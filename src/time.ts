export type Phase =
  | "BUILD"
  | "VOTE"
  | "REVIEW"
  | "PUBLISH"
  | "POST_PUBLISH";

export function monthKey(date = new Date()): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/** Linear scale from “so far this UTC month” to full month length (for pulse projections). */
export function monthEndLinearScale(date = new Date()): number {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth();
  const dayOfMonth = date.getUTCDate();
  const daysInMonth = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return daysInMonth / Math.max(dayOfMonth, 1);
}

/** Unified monthly calendar for Developer and Hacker tracks (UTC calendar days). */
export function getMonthlyPhase(date = new Date()): Phase {
  const day = date.getUTCDate();
  if (day >= 1 && day <= 21) return "BUILD";
  if (day >= 22 && day <= 25) return "VOTE";
  if (day >= 26 && day <= 28) return "REVIEW";
  if (day === 29) return "PUBLISH";
  return "POST_PUBLISH";
}
