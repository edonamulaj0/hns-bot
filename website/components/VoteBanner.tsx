"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getMonthKey } from "@/lib/month";

function getPhase() {
  const day = new Date().getUTCDate();
  if (day >= 22 && day <= 25) return "VOTE";
  return "OTHER";
}

/** Shown only during days 22–25 UTC. `monthKey` should match the active challenge month (e.g. portfolio.month). */
export function VoteBanner({ monthKey }: { monthKey?: string }) {
  const [phase, setPhase] = useState("");
  useEffect(() => {
    setPhase(getPhase());
  }, []);
  if (phase !== "VOTE") return null;

  const votePathMonth = monthKey?.trim() || getMonthKey();

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "1rem",
        padding: "1rem 1.25rem",
        border: "1px solid rgba(204,255,0,0.3)",
        background: "rgba(204,255,0,0.04)",
        borderRadius: "2px",
        marginBottom: "var(--space-lg)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "var(--accent)",
            animation: "pulse-dot 1.5s ease infinite",
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-sm)",
            color: "var(--accent)",
            fontWeight: 700,
          }}
        >
          Voting is open
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-xs)",
            color: "var(--text-dim)",
          }}
        >
          Closes day 25 · 4 votes per member (up to 2 per track: Dev / Hacker / Design)
        </span>
      </div>
      <Link
        href={`/vote/${votePathMonth}`}
        className="btn btn-primary"
        style={{ fontSize: "var(--text-xs)", padding: "0.4rem 1rem" }}
      >
        Vote now →
      </Link>
    </div>
  );
}
