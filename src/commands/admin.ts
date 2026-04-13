export function getInteractionRoleIds(interaction: any): string[] {
  const raw = interaction?.member?.roles;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((role) => (typeof role === "string" ? role.trim() : String(role ?? "").trim()))
    .filter(Boolean);
}

export function isAdmin(interaction: any, adminRoleId: string): boolean {
  const expected = (adminRoleId ?? "").trim();
  if (!expected) return false;
  const roles = getInteractionRoleIds(interaction);
  return roles.includes(expected);
}
