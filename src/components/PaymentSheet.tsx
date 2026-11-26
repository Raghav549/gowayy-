"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Banknote, CreditCard, Loader2, ShieldCheck, Smartphone, Wallet, X } from "lucide-react";
import { useApp } from "@/components/Providers";
import { inr } from "@/lib/utils";

export type PayInput = {
  method: "wallet" | "upi" | "card" | "cod";
  upi?: string;
  card?: { number: string; expiry: string; cvv: string; name?: string };
};

type Result = { error?: string; redirect?: string };

export function PaymentSheet({
  open, onClose, amount, title = "Complete payment", allowCod = false, codLabel = "Pay on delivery", noWallet = false, onPay,
}: {
  open: boolean;
  onClose: () => void;
  amount: number;
  title?: string;
  allowCod?: boolean;
  codLabel?: string;
  noWallet?: boolean;
  onPay: (p: PayInput) => Promise<Result>;
}) {
  const { user } = useApp();
  const router = useRouter();
  const wallet = user?.wallet ?? 0;
  const canWallet = !noWallet && wallet >= amount;
  const [method, setMethod] = useState<PayInput["method"]>("wallet");
  const [upi, setUpi] = useState("");
  const [card, setCard] = useState({ number: "", expiry: "", cvv: "", name: "" });
  const [phase, setPhase] = useState<"idle" | "busy" | "ok">("idle");
  const [err, setErr] = useState("");

  useEffect(() => {
    if (open) {
      setPhase("idle");
      setErr("");
      setMethod(canWallet ? "wallet" : "upi");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  async function pay() {
    setErr("");
    setPhase("busy");
    const input: PayInput = { method, upi: method === "upi" ? upi : undefined, card: method === "card" ? card : undefined };
    try {
      const r = await onPay(input);
      if (r.error) {
        setErr(r.error);
        setPhase("idle");
        return;
      }
      setPhase("ok");
      setTimeout(() => {
        if (r.redirect) router.push(r.redirect);
        router.refresh();
        onClose();
      }, 1300);
    } catch {
      setErr("Network error — please try again");
      setPhase("idle");
    }
  }

  const opt = (m: PayInput["method"], icon: React.ReactNode, label: string, sub: string, disabled = false) => (
    <button
      type="button"
      disabled={disabled}
      onClick={() => setMethod(m)}
      className={`flex w-full items-center gap-3 rounded-2xl p-3.5 text-left ring-1 transition ${method === m ? "bg-brand-50 ring-2 ring-brand-500" : "bg-white/70 ring-brand-100 hover:bg-white"} ${disabled ? "opacity-45" : ""}`}
    >
      <span className={`grid h-10 w-10 place-items-center rounded-xl ${method === m ? "bg-brand-600 text-white" : "bg-lav text-brand-700"}`}>{icon}</span>
      <span className="flex-1">
        <span className="block text-sm font-bold">{label}</span>
        <span className="block text-xs text-ink/55">{sub}</span>
      </span>
      <span className={`h-5 w-5 rounded-full border-2 transition ${method === m ? "border-brand-600 bg-brand-600 shadow-[inset_0_0_0_3px_#fff]" : "border-ink/20"}`} />
    </button>
  );

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center sm:items-center">
      <div className="fade-in absolute inset-0 bg-ink/45 backdrop-blur-sm" onClick={() => phase !== "busy" && onClose()} />
      <div className="sheet-up glass-strong relative max-h-[92vh] w-full max-w-md overflow-auto rounded-t-[36px] p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:rounded-[36px]">
        {phase === "ok" ? (
          <div className="grid place-items-center py-12 text-center">
            <svg width="96" height="96" viewBox="0 0 96 96" className="anim-pop">
              <circle cx="48" cy="48" r="44" fill="#10b981" />
              <path d="M28 49l14 14 27-30" fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="70" strokeDashoffset="70" style={{ animation: "checkDraw 0.6s 0.25s ease forwards" }} />
            </svg>
            <h3 className="font-display mt-5 text-2xl font-semibold">All set!</h3>
            <p className="mt-1 text-sm text-ink/60">{method === "cod" ? "Confirmed — pay on arrival." : `${inr(amount)} paid successfully.`}</p>
          </div>
        ) : (
          <>
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-ink/15 sm:hidden" />
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-2xl font-semibold">{title}</h3>
                <p className="text-sm text-ink/55">Total payable <b className="text-ink">{inr(amount)}</b></p>
              </div>
              <button onClick={onClose} aria-label="Close" disabled={phase === "busy"} className="grid h-10 w-10 place-items-center rounded-full bg-ink/5"><X size={18} /></button>
            </div>

            <div className="mt-4 space-y-2.5">
              {!noWallet && opt("wallet", <Wallet size={18} />, "gowayy wallet", canWallet ? `Balance ${inr(wallet)}` : `Balance ${inr(wallet)} — add money in profile`, !canWallet)}
              {opt("upi", <Smartphone size={18} />, "UPI", "GPay, PhonePe, Paytm & more")}
              {method === "upi" && (
                <input className="input anim-up" placeholder="yourname@okbank" value={upi} onChange={(e) => setUpi(e.target.value)} autoFocus />
              )}
              {opt("card", <CreditCard size={18} />, "Credit / debit card", "Visa, Mastercard, RuPay")}
              {method === "card" && (
                <div className="anim-up grid grid-cols-2 gap-2">
                  <input className="input col-span-2" inputMode="numeric" placeholder="Card number" maxLength={19} value={card.number}
                    onChange={(e) => setCard({ ...card, number: e.target.value.replace(/\D/g, "").replace(/(.{4})/g, "$1 ").trim() })} />
                  <input className="input" placeholder="MM/YY" maxLength={5} value={card.expiry}
                    onChange={(e) => {
                      let v = e.target.value.replace(/[^\d]/g, "").slice(0, 4);
                      if (v.length > 2) v = v.slice(0, 2) + "/" + v.slice(2);
                      setCard({ ...card, expiry: v });
                    }} />
                  <input className="input" placeholder="CVV" inputMode="numeric" maxLength={4} type="password" value={card.cvv} onChange={(e) => setCard({ ...card, cvv: e.target.value.replace(/\D/g, "") })} />
                  <input className="input col-span-2" placeholder="Name on card" value={card.name} onChange={(e) => setCard({ ...card, name: e.target.value })} />
                  <p className="col-span-2 text-[11px] text-ink/50">Sandbox test card: 4242 4242 4242 4242 · any future date · any CVV</p>
                </div>
              )}
              {allowCod && opt("cod", <Banknote size={18} />, codLabel, "Pay in cash or UPI on arrival")}
            </div>

            {err && <p className="anim-pop mt-3 rounded-2xl bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-600">{err}</p>}

            <button onClick={pay} disabled={phase === "busy"} className="btn btn-dark mt-5 h-14 w-full text-base">
              {phase === "busy" ? <><Loader2 size={18} className="animate-spin" /> Processing…</> : method === "cod" ? "Confirm" : `Pay ${inr(amount)}`}
            </button>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-ink/45"><ShieldCheck size={13} /> Secured by the gowayy sandbox gateway · no real money is charged</p>
          </>
        )}
      </div>
    </div>
  );
}
