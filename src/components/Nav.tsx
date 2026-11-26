"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell, Compass, Home, LayoutGrid, MapPin, ShoppingBag, User, X, Heart, Receipt, Wallet, Luggage, ChevronDown, ShieldCheck,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { SearchBox } from "@/components/SearchBox";
import { Avatar } from "@/components/Avatar";
import { useApp } from "@/components/Providers";
import { NAV_LINKS, SERVICES } from "@/components/nav-data";

function LocationPicker({ light = false, compact = false }: { light?: boolean; compact?: boolean }) {
  const { dests, locSlug, setLoc } = useApp();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const cur = dests.find((d) => d.slug === locSlug);

  // Close on outside tap / Escape. (A fixed full-screen catcher would be trapped by
  // ancestors that use backdrop-filter, so we listen on the document instead.)
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => box.current && !box.current.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div ref={box} className="relative min-w-0">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`Location: ${cur?.name ?? "All hills"}`}
        className={`flex h-11 min-w-0 max-w-full items-center gap-1.5 rounded-full text-sm font-semibold transition ${compact ? "px-3" : "px-3.5"} ${light ? "bg-white/80 hover:bg-white" : "glass"}`}
      >
        <MapPin size={16} className="shrink-0 text-brand-600" />
        <span className={`truncate ${compact ? "max-w-[6.5rem] min-[380px]:max-w-[8.5rem]" : "max-w-28"}`}>{cur?.name ?? "All hills"}</span>
        <ChevronDown size={14} className={`shrink-0 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div role="listbox" className="glass-strong anim-pop absolute right-0 top-full z-50 mt-2 max-h-[min(70vh,26rem)] w-56 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-3xl p-2">
          <p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wider text-ink/45">Deliver & discover in</p>
          {[{ slug: "", name: "All hills" }, ...dests].map((d) => (
            <button
              key={d.slug}
              role="option"
              aria-selected={d.slug === locSlug}
              onClick={() => {
                setLoc(d.slug);
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between rounded-2xl px-3 py-2 text-left text-sm font-semibold transition hover:bg-brand-50 ${d.slug === locSlug ? "bg-brand-100 text-brand-800" : ""}`}
            >
              {d.name}
              {d.slug === locSlug && <span className="h-2 w-2 rounded-full bg-brand-600" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export { LocationPicker };

/** Profile avatar button used in headers. Signed-out users get a neutral avatar that leads to sign-in. */
export function ProfileButton({ size = 44, className = "" }: { size?: number; className?: string }) {
  const { user, unread } = useApp();
  return (
    <Link
      href={user ? "/profile" : "/auth"}
      aria-label={user ? `Your profile${unread ? `, ${unread} unread notifications` : ""}` : "Sign in"}
      className={`relative shrink-0 rounded-full ring-2 ring-white shadow-md shadow-brand-900/10 transition active:scale-95 ${className}`}
    >
      <Avatar name={user?.name} src={user?.avatar} size={size} muted={!user} />
      {user && unread > 0 && <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-rose-500 ring-2 ring-white" />}
    </Link>
  );
}

export function TopNav() {
  const path = usePathname();
  const { user, cartCount } = useApp();
  if (path.startsWith("/auth")) return null;
  return (
    <header className="fixed inset-x-0 top-0 z-40 hidden px-4 lg:block">
      <div className="glass-strong mx-auto mt-4 flex h-[68px] max-w-6xl items-center gap-3 rounded-full pl-6 pr-3 xl:gap-5">
        <Link href="/" aria-label="gowayy home" className="shrink-0">
          <Logo size={30} />
        </Link>
        <nav className="flex shrink-0 items-center gap-0.5">
          {NAV_LINKS.map((l) => {
            const on = path.startsWith(l.href);
            return (
              <Link key={l.href} href={l.href} className={`rounded-full px-3 py-2 text-sm font-semibold transition xl:px-3.5 ${on ? "bg-ink text-white" : "text-ink/70 hover:bg-brand-50"}`}>
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="mx-auto min-w-0 flex-1 xl:max-w-xs">
          <SearchBox placeholder="Search gowayy…" />
        </div>
        <LocationPicker light />
        <Link href="/cart" aria-label="Bag" className="relative grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/80 transition hover:bg-white">
          <ShoppingBag size={18} />
          {cartCount > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">{cartCount}</span>}
        </Link>
        {user ? <ProfileButton size={44} /> : <Link href="/auth" className="btn btn-dark btn-sm shrink-0">Sign in</Link>}
      </div>
    </header>
  );
}

export function BottomNav() {
  const path = usePathname();
  const { cartCount, unread } = useApp();
  // the sheet belongs to the page it was opened on, so navigating closes it
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === path;
  const setOpen = (o: boolean) => setOpenOn(o ? path : null);

  if (path.startsWith("/auth")) return null;

  const svc = ["/tours", "/hotels", "/cabs", "/grocery", "/food", "/shops", "/store"];
  let idx = -1;
  if (path === "/") idx = 0;
  else if (["/explore", "/destinations", "/attractions", "/search"].some((p) => path.startsWith(p))) idx = 1;
  else if (svc.some((p) => path.startsWith(p))) idx = 2;
  else if (["/cart", "/orders"].some((p) => path.startsWith(p))) idx = 3;
  else if (["/profile", "/bookings", "/favorites", "/notifications", "/admin"].some((p) => path.startsWith(p))) idx = 4;

  // Cells shrink on very narrow phones (320px) so the bar never touches the screen edges.
  const cell = "relative z-10 grid h-[var(--cell)] w-[var(--cell)] place-items-center";
  const tone = (i: number) => `transition-colors duration-300 ${idx === i ? "text-ink" : "text-white/75"}`;

  return (
    <>
      <nav
        aria-label="Primary"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-3 pb-[max(1rem,env(safe-area-inset-bottom))] lg:hidden"
        style={{ "--cell": "min(3.5rem, calc((100vw - 2.5rem) / 5))" } as React.CSSProperties}
      >
        <div className="glass-dark pointer-events-auto relative flex rounded-full p-2">
          <span
            aria-hidden
            className="absolute left-2 top-2 h-[var(--cell)] w-[var(--cell)] rounded-full bg-white shadow-lg transition-all duration-500 ease-[cubic-bezier(.3,1.35,.4,1)]"
            style={{ transform: `translateX(calc(var(--cell) * ${Math.max(idx, 0)})) scale(${idx < 0 ? 0 : 1})`, opacity: idx < 0 ? 0 : 1 }}
          />
          <Link href="/" aria-label="Home" aria-current={idx === 0 ? "page" : undefined} className={cell}>
            <Home size={22} className={tone(0)} />
          </Link>
          <Link href="/explore" aria-label="Explore" aria-current={idx === 1 ? "page" : undefined} className={cell}>
            <Compass size={22} className={tone(1)} />
          </Link>
          <button onClick={() => setOpen(true)} aria-label="All services" aria-haspopup="dialog" className={cell}>
            <span className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-brand-400 via-brand-600 to-brand-800 text-white shadow-[0_6px_18px_-4px_rgba(124,58,237,0.75)] ring-1 ring-white/25 transition active:scale-90">
              <LayoutGrid size={19} strokeWidth={2.2} />
            </span>
          </button>
          <Link href="/cart" aria-label="Bag" aria-current={idx === 3 ? "page" : undefined} className={cell}>
            <ShoppingBag size={22} className={tone(3)} />
            {cartCount > 0 && <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-brand-500 px-1 text-[9px] font-bold text-white">{cartCount}</span>}
          </Link>
          <Link href="/profile" aria-label="Profile" aria-current={idx === 4 ? "page" : undefined} className={cell}>
            <User size={22} className={tone(4)} />
          </Link>
        </div>
      </nav>

      {open && (
        <div className="fixed inset-0 z-[90] lg:hidden" role="dialog" aria-modal="true" aria-label="All services">
          <div className="fade-in absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="sheet-up glass-strong absolute inset-x-0 bottom-0 max-h-[88dvh] overflow-y-auto overscroll-contain rounded-t-[36px] p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-ink/15" />
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="font-display text-2xl font-semibold">Everything gowayy</h3>
              <button onClick={() => setOpen(false)} aria-label="Close" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ink/5">
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-x-3 gap-y-4">
              {SERVICES.map((s, i) => (
                <Link key={s.href} href={s.href} style={{ "--i": i } as React.CSSProperties} className="anim-pop flex flex-col items-center gap-2 text-center transition active:scale-95">
                  <span className={`grid h-16 w-16 place-items-center rounded-full bg-gradient-to-tr p-[2.5px] ${s.ring}`}>
                    <span className="grid h-full w-full place-items-center rounded-full bg-white p-[3px]">
                      <span className={`grid h-full w-full place-items-center rounded-full ${s.tile} ${s.fg}`}>
                        <s.icon size={28} />
                      </span>
                    </span>
                  </span>
                  <span className="text-sm font-bold">{s.label}</span>
                </Link>
              ))}
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2">
              {[
                { href: "/bookings", label: "My trips", icon: Luggage },
                { href: "/orders", label: "Orders", icon: Receipt },
                { href: "/favorites", label: "Saved", icon: Heart },
                { href: "/notifications", label: "Alerts", icon: Bell, badge: unread },
                { href: "/profile", label: "Wallet", icon: Wallet },
                { href: "/explore", label: "Explore", icon: Compass },
              ].map((l) => (
                <Link key={l.href + l.label} href={l.href} className="relative flex flex-col items-center gap-1.5 rounded-2xl bg-white/70 py-3 text-[11px] font-bold transition active:scale-95">
                  <l.icon size={19} className="text-brand-600" />
                  {l.label}
                  {!!l.badge && <span className="absolute right-3 top-2 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">{l.badge}</span>}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function AdminBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-bold uppercase text-brand-700">
      <ShieldCheck size={12} /> admin
    </span>
  );
}
