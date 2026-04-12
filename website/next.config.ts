import path from "node:path";
import type { NextConfig } from "next";

/**
 * For Cloudflare Pages, run `npm run pages:build` after `next build` (or use the combined
 * `@cloudflare/next-on-pages` CLI per current Cloudflare docs). Local dev: `next dev` only.
 */
function workerBaseUrl(): string | null {
  const raw =
    process.env.HNS_WORKER_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_URL?.trim() ||
    "";
  const base = raw.replace(/\/$/, "");
  if (!base || base.includes("YOUR_SUBDOMAIN")) {
    if (process.env.NODE_ENV === "development") {
      return "http://127.0.0.1:8787";
    }
    return null;
  }
  return base;
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname, ".."),
  async rewrites() {
    const worker = workerBaseUrl();
    if (!worker) return [];
    return [
      {
        source: "/hns-api/:path*",
        destination: `${worker}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
