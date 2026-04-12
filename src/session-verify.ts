/** Verify hns_session cookie (same algorithm as auth Worker). */

export type SessionPayload = {
  discordId: string;
  discordUsername: string;
  displayName: string;
  avatarHash: string | null;
  exp: number;
};

async function sha256Key(secret: string): Promise<ArrayBuffer> {
  return crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
}

function bytesToB64Url(buf: ArrayBuffer): string {
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
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["decrypt"]);
}

export async function verifySessionToken(
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

const COOKIE_SESSION = "hns_session";

export function parseCookies(h: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!h) return out;
  for (const part of h.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (!k) continue;
    out[k] = decodeURIComponent(rest.join("=").trim());
  }
  return out;
}

export async function getSessionFromRequest(
  request: Request,
  sessionSecret: string | undefined,
): Promise<SessionPayload | null> {
  if (!sessionSecret?.trim()) return null;
  const raw = parseCookies(request.headers.get("Cookie"))[COOKIE_SESSION];
  if (!raw) return null;
  try {
    return await verifySessionToken(decodeURIComponent(raw), sessionSecret);
  } catch {
    return null;
  }
}

/** Decrypt Discord access token stored by auth Worker (AES-GCM, iv||ct as base64url). */
export async function decryptAccessTokenPayload(
  enc: string,
  secret: string,
): Promise<string | null> {
  try {
    const combined = b64UrlToBytes(enc);
    if (combined.length < 13) return null;
    const iv = combined.slice(0, 12);
    const ct = combined.slice(12);
    const key = await importAesKey(secret);
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
    return new TextDecoder().decode(pt);
  } catch {
    return null;
  }
}
