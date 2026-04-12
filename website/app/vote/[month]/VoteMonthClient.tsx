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

type QSub = {
  id: string;
  title: string;
  description: string;
  tier: string;
  track: string;
  votes: number;
  redirectSlug: string | null;
  revealed: boolean;
  author: {
    discordId: string;
    discordUsername: string | null;
    displayName: string | null;
  } | null;
};

export function VoteMonthClient({ month }: { month: string }) {
  const [phase, setPhase] = useState<Phase | null>(null);
  const [subs, setSubs] = useState<QSub[]>([]);
  const [voted, setVoted] = useState<Set<string>>(new Set());
  const [devRem, setDevRem] = useState(2);
  const [hackRem, setHackRem] = useState(2);
  const [auth, setAuth] = useState<boolean | undefined>(undefined);
  const [err, setErr] = useState<string | null>(null);
  const [notMemberUrl, setNotMemberUrl] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [qRes, sRes] = await Promise.all([
      fetchVoteQueue(month),
      fetchVoteStatus(month),
    ]);
    if (qRes.status === 401 || sRes.status === 401) {
      setAuth(false);
      setNotMemberUrl(null);
      return;
    }
    if (qRes.status === 403 || sRes.status === 403) {
      setAuth(true);
      const raw = qRes.status === 403 ? qRes : sRes;
      const body = (await raw.json().catch(() => ({}))) as {
        joinUrl?: string;
      };
      setNotMemberUrl(body.joinUrl ?? "/join");
      return;
    }
    setNotMemberUrl(null);
    setAuth(true);
    if (qRes.ok) {
      const q = (await qRes.json()) as { phase: Phase; submissions: QSub[] };
      setPhase(q.phase);
      setSubs(q.submissions);
    }
    if (sRes.ok) {
      const s = (await sRes.json()) as {
        voted: string[];
        developerVotesRemaining: number;
        hackerVotesRemaining: number;
      };
      setVoted(new Set(s.voted));
      setDevRem(s.developerVotesRemaining);
      setHackRem(s.hackerVotesRemaining);
    }
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  const vote = async (submissionId: string, track: string) => {
    setErr(null);
    const optimistic = new Set(voted);
    optimistic.add(submissionId);
    setVoted(optimistic);
    setSubs((prev) =>
      prev.map((s) =>
        s.id === submissionId ? { ...s, votes: s.votes + 1 } : s,
      ),
    );
    if (track === "DEVELOPER") setDevRem((n) => Math.max(0, n - 1));
    if (track === "HACKER") setHackRem((n) => Math.max(0, n - 1));

    const res = await postVote(submissionId);
    if (!res.ok) {
      await load();
      const j = await res.json().catch(() => ({}));
      setErr((j as { message?: string }).message ?? "Vote failed");
    }
  };

  if (auth === undefined) {
    return (
      <section className="section flex min-h-[40vh] items-center justify-center">
        <p className="text-white/50">Loading…</p>
      </section>
    );
  }

  if (!auth) {
    return (
      <section className="section flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4">
        <h1 className="text-2xl font-bold">Vote — {month}</h1>
        <a href={loginUrl()} className="btn btn-primary">
          Sign in to vote
        </a>
      </section>
    );
  }

  if (notMemberUrl) {
    return (
      <section className="section flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 max-w-lg mx-auto text-center">
        <h1 className="text-2xl font-bold">Vote — {month}</h1>
        <p className="text-white/60 text-sm">
          Your Discord account is signed in, but we could not verify membership in the H4cknStack server.
          Join the server, then try again.
        </p>
        <a href={notMemberUrl} className="btn btn-primary">
          Join Discord
        </a>
      </section>
    );
  }

  const canVote = phase === "VOTE";
  const beforeVote = phase === "BUILD" || phase === "REVIEW";

  return (
    <section className="section px-[clamp(1rem,4vw,2rem)] max-w-5xl mx-auto space-y-8">
      <div>
        <p className="label">Community vote</p>
        <h1 className="text-3xl font-bold mb-2">{month}</h1>
        <p className="text-sm text-white/55">
          Phase: <span className="mono">{phase}</span> · Dev votes left: {devRem} · Hacker votes
          left: {hackRem}
        </p>
        {beforeVote && (
          <p className="mt-4 text-white/60">
            {phase === "BUILD"
              ? "Voting opens on day 22 (UTC)."
              : "Voting window closed for this month on the site."}
          </p>
        )}
        {err && <p className="text-[var(--danger)] text-sm mt-2">{err}</p>}
      </div>

      {(["DEVELOPER", "HACKER"] as const).map((track) => (
        <div key={track}>
          <h2 className="text-xl font-bold mb-4 border-b border-[var(--border)] pb-2">
            {track === "DEVELOPER" ? "Developer" : "Hacker"}
          </h2>
          {(["Beginner", "Intermediate", "Advanced"] as const).map((tier) => {
            const list = subs.filter((s) => s.track === track && s.tier === tier);
            if (!list.length) return null;
            return (
              <div key={tier} className="mb-8">
                <h3 className="text-sm font-bold text-[var(--accent)] mb-3">{tier}</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  {list.map((s) => {
                    const name = s.revealed
                      ? s.author?.displayName?.trim() ||
                        (s.author?.discordUsername
                          ? `@${s.author.discordUsername}`
                          : s.author?.discordId?.slice(-6))
                      : codenameFromSubmissionId(s.id);
                    const votedThis = voted.has(s.id);
                    const trackRem = track === "DEVELOPER" ? devRem : hackRem;
                    const disabled =
                      !canVote || votedThis || trackRem <= 0;
                    return (
                      <article key={s.id} className="card p-4 flex flex-col gap-2">
                        <div className="flex justify-between gap-2">
                          <span className="font-bold">{name}</span>
                          <span className="mono text-xs text-[var(--accent)]">
                            ▲ {s.votes}
                          </span>
                        </div>
                        <p className="text-sm text-white/65 line-clamp-4">{s.title}</p>
                        <p className="text-xs text-white/45 line-clamp-3">{s.description}</p>
                        <div className="flex flex-wrap gap-2 mt-auto pt-2">
                          {s.redirectSlug && (
                            <Link
                              href={`/go/${s.redirectSlug}`}
                              className="btn text-xs py-1"
                              target="_blank"
                              rel="noreferrer"
                            >
                              View project →
                            </Link>
                          )}
                          <button
                            type="button"
                            className={`btn text-xs py-1 ${
                              votedThis ? "btn-primary" : ""
                            }`}
                            disabled={disabled}
                            title={
                              trackRem <= 0 && !votedThis
                                ? "No votes left for this track"
                                : undefined
                            }
                            onClick={() => vote(s.id, track)}
                          >
                            {votedThis ? "✓ Voted" : "Vote"}
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

      <Link href="/challenges" className="btn text-sm inline-block">
        ← Challenges
      </Link>
    </section>
  );
}
