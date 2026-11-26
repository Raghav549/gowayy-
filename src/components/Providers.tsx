"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CheckCircle2, AlertCircle } from "lucide-react";

export type AppUser = {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: string;
  wallet: number;
  address: string;
  avatar: string;
} | null;

type ToastItem = { id: number; msg: string; tone: "ok" | "err" };

type Ctx = {
  user: AppUser;
  cart: Record<number, number>;
  cartCount: number;
  qtyOf: (productId: number) => number;
  setQty: (productId: number, qty: number) => Promise<void>;
  clearCartLocal: () => void;
  favs: string[];
  isFav: (kind: string, id: number) => boolean;
  toggleFav: (kind: string, id: number) => Promise<void>;
  unread: number;
  toast: (msg: string, tone?: "ok" | "err") => void;
  locSlug: string;
  setLoc: (slug: string) => void;
  /** true while the page re-renders for a newly chosen area */
  locPending: boolean;
  dests: { slug: string; name: string }[];
  requireAuth: () => boolean;
};

const AppCtx = createContext<Ctx>(null as unknown as Ctx);
export const useApp = () => useContext(AppCtx);

const PENDING_ADD = "gw_pending_add";

export function Providers(props: {
  user: AppUser;
  initialCart: Record<number, number>;
  initialFavs: string[];
  unread: number;
  locSlug: string;
  dests: { slug: string; name: string }[];
  children: ReactNode;
}) {
  const { user, children } = props;
  const router = useRouter();
  const pathname = usePathname();
  const [cart, setCart] = useState(props.initialCart);
  const cartRef = useRef(cart);
  useEffect(() => {
    cartRef.current = cart; // latest cart for optimistic-update rollbacks
  }, [cart]);
  const [favs, setFavs] = useState(props.initialFavs);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [locSlug, setLocSlug] = useState(props.locSlug);
  const [locPending, startLoc] = useTransition();

  const toast = useCallback((msg: string, tone: "ok" | "err" = "ok") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  const requireAuth = useCallback(() => {
    if (user) return true;
    toast("Sign in to continue", "err");
    // come back to exactly this view (filters and search included) after signing in
    const here = typeof window === "undefined" ? pathname || "/" : window.location.pathname + window.location.search;
    router.push(`/auth?next=${encodeURIComponent(here)}`);
    return false;
  }, [user, toast, router, pathname]);

  const setQty = useCallback(
    async (productId: number, qty: number) => {
      if (!user && qty > 0) {
        // Remember what they tapped: it lands in the bag as soon as they're signed in.
        try {
          sessionStorage.setItem(PENDING_ADD, JSON.stringify({ productId, qty, at: Date.now() }));
        } catch {}
      }
      if (!requireAuth()) return;
      const prev = cartRef.current[productId] ?? 0;
      const apply = (q: number) =>
        setCart((c) => {
          const n = { ...c };
          if (q <= 0) delete n[productId];
          else n[productId] = q;
          return n;
        });
      apply(qty);
      try {
        const r = await fetch("/api/cart", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId, qty }) });
        const j = await r.json();
        if (!j.ok) throw new Error(j.error);
      } catch (e) {
        apply(prev);
        toast(e instanceof Error ? e.message : "Could not update bag", "err");
      }
    },
    [user, requireAuth, toast],
  );

  // Finish an "Add" that was tapped while signed out (see setQty above).
  useEffect(() => {
    if (!user) return;
    // Deferred, and the entry is only consumed inside the timer, so an effect that is
    // set up, torn down and set up again (React dev mode) still adds exactly once.
    const t = setTimeout(() => {
      let pending: { productId: number; qty: number; at: number } | null = null;
      try {
        pending = JSON.parse(sessionStorage.getItem(PENDING_ADD) ?? "null");
        sessionStorage.removeItem(PENDING_ADD);
      } catch {}
      if (!pending || Date.now() - pending.at > 30 * 60 * 1000 || cartRef.current[pending.productId]) return;
      const { productId, qty } = pending;
      setQty(productId, qty).then(() => {
        if (cartRef.current[productId]) toast("Added to your bag");
      });
    }, 0);
    return () => clearTimeout(t);
  }, [user, setQty, toast]);

  const toggleFav = useCallback(
    async (kind: string, id: number) => {
      if (!requireAuth()) return;
      const key = `${kind}:${id}`;
      const had = favs.includes(key);
      setFavs((f) => (had ? f.filter((x) => x !== key) : [...f, key]));
      try {
        const r = await fetch("/api/favorites", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, refId: id }) });
        const j = await r.json();
        if (!j.ok) throw new Error(j.error);
        toast(j.saved ? "Saved to favourites" : "Removed from favourites");
      } catch {
        setFavs((f) => (had ? [...f, key] : f.filter((x) => x !== key)));
        toast("Could not update favourites", "err");
      }
    },
    [favs, requireAuth, toast],
  );

  const setLoc = useCallback(
    (slug: string) => {
      const secure = location.protocol === "https:" ? "; secure" : "";
      document.cookie = `gw_loc=${encodeURIComponent(slug)}; path=/; max-age=31536000; samesite=lax${secure}`;
      setLocSlug(slug);
      // re-render the server pages for the new area; the picker shows progress meanwhile
      startLoc(() => router.refresh());
    },
    [router],
  );

  const value = useMemo<Ctx>(
    () => ({
      user,
      cart,
      cartCount: Object.values(cart).reduce((s, n) => s + n, 0),
      qtyOf: (id) => cart[id] ?? 0,
      setQty,
      clearCartLocal: () => setCart({}),
      favs,
      isFav: (k, id) => favs.includes(`${k}:${id}`),
      toggleFav,
      unread: props.unread,
      toast,
      locSlug,
      setLoc,
      locPending,
      dests: props.dests,
      requireAuth,
    }),
    [user, cart, setQty, favs, toggleFav, props.unread, toast, locSlug, setLoc, locPending, props.dests, requireAuth],
  );

  return (
    <AppCtx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[200] flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div key={t.id} className="glass-strong anim-pop pointer-events-auto flex items-center gap-2 rounded-full py-2.5 pl-3 pr-5 text-sm font-semibold shadow-xl">
            {t.tone === "ok" ? <CheckCircle2 size={18} className="text-emerald-500" /> : <AlertCircle size={18} className="text-rose-500" />}
            {t.msg}
          </div>
        ))}
      </div>
    </AppCtx.Provider>
  );
}
