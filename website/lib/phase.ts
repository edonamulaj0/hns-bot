/** Mirrors `src/time.ts` getMonthlyPhase — UTC calendar days. */

export type Phase =
  | "BUILD"
  | "VOTE"
  | "REVIEW"
  | "PUBLISH"
  | "POST_PUBLISH";

export function getMonthlyPhase(date = new Date()): Phase {
  const day = date.getUTCDate();
  if (day >= 1 && day <= 21) return "BUILD";
  if (day >= 22 && day <= 25) return "VOTE";
  if (day >= 26 && day <= 28) return "REVIEW";
  if (day === 29) return "PUBLISH";
  return "POST_PUBLISH";
}

export function utcLastDayOfMonth(y: number, monthIndex: number): number {
  return new Date(Date.UTC(y, monthIndex + 1, 0)).getUTCDate();
}

/** Next instant when the monthly phase changes (UTC). */
export function getNextPhaseTransitionAt(now = new Date()): Date {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const phase = getMonthlyPhase(now);
  const nextMonthStart = new Date(Date.UTC(y, m + 1, 1, 0, 0, 0, 0));

  if (phase === "BUILD") {
    return new Date(Date.UTC(y, m, 22, 0, 0, 0, 0));
  }
  if (phase === "VOTE") {
    return new Date(Date.UTC(y, m, 26, 0, 0, 0, 0));
  }
  if (phase === "REVIEW") {
    return new Date(Date.UTC(y, m, 29, 0, 0, 0, 0));
  }
  if (phase === "PUBLISH") {
    return new Date(Date.UTC(y, m, 30, 0, 0, 0, 0));
  }
  return nextMonthStart;
}

export function splitDuration(ms: number): {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
} {
  let s = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(s / 86400);
  s -= days * 86400;
  const hours = Math.floor(s / 3600);
  s -= hours * 3600;
  const minutes = Math.floor(s / 60);
  const seconds = s - minutes * 60;
  return { days, hours, minutes, seconds };
}

export function phaseCountdownHeadline(phase: Phase, msLeft: number): string {
  const { days, hours, minutes } = splitDuration(msLeft);
  const dh =
    days > 0
      ? `${days} day${days === 1 ? "" : "s"} ${hours} hour${hours === 1 ? "" : "s"}`
      : hours > 0
        ? `${hours} hour${hours === 1 ? "" : "s"} ${minutes} min`
        : `${minutes} min`;

  if (phase === "BUILD") return `Submissions close in ${dh}`;
  if (phase === "VOTE") return `Voting closes in ${dh}`;
  if (phase === "REVIEW") return `Admin review ends in ${dh}`;
  if (phase === "PUBLISH") return "Publishing today";
  return `New cycle starts in ${dh}`;
}

/** Stat grid: fixed label under `.stat-block .label` (phase timing context). */
export function phaseStatBlockLabel(phase: Phase): string {
  switch (phase) {
    case "BUILD":
      return "Days left in BUILD";
    case "VOTE":
      return "Days left in VOTE";
    case "REVIEW":
      return "Days left in REVIEW";
    case "PUBLISH":
      return "Publish day";
    case "POST_PUBLISH":
      return "Until BUILD";
    default:
      return "Phase";
  }
}

/** Stat grid: countdown value from `msLeft` (same clock as `getNextPhaseTransitionAt`). */
export function phaseStatBlockValue(phase: Phase, msLeft: number): string {
  const { days, hours, minutes } = splitDuration(msLeft);
  if (phase === "PUBLISH") {
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }
  if (phase === "POST_PUBLISH") {
    if (days > 0) return `${days} day${days === 1 ? "" : "s"}`;
    if (hours > 0) return `${hours} hour${hours === 1 ? "" : "s"}`;
    return `${minutes} min`;
  }
  if (days > 0) return `${days} day${days === 1 ? "" : "s"}`;
  if (hours > 0) return `${hours} hour${hours === 1 ? "" : "s"}`;
  return `${minutes} min`;
}

/** One-line stat bar copy, e.g. "5 days left in BUILD". */
export function phaseStatLine(phase: Phase, msLeft: number): string {
  const { days, hours } = splitDuration(msLeft);
  if (phase === "PUBLISH") return "Publishing today · BUILD returns on the 1st";
  if (phase === "POST_PUBLISH") {
    return days > 0
      ? `${days} day${days === 1 ? "" : "s"} until BUILD`
      : `${hours}h until BUILD`;
  }
  if (phase === "BUILD") {
    return days > 0
      ? `${days} day${days === 1 ? "" : "s"} left in BUILD`
      : `${hours}h left in BUILD`;
  }
  if (phase === "VOTE") {
    return days > 0
      ? `${days} day${days === 1 ? "" : "s"} left in VOTE`
      : `${hours}h left in VOTE`;
  }
  if (phase === "REVIEW") {
    return days > 0
      ? `${days} day${days === 1 ? "" : "s"} left in REVIEW`
      : `${hours}h left in REVIEW`;
  }
  return "";
}
