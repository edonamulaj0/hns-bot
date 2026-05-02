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
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "cdn.discordapp.com" },
    ],
    formats: ["image/avif", "image/webp"],
  },
  // Do not set outputFileTracingRoot to the repo parent here — @cloudflare/next-on-pages
  // runs `vercel build` and a parent root causes a doubled `website/website/.next` path (ENOENT).
  // /auth/* is proxied by middleware.ts (runtime env) so Pages works even if the auth URL was
  // added in the dashboard after the first build.
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
  async headers() {
    return [
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/branding/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/:path*.(svg|png|jpg|jpeg|gif|webp|avif|ico)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/fonts/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
