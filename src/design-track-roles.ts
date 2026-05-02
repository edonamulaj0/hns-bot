import type { PrismaClient } from "@prisma/client/edge";
import { TRACK_DESIGNERS, TRACK_DEVELOPER, TRACK_HACKER } from "./tracks";

const CATEGORY_ROLE_NAMES = ["designer", "developer", "hacker"] as const;
const DIFFICULTY_ROLE_NAMES = ["beginner", "intermediate", "advanced"] as const;
const ENROLLMENT_ROLE_NAMES = [...CATEGORY_ROLE_NAMES, ...DIFFICULTY_ROLE_NAMES] as const;

type EnrollmentRoleName = (typeof ENROLLMENT_ROLE_NAMES)[number];

function normalizeDiscordRoleName(name: string): string {
  return name.trim().toLowerCase();
}

async function getExistingEnrollmentRoles(
  guildId: string,
  token: string,
): Promise<Map<EnrollmentRoleName, string>> {
  const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
    headers: { Authorization: `Bot ${token}` },
  });
  if (!res.ok) return new Map();
  const roles: Array<{ id: string; name: string }> = await res.json();
  const byName = new Map<EnrollmentRoleName, string>();
  for (const role of roles) {
    const normalized = normalizeDiscordRoleName(role.name);
    if ((ENROLLMENT_ROLE_NAMES as readonly string[]).includes(normalized)) {
      byName.set(normalized as EnrollmentRoleName, role.id);
    }
  }
  return byName;
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

const TRACK_TO_CATEGORY_ROLE: Record<string, EnrollmentRoleName> = {
  [TRACK_DEVELOPER]: "developer",
  [TRACK_HACKER]: "hacker",
  [TRACK_DESIGNERS]: "designer",
};

function difficultyRoleForTier(tier: string): EnrollmentRoleName | null {
  const normalized = tier.trim().toLowerCase();
  if ((DIFFICULTY_ROLE_NAMES as readonly string[]).includes(normalized)) {
    return normalized as EnrollmentRoleName;
  }
  return null;
}

/** Assign existing category + difficulty roles for the selected challenge. Does not create Discord roles. */
export async function syncDesignEnrollmentRoles(
  _prisma: PrismaClient,
  discordUserId: string,
  challengeTrack: string,
  tier: string,
  guildId: string,
  botToken: string,
): Promise<void> {
  const roleMap = await getExistingEnrollmentRoles(guildId, botToken);
  const memberRes = await fetch(
    `https://discord.com/api/v10/guilds/${guildId}/members/${discordUserId}`,
    { headers: { Authorization: `Bot ${botToken}` } },
  );
  if (!memberRes.ok) return;
  const member: { roles: string[] } = await memberRes.json();
  const enrollmentRoleIds = new Set(roleMap.values());

  for (const roleId of member.roles) {
    if (enrollmentRoleIds.has(roleId)) {
      await removeRole(guildId, discordUserId, roleId, botToken);
    }
  }

  const categoryRole = TRACK_TO_CATEGORY_ROLE[challengeTrack];
  const categoryRoleId = categoryRole ? roleMap.get(categoryRole) : null;
  if (categoryRoleId) await assignRole(guildId, discordUserId, categoryRoleId, botToken);

  const difficultyRole = difficultyRoleForTier(tier);
  const difficultyRoleId = difficultyRole ? roleMap.get(difficultyRole) : null;
  if (difficultyRoleId) await assignRole(guildId, discordUserId, difficultyRoleId, botToken);
}
