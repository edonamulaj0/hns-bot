import type { D1Database } from "@cloudflare/workers-types";

export type WorkerBindings = {
  DB: D1Database;
  ADMIN_CHANNEL_ID: string;
  VOTING_CHANNEL_ID: string;
  BLOG_CHANNEL_ID: string; // Required: channel for blog post announcements
  GITHUB_TOKEN?: string; // Optional: server token for public Search/events pulse fallback
  /** OAuth app Client ID (public). */
  GITHUB_OAUTH_CLIENT_ID?: string;
  /** OAuth app Client Secret. */
  GITHUB_OAUTH_CLIENT_SECRET?: string;
  /**
   * Base URL of this Worker (no trailing slash), e.g. https://hns-bot.xxx.workers.dev
   * Used for OAuth redirect_uri = {WORKER_PUBLIC_URL}/oauth/github/callback
   */
  WORKER_PUBLIC_URL?: string;
  /**
   * Secret used to AES-GCM-encrypt stored GitHub user tokens (any long random string).
   * Required to use /link-github.
   */
  GITHUB_LINK_SECRET?: string;
  DISCORD_TOKEN: string;
  DISCORD_PUBLIC_KEY: string;
  DISCORD_APPLICATION_ID: string;
};

export type HonoWorkerEnv = {
  Bindings: WorkerBindings;
};
