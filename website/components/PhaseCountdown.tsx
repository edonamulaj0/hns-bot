"use client";

import { useEffect, useState } from "react";
import {
  getMonthlyPhase,
  getNextPhaseTransitionAt,
  phaseCountdownHeadline,
  phaseStatBlockLabel,
  phaseStatBlockValue,
  splitDuration,
  type Phase,
} from "@/lib/phase";

function useCountdownTarget(phaseFromApi?: Phase) {
  const [mounted, setMounted] = useState(false);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    setMounted(true);
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  if (!mounted) {
    const phase = phaseFromApi ?? getMonthlyPhase(new Date());
    return { phase, msLeft: 0, urgent: false, tick, mounted: false };
  }

  const now = new Date();
  const localPhase = getMonthlyPhase(now);
  const phase = phaseFromApi ?? localPhase;
  const target = getNextPhaseTransitionAt(now);
  const msLeft = target.getTime() - now.getTime();
  const urgent =
    msLeft < 86400000 &&
    phase !== "PUBLISH" &&
    phase !== "POST_PUBLISH";

  return { phase, msLeft, urgent, tick, mounted: true };
}

export function PhaseCountdown({ phase: phaseFromApi }: { phase?: Phase }) {
  const { phase, msLeft, urgent } = useCountdownTarget(phaseFromApi);
  const { days, hours, minutes, seconds } = splitDuration(msLeft);
  const headline = phaseCountdownHeadline(phase, msLeft);

  const blocks = [
    { label: "DD", value: String(days).padStart(2, "0") },
    { label: "HH", value: String(hours).padStart(2, "0") },
    { label: "MM", value: String(minutes).padStart(2, "0") },
    { label: "SS", value: String(seconds).padStart(2, "0") },
  ];

  return (
    <div className="mt-4 sm:mt-6">
      <p className="mono text-xs sm:text-sm text-white/70 mb-3">{headline}</p>
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {blocks.map((b, i) => (
          <div
            key={b.label}
            className={`flex items-center gap-2 sm:gap-3 ${
              b.label === "MM" || b.label === "SS" ? "max-[359px]:hidden" : ""
            }`}
          >
            <div
              className={`rounded border bg-[var(--bg-card)] px-3 py-2 sm:px-4 sm:py-3 text-center min-w-[48px] sm:min-w-[4rem] ${
                urgent ? "animate-phase-countdown-border" : "border-[var(--border)]"
              }`}
              style={
                urgent
                  ? undefined
                  : { borderColor: "var(--border)" }
              }
            >
              <div
                className="mono text-[clamp(1.5rem,6vw,2rem)] sm:text-2xl font-bold tabular-nums text-[var(--text)]"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {b.value}
              </div>
              <div className="mono text-[0.55rem] sm:text-[0.65rem] text-white/40 uppercase">
                {b.label}
              </div>
            </div>
            {i < blocks.length - 1 && (
              <span
                className={`mono text-white/30 text-lg ${
                  i >= 1 ? "max-[359px]:hidden" : ""
                }`}
              >
                ·
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Stats grid cell: label + value aligned with other `.stat-block` columns. */
export function PhaseCountdownStat({ phase: phaseFromApi }: { phase?: Phase }) {
  const { phase, msLeft, mounted } = useCountdownTarget(phaseFromApi);
  const label = phaseStatBlockLabel(phase);
  const value = phaseStatBlockValue(phase, msLeft);

  return (
    <>
      <span className="value">
        {!mounted ? (
          <span className="stat-value-skeleton !w-[min(5.5rem,46vw)]" aria-hidden />
        ) : (
          value
        )}
      </span>
      <span className="label">{label}</span>
    </>
  );
}
