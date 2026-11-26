"use client";

import { Minus, Plus } from "lucide-react";
import { Img } from "@/components/Img";
import { useApp } from "@/components/Providers";
import { inr } from "@/lib/utils";

export type ProductLite = {
  id: number;
  name: string;
  emoji: string;
  image: string;
  price: number;
  mrp: number;
  unit: string;
  veg: boolean;
  tag: string;
  available: boolean;
  description: string;
  category: string;
};

const TILE: Record<string, string> = {
  "Fresh produce": "from-emerald-100 to-lime-50",
  "Dairy & eggs": "from-sky-100 to-blue-50",
  Bakery: "from-amber-100 to-orange-50",
  Staples: "from-yellow-100 to-amber-50",
  Snacks: "from-rose-100 to-orange-50",
  Beverages: "from-teal-100 to-cyan-50",
  "Meat & fish": "from-red-100 to-rose-50",
  "Hill essentials": "from-violet-100 to-fuchsia-50",
};

export function Stepper({ id }: { id: number }) {
  const { qtyOf, setQty } = useApp();
  const q = qtyOf(id);
  if (!q)
    return (
      <button onClick={() => setQty(id, 1)} aria-label="Add to bag" className="ml-auto flex h-10 shrink-0 items-center gap-1 rounded-full bg-white px-3 text-xs font-bold shadow-md ring-1 ring-brand-100 transition hover:bg-brand-50 active:scale-90">
        Add <Plus size={14} />
      </button>
    );
  return (
    <div className="anim-pop ml-auto flex h-10 shrink-0 items-center gap-1 rounded-full bg-ink px-1 text-white shadow-md">
      <button onClick={() => setQty(id, q - 1)} aria-label="Remove one" className="grid h-8 w-8 place-items-center rounded-full transition hover:bg-white/15 active:scale-75">
        <Minus size={14} />
      </button>
      <span className="w-5 text-center text-sm font-bold tabular-nums">{q}</span>
      <button onClick={() => setQty(id, q + 1)} aria-label="Add one more" className="grid h-8 w-8 place-items-center rounded-full transition hover:bg-white/15 active:scale-75">
        <Plus size={14} />
      </button>
    </div>
  );
}

export function ProductCard({ p, i = 0, vendor }: { p: ProductLite; i?: number; vendor?: string }) {
  const off = p.mrp > p.price ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0;
  return (
    <div id={`p${p.id}`} style={{ "--i": i % 8 } as React.CSSProperties} className="anim-up lift glass-strong relative flex flex-col rounded-[28px] p-2">
      <div className={`relative grid h-32 place-items-center overflow-hidden rounded-[22px] bg-gradient-to-br ${TILE[p.category] ?? "from-brand-100 to-pink-50"}`}>
        {p.image ? <Img src={p.image} alt={p.name} className="h-full w-full object-cover" /> : <span className="float text-6xl drop-shadow-md">{p.emoji}</span>}
        {off > 0 && <span className="absolute left-2 top-2 rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-bold text-white">{off}% off</span>}
        {p.tag && <span className="absolute bottom-2 left-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-brand-700">{p.tag}</span>}
        {!p.available && <div className="absolute inset-0 grid place-items-center bg-white/70 text-xs font-bold backdrop-blur-sm">Sold out</div>}
      </div>
      <div className="flex flex-1 flex-col px-2 pb-1 pt-2.5">
        <div className="flex items-start gap-1.5">
          <span className={`mt-1 grid h-3.5 w-3.5 shrink-0 place-items-center rounded-[3px] border ${p.veg ? "border-emerald-600" : "border-rose-600"}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${p.veg ? "bg-emerald-600" : "bg-rose-600"}`} />
          </span>
          <h3 className="line-clamp-2 text-[13px] font-bold leading-snug">{p.name}</h3>
        </div>
        <p className="mt-0.5 text-[11px] text-ink/50">{vendor ? `${vendor} · ` : ""}{p.unit}</p>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-x-2 gap-y-2 pt-2.5">
          <p className="flex min-w-0 flex-col leading-none">
            <span className="font-display text-lg font-semibold">{inr(p.price)}</span>
            {off > 0 && <span className="mt-0.5 text-[11px] text-ink/40 line-through">{inr(p.mrp)}</span>}
          </p>
          {p.available && <Stepper id={p.id} />}
        </div>
      </div>
    </div>
  );
}
