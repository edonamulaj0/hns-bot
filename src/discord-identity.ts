import type { PrismaClient } from "@prisma/client/edge";

type IdentityInteraction = {
  member?: { user?: { username?: string; global_name?: string | null } };
  user?: { username?: string; global_name?: string | null };
};

export async function syncDiscordIdentity(
  prisma: PrismaClient,
  discordId: string,
  interaction: IdentityInteraction,
): Promise<void> {
  const username =
    interaction?.member?.user?.username ?? interaction?.user?.username;
  if (!username) return;
  const globalName =
    interaction?.member?.user?.global_name ??
    interaction?.user?.global_name ??
    null;
  await prisma.user.upsert({
    where: { discordId },
    create: {
      discordId,
      discordUsername: username,
      displayName: globalName ?? username,
    },
    update: {
      discordUsername: username,
      displayName: globalName ?? username,
    },
  });
}
