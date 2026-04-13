"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

function getPhase() {
  const day = new Date().getUTCDate();
  if (day >= 22 && day <= 25) return "VOTE";
  return "OTHER";
}

function getMonthKey() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function VoteBanner() {
  const [phase, setPhase] = useState("");
  useEffect(() => {
    setPhase(getPhase());
  }, []);
  if (phase !== "VOTE") return null;

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
          Closes day 25 · 4 votes per member (2 per track)
        </span>
      </div>
      <Link
        href={`/vote/${getMonthKey()}`}
        className="btn btn-primary"
        style={{ fontSize: "var(--text-xs)", padding: "0.4rem 1rem" }}
      >
        Vote now →
      </Link>
    </div>
  );
}
