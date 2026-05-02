"use client";

import Link from "next/link";
import type { ChallengeDto } from "@/lib/api";
import type { Phase } from "@/lib/phase";
import { DISCORD_INVITE_URL } from "@/lib/branding";

function formatTrack(track: string): string {
  const t = track.toUpperCase();
  return t === "HACKER" ? "Hacker" : t === "DESIGNERS" ? "Designer" : "Developer";
}

export function ProfileChallengeStatus({
  phase,
  month,
  enrollment,
}: {
  phase: Phase;
  month: string;
  enrollment: { challenge: ChallengeDto } | null;
}) {
  if (phase === "VOTE") {
    return (
      <section className="section px-[clamp(1rem,4vw,2rem)] pb-0 pt-2">
        <div className="container max-w-5xl">
          <div className="rounded border border-[var(--border)] bg-[var(--bg-card)] p-5 sm:p-6">
            <h2 className="font-bold text-lg text-white mb-2">Submissions are closed — time to vote</h2>
            <p className="text-sm text-white/65 leading-relaxed mb-5">
              The build window has ended for <span className="mono text-[var(--accent)]">{month}</span>. Cast your votes on
              the site (up to three per month, one per track).
            </p>
            <Link href={`/vote/${encodeURIComponent(month)}`} className="btn btn-primary inline-flex">
              Open voting
            </Link>
          </div>
        </div>
      </section>
    );
  }

  if (phase !== "BUILD") {
    return null;
  }

  if (enrollment) {
    const ch = enrollment.challenge;
    return (
      <section className="section px-[clamp(1rem,4vw,2rem)] pb-0 pt-2">
        <div className="container max-w-5xl">
          <div className="rounded border border-[var(--border)] bg-[var(--bg-card)] p-5 sm:p-6">
            <h2 className="font-bold text-lg text-white mb-3">You&apos;re enrolled this month</h2>
            <p className="text-sm text-white/80 mb-1">
              <span className="text-white font-semibold">{formatTrack(ch.track)}</span>
              <span className="text-white/40 mx-2">·</span>
              <span className="mono text-[var(--accent)]">{ch.tier}</span>
            </p>
            <p className="text-sm text-white/55 mb-5">{ch.title}</p>
            <Link href="/submit" className="btn btn-primary inline-flex">
              Submit your work
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section px-[clamp(1rem,4vw,2rem)] pb-0 pt-2">
      <div className="container max-w-5xl">
        <div className="rounded border border-[var(--border)] bg-[var(--bg-card)] p-5 sm:p-6">
          <h2 className="font-bold text-lg text-white mb-2">Challenges are out</h2>
          <p className="text-sm text-white/65 leading-relaxed mb-4">
            Pick your track and tier for <span className="mono text-[var(--accent)]">{month}</span> in Discord: run{" "}
            <code className="mono text-[var(--accent)] text-[0.9em]">/enroll</code>, choose your category and difficulty,
            and you&apos;ll get the full briefing in your DMs. Then submit your entry on this site.
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href={DISCORD_INVITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn inline-flex"
            >
              Open Discord
            </a>
            <Link href="/challenges" className="btn btn-primary inline-flex">
              Browse challenges
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
