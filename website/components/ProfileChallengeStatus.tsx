"use client";

import Link from "next/link";
import type { ChallengeDto } from "@/lib/api";
import type { Phase } from "@/lib/phase";
import { DISCORD_INVITE_URL } from "@/lib/branding";

function formatTrack(track: string): string {
  const t = track.toUpperCase();
  return t === "HACKER" ? "Hacker" : t === "DESIGNERS" ? "Designer" : "Developer";
}

const cardClass =
  "flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3 rounded-sm border border-[var(--border)] bg-[var(--bg-card)] px-2.5 py-2 sm:px-3 sm:py-2 mb-4 max-w-full";

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
          <div className={cardClass}>
            <div className="min-w-0 flex-1 leading-snug">
              <p className="font-bold text-xs text-white sm:text-sm">Submissions closed — vote open</p>
              <p className="mono text-[0.65rem] text-white/50 sm:text-xs">
                <span className="text-[var(--accent)]">{month}</span>
                <span className="text-white/30 before:mx-1.5 before:content-['·']">Up to 3 votes · 1 per track</span>
              </p>
            </div>
            <Link
              href={`/vote/${encodeURIComponent(month)}`}
              className="btn btn-primary w-full shrink-0 px-3 py-1.5 text-xs sm:w-auto sm:self-center"
            >
              Open voting →
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
          <div className={cardClass}>
            <div className="min-w-0 flex-1 leading-snug">
              <p className="font-bold text-xs text-white sm:text-sm">Enrolled this month</p>
              <p className="text-[0.65rem] text-white/70 sm:text-xs">
                <span className="font-semibold text-white/90">{formatTrack(ch.track)}</span>
                <span className="text-white/35 mx-1">·</span>
                <span className="mono text-[var(--accent)]">{ch.tier}</span>
              </p>
              <p className="mt-0.5 line-clamp-2 text-[0.65rem] text-white/45 sm:text-xs">{ch.title}</p>
            </div>
            <Link
              href="/submit"
              className="btn btn-primary w-full shrink-0 px-3 py-1.5 text-xs sm:w-auto sm:self-center"
            >
              Submit →
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section px-[clamp(1rem,4vw,2rem)] pb-0 pt-2">
      <div className="container max-w-5xl">
        <div className={cardClass}>
          <div className="min-w-0 flex-1 leading-snug">
            <p className="font-bold text-xs text-white sm:text-sm">Challenges are out</p>
            <p className="text-[0.65rem] text-white/50 sm:text-xs">
              <span className="mono text-[var(--accent)]">{month}</span>
              <span className="text-white/35">
                {" "}
                · Use <code className="mono text-[var(--accent)]">/enroll</code> in Discord, then submit here.
              </span>
            </p>
          </div>
          <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:justify-end sm:self-center">
            <a
              href={DISCORD_INVITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn w-full px-3 py-1.5 text-xs sm:w-auto"
            >
              Discord
            </a>
            <Link href="/challenges" className="btn btn-primary w-full px-3 py-1.5 text-xs sm:w-auto">
              Challenges →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
