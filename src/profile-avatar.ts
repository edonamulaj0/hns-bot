/** Stored values from DB / API (case-insensitive). Null/empty = auto. */
export type ProfileAvatarSource = "auto" | "github" | "discord";

export function normalizeProfileAvatarSource(raw: string | null | undefined): ProfileAvatarSource {
  const v = (raw ?? "").trim().toLowerCase();
  if (v === "github") return "github";
  if (v === "discord") return "discord";
  return "auto";
}

export function githubAvatarUrl(
  githubUrl: string | null | undefined,
  size: 64 | 128 | 256,
): string | null {
  if (!githubUrl?.trim()) return null;
  const match = githubUrl.trim().match(/github\.com\/([^/?#\s]+)/i);
  return match ? `https://avatars.githubusercontent.com/${match[1]}?size=${size}` : null;
}

export function discordUserAvatarUrl(
  discordId: string,
  avatarHash: string | null | undefined,
  size: 64 | 128 | 256,
): string | null {
  const h = avatarHash?.trim();
  if (!h) return null;
  return `https://cdn.discordapp.com/avatars/${discordId}/${h}.png?size=${size}`;
}

export function discordDefaultAvatarUrl(discordId: string): string {
  const fallback = Number.parseInt(discordId.slice(-4), 10) % 6;
  return `https://cdn.discordapp.com/embed/avatars/${Number.isNaN(fallback) ? 0 : fallback}.png`;
}

/**
 * Public avatar URL: respects profileAvatarSource; falls back when the preferred source is missing.
 */
export function resolveProfileAvatarUrl(opts: {
  discordId: string;
  github: string | null | undefined;
  avatarHash: string | null | undefined;
  profileAvatarSource: string | null | undefined;
  size: 64 | 128 | 256;
}): string {
  const pref = normalizeProfileAvatarSource(opts.profileAvatarSource);
  const gh = githubAvatarUrl(opts.github, opts.size);
  const disc = discordUserAvatarUrl(opts.discordId, opts.avatarHash, opts.size);
  const fallback = discordDefaultAvatarUrl(opts.discordId);

  if (pref === "github") {
    return gh ?? disc ?? fallback;
  }
  if (pref === "discord") {
    return disc ?? gh ?? fallback;
  }
  return gh ?? disc ?? fallback;
}
