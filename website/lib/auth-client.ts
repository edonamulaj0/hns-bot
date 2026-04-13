import type { SessionUser } from "./auth-shared";

export type { SessionUser };

export function loginUrl(): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/auth/login`;
  }
  const base = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") || "";
  return base ? `${base}/auth/login` : "/auth/login";
}

export async function getSessionClient(): Promise<SessionUser | null> {
  if (typeof window === "undefined") return null;
  const origin = window.location.origin;
  try {
    const res = await fetch(`${origin}/auth/me`, {
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as SessionUser;
  } catch {
    return null;
  }
}

/** After OAuth redirect the session cookie can lag one frame; retry before showing signed-out UI. */
export async function getSessionClientWithRetry(options?: {
  attempts?: number;
  delayMs?: number;
}): Promise<SessionUser | null> {
  if (typeof window === "undefined") return null;
  const attempts = options?.attempts ?? 5;
  const delayMs = options?.delayMs ?? 120;
  for (let i = 0; i < attempts; i++) {
    const session = await getSessionClient();
    if (session) return session;
    if (i < attempts - 1) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  return null;
}
