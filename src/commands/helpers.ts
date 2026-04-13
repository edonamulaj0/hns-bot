import { Prisma } from "@prisma/client/edge";

/**
 * Shared helper functions for Discord command handling
 */

export function extractModalFields(interaction: any): Record<string, string> {
  const rows = interaction?.data?.components ?? [];
  const values: Record<string, string> = {};
  for (const row of rows) {
    for (const component of row?.components ?? []) {
      const customId = component?.custom_id;
      const value = component?.value;
      if (customId && typeof value === "string") values[customId] = value;
    }
  }
  return values;
}

export function getDiscordUserId(interaction: any): string | null {
  return interaction?.member?.user?.id ?? interaction?.user?.id ?? null;
}

export function parseTechStack(input?: string): string[] {
  if (!input) return [];
  return input.split(",").map((s) => s.trim()).filter(Boolean);
}

export function formatTechStackForModal(stored: Prisma.JsonValue | null | undefined): string {
  if (stored == null) return "";
  if (Array.isArray(stored)) return stored.map(String).join(", ");
  if (typeof stored === "string") return stored;
  return "";
}

/** Stored JSON tech stack → string list */
export function formatTechStackList(stored: Prisma.JsonValue | null | undefined): string[] {
  if (stored == null) return [];
  if (Array.isArray(stored)) return stored.map(String);
  if (typeof stored === "string") return [stored];
  return [];
}

export function truncatePrefill(text: string, maxLen: number): string {
  return text.length <= maxLen ? text : text.slice(0, maxLen);
}

export function normalizeProfileString(raw: string | undefined): string | null {
  const t = (raw ?? "").trim();
  return t === "" ? null : t;
}

export function profilePayloadFromModal(fields: Record<string, string>) {
  const bio = normalizeProfileString(fields.about_me);
  const github = normalizeProfileString(fields.github);
  const linkedin = normalizeProfileString(fields.linkedin);
  const techStackList = parseTechStack(fields.tech_stack);
  const techStack: Prisma.InputJsonValue | typeof Prisma.DbNull =
    techStackList.length > 0 ? [...techStackList] : Prisma.DbNull;
  return { bio, github, linkedin, techStack };
}
