import { cache } from "react";
import { headers } from "next/headers";
import type { SessionUser } from "./auth-shared";

export type { SessionUser };

function authMeBase(): string {
  return (
    process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_AUTH_URL?.replace(/\/$/, "") ||
    ""
  );
}

async function loadSession(): Promise<SessionUser | null> {
  const base = authMeBase();
  if (!base) return null;
  const h = await headers();
  const cookie = h.get("cookie") ?? "";
  try {
    const res = await fetch(`${base}/auth/me`, {
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
