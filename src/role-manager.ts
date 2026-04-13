import type { PrismaClient } from "@prisma/client/edge";
import { XP_ROLES, getRoleForXp, type RoleKey } from "./roles";

let rolesInitialized = false;

async function getCachedRoleIds(
  prisma: PrismaClient,
  guildId: string,
): Promise<Map<RoleKey, string>> {
  const rows = await prisma.roleMapping.findMany({ where: { guildId } });
  const map = new Map<RoleKey, string>();
  for (const row of rows) {
    if (XP_ROLES.some((r) => r.key === row.key)) {
      map.set(row.key as RoleKey, row.roleId);
    }
  }
  return map;
}

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
  if (!res.ok) throw new Error(`Failed to create role: ${await res.text()}`);
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

function getNextTierDescription(currentKey: RoleKey): string {
  const tiers: Record<RoleKey, string> = {
    newcomer: "Reach 100 XP for ⚡ Builder",
    builder: "Reach 500 XP for 🔥 Veteran",
    veteran: "Reach 1500 XP for 💎 Elite",
    elite: "",
  };
  return tiers[currentKey];
}

async function sendRoleUpgradeDm(
  discordId: string,
  role: (typeof XP_ROLES)[number],
  totalXp: number,
  token: string,
): Promise<void> {
  try {
    const dmRes = await fetch("https://discord.com/api/v10/users/@me/channels", {
      method: "POST",
      headers: {
        Authorization: `Bot ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ recipient_id: discordId }),
    });
    if (!dmRes.ok) return;
    const dm: { id: string } = await dmRes.json();

    await fetch(`https://discord.com/api/v10/channels/${dm.id}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bot ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        embeds: [
          {
            title: `${role.emoji} You've been promoted to ${role.name}!`,
            description:
              `You've reached **${totalXp} XP** on H4cknStack.\n\n` +
              "Keep building, sharing, and contributing to climb higher.",
            color: role.color,
            fields:
              role.key !== "elite"
                ? [
                    {
                      name: "Next tier",
                      value: getNextTierDescription(role.key),
                      inline: false,
                    },
                  ]
                : [
                    {
                      name: "🏆 Maximum rank reached",
                      value: "You're at the top. Legend.",
                      inline: false,
                    },
                  ],
            footer: { text: "H4cknStack · XP Leaderboard at hns.gg/members" },
          },
        ],
      }),
    });
  } catch {
    // DMs can be closed; ignore silently.
  }
}

export async function ensureRolesExist(
  prisma: PrismaClient,
  guildId: string,
  botToken: string,
): Promise<Map<RoleKey, string>> {
  if (rolesInitialized) return getCachedRoleIds(prisma, guildId);

  const roleMap = new Map<RoleKey, string>();

  for (const roleDef of XP_ROLES) {
    const stored = await prisma.roleMapping.findUnique({
      where: { key: roleDef.key },
    });

    if (stored) {
      const exists = await verifyRoleExists(stored.roleId, guildId, botToken);
      if (exists) {
        roleMap.set(roleDef.key, stored.roleId);
        continue;
      }
    }

    const created = await createDiscordRole(guildId, botToken, {
      name: `${roleDef.emoji} ${roleDef.name}`,
      color: roleDef.color,
      hoist: roleDef.hoist,
      mentionable: false,
      permissions: "0",
    });

    await prisma.roleMapping.upsert({
      where: { key: roleDef.key },
      create: { key: roleDef.key, roleId: created.id, guildId },
      update: { roleId: created.id, guildId },
    });

    roleMap.set(roleDef.key, created.id);
  }

  rolesInitialized = true;
  return roleMap;
}

export async function syncUserRole(
  prisma: PrismaClient,
  discordId: string,
  currentXp: number,
  guildId: string,
  botToken: string,
): Promise<void> {
  const roleMap = await ensureRolesExist(prisma, guildId, botToken);
  const targetRole = getRoleForXp(currentXp);
  const targetRoleId = roleMap.get(targetRole.key);
  if (!targetRoleId) return;

  const memberRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${discordId}`, {
    headers: { Authorization: `Bot ${botToken}` },
  });
  if (!memberRes.ok) return;

  const member: { roles: string[] } = await memberRes.json();
  const allXpRoleIds = [...roleMap.values()];

  for (const roleId of member.roles) {
    if (allXpRoleIds.includes(roleId) && roleId !== targetRoleId) {
      await removeRole(guildId, discordId, roleId, botToken);
    }
  }

  if (!member.roles.includes(targetRoleId)) {
    await assignRole(guildId, discordId, targetRoleId, botToken);
    const wasNew = !member.roles.some((id) => allXpRoleIds.includes(id));
    if (!wasNew) {
      await sendRoleUpgradeDm(discordId, targetRole, currentXp, botToken);
    }
  }
}

export async function syncAllRoles(c: any, prisma: PrismaClient): Promise<number> {
  const users = await prisma.user.findMany({
    select: { discordId: true, points: true },
    orderBy: { points: "desc" },
  });

  for (const user of users) {
    await syncUserRole(
      prisma,
      user.discordId,
      user.points,
      c.env.DISCORD_GUILD_ID,
      c.env.DISCORD_TOKEN,
    );
    await new Promise((r) => setTimeout(r, 250));
  }
  return users.length;
}
