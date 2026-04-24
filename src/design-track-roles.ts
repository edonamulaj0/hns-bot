import type { PrismaClient } from "@prisma/client/edge";
import { TRACK_DESIGNERS } from "./tracks";

/** RoleMapping keys + Discord role names (without emoji in DB name for design set). */
export const DESIGN_ROLE_DEFS = [
  { key: "designer", name: "Designer", color: 0xd85a30, hoist: false },
  { key: "design_beginner", name: "Design Beginner", color: 0xd85a30, hoist: false },
  { key: "design_intermediate", name: "Design Intermediate", color: 0xd85a30, hoist: false },
  { key: "design_advanced", name: "Design Advanced", color: 0xd85a30, hoist: false },
  { key: "design_winner", name: "Design Winner", color: 0xd85a30, hoist: true },
] as const;

export type DesignRoleKey = (typeof DESIGN_ROLE_DEFS)[number]["key"];

async function createDiscordRole(
  guildId: string,
  token: string,
  payload: object,
): Promise<{ id: string }> {
  const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
    method: "POST",
    headers: {
      Authorization: `Bot ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Failed to create design role: ${await res.text()}`);
  return res.json();
}

async function verifyRoleExists(
  roleId: string,
  guildId: string,
  token: string,
): Promise<boolean> {
  const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
    headers: { Authorization: `Bot ${token}` },
  });
  if (!res.ok) return false;
  const roles: Array<{ id: string }> = await res.json();
  return roles.some((r) => r.id === roleId);
}

export async function ensureDesignRolesExist(
  prisma: PrismaClient,
  guildId: string,
  botToken: string,
): Promise<Map<DesignRoleKey, string>> {
  const map = new Map<DesignRoleKey, string>();
  for (const def of DESIGN_ROLE_DEFS) {
    const stored = await prisma.roleMapping.findUnique({ where: { key: def.key } });
    if (stored) {
      const ok = await verifyRoleExists(stored.roleId, guildId, botToken);
      if (ok) {
        map.set(def.key, stored.roleId);
        continue;
      }
    }
    const created = await createDiscordRole(guildId, botToken, {
      name: def.name,
      color: def.color,
      hoist: def.hoist,
      mentionable: false,
      permissions: "0",
    });
    await prisma.roleMapping.upsert({
      where: { key: def.key },
      create: { key: def.key, roleId: created.id, guildId },
      update: { roleId: created.id, guildId },
    });
    map.set(def.key, created.id);
  }
  return map;
}

async function assignRole(
  guildId: string,
  userId: string,
  roleId: string,
  token: string,
): Promise<void> {
  await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}/roles/${roleId}`, {
    method: "PUT",
    headers: { Authorization: `Bot ${token}` },
  });
}

async function removeRole(
  guildId: string,
  userId: string,
  roleId: string,
  token: string,
): Promise<void> {
  await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}/roles/${roleId}`, {
    method: "DELETE",
    headers: { Authorization: `Bot ${token}` },
  });
}

const TIER_TO_DESIGN_KEY: Record<string, DesignRoleKey> = {
  beginner: "design_beginner",
  intermediate: "design_intermediate",
  advanced: "design_advanced",
};

/** Remove other design tier roles; assign Designer + tier for DESIGNERS track. */
export async function syncDesignEnrollmentRoles(
  prisma: PrismaClient,
  discordUserId: string,
  challengeTrack: string,
  tier: string,
  guildId: string,
  botToken: string,
): Promise<void> {
  const roleMap = await ensureDesignRolesExist(prisma, guildId, botToken);
  const memberRes = await fetch(
    `https://discord.com/api/v10/guilds/${guildId}/members/${discordUserId}`,
    { headers: { Authorization: `Bot ${botToken}` } },
  );
  if (!memberRes.ok) return;
  const member: { roles: string[] } = await memberRes.json();
  const designRoleIds = new Set(roleMap.values());

  for (const roleId of member.roles) {
    if (designRoleIds.has(roleId)) {
      await removeRole(guildId, discordUserId, roleId, botToken);
    }
  }

  if (challengeTrack !== TRACK_DESIGNERS) return;

  const designerId = roleMap.get("designer");
  if (designerId) await assignRole(guildId, discordUserId, designerId, botToken);

  const tierKey = TIER_TO_DESIGN_KEY[tier.trim().toLowerCase()];
  if (tierKey) {
    const tid = roleMap.get(tierKey);
    if (tid) await assignRole(guildId, discordUserId, tid, botToken);
  }
}

export async function assignDesignWinnerRole(
  prisma: PrismaClient,
  discordUserId: string,
  guildId: string,
  botToken: string,
): Promise<void> {
  const roleMap = await ensureDesignRolesExist(prisma, guildId, botToken);
  const wid = roleMap.get("design_winner");
  if (wid) await assignRole(guildId, discordUserId, wid, botToken);
}
