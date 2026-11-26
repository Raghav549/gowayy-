"use client";

import { useEffect, useState } from "react";
import { Loader2, Ticket } from "lucide-react";
import { useApp } from "@/components/Providers";
import { PaymentSheet, type PayInput } from "@/components/PaymentSheet";
import { inr } from "@/lib/utils";

export type Extra = { label: string; subtotal: number; taxRate: number; discount: number };

export function BookingPanel({
  subtotal, taxRate, lines = [], extras = [], cta, disabled, disabledReason, allowCod, codLabel, buildBody, title = "Price summary",
}: {
  subtotal: number;
  taxRate: number;
  lines?: { label: string; value: number }[];
  extras?: Extra[];
  cta: string;
  disabled?: boolean;
  disabledReason?: string;
  allowCod?: boolean;
  codLabel?: string;
  title?: string;
  buildBody: (pay: PayInput, coupon: string) => object;
}) {
  const { requireAuth, toast } = useApp();
  const [code, setCode] = useState("");
  const [applied, setApplied] = useState<{ code: string; discount: number; description: string } | null>(null);
  const [checking, setChecking] = useState(false);
  const [open, setOpen] = useState(false);

  async function validate(c: string, silent = false) {
    setChecking(true);
    try {
      const r = await fetch("/api/promo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: c, amount: subtotal, scope: "booking" }) });
      const j = await r.json();
      if (j.ok) {
        setApplied({ code: j.code, discount: j.discount, description: j.description });
        if (!silent) toast(`${j.code} applied — you save ${inr(j.discount)}`);
      } else {
        setApplied(null);
        toast(j.error, "err");
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

  const discount = applied?.discount ?? 0;
  const mainTax = Math.round((subtotal - discount) * taxRate);
  const extraTotal = extras.reduce((s, e) => s + e.subtotal - e.discount + Math.round((e.subtotal - e.discount) * e.taxRate), 0);
  const total = subtotal - discount + mainTax + extraTotal;

  return (
    <div className="glass-strong rounded-[32px] p-5">
      <h3 className="font-display text-xl font-semibold">{title}</h3>
      <div className="mt-3 space-y-2 text-sm">
        {lines.map((l) => (
          <div key={l.label} className="flex justify-between text-ink/70"><span>{l.label}</span><span className="font-semibold text-ink">{inr(l.value)}</span></div>
        ))}
        {extras.map((e) => (
          <div key={e.label} className="flex justify-between text-ink/70"><span>{e.label} <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">-5% bundle</span></span><span className="font-semibold text-ink">{inr(e.subtotal - e.discount)}</span></div>
        ))}
        {discount > 0 && <div className="flex justify-between text-emerald-600"><span>Promo {applied?.code}</span><span className="font-semibold">−{inr(discount)}</span></div>}
        <div className="flex justify-between text-ink/70"><span>Taxes & fees</span><span className="font-semibold text-ink">{inr(mainTax + extras.reduce((s, e) => s + Math.round((e.subtotal - e.discount) * e.taxRate), 0))}</span></div>
      </div>

      <div className="mt-4 flex gap-2">
        <label className="flex h-12 min-w-0 flex-1 items-center gap-2 rounded-2xl bg-white/80 px-3 ring-1 ring-brand-100 focus-within:ring-2 focus-within:ring-brand-400">
          <Ticket size={16} className="text-brand-600" />
          <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Promo code" className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none" />
        </label>
        <button disabled={!code || checking || subtotal <= 0} onClick={() => validate(code)} className="btn btn-light h-12">{checking ? <Loader2 size={16} className="animate-spin" /> : "Apply"}</button>
      </div>
      <p className="mt-1.5 text-[11px] text-ink/45">Try HILLS10, GOWAYY15 or FIRSTRIDE</p>

      <div className="mt-4 flex items-end justify-between border-t border-dashed border-brand-200 pt-4">
        <span className="text-sm font-semibold text-ink/60">Total</span>
        <span className="font-display text-3xl font-semibold">{inr(total)}</span>
      </div>
      <button
        disabled={disabled}
        onClick={() => requireAuth() && setOpen(true)}
        className="btn btn-brand mt-4 h-14 w-full text-base"
      >
        {disabled && disabledReason ? disabledReason : cta}
      </button>

      <PaymentSheet
        open={open}
        onClose={() => setOpen(false)}
        amount={total}
        allowCod={allowCod}
        codLabel={codLabel}
        onPay={async (pay) => {
          const r = await fetch("/api/bookings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(buildBody(pay, applied?.code ?? "")) });
          const j = await r.json();
          return j.ok ? { redirect: j.redirect } : { error: j.error };
        }}
      />
    </div>
  );
}
