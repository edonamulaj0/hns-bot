export type Phase =
  | "BUILD"
  | "VOTE"
  | "REVIEW"
  | "PUBLISH"
  | "POST_PUBLISH";

/** Fixed UTC+2 civil calendar for challenges, cron day checks, and month keys (no DST). */
export const COMMUNITY_CALENDAR_UTC_OFFSET_HOURS = 2 as const;
export const COMMUNITY_CALENDAR_UTC_OFFSET_MS =
  COMMUNITY_CALENDAR_UTC_OFFSET_HOURS * 60 * 60 * 1000;

export function getCommunityCalendarParts(date: Date | number = new Date()): {
  year: number;
  monthIndex: number;
  day: number;
} {
  const t = typeof date === "number" ? date : date.getTime();
  const shifted = new Date(t + COMMUNITY_CALENDAR_UTC_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    monthIndex: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
  };
}

/** Instant when the community calendar rolls to this civil date at 00:00 (UTC+2). */
export function communityMidnightUtc(year: number, monthIndex: number, day: number): Date {
  return new Date(Date.UTC(year, monthIndex, day, 0, 0, 0, 0) - COMMUNITY_CALENDAR_UTC_OFFSET_MS);
}

export function monthKey(date = new Date()): string {
  const { year, monthIndex } = getCommunityCalendarParts(date);
  const month = String(monthIndex + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/** YYYY-MM-DD of the 1st of the next challenge calendar month — next build window start label. */
export function nextCommunityMonthFirstDateString(date = new Date()): string {
  const { year: y, monthIndex: m } = getCommunityCalendarParts(date);
  const nm = m === 11 ? 0 : m + 1;
  const ny = m === 11 ? y + 1 : y;
  return `${ny}-${String(nm + 1).padStart(2, "0")}-01`;
}

/** @deprecated Use `nextCommunityMonthFirstDateString`. */
export const nextUtcMonthFirstDateString = nextCommunityMonthFirstDateString;

/** Linear scale from progress through the current UTC+2 calendar month (pulse projections). */
export function monthEndLinearScale(date = new Date()): number {
  const { year: y, monthIndex: m, day: dayOfMonth } = getCommunityCalendarParts(date);
  const daysInMonth = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return daysInMonth / Math.max(dayOfMonth, 1);
}

/** Unified monthly calendar for all tracks (UTC+2 civil calendar days). */
export function getMonthlyPhase(date = new Date()): Phase {
  const { day } = getCommunityCalendarParts(date);
  if (day >= 1 && day <= 21) return "BUILD";
  if (day >= 22 && day <= 25) return "VOTE";
  if (day >= 26 && day <= 28) return "REVIEW";
  if (day === 29) return "PUBLISH";
  return "POST_PUBLISH";
}
