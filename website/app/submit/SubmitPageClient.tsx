"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getSessionClient, loginUrl } from "@/lib/auth-client";
import {
  fetchMe,
  postSubmit,
  patchSubmit,
  postEnroll,
  postDesignImageUpload,
} from "@/lib/api-browser";
import { getChallenges, getPortfolio, type ChallengeDto } from "@/lib/api";
import { codenameFromSubmissionId } from "@/lib/codename";
import { communityMidnightUtc, getCommunityCalendarParts } from "@/lib/community-calendar";
import { getMonthKey } from "@/lib/month";
import type { Phase } from "@/lib/phase";

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
    imageMeta?: string | null;
    challengeType?: string | null;
    track?: string | null;
    isLocked: boolean;
    month: string;
  } | null;
};

function nextBuildWindowOpensLabel(): string {
  const { year: y, monthIndex: m } = getCommunityCalendarParts(new Date());
  const nm = m === 11 ? 0 : m + 1;
  const ny = m === 11 ? y + 1 : y;
  const nextFirst = communityMidnightUtc(ny, nm, 1);
  return nextFirst.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Etc/GMT-2",
  });
}

function formatApiError(j: Record<string, unknown>): string {
  if (typeof j.message === "string" && j.message.trim()) return j.message;
  if (typeof j.error === "string" && j.error.trim()) return j.error;
  return "Request failed";
}

const HACKER_TYPES = [
  { value: "CTF_WRITEUP", label: "CTF Writeup" },
  { value: "TOOL_BUILD", label: "Tool Build" },
  { value: "VULN_RESEARCH", label: "Vuln Research" },
  { value: "REDTEAM", label: "Red Team" },
] as const;

export function SubmitPageClient() {
  const [me, setMe] = useState<MePayload | null | undefined>(undefined);
  const [authIssue, setAuthIssue] = useState<string | null>(null);
  const [challenges, setChallenges] = useState<ChallengeDto[]>([]);
  const [phase, setPhase] = useState<Phase | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [demoUrl, setDemoUrl] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [imageMetaJson, setImageMetaJson] = useState<string | null>(null);
  const [challengeType, setChallengeType] = useState<string>("CTF_WRITEUP");
  const [writeupBody, setWriteupBody] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const voteMonth = useMemo(() => getMonthKey(), []);

  const load = useCallback(async () => {
    const session = await getSessionClient();
    if (!session) {
      setAuthIssue(null);
      setMe(null);
      return;
    }
    const res = await fetchMe();
    if (!res.ok) {
      setAuthIssue(
        "You're signed in, but your app session could not be verified. Try signing out and signing in again.",
      );
      setMe(null);
      return;
    }
    setAuthIssue(null);
    const data = (await res.json()) as MePayload;
    setMe(data);
    if (data.submission) {
      setTitle(data.submission.title);
      setDescription(data.submission.description);
      setRepoUrl(
        data.submission.repoUrl?.includes("h4cknstack.com/challenges") ? "" : data.submission.repoUrl,
      );
      setDemoUrl(data.submission.demoUrl?.startsWith("data:") ? "" : (data.submission.demoUrl ?? ""));
      setAttachmentUrl(data.submission.attachmentUrl ?? "");
      setImageMetaJson(data.submission.imageMeta ?? null);
      if (data.submission.challengeType) setChallengeType(data.submission.challengeType);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    getPortfolio()
      .then((p) => setPhase(p.phase as Phase))
      .catch(() => setPhase("BUILD"));
  }, []);

  useEffect(() => {
    if (me?.user && !me.enrollment) {
      const m = new Date().toISOString().slice(0, 7);
      Promise.all([
        getChallenges("DEVELOPER", m),
        getChallenges("HACKER", m),
        getChallenges("DESIGNERS", m),
      ]).then(([a, b, c]) => {
        setChallenges([...a.challenges, ...b.challenges, ...c.challenges]);
      });
    }
  }, [me?.user, me?.enrollment]);

  const enroll = async (challengeId: string) => {
    setErr(null);
    setFieldErrors({});
    const res = await postEnroll(challengeId);
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      setErr(formatApiError(j));
      return;
    }
    load();
  };

  const onPickDesignFile = async (file: File | null) => {
    if (!file) return;
    setErr(null);
    setFieldErrors({});
    if (file.size > 10 * 1024 * 1024) {
      setFieldErrors({ image: "Image must be 10MB or smaller." });
      return;
    }
    const mime = (file.type || "").toLowerCase();
    if (!["image/png", "image/jpeg", "image/webp"].includes(mime)) {
      setFieldErrors({ image: "Use PNG, JPG, or WebP only." });
      return;
    }
    setUploading(true);
    try {
      const res = await postDesignImageUpload(file);
      const j = (await res.json().catch(() => ({}))) as {
        url?: string;
        imageMeta?: string;
        message?: string;
        error?: string;
      };
      if (!res.ok) {
        setErr(j.message ?? j.error ?? "Upload failed");
        return;
      }
      if (j.url) {
        setAttachmentUrl(j.url);
        setImageMetaJson(j.imageMeta ?? null);
      }
    } finally {
      setUploading(false);
    }
  };

  const buildPayload = (ch: ChallengeDto): Record<string, unknown> => {
    const base = { title, description };
    if (ch.track === "DEVELOPER") {
      return { ...base, repoUrl: repoUrl.trim(), demoUrl: demoUrl.trim() || null };
    }
    if (ch.track === "HACKER") {
      return {
        ...base,
        repoUrl: "",
        demoUrl: demoUrl.trim() || null,
        attachmentUrl: attachmentUrl.trim() || null,
        challengeType,
        writeupBody: writeupBody.trim() || null,
      };
    }
    return {
      ...base,
      repoUrl: "",
      demoUrl: null,
      attachmentUrl: attachmentUrl.trim() || null,
      imageMeta: imageMetaJson,
    };
  };

  const save = async () => {
    if (!me?.enrollment) return;
    const ch = me.enrollment.challenge;
    setFieldErrors({});
    setErr(null);
    setMsg(null);

    const fe: Record<string, string> = {};
    if (title.trim().length < 5 || title.trim().length > 100) {
      fe.title = "Title must be 5–100 characters.";
    }
    if (description.trim().length < 100 || description.trim().length > 2000) {
      fe.description = "Description must be 100–2000 characters.";
    }
    if (ch.track === "DEVELOPER") {
      const r = repoUrl.trim();
      if (!r) fe.repoUrl = "GitHub repo URL is required.";
      else {
        try {
          const u = new URL(r);
          if (u.hostname.toLowerCase() !== "github.com") {
            fe.repoUrl = "Must be a github.com URL.";
          }
        } catch {
          fe.repoUrl = "Invalid URL.";
        }
      }
    }
    if (ch.track === "HACKER") {
      const hasLink = Boolean(demoUrl.trim() || attachmentUrl.trim());
      const hasWriteup = writeupBody.trim().length >= 50;
      if (!hasLink && !hasWriteup) {
        fe.writeup = "Add a writeup URL, demo URL, attachment URL, or paste at least 50 characters of writeup.";
      }
    }
    if (ch.track === "DESIGNERS") {
      if (!attachmentUrl.trim()) fe.image = "Provide an image URL or upload a PNG, JPG, or WebP file.";
    }
    if (Object.keys(fe).length) {
      setFieldErrors(fe);
      return;
    }

    if (!me.submission) {
      setSaving(true);
      const res = await postSubmit(buildPayload(ch));
      setSaving(false);
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        setErr(formatApiError(j));
        return;
      }
      setMsg(`Submitted. When voting opens you can vote at /vote/${voteMonth}.`);
      load();
      return;
    }

    if (me.submission.isLocked) {
      setErr("Submission is locked (voting started).");
      return;
    }
    setSaving(true);
    const res = await patchSubmit(me.submission.id, buildPayload(ch));
    setSaving(false);
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      setErr(formatApiError(j));
      return;
    }
    setMsg(`Updated. Vote at /vote/${voteMonth} when the window opens.`);
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
        {authIssue && <p className="text-sm text-[var(--danger)] max-w-md text-center">{authIssue}</p>}
        <a href={loginUrl()} className="btn btn-primary">
          Sign in to submit
        </a>
      </section>
    );
  }

  if (phase && phase !== "BUILD") {
    return (
      <section className="section px-[clamp(1rem,4vw,2rem)] max-w-2xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold">Build window closed</h1>
        <p className="text-white/70 text-sm leading-relaxed">
          Submissions are only accepted during days <strong>1–21</strong> (UTC+2). The next build window opens on{" "}
          <span className="mono text-[var(--accent)]">{nextBuildWindowOpensLabel()}</span>.
        </p>
        <Link href="/challenges" className="btn inline-block">
          ← Challenges
        </Link>
      </section>
    );
  }

  if (!me.enrollment) {
    return (
      <section className="section px-[clamp(1rem,4vw,2rem)] max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Enroll first</h1>
        <p className="text-white/60 mb-6 leading-relaxed">
          You need to enroll before submitting. Use <span className="mono">/enroll</span> in Discord or pick a
          challenge below.
        </p>
        {err && (
          <p className="text-[var(--danger)] text-sm mb-4 border border-[var(--danger)]/40 rounded p-3" role="alert">
            {err}
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {challenges.map((ch) => (
            <button
              key={ch.id}
              type="button"
              className="card p-4 text-left hover:border-[var(--accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
              onClick={() => enroll(ch.id)}
            >
              <span className="tag tag-accent text-xs mb-2">{ch.tier}</span>
              <p className="font-bold">{ch.title}</p>
              <p className="text-xs text-white/45 mt-1">{ch.track}</p>
            </button>
          ))}
        </div>
        {challenges.length === 0 && (
          <p className="text-white/50 text-sm mt-4">
            No challenges loaded for this month yet. They are posted on day 1 — check Discord #challenges.
          </p>
        )}
        <Link href="/join" className="btn btn-primary mt-6 inline-block">
          Join Discord →
        </Link>
      </section>
    );
  }

  const ch = me.enrollment.challenge;
  const locked = me.submission?.isLocked;
  const track = ch.track;

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
        <summary className="cursor-pointer font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] rounded">
          Challenge brief
        </summary>
        <div className="mt-3 text-sm text-white/70 whitespace-pre-wrap">{ch.description}</div>
        {ch.deliverables && (
          <div className="mt-3 text-sm">
            <p className="font-bold text-white mb-1">Deliverables</p>
            <div className="text-white/65 whitespace-pre-wrap">{ch.deliverables}</div>
          </div>
        )}
      </details>
      {msg && (
        <p className="text-[var(--success)] text-sm border border-[var(--success)]/30 rounded p-3">
          {msg}{" "}
          <Link href={`/vote/${voteMonth}`} className="underline text-[var(--accent)]">
            Open vote page →
          </Link>
        </p>
      )}
      {err && (
        <p className="text-[var(--danger)] text-sm border border-[var(--danger)]/40 rounded p-3" role="alert">
          {err}
        </p>
      )}
      <label className="block text-sm text-white/60">Title (5–100)</label>
      <input
        className="w-full rounded border border-[var(--border)] bg-[var(--bg-card)] p-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
        value={title}
        disabled={locked}
        onChange={(e) => setTitle(e.target.value)}
        aria-invalid={Boolean(fieldErrors.title)}
      />
      {fieldErrors.title && <p className="text-xs text-[var(--danger)]">{fieldErrors.title}</p>}
      <label className="block text-sm text-white/60">Description (100–2000)</label>
      <textarea
        className="w-full min-h-[160px] rounded border border-[var(--border)] bg-[var(--bg-card)] p-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
        value={description}
        disabled={locked}
        onChange={(e) => setDescription(e.target.value)}
        aria-invalid={Boolean(fieldErrors.description)}
      />
      <p className="text-xs text-white/40">{description.length} chars</p>
      {fieldErrors.description && (
        <p className="text-xs text-[var(--danger)]">{fieldErrors.description}</p>
      )}

      {track === "DEVELOPER" && (
        <>
          <label className="block text-sm text-white/60">GitHub repository URL</label>
          <input
            className="w-full rounded border border-[var(--border)] bg-[var(--bg-card)] p-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            value={repoUrl}
            disabled={locked}
            onChange={(e) => setRepoUrl(e.target.value)}
            placeholder="https://github.com/org/repo"
          />
          {fieldErrors.repoUrl && <p className="text-xs text-[var(--danger)]">{fieldErrors.repoUrl}</p>}
          <label className="block text-sm text-white/60">Live demo URL (optional)</label>
          <input
            className="w-full rounded border border-[var(--border)] bg-[var(--bg-card)] p-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            value={demoUrl}
            disabled={locked}
            onChange={(e) => setDemoUrl(e.target.value)}
          />
        </>
      )}

      {track === "HACKER" && (
        <>
          <label className="block text-sm text-white/60">Submission type</label>
          <select
            className="w-full rounded border border-[var(--border)] bg-[var(--bg-card)] p-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            value={challengeType}
            disabled={locked}
            onChange={(e) => setChallengeType(e.target.value)}
          >
            {HACKER_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <label className="block text-sm text-white/60">Writeup or article URL</label>
          <input
            className="w-full rounded border border-[var(--border)] bg-[var(--bg-card)] p-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            value={demoUrl}
            disabled={locked}
            onChange={(e) => setDemoUrl(e.target.value)}
            placeholder="https://…"
          />
          <label className="block text-sm text-white/60">Attachment URL (optional)</label>
          <input
            className="w-full rounded border border-[var(--border)] bg-[var(--bg-card)] p-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            value={attachmentUrl}
            disabled={locked}
            onChange={(e) => setAttachmentUrl(e.target.value)}
          />
          <label className="block text-sm text-white/60">Or paste writeup (min 50 chars, optional if URL above)</label>
          <textarea
            className="w-full min-h-[120px] rounded border border-[var(--border)] bg-[var(--bg-card)] p-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            value={writeupBody}
            disabled={locked}
            onChange={(e) => setWriteupBody(e.target.value)}
          />
          {fieldErrors.writeup && <p className="text-xs text-[var(--danger)]">{fieldErrors.writeup}</p>}
        </>
      )}

      {track === "DESIGNERS" && (
        <>
          <label className="block text-sm text-white/60">Image URL (direct PNG, JPG, or WebP)</label>
          <input
            className="w-full rounded border border-[var(--border)] bg-[var(--bg-card)] p-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            value={attachmentUrl}
            disabled={locked}
            onChange={(e) => {
              setAttachmentUrl(e.target.value);
              setImageMetaJson(null);
            }}
            placeholder="https://…"
          />
          {fieldErrors.image && <p className="text-xs text-[var(--danger)]">{fieldErrors.image}</p>}
          <label className="block text-sm text-white/60">Or upload (max 10MB)</label>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={locked || uploading}
            className="text-sm text-white/70 file:mr-3 file:rounded file:border file:border-[var(--border)] file:bg-[var(--bg-card)] file:px-3 file:py-2"
            onChange={(e) => void onPickDesignFile(e.target.files?.[0] ?? null)}
          />
          {uploading && <p className="text-xs text-white/50">Uploading…</p>}
        </>
      )}

      {!locked && (
        <button
          type="button"
          className="btn btn-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          disabled={saving}
          onClick={() => void save()}
        >
          {saving ? "Saving…" : me.submission ? "Save changes" : "Submit"}
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
