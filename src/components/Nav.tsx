"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell, Compass, Home, MapPin, ShoppingBag, Sparkles, User, X, Heart, Receipt, Wallet, Luggage, ChevronDown, ShieldCheck,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { SearchBox } from "@/components/SearchBox";
import { useApp } from "@/components/Providers";
import { NAV_LINKS, SERVICES } from "@/components/nav-data";

function LocationPicker({ light = false }: { light?: boolean }) {
  const { dests, locSlug, setLoc } = useApp();
  const [open, setOpen] = useState(false);
  const cur = dests.find((d) => d.slug === locSlug);
  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className={`flex h-11 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold transition ${light ? "bg-white/80 hover:bg-white" : "glass"}`}>
        <MapPin size={16} className="text-brand-600" />
        <span className="max-w-28 truncate">{cur?.name ?? "All hills"}</span>
        <ChevronDown size={14} className={`transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="glass-strong anim-pop absolute right-0 top-full z-50 mt-2 w-56 rounded-3xl p-2">
            <p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wider text-ink/45">Deliver & discover in</p>
            {[{ slug: "", name: "All hills" }, ...dests].map((d) => (
              <button
                key={d.slug}
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
        </>
      )}
    </div>
  );
}

export { LocationPicker };

export function TopNav() {
  const path = usePathname();
  const { user, cartCount, unread } = useApp();
  if (path.startsWith("/auth")) return null;
  return (
    <header className="fixed inset-x-0 top-0 z-40 hidden lg:block">
      <div className="glass-strong mx-auto mt-4 flex h-[68px] max-w-6xl items-center gap-5 rounded-full px-5">
        <Link href="/" aria-label="gowayy home">
          <Logo size={34} />
        </Link>
        <nav className="flex items-center gap-1">
          {NAV_LINKS.map((l) => {
            const on = path.startsWith(l.href);
            return (
              <Link key={l.href} href={l.href} className={`rounded-full px-3.5 py-2 text-sm font-semibold transition ${on ? "bg-ink text-white" : "text-ink/70 hover:bg-brand-50"}`}>
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="mx-auto w-full max-w-xs">
          <SearchBox placeholder="Search gowayy…" />
        </div>
        <LocationPicker light />
        <Link href="/notifications" aria-label="Notifications" className="relative grid h-11 w-11 place-items-center rounded-full bg-white/80 transition hover:bg-white">
          <Bell size={18} />
          {unread > 0 && <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white" />}
        </Link>
        <Link href="/cart" aria-label="Bag" className="relative grid h-11 w-11 place-items-center rounded-full bg-white/80 transition hover:bg-white">
          <ShoppingBag size={18} />
          {cartCount > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">{cartCount}</span>}
        </Link>
        {user ? (
          <Link href="/profile" className="flex h-11 items-center gap-2 rounded-full bg-ink pl-1.5 pr-4 text-sm font-semibold text-white">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-brand-300 to-brand-600 text-xs font-bold">{user.name[0]?.toUpperCase()}</span>
            {user.name.split(" ")[0]}
          </Link>
        ) : (
          <Link href="/auth" className="btn btn-dark btn-sm">
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}

export function BottomNav() {
  const path = usePathname();
  const { cartCount } = useApp();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [path]);

  if (path.startsWith("/auth")) return null;

  const svc = ["/tours", "/hotels", "/cabs", "/grocery", "/food", "/shops", "/store"];
  let idx = -1;
  if (path === "/") idx = 0;
  else if (["/explore", "/destinations", "/attractions", "/search"].some((p) => path.startsWith(p))) idx = 1;
  else if (svc.some((p) => path.startsWith(p))) idx = 2;
  else if (["/cart", "/orders"].some((p) => path.startsWith(p))) idx = 3;
  else if (["/profile", "/bookings", "/favorites", "/notifications", "/admin"].some((p) => path.startsWith(p))) idx = 4;

  const cell = "relative z-10 grid h-14 w-14 place-items-center";
  const tone = (i: number) => `transition-colors duration-300 ${idx === i ? "text-ink" : "text-white/75"}`;

  return (
    <>
      <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] lg:hidden">
        <div className="glass-dark pointer-events-auto relative flex rounded-full p-2">
          <span
            className="absolute left-2 top-2 h-14 w-14 rounded-full bg-white shadow-lg transition-all duration-500 ease-[cubic-bezier(.3,1.35,.4,1)]"
            style={{ transform: `translateX(${Math.max(idx, 0) * 56}px) scale(${idx < 0 ? 0 : 1})`, opacity: idx < 0 ? 0 : 1 }}
          />
          <Link href="/" aria-label="Home" className={cell}>
            <Home size={22} className={tone(0)} />
          </Link>
          <Link href="/explore" aria-label="Explore" className={cell}>
            <Compass size={22} className={tone(1)} />
          </Link>
          <button onClick={() => setOpen(true)} aria-label="All services" className={cell}>
            <span className="orb grid h-11 w-11 place-items-center">
              <Sparkles size={18} className="text-white drop-shadow" style={{ animation: "spin 7s linear infinite reverse" }} />
            </span>
          </button>
          <Link href="/cart" aria-label="Bag" className={cell}>
            <ShoppingBag size={22} className={tone(3)} />
            {cartCount > 0 && <span className="absolute right-2 top-2 grid h-4 min-w-4 place-items-center rounded-full bg-brand-500 px-1 text-[9px] font-bold text-white">{cartCount}</span>}
          </Link>
          <Link href="/profile" aria-label="Profile" className={cell}>
            <User size={22} className={tone(4)} />
          </Link>
        </div>
      </nav>

      {open && (
        <div className="fixed inset-0 z-[90] lg:hidden">
          <div className="fade-in absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="sheet-up glass-strong absolute inset-x-0 bottom-0 rounded-t-[36px] p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-ink/15" />
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-display text-2xl font-semibold">Everything gowayy</h3>
                <p className="text-xs text-ink/55">One app for the whole journey</p>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close" className="grid h-10 w-10 place-items-center rounded-full bg-ink/5">
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {SERVICES.map((s, i) => (
                <Link key={s.href} href={s.href} style={{ "--i": i } as React.CSSProperties} className={`anim-pop flex flex-col items-center gap-2 rounded-3xl bg-gradient-to-b ${s.bg} p-4 text-center transition active:scale-95`}>
                  <s.icon size={26} className={s.fg} />
                  <span className="text-sm font-bold">{s.label}</span>
                </Link>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-4 gap-2">
              {[
                { href: "/bookings", label: "My trips", icon: Luggage },
                { href: "/orders", label: "Orders", icon: Receipt },
                { href: "/favorites", label: "Saved", icon: Heart },
                { href: "/profile", label: "Wallet", icon: Wallet },
              ].map((l) => (
                <Link key={l.href} href={l.href} className="flex flex-col items-center gap-1.5 rounded-2xl bg-white/70 py-3 text-[11px] font-bold transition active:scale-95">
                  <l.icon size={19} className="text-brand-600" />
                  {l.label}
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
