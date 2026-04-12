import { cache } from "react";
import { headers } from "next/headers";
import type { SessionUser } from "./auth-shared";

export type { SessionUser };

/** Where server-side code calls `/auth/me` (cookie header forwarded). Prefer auth Worker URL when set — public URL may not reach the auth Worker during SSR. */
function authMeUrl(): string | null {
  const w =
    process.env.HNS_AUTH_WORKER_URL?.trim().replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_AUTH_URL?.trim().replace(/\/$/, "") ||
    "";
  if (w && !w.includes("YOUR_SUBDOMAIN")) return `${w}/auth/me`;
  const site =
    process.env.NEXT_PUBLIC_BASE_URL?.trim().replace(/\/$/, "") || "";
  return site ? `${site}/auth/me` : null;
}

async function loadSession(): Promise<SessionUser | null> {
  const meUrl = authMeUrl();
  if (!meUrl) return null;
  const h = await headers();
  const cookie = h.get("cookie") ?? "";
  try {
    const res = await fetch(meUrl, {
      headers: { cookie },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as SessionUser;
  } catch {
    return null;
  }
}

/** Server Components — one fetch per request (React cache). */
export const getSession = cache(loadSession);
