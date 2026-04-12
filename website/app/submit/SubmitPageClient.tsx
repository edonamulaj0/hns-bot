"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { loginUrl } from "@/lib/auth-client";
import { fetchMe, postSubmit, patchSubmit, postEnroll } from "@/lib/api-browser";
import { getChallenges, type ChallengeDto } from "@/lib/api";
import { codenameFromSubmissionId } from "@/lib/codename";

type MePayload = {
  user: { id: string; discordId: string };
  enrollment: { challenge: ChallengeDto } | null;
  submission: {
    id: string;
    title: string;
    description: string;
    repoUrl: string;
    demoUrl: string | null;
    attachmentUrl: string | null;
    isLocked: boolean;
    month: string;
  } | null;
};

export function SubmitPageClient() {
  const [me, setMe] = useState<MePayload | null | undefined>(undefined);
  const [challenges, setChallenges] = useState<ChallengeDto[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [demoUrl, setDemoUrl] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetchMe();
    if (res.status === 401) {
      setMe(null);
      return;
    }
    if (!res.ok) {
      setMe(null);
      return;
    }
    const data = (await res.json()) as MePayload;
    setMe(data);
    if (data.submission) {
      setTitle(data.submission.title);
      setDescription(data.submission.description);
      setRepoUrl(data.submission.repoUrl);
      setDemoUrl(data.submission.demoUrl ?? "");
      setAttachmentUrl(data.submission.attachmentUrl ?? "");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (me?.user && !me.enrollment) {
      const m = new Date().toISOString().slice(0, 7);
      Promise.all([
        getChallenges("DEVELOPER", m),
        getChallenges("HACKER", m),
      ]).then(([a, b]) => {
        setChallenges([...a.challenges, ...b.challenges]);
      });
    }
  }, [me?.user, me?.enrollment]);

  const enroll = async (challengeId: string) => {
    setErr(null);
    const res = await postEnroll(challengeId);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr((j as { error?: string }).error ?? "Enroll failed");
      return;
    }
    load();
  };

  const save = async () => {
    if (!me?.submission) {
      setSaving(true);
      setErr(null);
      const res = await postSubmit({
        title,
        description,
        repoUrl,
        demoUrl: demoUrl || null,
        attachmentUrl: attachmentUrl || null,
      });
      setSaving(false);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setErr(JSON.stringify(j));
        return;
      }
      setMsg("Submitted.");
      load();
      return;
    }

    if (me.submission.isLocked) {
      setErr("Submission is locked (voting started).");
      return;
    }
    setSaving(true);
    setErr(null);
    const res = await patchSubmit(me.submission.id, {
      title,
      description,
      repoUrl,
      demoUrl: demoUrl || null,
      attachmentUrl: attachmentUrl || null,
    });
    setSaving(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(JSON.stringify(j));
      return;
    }
    setMsg("Updated.");
    load();
  };

  if (me === undefined) {
    return (
      <section className="section flex min-h-[40vh] items-center justify-center">
        <p className="text-white/50">Loading…</p>
      </section>
    );
  }

  if (me === null) {
    return (
      <section className="section flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4">
        <h1 className="text-2xl font-bold">Submit</h1>
        <a href={loginUrl()} className="btn btn-primary">
          Sign in to submit
        </a>
      </section>
    );
  }

  if (!me.enrollment) {
    return (
      <section className="section px-[clamp(1rem,4vw,2rem)] max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Enroll first</h1>
        <p className="text-white/60 mb-6">
          Pick a challenge for this month. You can also use <span className="mono">/enroll</span> in
          Discord.
        </p>
        {err && <p className="text-[var(--danger)] text-sm mb-4">{err}</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          {challenges.map((ch) => (
            <button
              key={ch.id}
              type="button"
              className="card p-4 text-left hover:border-[var(--accent)]"
              onClick={() => enroll(ch.id)}
            >
              <span className="tag tag-accent text-xs mb-2">{ch.tier}</span>
              <p className="font-bold">{ch.title}</p>
              <p className="text-xs text-white/45 mt-1">{ch.track}</p>
            </button>
          ))}
        </div>
        {challenges.length === 0 && (
          <p className="text-white/50 text-sm">
            No challenges loaded for this month yet. They are posted on day 1 — check Discord
            #challenges.
          </p>
        )}
      </section>
    );
  }

  const ch = me.enrollment.challenge;
  const locked = me.submission?.isLocked;

  return (
    <section className="section px-[clamp(1rem,4vw,2rem)] max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Submit</h1>
        <p className="text-sm text-white/50">
          {ch.track} · {ch.tier} · {ch.month}
          {locked && " · locked for editing"}
        </p>
      </div>
      <details className="card p-4">
        <summary className="cursor-pointer font-bold">Challenge brief</summary>
        <div className="mt-3 text-sm text-white/70 whitespace-pre-wrap">{ch.description}</div>
        {ch.deliverables && (
          <div className="mt-3 text-sm">
            <p className="font-bold text-white mb-1">Deliverables</p>
            <div className="text-white/65 whitespace-pre-wrap">{ch.deliverables}</div>
          </div>
        )}
      </details>
      {msg && <p className="text-[var(--success)] text-sm">{msg}</p>}
      {err && <p className="text-[var(--danger)] text-sm">{err}</p>}
      <label className="block text-sm text-white/60">Title (5–100)</label>
      <input
        className="w-full rounded border border-[var(--border)] bg-[var(--bg-card)] p-2 text-sm"
        value={title}
        disabled={locked}
        onChange={(e) => setTitle(e.target.value)}
      />
      <label className="block text-sm text-white/60">Description (100–2000)</label>
      <textarea
        className="w-full min-h-[160px] rounded border border-[var(--border)] bg-[var(--bg-card)] p-2 text-sm"
        value={description}
        disabled={locked}
        onChange={(e) => setDescription(e.target.value)}
      />
      <p className="text-xs text-white/40">{description.length} chars</p>
      <label className="block text-sm text-white/60">Repo URL (GitHub/GitLab)</label>
      <input
        className="w-full rounded border border-[var(--border)] bg-[var(--bg-card)] p-2 text-sm"
        value={repoUrl}
        disabled={locked}
        onChange={(e) => setRepoUrl(e.target.value)}
      />
      <label className="block text-sm text-white/60">Demo URL (optional)</label>
      <input
        className="w-full rounded border border-[var(--border)] bg-[var(--bg-card)] p-2 text-sm"
        value={demoUrl}
        disabled={locked}
        onChange={(e) => setDemoUrl(e.target.value)}
      />
      {ch.track === "HACKER" && (
        <>
          <label className="block text-sm text-white/60">
            Attachment / writeup URL (Hacker: required if no demo)
          </label>
          <input
            className="w-full rounded border border-[var(--border)] bg-[var(--bg-card)] p-2 text-sm"
            value={attachmentUrl}
            disabled={locked}
            onChange={(e) => setAttachmentUrl(e.target.value)}
          />
        </>
      )}
      {!locked && (
        <button type="button" className="btn btn-primary" disabled={saving} onClick={save}>
          {me.submission ? "Save changes" : "Submit project"}
        </button>
      )}
      {me.submission?.id && (
        <p className="text-xs text-white/40 mono">
          Internal id {me.submission.id} · codename {codenameFromSubmissionId(me.submission.id)}
        </p>
      )}
      <Link href="/challenges" className="btn text-sm inline-block">
        ← Challenges
      </Link>
    </section>
  );
}
