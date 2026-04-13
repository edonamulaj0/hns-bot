export const PUBLIC_DISPLAY_NAME_MAX = 80;

/** Shown on the site when profile name is unset: Discord login name (no @). */
export function mergedPublicDisplayName(
  profileDisplayName: string | null | undefined,
  discordUsername: string | null | undefined,
): string | null {
  const p = profileDisplayName?.trim();
  if (p) return p;
  const d = discordUsername?.trim();
  return d || null;
}

/** One or more words; last name optional. No @/#. */
export function validatePublicDisplayName(value: string): string | null {
  const v = value.trim().replace(/\s+/g, " ");
  if (!v) return "Name cannot be empty.";
  if (v.length > PUBLIC_DISPLAY_NAME_MAX) {
    return `Name must be at most ${PUBLIC_DISPLAY_NAME_MAX} characters.`;
  }
  if (/[@#]/.test(v)) return "Do not use @ or # in your name.";
  const parts = v.split(" ").filter(Boolean);
  for (const p of parts) {
    if (p.length > 40) return "Each name part is too long.";
  }
  return null;
}
