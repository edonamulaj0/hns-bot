import type { D1Database } from "@cloudflare/workers-types";

export type WorkerBindings = {
  DB: D1Database;
  /** Public website origin (no trailing slash), e.g. https://h4cknstack.com — used in Discord + cron copy. */
  BASE_URL?: string;
  /** Same secret as auth Worker; verifies `hns_session` and decrypts stored Discord tokens. */
  SESSION_SECRET?: string;
  /** Discord server id — membership re-check on authenticated API writes. */
  DISCORD_GUILD_ID?: string;
  /** Anthropic API key for monthly challenge generation (day 1 cron). */
  CLAUDE_API_KEY?: string;

  ADMIN_CHANNEL_ID: string;
  VOTING_CHANNEL_ID: string;
  BLOG_CHANNEL_ID: string;
  /** Legacy: was used for /post-challenge (removed). */
  ADMIN_ROLE_ID: string;
  DEVELOPER_CHALLENGES_CHANNEL_ID: string;
  HACKER_CHALLENGES_CHANNEL_ID: string;
  GITHUB_TOKEN?: string;
  GITHUB_OAUTH_CLIENT_ID?: string;
  GITHUB_OAUTH_CLIENT_SECRET?: string;
  WORKER_PUBLIC_URL?: string;
  GITHUB_LINK_SECRET?: string;
  DISCORD_TOKEN: string;
  DISCORD_PUBLIC_KEY: string;
  DISCORD_APPLICATION_ID: string;
};

export type HonoWorkerEnv = {
  Bindings: WorkerBindings;
};
