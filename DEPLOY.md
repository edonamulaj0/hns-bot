# Deploying H4cknStack

This stack has **three Cloudflare pieces** plus **Discord**:

| Piece | Role |
|--------|------|
| **Website** (Cloudflare Pages) | Next.js app on your public domain |
| **Bot Worker** (`wrangler.toml` at repo root) | Discord interactions, cron, REST API under `/api/*` |
| **Auth Worker** (`auth/wrangler.toml`) | Discord OAuth, `hns_session` cookie, `/auth/*` |
| **D1** | Single SQLite database shared by both Workers |

The browser calls **same-origin** `/auth/*` and `/hns-api/*`. Those requests must reach the right Worker (see [Routing](#routing) below).

---

## 1. Prerequisites

- Node.js 20+
- [Wrangler](https://developers.cloudflare.com/workers/wrangler/install-and-update/) logged in (`wrangler login`)
- A Cloudflare zone (e.g. `hns.gg`) if you use a custom domain
- Discord application: **Bot** (token, public key, application id) + **OAuth2** (client id & secret)

---

## 2. D1 database

Create a database (once):

```bash
npx wrangler d1 create hns-bot-db
```

Copy the `database_id` into **both**:

- Root `wrangler.toml` → `[[d1_databases]]` `database_id`
- `auth/wrangler.toml` → same `database_id` (same DB for both Workers)

### Migrations

Incremental SQL lives in `migrations/` (`0001_init.sql` … `0009_*.sql`). Apply to **remote** D1 from the **repo root** (bot `wrangler.toml`):

```bash
npx wrangler d1 migrations apply hns-bot-db --remote
```

Use the **database name** (`database_name` in TOML), not only the binding. For a brand-new empty DB, you can instead follow `migrations-greenfield/README.md`.

Regenerate Prisma client after schema changes (if you use Prisma locally):

```bash
npx prisma generate
```

---

## 3. Discord Developer Portal

### OAuth2 (website sign-in)

- **Redirects**: `https://YOUR_DOMAIN/auth/callback` (must match the URL users hit; normally your **site** origin, routed to the auth Worker).
- Scopes: include what your auth Worker requests (typically `identify`, `guilds`, and **`guilds.members.read`** if you gate on server membership).

### Bot

- Enable **Privileged Gateway Intents** as required by your bot code.
- Install the bot to your guild; copy **Guild ID** into `DISCORD_GUILD_ID` (auth + bot vars) and `NEXT_PUBLIC_DISCORD_GUILD_ID` (website).

### Slash commands

After changing `src/register.ts`, register guild commands (needs `.env` with `DISCORD_APPLICATION_ID`, `DISCORD_TOKEN`, `DISCORD_TEST_GUILD_ID`):

```bash
npm run register
```

---

## 4. Secrets and vars

### Bot Worker (root)

**Secrets** (never commit):

```bash
npx wrangler secret put DISCORD_TOKEN
npx wrangler secret put SESSION_SECRET
# Optional:
npx wrangler secret put CLAUDE_API_KEY
npx wrangler secret put GITHUB_OAUTH_CLIENT_SECRET
npx wrangler secret put GITHUB_LINK_SECRET
```

**`SESSION_SECRET` must match** the auth Worker (same string), so both can verify or derive keys for the session and encrypted tokens.

**`[vars]`** in `wrangler.toml`: set `BASE_URL` (public site, no trailing slash), `DISCORD_GUILD_ID`, channel IDs, `DISCORD_PUBLIC_KEY`, `DISCORD_APPLICATION_ID`, etc.

### Auth Worker (`auth/`)

```bash
cd auth
npx wrangler secret put DISCORD_CLIENT_SECRET
npx wrangler secret put SESSION_SECRET
```

**`[vars]`**: `BASE_URL`, `DISCORD_GUILD_ID`, `DISCORD_CLIENT_ID`. Optional: `COOKIE_DOMAIN` (e.g. `.hns.gg`) so the session cookie is shared across subdomains if you split traffic that way.

### Website (Cloudflare Pages — environment variables)

Set at **build time** (and production runtime where applicable):

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_BASE_URL` | Public site origin; server auth fetch uses this for `/auth/me` |
| `NEXT_PUBLIC_API_URL` or `HNS_WORKER_URL` | Bot Worker origin (no trailing slash). **Required at build** so Next.js emits rewrites from `/hns-api/*` → Worker `/api/*` |
| `NEXT_PUBLIC_DISCORD_GUILD_ID` | Widget + UI |
| `NEXT_PUBLIC_DISCORD_CLIENT_ID` | Shown in UI / OAuth hints |

If `NEXT_PUBLIC_API_URL` / `HNS_WORKER_URL` is missing at build, the `/hns-api` rewrites are omitted and API calls from the browser will 404.

---

## 5. Deploy Workers

From **repo root**:

```bash
npm run deploy
```

From **`auth/`**:

```bash
cd auth && npx wrangler deploy
```

Note each Worker’s **workers.dev** URL or your **custom routes** for debugging.

---

## 6. Deploy the website (Pages)

From **`website/`**:

```bash
npm run pages:build
npx wrangler pages deploy
```

Or use the combined script if configured in `package.json` (`pages:deploy`). The build output dir is set in `website/wrangler.toml` (`pages_build_output_dir`).

---

## 7. Routing

**Auth** paths (`/auth/login`, `/auth/callback`, `/auth/me`, `/auth/logout`) are requested as **same origin** as the site (`NEXT_PUBLIC_BASE_URL`). You must route them to the **auth Worker**, not to Pages.

Typical Cloudflare setup:

1. Attach the **Pages** project to `hns.gg` (and `www` if used).
2. Add a **Worker route** with higher specificity, e.g. `hns.gg/auth/*` → **hns-auth** Worker.

**API** traffic uses Next rewrites: browser → `https://hns.gg/hns-api/...` → bot Worker `https://<bot-origin>/api/...`. No extra zone route is required if the Worker URL in `NEXT_PUBLIC_API_URL` is publicly reachable and CORS/`BASE_URL` on the bot matches your site origin.

---

## 8. Smoke checks

1. Open `/auth/login`, complete Discord OAuth, confirm cookie and `/auth/me`.
2. Signed-in: `/profile`, `/submit`, `/vote/YYYY-MM` (UTC month).
3. Discord: slash commands respond; cron runs on schedule (UTC).

---

## 9. Local development

- **Bot**: `npx wrangler dev` (root), often `http://127.0.0.1:8787`
- **Auth**: `cd auth && npx wrangler dev` on another port if needed, or use remote auth with careful cookie domains
- **Website**: `cd website && npm run dev` — `next.config.ts` defaults `HNS_WORKER_URL` to `http://127.0.0.1:8787` in development when unset

Use `.dev.vars` / `.env` for tokens locally; never commit secrets.
