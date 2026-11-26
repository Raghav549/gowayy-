"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Minus, Plus, Trash2, Ticket, ArrowRight, MapPin, Bike } from "lucide-react";
import { Img } from "@/components/Img";
import { useApp } from "@/components/Providers";
import { PaymentSheet } from "@/components/PaymentSheet";
import { FREE_DELIVERY_ABOVE } from "@/lib/pricing";
import { inr } from "@/lib/utils";

export type CartLine = {
  productId: number; name: string; emoji: string; image: string; price: number; mrp: number; unit: string; veg: boolean;
  vendorId: number; vendorName: string; vendorSlug: string; deliveryFee: number; minOrder: number; etaMins: number;
};

export function CartClient({ lines, address: initialAddress }: { lines: CartLine[]; address: string }) {
  const { cart, setQty, clearCartLocal, toast } = useApp();
  const [address, setAddress] = useState(initialAddress);
  const [note, setNote] = useState("");
  const [code, setCode] = useState("");
  const [applied, setApplied] = useState<{ code: string; discount: number } | null>(null);
  const [checking, setChecking] = useState(false);
  const [open, setOpen] = useState(false);

  const live = lines.filter((l) => (cart[l.productId] ?? 0) > 0);
  const groups = useMemo(() => {
    const m = new Map<number, CartLine[]>();
    live.forEach((l) => m.set(l.vendorId, [...(m.get(l.vendorId) ?? []), l]));
    return [...m.values()];
  }, [live]);

  const perVendor = groups.map((g) => {
    const sub = g.reduce((s, l) => s + l.price * (cart[l.productId] ?? 0), 0);
    return { g, sub, fee: sub >= FREE_DELIVERY_ABOVE ? 0 : g[0].deliveryFee, min: g[0].minOrder };
  });
  const subtotal = perVendor.reduce((s, v) => s + v.sub, 0);
  const delivery = perVendor.reduce((s, v) => s + v.fee, 0);
  const discount = applied?.discount ?? 0;
  const total = subtotal + delivery - discount;
  const belowMin = perVendor.find((v) => v.sub < v.min);
  const saved = live.reduce((s, l) => s + (l.mrp - l.price) * (cart[l.productId] ?? 0), 0);

  async function validate(c: string, silent = false) {
    setChecking(true);
    try {
      const r = await fetch("/api/promo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: c, amount: subtotal, scope: "order" }) });
      const j = await r.json();
      if (j.ok) {
        setApplied({ code: j.code, discount: j.discount });
        if (!silent) toast(`${j.code} applied — you save ${inr(j.discount)}`);
      } else {
        setApplied(null);
        if (!silent) toast(j.error, "err");
      }
    } finally {
      setChecking(false);
    }
  }
  // Re-price an applied coupon when the amount changes (debounced, so rapid
  // quantity taps make one request instead of one per tap).
  useEffect(() => {
    if (!applied) return;
    const t = setTimeout(() => validate(applied.code, true), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotal]);

  if (!live.length)
    return (
      <div className="glass anim-up mx-auto my-10 max-w-md rounded-[32px] p-8 text-center">
        <div className="float text-5xl">🛍️</div>
        <h3 className="font-display mt-4 text-xl font-semibold">Your bag is empty</h3>
        <p className="mt-1 text-sm text-ink/60">Add groceries, dishes or local goodies to get started.</p>
        <div className="mt-5 flex justify-center gap-2">
          <Link href="/grocery" className="btn btn-brand">Grocery</Link>
          <Link href="/food" className="btn btn-light">Food</Link>
        </div>
      </div>
    );

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <div className="space-y-5">
        {perVendor.map(({ g, sub, fee, min }) => (
          <section key={g[0].vendorId} className="anim-up">
            <div className="mb-2 flex items-center justify-between px-1">
              <Link href={`/store/${g[0].vendorSlug}`} className="font-display text-lg font-semibold">{g[0].vendorName}</Link>
              <span className="flex items-center gap-1 text-xs font-semibold text-ink/55"><Bike size={13} /> ~{g[0].etaMins} min · {fee ? inr(fee) : "free delivery"}</span>
            </div>
            <div className="space-y-2.5">
              {g.map((l) => {
                const q = cart[l.productId] ?? 0;
                return (
                  <div key={l.productId} className="glass-strong anim-pop flex items-center gap-3 rounded-[28px] p-2.5">
                    <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-[20px] bg-gradient-to-br from-brand-100 to-pink-50 text-4xl">
                      {l.image ? <Img src={l.image} alt={l.name} className="h-full w-full object-cover" /> : l.emoji}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-bold leading-snug">{l.name}</p>
                      <p className="font-display text-lg font-semibold">{inr(l.price)}</p>
                      <p className="text-xs text-ink/50">{l.unit}</p>
                    </div>
                    <div className="flex flex-col items-center gap-1 rounded-full bg-white p-1 shadow-md ring-1 ring-brand-100">
                      <button onClick={() => setQty(l.productId, q + 1)} aria-label="Add one" className="grid h-8 w-8 place-items-center rounded-full transition hover:bg-brand-50 active:scale-75"><Plus size={15} /></button>
                      <span className="text-sm font-bold tabular-nums">{String(q).padStart(2, "0")}</span>
                      <button onClick={() => setQty(l.productId, q - 1)} aria-label="Remove one" className="grid h-8 w-8 place-items-center rounded-full transition hover:bg-brand-50 active:scale-75"><Minus size={15} /></button>
                    </div>
                    <button onClick={() => setQty(l.productId, 0)} aria-label={`Remove ${l.name}`} className="grid h-20 w-12 place-items-center rounded-full bg-rose-500 text-white transition hover:bg-rose-600 active:scale-90"><Trash2 size={18} /></button>
                  </div>
                );
              })}
            </div>
            {sub < min && <p className="mt-2 rounded-2xl bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-800">Add {inr(min - sub)} more from {g[0].vendorName} (minimum {inr(min)})</p>}
          </section>
        ))}
      </div>

      <aside className="space-y-4 lg:sticky lg:top-28 lg:self-start">
        <div className="glass-strong rounded-[32px] p-5">
          <label className="mb-2 flex items-center gap-1.5 text-xs font-bold text-ink/55"><MapPin size={13} /> Delivery address</label>
          <textarea className="input" rows={2} placeholder="House no., street, landmark, town" value={address} onChange={(e) => setAddress(e.target.value)} />
          <input className="input mt-2" placeholder="Note for the rider (optional)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />
        </div>

        <div className="glass-strong rounded-[32px] p-5">
          <div className="flex gap-2">
            <label className="flex h-12 min-w-0 flex-1 items-center gap-2 rounded-full bg-white px-4 ring-1 ring-brand-100 focus-within:ring-2 focus-within:ring-brand-400">
              <Ticket size={16} className="text-brand-600" />
              <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Promo code or vouchers" className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none" />
            </label>
            <button disabled={!code || checking} onClick={() => validate(code)} aria-label="Apply promo" className="grid h-12 w-12 place-items-center rounded-full bg-lav transition hover:bg-brand-100">
              {checking ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={18} />}
            </button>
          </div>
          <p className="mt-1.5 px-2 text-[11px] text-ink/45">Try WELCOME100 (₹100 off above ₹399)</p>

          <div className="mt-4 space-y-2.5 text-sm">
            <div className="flex items-baseline justify-between"><span className="text-ink/60">Sub total</span><span className="font-display text-lg font-semibold">{inr(subtotal)}</span></div>
            <div className="flex items-baseline justify-between"><span className="text-ink/60">Delivery</span><span className="font-display text-lg font-semibold">{delivery ? inr(delivery) : "Free"}</span></div>
            {discount > 0 && <div className="flex items-baseline justify-between text-emerald-600"><span>Promo {applied?.code}</span><span className="font-display text-lg font-semibold">−{inr(discount)}</span></div>}
            {saved > 0 && <p className="rounded-2xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">You&apos;re saving {inr(saved + discount)} on this order</p>}
            <div className="flex items-baseline justify-between border-t border-dashed border-brand-200 pt-3"><span className="font-semibold">Total</span><span className="font-display text-3xl font-semibold">{inr(total)}</span></div>
          </div>

          <button
            disabled={!!belowMin || address.trim().length < 6}
            onClick={() => setOpen(true)}
            className="btn btn-dark mt-4 h-14 w-full justify-between pl-6 pr-5 text-base"
          >
            <span>{address.trim().length < 6 ? "Add delivery address" : belowMin ? "Minimum order not met" : "Proceed to Checkout"}</span>
            <ArrowRight size={18} />
          </button>
        </div>
      </aside>

      <PaymentSheet
        open={open}
        onClose={() => setOpen(false)}
        amount={total}
        allowCod
        onPay={async (payment) => {
          const r = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ address, note, coupon: applied?.code ?? "", payment }) });
          const j = await r.json();
          if (!j.ok) return { error: j.error };
          clearCartLocal();
          return { redirect: j.redirect };
        }}
      />
    </div>
  );
}
