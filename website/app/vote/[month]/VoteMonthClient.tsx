"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { loginUrl } from "@/lib/auth-client";
import {
  fetchVoteQueue,
  fetchVoteStatus,
  postVote,
} from "@/lib/api-browser";
import { codenameFromSubmissionId } from "@/lib/codename";
import type { Phase } from "@/lib/api";

const HACKER_TYPE_LABEL: Record<string, string> = {
  CTF_WRITEUP: "CTF Writeup",
  TOOL_BUILD: "Tool Build",
  VULN_RESEARCH: "Vuln Research",
  REDTEAM: "Red Team",
};

type QSub = {
  id: string;
  title: string;
  description: string;
  tier: string;
  track: string;
  votes: number;
  redirectSlug: string | null;
  revealed: boolean;
  repoUrl?: string | null;
  demoUrl?: string | null;
  attachmentUrl?: string | null;
  challengeType?: string | null;
  deliverableType?: string | null;
  imageMeta?: string | null;
  author: {
    discordId: string;
    displayName: string | null;
    avatarHash?: string | null;
  } | null;
};

function parseImageMeta(
  raw: string | null | undefined,
): { width?: number; height?: number; mime?: string } | null {
  if (!raw?.trim()) return null;
  try {
    return JSON.parse(raw) as { width?: number; height?: number; mime?: string };
  } catch {
    return null;
  }
}

export function VoteMonthClient({ month }: { month: string }) {
  const [phase, setPhase] = useState<Phase | null>(null);
  const [subs, setSubs] = useState<QSub[]>([]);
  const [voted, setVoted] = useState<Set<string>>(new Set());
  const [devRem, setDevRem] = useState(1);
  const [hackRem, setHackRem] = useState(1);
  const [designRem, setDesignRem] = useState(1);
  const [auth, setAuth] = useState<boolean | undefined>(undefined);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [membershipRequired, setMembershipRequired] = useState(false);

  const load = useCallback(async () => {
    setLoadErr(null);
    try {
      const [qRes, sRes] = await Promise.all([
        fetchVoteQueue(month),
        fetchVoteStatus(month),
      ]);
      if (qRes.status === 401 || sRes.status === 401) {
        setAuth(false);
        setMembershipRequired(false);
        return;
      }
      if (qRes.status === 403 || sRes.status === 403) {
        setAuth(true);
        await (qRes.status === 403 ? qRes : sRes).json().catch(() => ({}));
        setMembershipRequired(true);
        return;
      }
      setMembershipRequired(false);
      setAuth(true);
      if (qRes.ok) {
        const q = (await qRes.json()) as { phase: Phase; submissions: QSub[] };
        setPhase(q.phase);
        setSubs(q.submissions);
      } else {
        setLoadErr(`Could not load submissions (HTTP ${qRes.status}).`);
      }
      if (sRes.ok) {
        const s = (await sRes.json()) as {
          voted: string[];
          developerVotesRemaining: number;
          hackerVotesRemaining: number;
          designerVotesRemaining?: number;
        };
        // DESIGNERS vote wiring is complete: rest-handlers returns designerVotesRemaining and we map it into designRem.
        setVoted(new Set(s.voted));
        setDevRem(s.developerVotesRemaining);
        setHackRem(s.hackerVotesRemaining);
        setDesignRem(s.designerVotesRemaining ?? 1);
      }
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : "Could not load vote page.");
      setAuth(true);
    }
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  const trackRem = (track: string) => {
    if (track === "DEVELOPER") return devRem;
    if (track === "HACKER") return hackRem;
    return designRem;
  };

  const setTrackRem = (track: string, fn: (n: number) => number) => {
    if (track === "DEVELOPER") setDevRem(fn);
    else if (track === "HACKER") setHackRem(fn);
    else setDesignRem(fn);
  };

  const vote = async (submissionId: string, track: string) => {
    setErr(null);
    const votedThis = voted.has(submissionId);
    const rem = trackRem(track);

    if (!votedThis && rem <= 0) {
      setErr("No votes left for this track.");
      return;
    }

    if (votedThis) {
      setVoted((prev) => {
        const n = new Set(prev);
        n.delete(submissionId);
        return n;
      });
      setSubs((prev) =>
        prev.map((s) =>
          s.id === submissionId ? { ...s, votes: Math.max(0, s.votes - 1) } : s,
        ),
      );
      setTrackRem(track, (n) => n + 1);
    } else {
      setVoted((prev) => new Set(prev).add(submissionId));
      setSubs((prev) =>
        prev.map((s) =>
          s.id === submissionId ? { ...s, votes: s.votes + 1 } : s,
        ),
      );
      setTrackRem(track, (n) => Math.max(0, n - 1));
    }

    const res = await postVote(submissionId, month);
    if (!res.ok) {
      await load();
      const j = await res.json().catch(() => ({}));
      setErr(
        (j as { message?: string }).message ??
          (j as { error?: string }).error ??
          "Vote failed",
      );
    }
  };

  if (auth === undefined) {
    return (
      <section className="section flex min-h-[40vh] flex-col items-center justify-center gap-3 px-4">
        <p className="text-white/50">Loading vote data…</p>
        {loadErr && <p className="text-[var(--danger)] text-sm text-center max-w-md">{loadErr}</p>}
      </section>
    );
  }

  if (!auth) {
    return (
      <section className="section flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4">
        <h1 className="text-2xl font-bold">Vote — {month}</h1>
        <p className="text-white/60 text-sm max-w-md text-center">
          Sign in with Discord to vote for community submissions.
        </p>
        <a href={loginUrl()} className="btn btn-primary min-h-[44px] px-6">
          Sign in with Discord to vote
        </a>
        {loadErr && <p className="text-[var(--danger)] text-sm text-center max-w-md">{loadErr}</p>}
      </section>
    );
  }

  if (membershipRequired) {
    return (
      <section className="section flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 max-w-lg mx-auto text-center">
        <h1 className="text-2xl font-bold">Vote — {month}</h1>
        <p className="text-white/60 text-sm">
          Your Discord account is signed in, but we could not verify membership in the H4ck&Stack server.
          Join the server, then try again.
        </p>
        <Link href="/join" className="btn btn-primary min-h-[44px] px-6">
          Join Discord
        </Link>
      </section>
    );
  }

  const canVote = phase === "VOTE";
  const beforeVote = phase === "BUILD" || phase === "REVIEW" || phase === "POST_PUBLISH";

  const trackTitle = (t: string) => {
    if (t === "HACKER") return "Hacker";
    if (t === "DESIGNERS") return "Designer";
    return "Developer";
  };

  return (
    <section className="section px-[clamp(1rem,4vw,2rem)] max-w-5xl mx-auto space-y-8">
      <div>
        <p className="label">Community vote</p>
        <h1 className="text-3xl font-bold mb-2">{month}</h1>
        <p className="text-sm text-white/55">
          Phase: <span className="mono">{phase ?? "—"}</span> · Votes left — Dev: {devRem} · Hacker:{" "}
          {hackRem} · Designer: {designRem}
        </p>
        {beforeVote && (
          <p className="mt-4 text-white/60">
            {phase === "BUILD"
              ? "Voting opens on day 22 (UTC+2) and runs through day 25 (UTC+2)."
              : phase === "REVIEW"
                ? "Voting for this month has closed (day 25 UTC+2). Results publish on day 29."
                : "Voting is not open for this month on the calendar right now."}
          </p>
        )}
        {err && <p className="text-[var(--danger)] text-sm mt-2">{err}</p>}
      </div>

      {(["DEVELOPER", "HACKER", "DESIGNERS"] as const).map((track) => (
        <div key={track}>
          <h2 className="text-xl font-bold mb-4 border-b border-[var(--border)] pb-2">
            {trackTitle(track)}
          </h2>
          {(["Beginner", "Intermediate", "Advanced"] as const).map((tier) => {
            const list = subs.filter((s) => s.track === track && s.tier === tier);
            if (!list.length) return null;
            return (
              <div key={tier} className="mb-8">
                <h3 className="text-sm font-bold text-[var(--accent)] mb-3">{tier}</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  {list.map((s) => {
                    const name =
                      s.author?.displayName?.trim() ||
                      codenameFromSubmissionId(s.id);
                    const votedThis = voted.has(s.id);
                    const tr = trackRem(track);
                    const disabled = !canVote || (!votedThis && tr <= 0);
                    const meta = parseImageMeta(s.imageMeta);
                    const typeBadge =
                      s.track === "HACKER" && s.challengeType
                        ? HACKER_TYPE_LABEL[s.challengeType] ?? s.challengeType
                        : null;
                    return (
                      <article key={s.id} className="card p-4 flex flex-col gap-2">
                        <div className="flex justify-between gap-2">
                          <span className="font-bold">{name}</span>
                          <span className="mono text-xs text-[var(--accent)]">▲ {s.votes}</span>
                        </div>
                        {typeBadge && (
                          <span className="tag text-[0.65rem] w-fit">{typeBadge}</span>
                        )}
                        <p className="text-sm text-white/65 line-clamp-4">{s.title}</p>
                        <p className="text-xs text-white/45 line-clamp-3">{s.description}</p>
                        {s.track === "DESIGNERS" && s.attachmentUrl && (
                          <div className="mt-1 space-y-1">
                            <img
                              src={s.attachmentUrl}
                              alt={`${s.title} submission image`}
                              loading="lazy"
                              className="w-full max-h-48 rounded border border-[var(--border)] object-contain bg-black/40"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                            />
                            {meta && (meta.width || meta.height || meta.mime) && (
                              <p className="mono text-[0.6rem] text-white/40">
                                {[meta.width && meta.height ? `${meta.width}×${meta.height}` : null, meta.mime]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </p>
                            )}
                          </div>
                        )}
                        <div className="flex flex-wrap gap-2 mt-auto pt-2">
                          {s.track === "DEVELOPER" && s.repoUrl && (
                            <a
                              href={s.repoUrl}
                              className="btn text-xs py-1"
                              target="_blank"
                              rel="noreferrer"
                            >
                              GitHub →
                            </a>
                          )}
                          {s.demoUrl && !s.demoUrl.startsWith("data:") && (
                            <a
                              href={s.demoUrl}
                              className="btn text-xs py-1"
                              target="_blank"
                              rel="noreferrer"
                            >
                              Demo / writeup →
                            </a>
                          )}
                          {s.track === "HACKER" && s.attachmentUrl && (
                            <a
                              href={s.attachmentUrl}
                              className="btn text-xs py-1"
                              target="_blank"
                              rel="noreferrer"
                            >
                              Writeup →
                            </a>
                          )}
                          {s.redirectSlug && s.track === "DEVELOPER" && (
                            <Link
                              href={`/go/${s.redirectSlug}`}
                              className="btn text-xs py-1"
                              target="_blank"
                              rel="noreferrer"
                            >
                              Redirect →
                            </Link>
                          )}
                          <Link href={`/submissions/${s.id}`} className="btn text-xs py-1">
                            Details
                          </Link>
                          <button
                            type="button"
                            className={`btn text-xs py-1 min-h-[44px] ${votedThis ? "btn-primary" : ""}`}
                            disabled={disabled}
                            title={
                              !canVote
                                ? "Voting is not open"
                                : !votedThis && tr <= 0
                                  ? "No votes left for this track"
                                  : votedThis
                                    ? "Click to remove your vote"
                                    : "Cast your vote"
                            }
                            onClick={() => vote(s.id, track)}
                          >
                            {votedThis ? "✓ Voted (click to undo)" : "Vote"}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ))}

      <Link href="/challenges" className="btn text-sm inline-block min-h-[44px]">
        ← Challenges
      </Link>
    </section>
  );
}
