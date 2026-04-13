import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Proxy /auth/* to the auth Worker at runtime (Pages reads env on each deploy).
 * We use fetch() instead of NextResponse.rewrite() because external-host rewrites
 * are unreliable on @cloudflare/next-on-pages and often surface as 502 Bad Gateway.
 * redirect: "manual" preserves 302 + Set-Cookie from the auth Worker (e.g. OAuth to Discord).
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

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
]);

function buildUpstreamHeaders(request: NextRequest): Headers {
  const out = new Headers();
  request.headers.forEach((value, key) => {
    const l = key.toLowerCase();
    if (l === "host" || HOP_BY_HOP.has(l)) return;
    out.append(key, value);
  });
  return out;
}

function applyUpstreamResponseHeaders(from: Headers, to: Headers): void {
  const withGetSetCookie =
    typeof (from as Headers & { getSetCookie?: () => string[] }).getSetCookie === "function";
  const setCookies = withGetSetCookie
    ? (from as Headers & { getSetCookie: () => string[] }).getSetCookie()
    : [];

  from.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") return;
    to.append(key, value);
  });

  if (setCookies.length > 0) {
    for (const c of setCookies) to.append("Set-Cookie", c);
  } else {
    const merged = from.get("Set-Cookie");
    if (merged) to.append("Set-Cookie", merged);
  }
}

export const config = {
  matcher: ["/auth/:path*"],
};

export async function middleware(request: NextRequest) {
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

  const method = request.method;
  const headers = buildUpstreamHeaders(request);

  const init: RequestInit = {
    method,
    headers,
    redirect: "manual",
  };

  if (method !== "GET" && method !== "HEAD") {
    const body = await request.arrayBuffer();
    if (body.byteLength > 0) init.body = body;
  }

  let upstream: Response;
  try {
    upstream = await fetch(dest.toString(), init);
  } catch {
    return new NextResponse(
      [
        "Could not reach the auth Worker.",
        "",
        "Check HNS_AUTH_WORKER_URL (HTTPS, no typo) and that the Worker is deployed:",
        "  cd auth && npx wrangler deploy",
      ].join("\n"),
      { status: 502, headers: { "Content-Type": "text/plain; charset=utf-8" } },
    );
  }

  const resHeaders = new Headers();
  applyUpstreamResponseHeaders(upstream.headers, resHeaders);

  return new NextResponse(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: resHeaders,
  });
}
