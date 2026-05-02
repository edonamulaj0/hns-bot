"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getCommunityCalendarParts } from "@/lib/community-calendar";
import { getMonthKey } from "@/lib/month";

function getPhase() {
  const { day } = getCommunityCalendarParts(new Date());
  if (day >= 22 && day <= 25) return "VOTE";
  return "OTHER";
}

/** Shown only during days 22–25 (UTC+2 calendar). `monthKey` should match the active challenge month (e.g. portfolio.month). */
export function VoteBanner({ monthKey }: { monthKey?: string }) {
  const [phase, setPhase] = useState("");
  useEffect(() => {
    setPhase(getPhase());
  }, []);
  if (phase !== "VOTE") return null;

  const votePathMonth = monthKey?.trim() || getMonthKey();

  return (
    <div
      className={[
        "flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3",
        "rounded-sm border border-[#ccff004d] bg-[#ccff000a]",
        "px-2.5 py-2 sm:px-3 sm:py-2",
        "mb-4 max-w-full",
      ].join(" ")}
    >
      {/* Vote cap: 3 total, max 1 per track. Update here if src/vote-service.ts changes. */}
      <div className="flex min-w-0 flex-1 items-start gap-2 sm:items-center">
        <span
          className="pulse-dot mt-1 shrink-0 sm:mt-0"
          style={{ background: "var(--accent)" }}
          aria-hidden
        />
        <div className="min-w-0 leading-snug">
          <span className="mono text-[var(--accent)] text-xs font-bold tracking-tight">
            Voting is open
          </span>
          <span className="mono block text-[0.65rem] text-white/45 sm:mt-0.5 sm:inline sm:before:mx-1.5 sm:before:text-white/25 sm:before:content-['·']">
            Closes day 25 · 3 votes · max 1 per track (Dev / Hacker / Designer)
          </span>
        </div>
      </div>
      <Link
        href={`/vote/${votePathMonth}`}
        className="btn btn-primary w-full shrink-0 px-3 py-1.5 text-xs sm:w-auto sm:self-center"
      >
        Vote now →
      </Link>
    </div>
  );
}
