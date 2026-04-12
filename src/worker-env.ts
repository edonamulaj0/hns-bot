import type { D1Database } from "@cloudflare/workers-types";

export type WorkerBindings = {
  DB: D1Database;
  ADMIN_CHANNEL_ID: string;
  VOTING_CHANNEL_ID: string;
  DISCORD_TOKEN: string;
  DISCORD_PUBLIC_KEY: string;
  DISCORD_APPLICATION_ID: string;
};

export type HonoWorkerEnv = {
  Bindings: WorkerBindings;
};
