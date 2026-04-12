export type Phase = "BUILD" | "VOTE" | "PUBLISH" | "POST_PUBLISH";

export function monthKey(date = new Date()): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function getMonthlyPhase(date = new Date()): Phase {
  const day = date.getUTCDate();
  if (day >= 1 && day <= 21) return "BUILD";
  if (day >= 22 && day <= 29) return "VOTE";
  if (day === 30) return "PUBLISH";
  return "POST_PUBLISH";
}
