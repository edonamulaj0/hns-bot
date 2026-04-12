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
