/** Normalize stored GitHub profile (URL or bare username) to an https href. */
export function githubProfileHref(
  github: string | null | undefined,
): string | null {
  if (!github) return null;
  const t = github.trim();
  if (!t) return null;
  if (/^https?:\/\//i.test(t)) return t;
  return `https://github.com/${t.replace(/^@/, "")}`;
}

/** Ensure social / article links open correctly when missing a scheme. */
export function ensureAbsoluteUrl(
  raw: string | null | undefined,
): string | null {
  if (!raw) return null;
  const t = raw.trim();
  if (!t) return null;
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t.replace(/^\/+/, "")}`;
}
