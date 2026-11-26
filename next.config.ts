import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The floating dev-tools badge is pinned to the screen edge on every page and
  // overlaps the mobile UI; the app does not use it.
  devIndicators: false,
  // `next dev` refuses its scripts/HMR to any origin but localhost, which leaves
  // pages unhydrated (every button dead) when the dev server is opened through a
  // preview proxy or another device on the network. Production builds ignore this.
  allowedDevOrigins: ["*.e2b.app", "*.e2b.dev", "*.local", "192.168.*.*", "10.*.*.*"],
};

export default nextConfig;
