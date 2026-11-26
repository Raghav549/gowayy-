import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "gowayy",
    short_name: "gowayy",
    description: "Explore, stay, ride and shop the Darjeeling & Kalimpong hills in one super-app.",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f2ff",
    theme_color: "#7c3aed",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/logo.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
