import { PrismaClient } from "@prisma/client/edge";
import { PrismaD1 } from "@prisma/adapter-d1";
import type { WorkerBindings } from "./worker-env";

/**
 * Creates a PrismaClient connected to D1 for Cloudflare Workers.
 * Return type is explicit so `adapter` inference still exposes every model delegate (e.g. `challengeGenPreview`).
 */
export function getPrisma(db: WorkerBindings["DB"]): PrismaClient {
  return new PrismaClient({ adapter: new PrismaD1(db) });
}

/** Uses chained delegates — avoids Prisma generic quirks when `getPrisma` is assigned to a variable after `ctx: any`. */
export async function deleteChallengeGenPreviewForDiscordUser(
  db: WorkerBindings["DB"],
  discordUserId: string,
) {
  return getPrisma(db).challengeGenPreview.deleteMany({
    where: { discordUserId },
  });
}

export async function findChallengeGenPreviewForDiscordUser(
  db: WorkerBindings["DB"],
  discordUserId: string,
) {
  return getPrisma(db).challengeGenPreview.findUnique({
    where: { discordUserId },
  });
}