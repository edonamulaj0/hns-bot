import type { PrismaClient } from "@prisma/client/edge";

/** Single-row cron / pipeline flags (D1). */
export async function getConfig(prisma: PrismaClient) {
  let config = await prisma.config.findFirst();
  if (!config) {
    config = await prisma.config.create({ data: {} });
  }
  return config;
}

export async function setConfig(
  prisma: PrismaClient,
  configId: string,
  data: {
    lastChallengeMonth?: string | null;
    lastVoteFeedMonth?: string | null;
    lastPublishMonth?: string | null;
    lastChallengeGenError?: string | null;
  },
): Promise<void> {
  await prisma.config.update({
    where: { id: configId },
    data,
  });
}
