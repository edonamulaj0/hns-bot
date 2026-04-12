import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Proxy /auth/* to the auth Worker at runtime (Pages reads env on each deploy).
 * Build-time rewrites in next.config.ts omit /auth when HNS_AUTH_WORKER_URL was unset during build
 * (common on first deploy) → 404. Middleware fixes that once the var exists on Cloudflare.
 */
function authWorkerOrigin(): string {
  const raw =
    process.env.HNS_AUTH_WORKER_URL?.trim() ||
    process.env.NEXT_PUBLIC_AUTH_WORKER_URL?.trim() ||
    "";
  let base = raw.replace(/\/$/, "");
  if (base.includes("YOUR_SUBDOMAIN")) base = "";
  if (!base && process.env.NODE_ENV === "development") {
    return "http://127.0.0.1:8788";
  }
  return base;
}

export const config = {
  matcher: ["/auth/:path*"],
};

export function middleware(request: NextRequest) {
  const base = authWorkerOrigin();
  if (!base) {
    return new NextResponse(
      [
        "Auth Worker URL is not configured.",
        "",
        "In Cloudflare Pages → Settings → Environment variables, set one of:",
        "  HNS_AUTH_WORKER_URL=https://<your-auth-worker>.workers.dev",
        "  NEXT_PUBLIC_AUTH_WORKER_URL=(same value)",
        "",
        "Redeploy the site after saving. Deploy the auth Worker from the auth/ folder first.",
      ].join("\n"),
      { status: 502, headers: { "Content-Type": "text/plain; charset=utf-8" } },
    );
  }

  const path = request.nextUrl.pathname + request.nextUrl.search;
  const dest = new URL(path, base.endsWith("/") ? base : `${base}/`);
  return NextResponse.rewrite(dest);
}
