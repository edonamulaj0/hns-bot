# H4ck&Stack (`hns-bot`)

Monorepo for **[H4ck&Stack](https://h4cknstack.com)** — a Discord-first community platform for monthly build challenges (developer, hacker, and design tracks), member profiles, XP and leaderboards, voting, blogs, and public portfolios. The **Discord bot** is the operational hub; the **website** is the member-facing surface; both share one **D1** database and coordinate through a **REST API** on the bot Worker.

## What this codebase does

- **Discord (discord-hono on Cloudflare Workers)** — Slash commands (`/profile`, `/pulse`, `/leaderboard`, `/help`, enrollment, GitHub link/unlink, admin tools), interactive buttons for challenge enrollment and admin flows, scheduled cron jobs (challenge lifecycle, vote feeds, publishing), and optional **Queues** for long-running work (e.g. challenge generation outside interaction timeouts).
- **HTTP API (`/api/*`)** — Same Worker serves JSON endpoints used by the site: profiles, challenges, enrollments, submissions, votes, blogs, activity feeds, admin submission review, R2-backed media, etc. `GET /` returns a small discovery JSON listing route prefixes (not the full OpenAPI spec).
- **Auth Worker (`auth/`)** — Discord OAuth, session cookie (`hns_session`), `/auth/*` routes; must agree with the bot Worker on **`SESSION_SECRET`** and guild/client configuration.
- **Website (`website/`)** — Next.js app (Cloudflare Pages): challenges, submit flow, voting, member hub, public profiles, settings, blog, activity — calling the bot Worker API via configured public URLs.
- **Wiki (`hns-wiki/`)** — VitePress documentation/wiki (separate Pages deploy; FMHY-derived fork). Optional relative to core bot + site.

Data lives in **Cloudflare D1** via **Prisma** (`prisma/schema.prisma`): users, challenges, enrollments, submissions, votes, blogs, pulse awards, pipeline config flags, etc. **R2** stores submission-related uploads where applicable.

For production URLs, secrets, D1 migration, routing `/auth/*` and `/hns-api/*`, and Pages env vars, see **[DEPLOY.md](./DEPLOY.md)**.

## Repository layout

| Path | Role |
|------|------|
| `src/` | Bot Worker: Discord app, `api.ts` + `rest-handlers.ts`, commands, cron, GitHub OAuth callback, queues, role/points logic |
| `prisma/` | Schema and migrations for D1 |
| `website/` | Next.js frontend + its Wrangler/Pages config |
| `auth/` | OAuth session Worker |
| `hns-wiki/` | VitePress wiki (optional deploy) |
| `DEPLOY.md` | Full deployment checklist (Workers, Pages, DNS, Discord redirects) |

Root **`package.json`** scripts: `npm run register` (Discord command registration), `npm run deploy` (bot Worker). The website and wiki have their own `package.json` files.

## Local development (overview)

- Requires Node **20+**, `wrangler login`, and Discord application credentials (bot + OAuth2) as in **DEPLOY.md**.
- Copy env examples from **`website/.env.example`** and configure Workers per **DEPLOY.md** § secrets/vars.
- After schema changes: apply Prisma migrations against your D1 binding as documented in **DEPLOY.md**.

---

## Bot permissions

The Discord bot needs:

- `MANAGE_ROLES` (create + assign XP roles)
- `SEND_MESSAGES`
- `EMBED_LINKS`
- `CREATE_PUBLIC_THREADS`
- `SEND_MESSAGES_IN_THREADS`
- `READ_MESSAGE_HISTORY`
- `ADD_REACTIONS`

### Role hierarchy

The bot role must sit **above** the XP roles it creates and assigns:

- `🌱 Newcomer`
- `⚡ Builder`
- `🔥 Veteran`
- `💎 Elite`

Server owners should order roles in **Server Settings → Roles** so the bot can assign them; Discord does not allow bots to manage roles ranked higher than the bot’s role.

### Environment alignment

Set **`DISCORD_GUILD_ID`** (and related Discord IDs) consistently on the bot Worker, auth Worker, and site env vars. **`NEXT_PUBLIC_API_URL`** on Pages must be the full URL of the bot Worker API base; without it, the site’s API calls fail and pages may load empty or spin indefinitely.

---

## Further reading

- **[DEPLOY.md](./DEPLOY.md)** — Cloudflare Workers, D1, Pages, auth routing, wiki, smoke tests.
