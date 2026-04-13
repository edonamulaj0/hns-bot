/**
 * H4ck&Stack auth Worker — Discord OAuth, session cookie (hns_session), D1 User upsert.
 */
/// <reference types="@cloudflare/workers-types" />

export interface Env {
  DB: D1Database;
  BASE_URL: string;
  DISCORD_GUILD_ID: string;
  DISCORD_CLIENT_ID: string;
  DISCORD_CLIENT_SECRET: string;
  SESSION_SECRET: string;
  COOKIE_DOMAIN?: string;
}

const COOKIE_SESSION = "hns_session";
const COOKIE_STATE = "hns_oauth_state";
const SESSION_MAX_AGE = 60 * 60 * 24 * 90;

async function sha256Key(secret: string): Promise<ArrayBuffer> {
  return crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
}

function bytesToB64Url(buf: ArrayBufferLike): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  const b64 = btoa(bin);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function b64UrlToBytes(s: string): Uint8Array {
  let b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4 !== 0) b64 += "=";
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  const raw = await sha256Key(secret);
  return crypto.subtle.importKey("raw", raw, { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);
}

async function importAesKey(secret: string): Promise<CryptoKey> {
  const raw = await sha256Key(secret);
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

async function encryptSecret(plain: string, secret: string): Promise<string> {
  const key = await importAesKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      new TextEncoder().encode(plain),
    ),
  );
  const combined = new Uint8Array(iv.length + ct.length);
  combined.set(iv, 0);
  combined.set(ct, iv.length);
  return bytesToB64Url(combined.buffer);
}

type SessionPayload = {
  discordId: string;
  discordUsername: string;
  displayName: string;
  avatarHash: string | null;
  exp: number;
};

async function signSession(p: SessionPayload, secret: string): Promise<string> {
  const key = await importHmacKey(secret);
  const json = JSON.stringify(p);
  const payloadB64 = bytesToB64Url(new TextEncoder().encode(json).buffer);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadB64));
  return `${payloadB64}.${bytesToB64Url(sig)}`;
}

async function verifySession(
  token: string,
  secret: string,
): Promise<SessionPayload | null> {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const payloadB64 = token.slice(0, dot);
  const sigB64 = token.slice(dot + 1);
  const key = await importHmacKey(secret);
  const sig = b64UrlToBytes(sigB64);
  const ok = await crypto.subtle.verify(
    "HMAC",
    key,
    sig,
    new TextEncoder().encode(payloadB64),
  );
  if (!ok) return null;
  const json = new TextDecoder().decode(b64UrlToBytes(payloadB64));
  const p = JSON.parse(json) as SessionPayload;
  if (typeof p.exp !== "number" || p.exp < Date.now() / 1000) return null;
  return p;
}

function parseCookies(h: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!h) return out;
  for (const part of h.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (!k) continue;
    out[k] = decodeURIComponent(rest.join("=").trim());
  }
  return out;
}

/** Public site origin for OAuth redirect_uri (must match Discord app URLs, not the Worker’s hostname when proxied). */
function publicOrigin(env: Env, url: URL): string {
  return env.BASE_URL.replace(/\/$/, "") || url.origin;
}

function cookieAttrs(env: Env, url: URL, maxAge: number, clear = false): string {
  const secure = url.protocol === "https:";
  const domain = env.COOKIE_DOMAIN?.trim();
  const base = `Path=/; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}${
    domain ? `; Domain=${domain}` : ""
  }`;
  if (clear) return `${base}; Max-Age=0`;
  return `${base}; Max-Age=${maxAge}`;
}

async function discordToken(
  code: string,
  redirectUri: string,
  env: Env,
): Promise<{ access_token: string; expires_in: number; token_type: string }> {
  const body = new URLSearchParams({
    client_id: env.DISCORD_CLIENT_ID,
    client_secret: env.DISCORD_CLIENT_SECRET,
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });
  const res = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`token exchange failed: ${res.status} ${t}`);
  }
  return res.json();
}

async function discordMe(access: string) {
  const res = await fetch("https://discord.com/api/v10/users/@me", {
    headers: { Authorization: `Bearer ${access}` },
  });
  if (!res.ok) throw new Error("users/@me failed");
  return res.json() as Promise<{
    id: string;
    username: string;
    global_name: string | null;
    avatar: string | null;
  }>;
}

async function discordGuildMember(access: string, guildId: string): Promise<Response> {
  return fetch(`https://discord.com/api/v10/users/@me/guilds/${guildId}/member`, {
    headers: { Authorization: `Bearer ${access}` },
  });
}

async function upsertUser(
  env: Env,
  row: {
    discordId: string;
    discordUsername: string;
    displayName: string;
    avatarHash: string | null;
    accessEnc: string | null;
    tokenExpiresAt: string | null;
  },
) {
  const id = crypto.randomUUID().replace(/-/g, "");
  await env.DB.prepare(
    `INSERT INTO User (id, discordId, discordUsername, displayName, avatarHash, accessToken, tokenExpiresAt, points, rank, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, datetime('now'), datetime('now'))
     ON CONFLICT(discordId) DO UPDATE SET
       discordUsername = excluded.discordUsername,
       avatarHash = excluded.avatarHash,
       accessToken = excluded.accessToken,
       tokenExpiresAt = excluded.tokenExpiresAt,
       updatedAt = datetime('now')`,
  )
    .bind(
      id,
      row.discordId,
      row.discordUsername,
      row.displayName,
      row.avatarHash,
      row.accessEnc,
      row.tokenExpiresAt,
    )
    .run();
}

async function recomputeRanks(env: Env): Promise<void> {
  await env.DB.prepare(
    `UPDATE "User" SET rank = (
      SELECT COUNT(*) + 1 FROM "User" AS u2 WHERE u2.points > "User".points
    )`,
  ).run();
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    let path = url.pathname;
    if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);

    const allowOrigin = publicOrigin(env, url);
    const corsJson = (body: unknown, status = 200) =>
      new Response(JSON.stringify(body), {
        status,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": allowOrigin,
          "Access-Control-Allow-Credentials": "true",
        },
      });

    try {
      if (path === "/auth/login" && request.method === "GET") {
        const redirectUri = `${publicOrigin(env, url)}/auth/callback`;
        const state = crypto.randomUUID();
        const loc = new URL("https://discord.com/api/oauth2/authorize");
        loc.searchParams.set("client_id", env.DISCORD_CLIENT_ID);
        loc.searchParams.set("redirect_uri", redirectUri);
        loc.searchParams.set("response_type", "code");
        loc.searchParams.set("scope", "identify guilds.members.read");
        loc.searchParams.set("state", state);
        const set = `${COOKIE_STATE}=${state}; ${cookieAttrs(env, url, 600)}`;
        return new Response(null, {
          status: 302,
          headers: { Location: loc.toString(), "Set-Cookie": set },
        });
      }

      if (path === "/auth/callback" && request.method === "GET") {
        const q = url.searchParams;
        const code = q.get("code");
        const state = q.get("state");
        const cookies = parseCookies(request.headers.get("Cookie"));
        if (!code || !state || state !== cookies[COOKIE_STATE]) {
          return new Response(null, {
            status: 302,
            headers: {
              Location: `${env.BASE_URL.replace(/\/$/, "")}/join?error=oauth`,
              "Set-Cookie": `${COOKIE_STATE}=; ${cookieAttrs(env, url, 0, true)}`,
            },
          });
        }
        const redirectUri = `${publicOrigin(env, url)}/auth/callback`;
        let access: string;
        let expiresIn: number;
        try {
          const tok = await discordToken(code, redirectUri, env);
          access = tok.access_token;
          expiresIn = tok.expires_in;
        } catch {
          return new Response(null, {
            status: 302,
            headers: {
              Location: `${env.BASE_URL.replace(/\/$/, "")}/join?error=oauth`,
              "Set-Cookie": `${COOKIE_STATE}=; ${cookieAttrs(env, url, 0, true)}`,
            },
          });
        }

        const me = await discordMe(access);
        const memberRes = await discordGuildMember(access, env.DISCORD_GUILD_ID);
        if (!memberRes.ok) {
          return new Response(null, {
            status: 302,
            headers: {
              Location: `${env.BASE_URL.replace(/\/$/, "")}/join?error=not_member`,
              "Set-Cookie": `${COOKIE_STATE}=; ${cookieAttrs(env, url, 0, true)}`,
            },
          });
        }

        const displayName = me.global_name?.trim() || me.username;
        const expAt = new Date(Date.now() + expiresIn * 1000).toISOString();
        let accessEnc: string | null = null;
        try {
          accessEnc = await encryptSecret(access, env.SESSION_SECRET);
        } catch {
          accessEnc = null;
        }

        await upsertUser(env, {
          discordId: me.id,
          discordUsername: me.username,
          displayName,
          avatarHash: me.avatar,
          accessEnc,
          tokenExpiresAt: expAt,
        });
        await recomputeRanks(env);

        const expSec = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE;
        const sessionTok = await signSession(
          {
            discordId: me.id,
            discordUsername: me.username,
            displayName,
            avatarHash: me.avatar,
            exp: expSec,
          },
          env.SESSION_SECRET,
        );

        const clearState = `${COOKIE_STATE}=; ${cookieAttrs(env, url, 0, true)}`;
        const setSess = `${COOKIE_SESSION}=${encodeURIComponent(sessionTok)}; ${cookieAttrs(
          env,
          url,
          SESSION_MAX_AGE,
        )}`;

        const redir = new Headers();
        redir.set("Location", `${env.BASE_URL.replace(/\/$/, "")}/profile`);
        redir.append("Set-Cookie", clearState);
        redir.append("Set-Cookie", setSess);
        return new Response(null, { status: 302, headers: redir });
      }

      if (path === "/auth/logout" && request.method === "POST") {
        return new Response(null, {
          status: 302,
          headers: {
            Location: `${env.BASE_URL.replace(/\/$/, "")}/`,
            "Set-Cookie": `${COOKIE_SESSION}=; ${cookieAttrs(env, url, 0, true)}`,
          },
        });
      }

      if (path === "/auth/me" && request.method === "GET") {
        const cookies = parseCookies(request.headers.get("Cookie"));
        const raw = cookies[COOKIE_SESSION];
        if (!raw) return corsJson({ error: "unauthorized" }, 401);
        const p = await verifySession(decodeURIComponent(raw), env.SESSION_SECRET);
        if (!p)
          return corsJson({ error: "unauthorized" }, 401);
        const row = await env.DB.prepare(
          "SELECT displayName, github FROM User WHERE discordId = ? LIMIT 1",
        )
          .bind(p.discordId)
          .first<{ displayName: string | null; github: string | null }>();
        const fromDb = row?.displayName?.trim();
        return corsJson({
          discordId: p.discordId,
          displayName: fromDb || p.displayName,
          avatarHash: p.avatarHash,
          github: row?.github ?? null,
        });
      }

      return new Response("Not found", { status: 404 });
    } catch (e) {
      console.error(e);
      return new Response("Internal error", { status: 500 });
    }
  },
};
