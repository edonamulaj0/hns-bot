import { PrismaClient } from "@prisma/client/edge";
import { PrismaD1 } from "@prisma/adapter-d1";
import type { WorkerBindings } from "./worker-env";

/**
 * Creates a PrismaClient connected to D1 for Cloudflare Workers.
 * This is the single source of truth for Prisma instantiation.
 */
export function getPrisma(db: WorkerBindings["DB"]) {
  return new PrismaClient({ adapter: new PrismaD1(db) });
}