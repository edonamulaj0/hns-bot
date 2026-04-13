import type { PrismaClient } from "@prisma/client/edge";
import { getPrisma } from "./db";
import { extractGithubUsername } from "./github";
import { encryptSecret, decryptSecret } from "./token-crypto";
import type { WorkerBindings } from "./worker-env";

const OAUTH_SCOPES = ["read:user", "repo"].join(" ");
const STATE_TTL_MS = 15 * 60 * 1000;

export function oauthConfigReady(env: WorkerBindings): boolean {
  return Boolean(
    env.GITHUB_OAUTH_CLIENT_ID?.trim() &&
      env.GITHUB_OAUTH_CLIENT_SECRET?.trim() &&
      env.WORKER_PUBLIC_URL?.trim() &&
      env.GITHUB_LINK_SECRET?.trim(),
  );
}

export function getOAuthRedirectUri(env: WorkerBindings): string {
  const base = env.WORKER_PUBLIC_URL!.replace(/\/+$/, "");
  return `${base}/oauth/github/callback`;
}

export async function createGithubAuthorizeUrl(
  prisma: PrismaClient,
  discordUserId: string,
  env: WorkerBindings,
): Promise<string> {
  const state = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + STATE_TTL_MS);
  await prisma.pendingGithubOAuth.deleteMany({ where: { discordUserId } });
  await prisma.pendingGithubOAuth.create({
    data: { state, discordUserId, expiresAt },
  });
  const params = new URLSearchParams({
    client_id: env.GITHUB_OAUTH_CLIENT_ID!,
    redirect_uri: getOAuthRedirectUri(env),
    scope: OAUTH_SCOPES,
    state,
    allow_signup: "false",
  });
  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

interface TokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
  error?: string;
  error_description?: string;
}

async function postOAuthAccess(
  body: Record<string, string>,
  env: WorkerBindings,
): Promise<TokenResponse> {
  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      ...body,
      client_id: env.GITHUB_OAUTH_CLIENT_ID!,
      client_secret: env.GITHUB_OAUTH_CLIENT_SECRET!,
    }),
  });
  return res.json() as Promise<TokenResponse>;
}

export async function exchangeCodeForTokens(
  code: string,
  env: WorkerBindings,
): Promise<{ accessToken: string; refreshToken: string | null; expiresAt: Date | null }> {
  const json = await postOAuthAccess(
    {
      grant_type: "authorization_code",
      code,
      redirect_uri: getOAuthRedirectUri(env),
    },
    env,
  );
  if (json.error || !json.access_token) {
    throw new Error(json.error_description ?? json.error ?? "OAuth token exchange failed");
  }
  const expiresAt =
    typeof json.expires_in === "number"
      ? new Date(Date.now() + json.expires_in * 1000 - 60_000)
      : null;
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? null,
    expiresAt,
  };
}

export async function refreshUserGithubTokens(
  refreshToken: string,
  env: WorkerBindings,
): Promise<{ accessToken: string; refreshToken: string | null; expiresAt: Date | null }> {
  const json = await postOAuthAccess(
    {
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    },
    env,
  );
  if (json.error || !json.access_token) {
    throw new Error(json.error_description ?? json.error ?? "OAuth refresh failed");
  }
  const expiresAt =
    typeof json.expires_in === "number"
      ? new Date(Date.now() + json.expires_in * 1000 - 60_000)
      : null;
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? refreshToken,
    expiresAt,
  };
}

export async function fetchGithubViewerLogin(accessToken: string): Promise<string> {
  const res = await fetch("https://api.github.com/user", {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": "hns-bot/1.0",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`GitHub user API: ${res.status} ${t.slice(0, 120)}`);
  }
  const u = (await res.json()) as { login?: string };
  if (!u.login) throw new Error("GitHub user response missing login");
  return u.login;
}

export type TokenUserRow = {
  id: string;
  github: string | null;
  githubAccessTokenEnc: string | null;
  githubRefreshTokenEnc: string | null;
  githubTokenExpiresAt: Date | null;
};

export async function getValidGithubAccessTokenForUser(
  prisma: PrismaClient,
  row: TokenUserRow,
  env: WorkerBindings,
): Promise<string | null> {
  const enc = env.GITHUB_LINK_SECRET?.trim();
  if (!enc || !row.githubAccessTokenEnc) return null;

  let access: string;
  try {
    access = await decryptSecret(row.githubAccessTokenEnc, enc);
  } catch {
    return null;
  }
  const exp = row.githubTokenExpiresAt?.getTime() ?? 0;
  const needsRefresh =
    exp > 0 && Date.now() > exp - 120_000 && row.githubRefreshTokenEnc;

  if (needsRefresh && row.githubRefreshTokenEnc) {
    try {
      const refreshPlain = await decryptSecret(row.githubRefreshTokenEnc, enc);
      const next = await refreshUserGithubTokens(refreshPlain, env);
      const accessEnc = await encryptSecret(next.accessToken, enc);
      const refreshEnc = next.refreshToken
        ? await encryptSecret(next.refreshToken, enc)
        : row.githubRefreshTokenEnc;
      await prisma.user.update({
        where: { id: row.id },
        data: {
          githubAccessTokenEnc: accessEnc,
          githubRefreshTokenEnc: refreshEnc,
          githubTokenExpiresAt: next.expiresAt,
        },
      });
      access = next.accessToken;
    } catch (e) {
      console.error("github token refresh failed:", e);
    }
  }

  return access;
}

function htmlPage(title: string, body: string): Response {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return new Response(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(title)}</title></head><body style="font-family:system-ui;max-width:40rem;margin:3rem auto;padding:0 1rem">${body}</body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

export async function handleGithubOAuthCallback(
  request: Request,
  env: WorkerBindings,
): Promise<Response> {
  if (!oauthConfigReady(env)) {
    return htmlPage(
      "GitHub link unavailable",
      "<p>OAuth is not configured on this Worker (missing client ID/secret, WORKER_PUBLIC_URL, or GITHUB_LINK_SECRET).</p>",
    );
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const err = url.searchParams.get("error_description") ?? url.searchParams.get("error");

  if (err) {
    return htmlPage("GitHub OAuth", `<p>Authorization failed: ${err}</p>`);
  }
  if (!code || !state) {
    return htmlPage("GitHub OAuth", "<p>Missing <code>code</code> or <code>state</code>.</p>");
  }

  const prisma = getPrisma(env.DB);
  const pending = await prisma.pendingGithubOAuth.findUnique({ where: { state } });
  if (!pending || pending.expiresAt.getTime() < Date.now()) {
    return htmlPage(
      "GitHub OAuth",
      "<p>This link expired or was already used. Run <code>/link-github</code> again in Discord.</p>",
    );
  }

  const discordUserId = pending.discordUserId;
  await prisma.pendingGithubOAuth.delete({ where: { state } });

  let tokens: { accessToken: string; refreshToken: string | null; expiresAt: Date | null };
  try {
    tokens = await exchangeCodeForTokens(code, env);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return htmlPage("GitHub OAuth", `<p>Token exchange failed: ${msg}</p>`);
  }

  let login: string;
  try {
    login = await fetchGithubViewerLogin(tokens.accessToken);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return htmlPage("GitHub OAuth", `<p>Could not read GitHub profile: ${msg}</p>`);
  }

  const user = await prisma.user.findUnique({
    where: { discordId: discordUserId },
    select: { id: true, github: true },
  });
  if (!user) {
    return htmlPage(
      "GitHub OAuth",
      "<p>No Discord user record found. Sign in on the website (<strong>/profile</strong>) or use the bot once, then try linking again.</p>",
    );
  }

  const profileLogin = extractGithubUsername(user.github);
  if (profileLogin && profileLogin.toLowerCase() !== login.toLowerCase()) {
    return htmlPage(
      "GitHub mismatch",
      `<p>You signed in as <strong>@${login}</strong> but your profile GitHub URL points at <strong>@${profileLogin}</strong>. Update your GitHub field on <strong>/profile</strong> to match, then run <code>/link-github</code> again.</p>`,
    );
  }

  const enc = env.GITHUB_LINK_SECRET!.trim();
  const accessEnc = await encryptSecret(tokens.accessToken, enc);
  const refreshEnc = tokens.refreshToken
    ? await encryptSecret(tokens.refreshToken, enc)
    : null;

  await prisma.user.update({
    where: { id: user.id },
    data: {
      githubAccessTokenEnc: accessEnc,
      githubRefreshTokenEnc: refreshEnc,
      githubTokenExpiresAt: tokens.expiresAt,
      githubLinkedLogin: login,
      ...(user.github ? {} : { github: `https://github.com/${login}` }),
    },
  });

  return htmlPage(
    "GitHub linked",
    `<p>Linked GitHub <strong>@${login}</strong> to your Discord account. You can close this tab and use <code>/pulse</code> for a contribution preview (includes private repos you authorized).</p>`,
  );
}
