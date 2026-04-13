# Deploying H4ck&Stack

## Moving off Vercel → full stack on Cloudflare (checklist)

Your **production domain** (e.g. `h4cknstack.com`) should use **Cloudflare DNS** (nameservers pointed to Cloudflare). Then:

1. **Deploy the bot Worker** (repo root): `npm run deploy` — note the URL (`https://hns-bot.<account>.workers.dev` or your custom route).
2. **Deploy the auth Worker**: `cd auth && npx wrangler deploy` — note the URL (`https://hns-auth.<account>.workers.dev`).
3. **Set secrets** on both Workers (see [§4](#4-secrets-and-vars)). **`SESSION_SECRET` must be identical** on bot + auth.
4. **Set plain vars** in the dashboard or `wrangler.toml`: **`BASE_URL=https://h4cknstack.com`**, **`DISCORD_GUILD_ID`**, **`DISCORD_CLIENT_ID`** on auth; bot gets **`BASE_URL`**, guild, channels, **`DISCORD_PUBLIC_KEY`**, **`DISCORD_APPLICATION_ID`**.
5. **Cloudflare Pages**: create a project from this Git repo (or **Direct Upload**). Set **Root directory** to **`website`**, **Build command** to **`npm run pages:build`**, **Build output directory** to **`.vercel/output/static`** (matches `website/wrangler.toml`). Use **Node 20+** (Environment variables → **Production** → add `NODE_VERSION=20` if needed). Under **Settings → Environment variables → Production**, set every variable from **`website/.env.example`** (especially **`NEXT_PUBLIC_BASE_URL`**, **`NEXT_PUBLIC_API_URL`**, **`HNS_WORKER_URL`**, **`HNS_AUTH_WORKER_URL`**, Discord IDs).
6. **Deploy**: Git-connected Pages runs the build on push; or from **`website/`** run **`npm run pages:build`** then **`npx wrangler pages deploy`** (link the project on first run). Remove the **Vercel** deployment for this app when Cloudflare is verified.
7. **Attach the custom domain** to the Pages project (**Custom domains** → `h4cknstack.com` / `www`). Remove or disable the **Vercel** DNS record / project so traffic hits Pages only.
8. **Auth routing** — pick one:
   - **Recommended:** **Workers → Triggers → Routes** (or zone routes): `h4cknstack.com/auth/*` → **hns-auth** Worker (more specific than Pages). Then browser hits your domain and Cloudflare sends `/auth/*` to auth.
   - **Alternative:** omit that route and set **`HNS_AUTH_WORKER_URL`** on Pages so **middleware** proxies `/auth/*` to the auth Worker (OAuth still uses auth Worker **`BASE_URL`** for `redirect_uri`).
9. **Discord Developer Portal → OAuth2 → Redirects:** add **`https://h4cknstack.com/auth/callback`**, remove old **Vercel** callback URLs.
10. **Smoke test:** open **`/auth/login`**, sign in, **`/profile`**, **`/hns-api/portfolio`** (or a page that loads API). Fix **CORS** by keeping bot **`BASE_URL`** exactly your site origin (no trailing slash).

---

This stack has **three Cloudflare pieces** plus **Discord**:

| Piece | Role |
|--------|------|
| **Website** (Cloudflare Pages) | Next.js app on your public domain |
| **Bot Worker** (`wrangler.toml` at repo root) | Discord interactions, cron, REST API under `/api/*` |
| **Auth Worker** (`auth/wrangler.toml`) | Discord OAuth, `hns_session` cookie, `/auth/*` |
| **D1** | Single SQLite database shared by both Workers |
| **Wiki** (`hns-wiki/`) | VitePress site (FMHY `edit` fork) for `wiki.h4cknstack.com` — separate Pages project |

The browser calls **same-origin** `/auth/*` and `/hns-api/*`. Those requests must reach the right Worker (see [Routing](#routing) below).

### Wiki (`hns-wiki/`)

The curated resource wiki lives in **`hns-wiki/`** (fork of [fmhy/edit](https://github.com/fmhy/edit)). It uses **pnpm** (see `hns-wiki/package.json` `packageManager` / `engines` for local tooling).

- **Local dev:** `cd hns-wiki && pnpm install && pnpm docs:dev`
- **Production build:** `cd hns-wiki && pnpm docs:build` → static output under **`hns-wiki/docs/.vitepress/dist`**
- **Wrangler (optional):** `hns-wiki/wrangler.toml` sets `name = "hns-wiki"` and `pages_build_output_dir = "docs/.vitepress/dist"` for `wrangler pages` workflows.

**Cloudflare Pages (production)**

1. Create a **Pages** project from this repo (or upload). Set **Root directory** to **`hns-wiki`**.
2. **Build command:** `pnpm install && pnpm docs:build` (or `pnpm docs:build` if install is handled separately).
3. **Build output directory:** `docs/.vitepress/dist` (relative to `hns-wiki/`).
4. **Environment variables → Production (and Preview if needed):**
   - **`NODE_VERSION`** = `21`
   - **`FMHY_BUILD_NSFW`** — omit or set empty (**required** for this wiki). Do **not** set to `true`; NSFW build paths are disabled in this fork.
   - **`FMHY_BUILD_API`** — omit or leave empty (**default**). Set to **`true`** only if you need FMHY feedback API hooks.
5. **Custom domain:** Pages → **Custom domains** → add **`wiki.h4cknstack.com`**. In **Cloudflare DNS** for the zone, add:
   - **Type:** CNAME  
   - **Name:** `wiki`  
   - **Target:** `hns-wiki.pages.dev` (or the hostname Pages shows for your project)  
   - **Proxy:** Proxied  

After DNS propagates, the wiki should serve on **`https://wiki.h4cknstack.com`**.

---

## 1. Prerequisites

- Node.js 20+
- [Wrangler](https://developers.cloudflare.com/workers/wrangler/install-and-update/) logged in (`wrangler login`)
- A Cloudflare zone (e.g. `h4cknstack.com`) if you use a custom domain
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

- **Redirects**: add exactly `https://<YOUR_DOMAIN>/auth/callback` (no trailing slash). Must match auth Worker **`BASE_URL`** (e.g. `https://h4cknstack.com/auth/callback`).
- **Scopes** (must match `auth/src/index.ts`): **`identify`** and **`guilds.members.read`** (profile + verify membership in `DISCORD_GUILD_ID`). You do **not** need the separate `guilds` scope for this app.

### Bot

- Enable **Privileged Gateway Intents** as required by your bot code.
- Install the bot to your guild; copy **Guild ID** into `DISCORD_GUILD_ID` (auth + bot vars) and `NEXT_PUBLIC_DISCORD_GUILD_ID` (website).

### Slash commands

After changing `src/register.ts`, register guild commands. Root **`.env`** needs `DISCORD_APPLICATION_ID`, `DISCORD_TOKEN`, `DISCORD_TEST_GUILD_ID`, and **`ADMIN_ROLE_ID`** (same mod role as the Worker) so `/intro` and `/admin-*` commands are **hidden** from members without that role.

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

**`[vars]`**: `BASE_URL`, `DISCORD_GUILD_ID`, `DISCORD_CLIENT_ID`. Optional: `COOKIE_DOMAIN` (e.g. `.h4cknstack.com`) so the session cookie is shared across subdomains if you split traffic that way.

### Website (Cloudflare Pages — environment variables)

Set at **build time** (and production runtime where applicable):

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_BASE_URL` | Public site origin (no trailing slash). Must match auth Worker `BASE_URL` for OAuth. |
| `NEXT_PUBLIC_API_URL` or `HNS_WORKER_URL` | Bot Worker origin (no trailing slash). **Required at build** so Next emits rewrites `/hns-api/*` → `/api/*` |
| `HNS_AUTH_WORKER_URL` or `NEXT_PUBLIC_AUTH_WORKER_URL` | Auth Worker origin (no trailing slash). **Middleware** proxies `/auth/*` at **runtime** (set on Pages, then redeploy once so the binding ships). Optional duplicate name: `NEXT_PUBLIC_AUTH_WORKER_URL`. |
| `NEXT_PUBLIC_DISCORD_GUILD_ID` | Widget + UI |
| `NEXT_PUBLIC_DISCORD_CLIENT_ID` | Shown in UI / OAuth hints |

If `NEXT_PUBLIC_API_URL` / `HNS_WORKER_URL` is missing at build, `/hns-api` rewrites are omitted. If auth Worker URL env vars are missing on Pages, **`/auth/login`** returns **502** with a short plain-text hint (middleware).

**Local dev:** run the auth Worker on port **8788** (`cd auth && npx wrangler dev --port 8788`) so it does not clash with the bot on **8787**. Middleware defaults auth proxy to `http://127.0.0.1:8788` in development when unset.

**Testing on `*.pages.dev` before the custom domain is live:** Discord **Redirect** must include **`https://<your-project>.pages.dev/auth/callback`** *or* OAuth will send users to `BASE_URL` only (e.g. `https://h4cknstack.com/auth/callback`). Add both redirect URLs in the Developer Portal while testing.

### §3–4 in practice (do this in order)

1. **Open** [Discord Developer Portal](https://discord.com/developers/applications) → your application (or create one).
2. **OAuth2 → General**  
   - Copy **Client ID** → you will set **`DISCORD_CLIENT_ID`** (auth Worker vars) and **`NEXT_PUBLIC_DISCORD_CLIENT_ID`** (Pages).  
   - Click **Reset Secret** if needed → copy **Client Secret** → set only via **`wrangler secret put DISCORD_CLIENT_SECRET`** in **`auth/`** (never commit).
3. **OAuth2 → Redirects** → **Add Redirect** → `https://h4cknstack.com/auth/callback` (use your real domain if different). Save.
4. **Bot** (left sidebar) → **Add Bot** if needed → **Reset Token** → copy token → **`wrangler secret put DISCORD_TOKEN`** from **repo root** (bot Worker).  
   - Under **Privileged Gateway Intents**, enable what you use (e.g. **Server Members Intent** if your bot reads member lists; many slash-command bots work with defaults—enable if something fails).
5. **General Information** → copy **Application ID** and **Public Key** → put **`DISCORD_APPLICATION_ID`** and **`DISCORD_PUBLIC_KEY`** in root **`wrangler.toml`** `[vars]` (or Dashboard).
6. **Install the bot** to your server: **OAuth2 → URL Generator**. Under **SCOPES**, check only what you need for the *invite link* (not the website login):  
   - **`bot`** — adds the bot user to the server (required).  
   - **`applications.commands`** — lets slash commands work for this app in the server (check this for H4ck&Stack).  
   Under **BOT PERMISSIONS**, enable what your commands use at minimum **Send Messages**, **Use Slash Commands**, **Embed Links**; add **Read Messages/View Channels** if the bot must see channels. Copy the generated URL, open it in a browser, choose your server, authorize.  
7. **Guild ID**: Discord → **Server Settings → Widget** (or enable Developer Mode → right‑click server icon → **Copy Server ID**) → set **`DISCORD_GUILD_ID`** in **bot** + **auth** Worker vars and **`NEXT_PUBLIC_DISCORD_GUILD_ID`** on Pages.
8. **Generate `SESSION_SECRET`** once (long random string, e.g. `openssl rand -hex 32`). From **repo root**: `npx wrangler secret put SESSION_SECRET` → paste. From **`auth/`**: `npx wrangler secret put SESSION_SECRET` → **same value**.
9. **Bot `[vars]`** (root `wrangler.toml` or Dashboard): **`BASE_URL`**, **`DISCORD_GUILD_ID`**, channel IDs, **`DISCORD_PUBLIC_KEY`**, **`DISCORD_APPLICATION_ID`**. Redeploy: `npm run deploy`.
10. **Auth `[vars]`** (`auth/wrangler.toml` or Dashboard): **`BASE_URL`**, **`DISCORD_GUILD_ID`**, **`DISCORD_CLIENT_ID`**. Secrets already set in step 8–9. Redeploy: `cd auth && npx wrangler deploy`.
11. **Pages** (Cloudflare): **Settings → Environment variables** → set the table above (**`NEXT_PUBLIC_BASE_URL`**, API URLs, **`HNS_AUTH_WORKER_URL`** if needed, Discord IDs). **Redeploy** the site so Next picks up rewrites.
12. **Slash commands** (optional, after bot is live): root **`.env`** with `DISCORD_APPLICATION_ID`, `DISCORD_TOKEN`, `DISCORD_TEST_GUILD_ID`, and **`ADMIN_ROLE_ID`** → **`npm run register`** (second step sets guild command permissions so only mods see admin commands).

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

**Why logs say “Vercel build”:** `@cloudflare/next-on-pages` runs `npx vercel build` internally to produce the output format Cloudflare Pages expects. You are **not** deploying to Vercel; this is normal for this adapter.

**`.env` vs Cloudflare Pages:** `website/.env` is for **local** `next dev` / optional local `pages:build`. Cloudflare’s build servers **do not read your gitignored `.env`**. Copy the same names and values into **Pages → Settings → Environment variables** (Production) for `NEXT_PUBLIC_*`, `HNS_WORKER_URL`, `HNS_AUTH_WORKER_URL`, etc., then redeploy.

**Monorepo lockfile warning:** If Next warns about multiple lockfiles, either delete **`website/package-lock.json`** and install only from the repo root, or keep only one lockfile strategy so the build is deterministic.

---

## 7. Routing

**Auth** paths (`/auth/login`, `/auth/callback`, `/auth/me`, `/auth/logout`) are requested as **same origin** as the site. They must reach the **auth Worker**, not the Next app (which has no `/auth` routes).

Pick **one** (or combine zone route + env for SSR):

1. **Worker route (recommended):** e.g. `h4cknstack.com/auth/*` → **hns-auth** Worker (more specific than Pages).
2. **Env on Pages:** set **`HNS_AUTH_WORKER_URL`** (or **`NEXT_PUBLIC_AUTH_WORKER_URL`**) so **middleware** proxies `/auth/*` to the auth Worker. The auth Worker uses **`BASE_URL`** for Discord `redirect_uri` (not `*.workers.dev`), so registered redirects must match **`BASE_URL/auth/callback`** (and optionally your **`*.pages.dev/auth/callback`** while testing).

Typical Cloudflare setup with a zone route:

1. Attach the **Pages** project to `h4cknstack.com` (and `www` if used).
2. Add a **Worker route** with higher specificity, e.g. `h4cknstack.com/auth/*` → **hns-auth** Worker.

**API** traffic uses Next rewrites: browser → `https://h4cknstack.com/hns-api/...` → bot Worker `https://<bot-origin>/api/...`. No extra zone route is required if the Worker URL in `NEXT_PUBLIC_API_URL` is publicly reachable and CORS/`BASE_URL` on the bot matches your site origin.

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

---

## 10. Wrangler shows no output / `login` seems stuck

1. **Install deps** (Wrangler must be on disk — root and `website/` now list it in `devDependencies`):
   ```bash
   cd /path/to/hns-bot && npm install
   cd website && npm install
   cd ../auth && npm install
   ```
2. **Use a normal terminal** (system Terminal or VS Code integrated terminal with TTY). Some agent/sandbox environments hide Wrangler’s spinner and OAuth URL.
3. **Run with debug logging:**
   ```bash
   cd /path/to/hns-bot
   npx wrangler login
   # or
   WRANGLER_LOG=debug npm run deploy
   ```
4. **Browser OAuth:** `wrangler login` should eventually print a line like “Visit … to authorize”. Open that URL in a browser. If nothing prints, try `npx wrangler@4 login` after `npm install`.
5. **CI / headless:** use an **API token** instead of interactive login: [Cloudflare dashboard → My Profile → API Tokens](https://dash.cloudflare.com/profile/api-tokens) → create a token with **Edit Cloudflare Workers**. Then:
   ```bash
   export CLOUDFLARE_API_TOKEN="your-token"
   npm run deploy
   ```
   Do not commit the token; set it in your shell or CI secrets only.
