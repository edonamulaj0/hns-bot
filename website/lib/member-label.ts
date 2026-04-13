import type { MemberSummary } from "./api";

/** Public label: API sends profile name or merged Discord login name. */
export function memberDisplayName(
  m: Pick<MemberSummary, "discordId"> & {
    displayName?: string | null;
  },
): string {
  const t = m.displayName?.trim();
  if (t) return t;
  return "—";
}
