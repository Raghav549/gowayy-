"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell, Compass, Home, LayoutGrid, Loader2, MapPin, ShoppingBag, User, X, Heart, Receipt, Wallet, Luggage, ChevronDown, ShieldCheck,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { SearchBox } from "@/components/SearchBox";
import { Avatar } from "@/components/Avatar";
import { useApp } from "@/components/Providers";
import { NAV_LINKS, SERVICES } from "@/components/nav-data";
import { Portal } from "@/components/Portal";

type MenuPos = { right: number; maxH: number; top?: number; bottom?: number };

/** Where to draw the menu for a trigger: below it, or above when there's more room there. */
function measureMenu(el: HTMLElement): MenuPos | null {
  const r = el.getBoundingClientRect();
  const vh = window.innerHeight;
  if (r.bottom < 0 || r.top > vh) return null; // trigger scrolled away → close
  const right = Math.max(16, document.documentElement.clientWidth - r.right);
  // keep clear of the mobile bottom nav as well as the screen edge
  const nav = document.querySelector('nav[aria-label="Primary"]')?.getBoundingClientRect();
  const floor = nav && nav.height > 0 && nav.top > 0 && nav.top < vh ? nav.top : vh;
  const below = floor - r.bottom - 16;
  const above = r.top - 24;
  if (below < 240 && above > below) return { right, bottom: vh - r.top + 8, maxH: Math.min(416, above) };
  return { right, top: r.bottom + 8, maxH: Math.max(120, Math.min(416, below)) };
}

function LocationPicker({ light = false, compact = false }: { light?: boolean; compact?: boolean }) {
  const { dests, locSlug, setLoc, locPending } = useApp();
  // The menu is portalled to <body> and positioned from the trigger: cards and
  // headers use backdrop-filters/animations that create stacking contexts, which
  // let later page content paint over an in-place dropdown.
  const [pos, setPos] = useState<MenuPos | null>(null);
  const open = pos !== null;
  const btn = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const cur = dests.find((d) => d.slug === locSlug);

  // Close on outside tap / Escape; follow the trigger on scroll and resize.
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      const t = e.target as Node;
      if (btn.current?.contains(t) || menu.current?.contains(t)) return;
      setPos(null);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setPos(null);
    const follow = (e: Event) => {
      if (menu.current && e.target instanceof Node && menu.current.contains(e.target)) return; // scrolling the list itself
      if (btn.current) setPos(measureMenu(btn.current));
    };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    window.addEventListener("scroll", follow, { passive: true, capture: true });
    window.addEventListener("resize", follow);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", esc);
      window.removeEventListener("scroll", follow, { capture: true });
      window.removeEventListener("resize", follow);
    };
  }, [open]);

  return (
    <div className="relative min-w-0">
      <button
        ref={btn}
        onClick={() => setPos(open || !btn.current ? null : measureMenu(btn.current))}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`Location: ${cur?.name ?? "All hills"}`}
        aria-busy={locPending || undefined}
        className={`flex h-11 min-w-0 max-w-full items-center gap-1.5 rounded-full text-sm font-semibold transition ${compact ? "px-3" : "px-3.5"} ${light ? "bg-white/80 hover:bg-white" : "glass"}`}
      >
        {locPending ? <Loader2 size={16} className="shrink-0 animate-spin text-brand-600" /> : <MapPin size={16} className="shrink-0 text-brand-600" />}
        <span className={`truncate ${compact ? "max-w-[6.5rem] min-[380px]:max-w-[8.5rem]" : "max-w-28"}`}>{cur?.name ?? "All hills"}</span>
        <ChevronDown size={14} className={`shrink-0 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {pos && (
        <Portal>
          <div
            ref={menu}
            role="listbox"
            aria-label="Choose your area"
            style={{ top: pos.top, bottom: pos.bottom, right: pos.right, maxHeight: pos.maxH }}
            className="glass-strong anim-pop fixed z-[70] w-56 bg-white/95 max-w-[calc(100vw-2rem)] overflow-y-auto overscroll-contain rounded-3xl p-2 shadow-xl"
          >
            <p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wider text-ink/45">Deliver & discover in</p>
            {[{ slug: "", name: "All hills" }, ...dests].map((d) => (
              <button
                key={d.slug}
                role="option"
                aria-selected={d.slug === locSlug}
                onClick={() => {
                  setLoc(d.slug);
                  setPos(null);
                }}
                className={`flex w-full items-center justify-between gap-2 rounded-2xl px-3 py-2 text-left text-sm font-semibold transition hover:bg-brand-50 ${d.slug === locSlug ? "bg-brand-100 text-brand-800" : ""}`}
              >
                <span className="min-w-0 break-words">{d.name}</span>
                {d.slug === locSlug && <span className="h-2 w-2 shrink-0 rounded-full bg-brand-600" />}
              </button>
            ))}
          </div>
        </Portal>
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
        {/* Home has its own full-width search right below, so the header doesn't repeat it there. */}
        <div className="mx-auto min-w-0 flex-1 xl:max-w-xs">
          {path !== "/" && <SearchBox placeholder="Search gowayy…" />}
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

  const svc = ["/tours", "/hotels", "/cabs", "/grocery", "/food", "/shops", "/store", "/offers"];
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
                    <span className="block h-full w-full overflow-hidden rounded-full bg-white p-[3px]">
                      {/* eslint-disable-next-line @next/next/no-img-element -- small pre-sized local webp */}
                      <img src={s.img} alt="" width={120} height={120} decoding="async" draggable={false} className="h-full w-full rounded-full bg-brand-50 object-cover" />
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
