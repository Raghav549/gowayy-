"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Loader2, MapPin, Phone, RotateCcw, Store } from "lucide-react";
import { Img } from "@/components/Img";
import { useApp } from "@/components/Providers";
import { StatusPill } from "@/components/ui";
import { inr } from "@/lib/utils";

type Order = {
  id: number; code: string; status: string; subtotal: number; deliveryFee: number; discount: number; total: number; address: string;
  paymentMethod: string; paymentStatus: string; riderName: string; riderPhone: string; createdAt: string | Date; couponCode: string;
};
type Item = { id: number; name: string; emoji: string; image: string; price: number; qty: number };
type Event = { id: number; status: string; note: string; createdAt: string | Date };
type Vendor = { name: string; slug: string; etaMins: number; area: string };
export type OrderPayload = { order: Order; items: Item[]; events: Event[]; vendor: Vendor };

const STEPS = [
  ["placed", "Placed"],
  ["confirmed", "Confirmed"],
  ["preparing", "Preparing"],
  ["out_for_delivery", "On the way"],
  ["delivered", "Delivered"],
] as const;
const HEAD: Record<string, [string, string]> = {
  placed: ["Order placed", "Waiting for the store to accept"],
  confirmed: ["Order confirmed", "The store is getting started"],
  preparing: ["Packing your order", "Fresh and careful"],
  out_for_delivery: ["Your package is on the way", "Your rider is heading to you"],
  delivered: ["Delivered!", "Enjoy — thanks for choosing gowayy"],
  cancelled: ["Order cancelled", "This order was cancelled"],
};

export function OrderTracker({ initial }: { initial: OrderPayload }) {
  const [data, setData] = useState(initial);
  const { toast } = useApp();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const last = useRef(initial.order.status);
  const { order: o, items, events, vendor } = data;
  const final = o.status === "delivered" || o.status === "cancelled";

  useEffect(() => {
    if (final) return;
    const t = setInterval(async () => {
      try {
        const r = await fetch(`/api/orders/${o.code}`, { cache: "no-store" });
        const j = await r.json();
        if (j.ok) {
          setData(j);
          if (j.order.status !== last.current) {
            last.current = j.order.status;
            toast(HEAD[j.order.status]?.[0] ?? "Order updated");
            router.refresh();
          }
        }
      } catch {}
    }, 4000);
    return () => clearInterval(t);
  }, [final, o.code, toast, router]);

  const step = Math.max(0, STEPS.findIndex((s) => s[0] === o.status));
  const pct = o.status === "cancelled" ? 0 : (step / (STEPS.length - 1)) * 100;
  const [h1, h2] = HEAD[o.status] ?? HEAD.placed;
  const eta = Math.max(1, vendor.etaMins - Math.round(((Date.now() - new Date(o.createdAt).getTime()) / 60000) * 4));

  async function cancel() {
    if (!confirm("Cancel this order?")) return;
    setBusy(true);
    const r = await fetch(`/api/orders/${o.code}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "cancel" }) });
    const j = await r.json();
    setBusy(false);
    if (!j.ok) return toast(j.error, "err");
    toast("Order cancelled");
    const rr = await fetch(`/api/orders/${o.code}`, { cache: "no-store" });
    const jj = await rr.json();
    if (jj.ok) setData(jj);
    router.refresh();
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <div className="glass-strong relative overflow-hidden rounded-[36px] p-6 text-center">
          <div className="pointer-events-none absolute -top-16 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-brand-300/50 blur-3xl" />
          <div className="relative mx-auto grid h-36 w-36 place-items-center">
            <div className="absolute bottom-3 h-6 w-32 rounded-[100%] bg-brand-300/60 blur-sm" />
            <span className={`text-8xl drop-shadow-xl ${o.status === "out_for_delivery" ? "ride" : final ? "" : "float"}`}>{o.status === "delivered" ? "📦" : o.status === "cancelled" ? "🚫" : "🛵"}</span>
          </div>
          <h2 className="font-display relative mt-1 text-3xl font-semibold">Order Status</h2>
          <p className="relative text-sm font-semibold text-brand-700">{h1}</p>
          <p className="relative text-xs text-ink/55">{h2}{o.status === "out_for_delivery" ? ` · arriving in ~${eta} min` : ""}</p>

          {o.status !== "cancelled" && (
            <div className="relative mt-7 px-2">
              <div className="absolute left-5 right-5 top-3 h-1.5 rounded-full bg-ink/10"><div className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-700 transition-all duration-1000" style={{ width: `${pct}%` }} /></div>
              <div className="relative flex justify-between">
                {STEPS.map(([k, label], i) => (
                  <div key={k} className="flex w-14 flex-col items-center gap-1.5">
                    <span className={`grid h-7 w-7 place-items-center rounded-full text-[10px] font-bold transition-all duration-500 ${i < step ? "bg-brand-600 text-white" : i === step ? "scale-110 bg-ink text-white ring-4 ring-brand-200" : "bg-white text-ink/40 ring-1 ring-ink/10"}`}>
                      {i < step || o.status === "delivered" ? <Check size={13} /> : i + 1}
                    </span>
                    <span className={`text-[10px] font-semibold leading-tight ${i <= step ? "text-ink" : "text-ink/40"}`}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {!final && (
          <div className="glass flex items-center gap-3 rounded-3xl p-4">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-brand-300 to-brand-600 text-lg font-bold text-white">{o.riderName[0]}</span>
            <div className="min-w-0 flex-1">
              <p className="font-bold">{o.riderName}</p>
              <p className="text-xs text-ink/55">Your gowayy rider</p>
            </div>
            <a href={`tel:${o.riderPhone}`} className="btn btn-dark btn-sm"><Phone size={14} /> Call</a>
          </div>
        )}

        <div className="glass rounded-3xl p-4">
          <h3 className="font-display mb-3 text-lg font-semibold">Timeline</h3>
          <ol className="space-y-3">
            {events.map((e, i) => (
              <li key={e.id} className="flex gap-3">
                <span className={`mt-1 h-3 w-3 shrink-0 rounded-full ${i === 0 ? "bg-brand-600 ring-4 ring-brand-200" : "bg-ink/20"}`} />
                <div>
                  <p className="text-sm font-bold capitalize">{e.status.replace(/_/g, " ")}</p>
                  <p className="text-xs text-ink/55">{e.note} · {new Date(e.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="space-y-4">
        <div className="glass-strong rounded-[32px] p-4">
          <Link href={`/store/${vendor.slug}`} className="mb-3 flex items-center gap-2 px-1 text-sm font-bold text-brand-700"><Store size={15} /> {vendor.name}</Link>
          <div className="space-y-2">
            {items.map((it) => (
              <div key={it.id} className="flex items-center gap-3 rounded-3xl bg-white p-2.5">
                <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-brand-50 text-3xl">{it.image ? <Img src={it.image} alt={it.name} className="h-full w-full object-cover" /> : it.emoji}</div>
                <div className="min-w-0 flex-1"><p className="line-clamp-1 text-sm font-bold">{it.name}</p><p className="text-xs text-ink/55">Qty {it.qty} × {inr(it.price)}</p></div>
                <p className="font-display font-semibold">{inr(it.price * it.qty)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-strong rounded-[32px] p-5">
          <h3 className="font-display text-lg font-semibold">Payment Summary</h3>
          <dl className="mt-3 space-y-2 text-sm">
            <Row k="Subtotal" v={inr(o.subtotal)} />
            <Row k="Delivery fee" v={o.deliveryFee ? inr(o.deliveryFee) : "Free"} />
            {o.discount > 0 && <Row k={`Promo ${o.couponCode}`} v={`−${inr(o.discount)}`} />}
            <div className="border-t border-dashed border-brand-200 pt-2"><Row k="Total Amount" v={inr(o.total)} bold /></div>
          </dl>
          <h3 className="font-display mt-5 text-lg font-semibold">Order details</h3>
          <dl className="mt-3 space-y-2 text-sm">
            <Row k="Order ID" v={o.code} bold />
            <Row k="Payment" v={<span className="flex items-center gap-2 capitalize">{o.paymentMethod} <StatusPill status={o.paymentStatus} /></span>} />
            <Row k="Status" v={<StatusPill status={o.status} />} />
            <Row k="Placed" v={new Date(o.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} />
            <div className="flex items-start justify-between gap-6"><dt className="flex shrink-0 items-center gap-1 text-ink/55"><MapPin size={13} /> Address</dt><dd className="text-right font-semibold">{o.address}</dd></div>
          </dl>
          <div className="mt-5 flex gap-2">
            {["placed", "confirmed"].includes(o.status) && (
              <button onClick={cancel} disabled={busy} className="btn btn-light flex-1 text-rose-600">{busy ? <Loader2 size={16} className="animate-spin" /> : "Cancel order"}</button>
            )}
            {final && <Link href={`/store/${vendor.slug}`} className="btn btn-dark flex-1"><RotateCcw size={15} /> Order again</Link>}
            {!final && <Link href="/orders" className="btn btn-dark flex-1">All orders</Link>}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v, bold }: { k: string; v: React.ReactNode; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-ink/55">{k}</dt>
      <dd className={bold ? "font-display text-lg font-semibold" : "font-semibold"}>{v}</dd>
    </div>
  );
}
