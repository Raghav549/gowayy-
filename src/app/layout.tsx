import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "@fontsource-variable/plus-jakarta-sans";
import "@fontsource-variable/bricolage-grotesque";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { BottomNav, TopNav } from "@/components/Nav";
import { Onboarding } from "@/components/Onboarding";
import { DragScroll } from "@/components/DragScroll";
import { getCurrentUser } from "@/lib/auth";
import { getDestMap, getLoc, getShellData } from "@/lib/data";

export const metadata: Metadata = {
  title: { default: "gowayy — explore, stay, ride & shop the hills", template: "%s · gowayy" },
  description: "gowayy is the super-app for Darjeeling, Kalimpong and beyond: tours, hotels, cabs, groceries, food and local shops in one connected platform.",
  applicationName: "gowayy",
  appleWebApp: { capable: true, title: "gowayy", statusBarStyle: "default" },
  icons: { icon: "/icon.svg", apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#7c3aed",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  const [shell, loc, dm] = await Promise.all([getShellData(user?.id ?? null), getLoc(), getDestMap()]);
  return (
    // data-scroll-behavior: CSS smooth scrolling is for in-page jumps only; Next
    // switches it off during route changes so a new page opens at the top instantly.
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <div className="aurora" aria-hidden>
          <i style={{ width: 460, height: 460, left: "-8%", top: "-6%", color: "#c9b0ff" }} />
          <i style={{ width: 380, height: 380, right: "-6%", top: "22%", color: "#f3c6ff", animationDelay: "-6s" }} />
          <i style={{ width: 420, height: 420, left: "28%", bottom: "-12%", color: "#b8d4ff", animationDelay: "-11s" }} />
        </div>
        <Providers
          user={user}
          initialCart={shell.cart}
          initialFavs={shell.favs}
          unread={shell.unread}
          locSlug={loc?.slug ?? ""}
          dests={dm.list.map((d) => ({ slug: d.slug, name: d.name }))}
        >
          <TopNav />
          <main>{children}</main>
          <BottomNav />
          <Onboarding />
          <DragScroll />
        </Providers>
      </body>
    </html>
  );
}
