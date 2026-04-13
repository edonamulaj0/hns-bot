export function isAdmin(interaction: any, adminRoleId: string): boolean {
  const roles: string[] = interaction?.member?.roles ?? [];
  return roles.includes(adminRoleId);
}
