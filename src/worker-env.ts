import type { D1Database } from "@cloudflare/workers-types";

export type WorkerBindings = {
  DB: D1Database;
  ADMIN_CHANNEL_ID: string;
  VOTING_CHANNEL_ID: string;
  BLOG_CHANNEL_ID: string;  // Required: channel for blog post announcements
  GITHUB_TOKEN?: string;      // Optional: raises GitHub API rate limit from 60 to 5000 req/hr
  DISCORD_TOKEN: string;
  DISCORD_PUBLIC_KEY: string;
  DISCORD_APPLICATION_ID: string;
};

export type HonoWorkerEnv = {
  Bindings: WorkerBindings;
};
