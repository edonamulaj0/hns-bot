/** Canonical challenge / submission track values in D1 (uppercase). */
export const TRACK_DEVELOPER = "DEVELOPER" as const;
export const TRACK_HACKER = "HACKER" as const;
export const TRACK_DESIGNERS = "DESIGNERS" as const;

export const TRACK_VALUES = [TRACK_DEVELOPER, TRACK_HACKER, TRACK_DESIGNERS] as const;
export type TrackValue = (typeof TRACK_VALUES)[number];

export const DELIVERABLE_IMAGE_EXPORT = "IMAGE_EXPORT" as const;

export function normalizeTrackParam(raw: string | null | undefined): TrackValue | null {
  const u = (raw ?? "").trim().toUpperCase();
  if (u === "DESIGNER" || u === "DESIGN" || u === "DESIGNERS" || u === "GRAPHIC") return TRACK_DESIGNERS;
  if (u === TRACK_DEVELOPER || u === "DEV" || u === "DEVELOPERS") return TRACK_DEVELOPER;
  if (u === TRACK_HACKER || u === "HACKERS") return TRACK_HACKER;
  return null;
}

export function trackLabel(track: string): string {
  if (track === TRACK_HACKER) return "Hacker";
  if (track === TRACK_DESIGNERS) return "Designer";
  return "Developer";
}

export function trackBadge(track: string): string {
  if (track === TRACK_HACKER) return "Hacker";
  if (track === TRACK_DESIGNERS) return "Design";
  return "Developer";
}
