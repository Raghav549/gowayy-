"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Banknote, CreditCard, Loader2, ShieldCheck, Smartphone, Wallet, X } from "lucide-react";
import { useApp } from "@/components/Providers";
import { Portal } from "@/components/Portal";
import { inr } from "@/lib/utils";

export type PayInput = {
  method: "wallet" | "upi" | "card" | "cod";
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
};

type PaymentSession = { provider: "razorpay"; key: string; orderId: string; amount: number; currency: "INR"; name: string; description: string };
type Result = { error?: string; redirect?: string; payment?: PaymentSession };

type RazorpayResponse = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
type RazorpayWindow = Window & { Razorpay?: new (options: Record<string, unknown>) => { open: () => void } };

function loadRazorpay() {
  if ((window as RazorpayWindow).Razorpay) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-gowayy-razorpay="true"]');
    if (existing) { existing.addEventListener("load", () => resolve(), { once: true }); existing.addEventListener("error", () => reject(new Error("Secure checkout could not load")), { once: true }); return; }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.dataset.gowayyRazorpay = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Secure checkout could not load"));
    document.head.appendChild(script);
  });
}

async function openRazorpay(session: PaymentSession, email?: string): Promise<RazorpayResponse> {
  await loadRazorpay();
  return new Promise((resolve, reject) => {
    const Razorpay = (window as RazorpayWindow).Razorpay;
    if (!Razorpay) return reject(new Error("Secure checkout is unavailable"));
    const checkout = new Razorpay({
      key: session.key, order_id: session.orderId, amount: session.amount, currency: session.currency,
      name: session.name, description: session.description, prefill: { email: email || "" },
      theme: { color: "#7c3aed" },
      handler: (response: RazorpayResponse) => resolve(response),
      modal: { ondismiss: () => reject(new Error("Payment was cancelled")), escape: true },
    });
    checkout.open();
  });
}

type SheetProps = {
  open: boolean;
  onClose: () => void;
  amount: number;
  title?: string;
  allowCod?: boolean;
  codLabel?: string;
  noWallet?: boolean;
  onPay: (p: PayInput) => Promise<Result>;
};

/** Mounted only while open, so every opening starts from a fresh state. */
export function PaymentSheet(props: SheetProps) {
  return props.open ? <PaymentSheetBody {...props} /> : null;
}

function PaymentSheetBody({
  onClose, amount, title = "Complete payment", allowCod = false, codLabel = "Pay on delivery", noWallet = false, onPay,
}: Omit<SheetProps, "open">) {
  const { user } = useApp();
  const router = useRouter();
  const wallet = user?.wallet ?? 0;
  const canWallet = !noWallet && wallet >= amount;
  const [method, setMethod] = useState<PayInput["method"]>(canWallet ? "wallet" : "upi");
  const [phase, setPhase] = useState<"idle" | "busy" | "ok">("idle");
  const [err, setErr] = useState("");

  async function pay() {
    setErr("");
    setPhase("busy");
    const input: PayInput = { method };
    try {
      let r = await onPay(input);
      if (r.error) {
        setErr(r.error);
        setPhase("idle");
        return;
      }
      if (r.payment) {
        const proof = await openRazorpay(r.payment, user?.email);
        r = await onPay({
          method,
          razorpayOrderId: proof.razorpay_order_id,
          razorpayPaymentId: proof.razorpay_payment_id,
          razorpaySignature: proof.razorpay_signature,
        });
        if (r.error) { setErr(r.error); setPhase("idle"); return; }
      }
      setPhase("ok");
      setTimeout(() => {
        if (r.redirect) router.push(r.redirect);
        router.refresh();
        onClose();
      }, 1300);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Network error — please try again");
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
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${method === m ? "bg-brand-600 text-white" : "bg-lav text-brand-700"}`}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold">{label}</span>
        <span className="block text-xs text-ink/55">{sub}</span>
      </span>
      <span className={`h-5 w-5 shrink-0 rounded-full border-2 transition ${method === m ? "border-brand-600 bg-brand-600 shadow-[inset_0_0_0_3px_#fff]" : "border-ink/20"}`} />
    </button>
  );

  return (
    <Portal>
    <div className="fixed inset-0 z-[120] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <div className="fade-in absolute inset-0 bg-ink/45 backdrop-blur-sm" onClick={() => phase !== "busy" && onClose()} />
      <div className="sheet-up glass-strong relative max-h-[92dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-[36px] p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:rounded-[36px]">
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
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-display text-2xl font-semibold">{title}</h3>
                <p className="text-sm text-ink/55">Total payable <b className="text-ink">{inr(amount)}</b></p>
              </div>
              <button onClick={onClose} aria-label="Close" disabled={phase === "busy"} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ink/5"><X size={18} /></button>
            </div>

            <div className="mt-4 space-y-2.5">
              {!noWallet && opt("wallet", <Wallet size={18} />, "gowayy wallet", canWallet ? `Balance ${inr(wallet)}` : `Balance ${inr(wallet)} — add money in profile`, !canWallet)}
              {opt("upi", <Smartphone size={18} />, "UPI", "GPay, PhonePe, Paytm via secure checkout")}
              {opt("card", <CreditCard size={18} />, "Credit / debit card", "Visa, Mastercard and RuPay via secure checkout")}
              {allowCod && opt("cod", <Banknote size={18} />, codLabel, "Pay in cash or UPI on arrival")}
            </div>

            {err && <p className="anim-pop mt-3 rounded-2xl bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-600">{err}</p>}

            <button onClick={pay} disabled={phase === "busy"} className="btn btn-dark mt-5 h-14 w-full text-base">
              {phase === "busy" ? <><Loader2 size={18} className="animate-spin" /> Processing…</> : method === "cod" ? "Confirm" : `Pay ${inr(amount)}`}
            </button>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[11px] text-ink/45"><ShieldCheck size={13} className="shrink-0" /> Online payment details are handled by Razorpay secure checkout</p>
          </>
        )}
      </div>
    </div>
    </Portal>
  );
}
