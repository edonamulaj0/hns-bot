/**
 * Challenge calendar uses a fixed UTC+2 civil month/day (no DST).
 * Must stay aligned with `src/time.ts` on the bot Worker.
 */
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

export function communityMonthKey(date = new Date()): string {
  const { year, monthIndex } = getCommunityCalendarParts(date);
  const month = String(monthIndex + 1).padStart(2, "0");
  return `${year}-${month}`;
}
