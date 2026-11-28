import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The console is an independent Next.js application. Explicitly scoping
  // Turbopack prevents the customer app's instrumentation and lockfile from
  // leaking into Admin/Business builds on Vercel.
  turbopack: { root: process.cwd() },
};
export default nextConfig;
