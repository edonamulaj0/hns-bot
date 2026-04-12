import type { MemberSummary } from "./api";

/** Prefer Discord display name / @handle over numeric id tail. */
export function memberDisplayName(m: Pick<MemberSummary, "discordId"> & {
  discordUsername?: string | null;
  displayName?: string | null;
}): string {
  if (m.displayName?.trim()) return m.displayName.trim();
  if (m.discordUsername?.trim()) return `@${m.discordUsername.trim()}`;
  return `@${m.discordId.slice(-6)}`;
}
