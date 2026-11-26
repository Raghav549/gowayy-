import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The floating dev-tools badge is pinned to the screen edge on every page and
  // overlaps the mobile UI; the app does not use it.
  devIndicators: false,
};

export default nextConfig;
