import type { PrismaClient } from "@prisma/client/edge";
import { decryptAccessTokenPayload } from "./session-verify";

export const JOIN_DISCORD_URL = "https://discord.gg/xrxTUsgdv9";

export type NotMemberError = { error: "not_member"; joinUrl: string };

/**
 * If user has a non-expired encrypted Discord token, verify they are still in the guild.
 * On failure returns not_member. On missing/expired token, returns ok (skip check).
 */
export async function requireGuildMembership(
  prisma: PrismaClient,
  discordId: string,
  env: {
    SESSION_SECRET?: string;
    DISCORD_GUILD_ID?: string;
  },
): Promise<NotMemberError | null> {
  const guildId = env.DISCORD_GUILD_ID?.trim();
  if (!guildId || !env.SESSION_SECRET?.trim()) return null;

  const user = await prisma.user.findUnique({
    where: { discordId },
    select: { accessToken: true, tokenExpiresAt: true },
  });
  if (!user?.accessToken) return null;

  const exp = user.tokenExpiresAt?.getTime() ?? 0;
  if (exp <= Date.now()) return null;

  const access = await decryptAccessTokenPayload(user.accessToken, env.SESSION_SECRET);
  if (!access) return null;

  const res = await fetch(
    `https://discord.com/api/v10/users/@me/guilds/${guildId}/member`,
    { headers: { Authorization: `Bearer ${access}` } },
  );

  if (res.status === 404) {
    return { error: "not_member", joinUrl: JOIN_DISCORD_URL };
  }
  return null;
}
