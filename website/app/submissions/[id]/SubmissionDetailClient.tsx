"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchSubmission } from "@/lib/api-browser";

type Detail = {
  id: string;
  title: string;
  description: string;
  tier: string;
  track: string;
  votes: number;
  month?: string;
  repoUrl?: string;
  demoUrl?: string | null;
  attachmentUrl?: string | null;
  challengeType?: string | null;
  imageMeta?: string | null;
  createdAt?: string;
  user?: { discordId: string; displayName: string | null; avatarHash?: string | null };
  error?: string;
  message?: string;
};

export function SubmissionDetailClient({ id }: { id: string }) {
  const [data, setData] = useState<Detail | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetchSubmission(id)
      .then(async (r) => {
        const j = (await r.json()) as Detail & { error?: string; message?: string };
        if (!r.ok) {
          setErr(j.message ?? j.error ?? `HTTP ${r.status}`);
          return;
        }
        setData(j);
      })
      .catch((e) => setErr(e instanceof Error ? e.message : "Failed to load"));
  }, [id]);

  if (err) {
    return (
      <section className="section max-w-2xl mx-auto px-4">
        <h1 className="text-2xl font-bold mb-2">Submission</h1>
        <p className="text-[var(--danger)]">{err}</p>
        <Link href="/activity" className="btn mt-4 inline-block">
          ← Activity
        </Link>
      </section>
    );
  }

  if (!data) {
    return (
      <section className="section flex min-h-[30vh] items-center justify-center">
        <p className="text-white/50">Loading…</p>
      </section>
    );
  }

  const trackLabel =
    data.track === "HACKER" ? "Hacker" : data.track === "DESIGNERS" ? "Design" : "Developer";

  const hackerTypeLabel =
    data.challengeType === "CTF_WRITEUP"
      ? "CTF Writeup"
      : data.challengeType === "TOOL_BUILD"
        ? "Tool Build"
        : data.challengeType === "VULN_RESEARCH"
          ? "Vuln Research"
          : data.challengeType === "REDTEAM"
            ? "Red Team"
            : null;

  type ImageMeta = { width?: number; height?: number; mime?: string };
  let imageMetaParsed: ImageMeta | null = null;
  if (data.imageMeta) {
    try {
      imageMetaParsed = JSON.parse(data.imageMeta) as ImageMeta;
    } catch {
      imageMetaParsed = null;
    }
  }

  const hideRepo = Boolean(data.repoUrl?.includes("h4cknstack.com/challenges"));

  return (
    <section className="section max-w-3xl mx-auto px-[clamp(1rem,4vw,2rem)] space-y-6">
      <div>
        <p className="label">Submission</p>
        <h1 className="text-3xl font-bold mb-2">{data.title}</h1>
        <div className="flex flex-wrap gap-2">
          <span className="tag text-xs">{trackLabel}</span>
          <span className="tag text-xs">{data.tier}</span>
          {hackerTypeLabel && (
            <span className="tag text-xs border-[#7c2feb4d] bg-[#7c2feb14]">{hackerTypeLabel}</span>
          )}
          {data.month && <span className="mono text-xs text-white/45">{data.month}</span>}
        </div>
      </div>
      {data.user?.displayName && (
        <p className="text-sm text-white/60">
          By <span className="text-white/90">{data.user.displayName}</span>
        </p>
      )}
      <p className="text-sm text-white/75 whitespace-pre-wrap">{data.description}</p>
      {data.track === "DESIGNERS" && data.attachmentUrl && (
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={data.attachmentUrl}
            alt=""
            className="w-full max-h-[480px] rounded border border-[var(--border)] object-contain bg-black/30"
          />
          {imageMetaParsed && (imageMetaParsed.width || imageMetaParsed.mime) && (
            <p className="mono text-xs text-white/45 mt-2">
              {imageMetaParsed.width && imageMetaParsed.height
                ? `${imageMetaParsed.width}×${imageMetaParsed.height}px`
                : null}
              {imageMetaParsed.mime ? ` · ${imageMetaParsed.mime}` : ""}
            </p>
          )}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {data.repoUrl && !hideRepo && (
          <a href={data.repoUrl} target="_blank" rel="noreferrer" className="btn text-sm">
            Repository →
          </a>
        )}
        {data.demoUrl?.startsWith("data:text/markdown") && (
          <p className="text-xs text-white/50 w-full">
            Writeup stored with this submission (markdown). Editing is available from your submit page during the
            build window.
          </p>
        )}
        {data.demoUrl && !data.demoUrl.startsWith("data:") && (
          <a href={data.demoUrl} target="_blank" rel="noreferrer" className="btn text-sm">
            Demo / writeup →
          </a>
        )}
        {data.attachmentUrl && data.track !== "DESIGNERS" && (
          <a href={data.attachmentUrl} target="_blank" rel="noreferrer" className="btn text-sm">
            Attachment →
          </a>
        )}
      </div>
      {data.createdAt && (
        <p className="mono text-xs text-white/40">Submitted {new Date(data.createdAt).toLocaleString()}</p>
      )}
      <p className="mono text-sm text-[var(--accent)]">▲ {data.votes} votes</p>
      <Link href="/activity" className="btn text-sm inline-block">
        ← Activity
      </Link>
    </section>
  );
}
