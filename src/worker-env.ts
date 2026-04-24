import type { D1Database, R2Bucket } from "@cloudflare/workers-types";

/**
 * Cloudflare Worker `env` — keep in sync with `wrangler.toml`:
 * - **D1:** `[[d1_databases]].binding = "DB"` (not under `[vars]`).
 * - **Plain `[vars]`:** channel/role/guild IDs, `BASE_URL`, `DISCORD_PUBLIC_KEY`,
 *   `DISCORD_APPLICATION_ID`, GitHub OAuth client id / `WORKER_PUBLIC_URL` when used.
 * - **Secrets** (`wrangler secret put …`): `DISCORD_TOKEN`, `SESSION_SECRET`, optional
 *   `GITHUB_TOKEN`, `CLAUDE_API_KEY`, `GITHUB_OAUTH_CLIENT_SECRET`, `GITHUB_LINK_SECRET`.
 */
export type WorkerBindings = {
  /** D1 database — `[[d1_databases]]` binding `DB`. */
  DB: D1Database;
  /** Optional R2 bucket for design image uploads (`POST /api/upload/design-image`). */
  SUBMISSIONS_BUCKET?: R2Bucket;
  /** Public website origin (no trailing slash), e.g. https://h4cknstack.com — used in Discord + cron copy. */
  BASE_URL?: string;
  /** Same secret as auth Worker; verifies `hns_session` and decrypts stored Discord tokens. Secret. */
  SESSION_SECRET?: string;
  /** Discord server id — membership re-check on authenticated API writes. */
  DISCORD_GUILD_ID: string;
  /** Anthropic API key for monthly challenge generation (day 1 cron). Optional secret. */
  CLAUDE_API_KEY?: string;

  ADMIN_CHANNEL_ID: string;
  VOTING_CHANNEL_ID: string;
  /** Community blog / article channel. Post via `sendBlogChannelMessage` in `discord-api.ts` (empty guard). */
  BLOG_CHANNEL_ID: string;
  /** Snowflake of the admin Discord role (slash-command gating, e.g. `/admin-health`). */
  ADMIN_ROLE_ID: string;
  /** Comma-separated Discord user IDs allowed for `/admin/submissions` and submission approve/reject API. */
  ADMIN_DISCORD_IDS?: string;
  DEVELOPER_CHALLENGES_CHANNEL_ID: string;
  HACKER_CHALLENGES_CHANNEL_ID: string;
  /** Optional — if unset, design briefs post to DEVELOPER_CHALLENGES_CHANNEL_ID. */
  DESIGN_CHALLENGES_CHANNEL_ID?: string;
  /** Optional secret — higher GitHub API rate limits / Search API for `/pulse`. */
  GITHUB_TOKEN?: string;
  GITHUB_OAUTH_CLIENT_ID?: string;
  GITHUB_OAUTH_CLIENT_SECRET?: string;
  WORKER_PUBLIC_URL?: string;
  GITHUB_LINK_SECRET?: string;
  /** Bot token. Secret — never commit. */
  DISCORD_TOKEN: string;
  /** From Discord Developer Portal → General Information. Safe in `[vars]`. */
  DISCORD_PUBLIC_KEY: string;
  /** Application id (snowflake). Safe in `[vars]`. */
  DISCORD_APPLICATION_ID: string;
};

export type HonoWorkerEnv = {
  Bindings: WorkerBindings;
};
