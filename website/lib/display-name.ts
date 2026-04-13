export const PUBLIC_DISPLAY_NAME_MAX = 80;

export function splitPublicDisplayName(raw: string | null | undefined): {
  first: string;
  last: string;
} {
  const t = (raw ?? "").trim().replace(/\s+/g, " ");
  if (!t) return { first: "", last: "" };
  const space = t.indexOf(" ");
  if (space === -1) return { first: t, last: "" };
  return { first: t.slice(0, space), last: t.slice(space + 1) };
}

export function joinPublicDisplayName(first: string, last: string): string {
  return `${first.trim()} ${last.trim()}`.trim();
}

/** Same as worker: profile name, else Discord login name (for UI before API merge). */
export function mergedPublicDisplayName(
  profileDisplayName: string | null | undefined,
  discordUsername: string | null | undefined,
): string | null {
  const p = profileDisplayName?.trim();
  if (p) return p;
  const d = discordUsername?.trim();
  return d || null;
}

export function validatePublicDisplayName(value: string): string | null {
  const v = value.trim().replace(/\s+/g, " ");
  if (!v) return "Enter a name.";
  if (v.length > PUBLIC_DISPLAY_NAME_MAX) {
    return `Max ${PUBLIC_DISPLAY_NAME_MAX} characters.`;
  }
  if (/[@#]/.test(v)) return "Don’t use @ or # in your name.";
  const parts = v.split(" ").filter(Boolean);
  for (const p of parts) {
    if (p.length > 40) return "Each name part is too long.";
  }
  return null;
}
