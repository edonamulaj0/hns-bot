import { communityMonthKey } from "@/lib/community-calendar";

/** Calendar month key `YYYY-MM` — UTC+2 challenge calendar (matches bot Worker `monthKey`). */
export function getMonthKey(date = new Date()): string {
  return communityMonthKey(date);
}
