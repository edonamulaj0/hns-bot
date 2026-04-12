import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Monorepo: parent repo has its own package-lock; keep file tracing scoped to repo root.
  outputFileTracingRoot: path.join(__dirname, ".."),
};

export default nextConfig;
