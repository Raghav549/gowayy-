"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bike, CreditCard, Gift, Info, Loader2, LogOut, Plus, Ticket, type LucideIcon } from "lucide-react";
import { useApp } from "@/components/Providers";
import { PaymentSheet } from "@/components/PaymentSheet";
import { inr } from "@/lib/utils";

export function WalletTopUp({ balance }: { balance: number }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(1000);
  return (
    <div className="relative overflow-hidden rounded-[36px] bg-gradient-to-br from-brand-500 via-brand-700 to-[#2a0f5e] p-6 text-white shadow-2xl shadow-brand-700/40">
      <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-fuchsia-400/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 left-10 h-44 w-44 rounded-full bg-sky-300/30 blur-3xl" />
      <p className="relative text-xs font-bold uppercase tracking-wider text-white/70">gowayy wallet</p>
      <p className="font-display relative mt-1 text-5xl font-semibold">{inr(balance)}</p>
      <p className="relative mt-1 text-xs text-white/70">Use for orders, rides, stays & refunds</p>
      <div className="relative mt-5 flex flex-wrap gap-2">
        {[500, 1000, 2000, 5000].map((a) => (
          <button key={a} onClick={() => setAmount(a)} className={`rounded-full px-4 py-2 text-xs font-bold transition ${amount === a ? "bg-white text-ink" : "bg-white/15 hover:bg-white/25"}`}>+{inr(a)}</button>
        ))}
      </div>
      <button onClick={() => setOpen(true)} className="btn mt-4 w-full bg-white text-ink"><Plus size={16} /> Add {inr(amount)}</button>
      <PaymentSheet
        open={open}
        onClose={() => setOpen(false)}
        amount={amount}
        noWallet
        title="Add money"
        onPay={async (payment) => {
          const r = await fetch("/api/wallet", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount, payment }) });
          const j = await r.json();
          return j.ok ? {} : { error: j.error };
        }}
      />
    </div>
  );
}

export function ProfileForm({ initial }: { initial: { name: string; phone: string; address: string; email: string } }) {
  const [f, setF] = useState(initial);
  const [busy, setBusy] = useState(false);
  const { toast } = useApp();
  const router = useRouter();
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const r = await fetch("/api/profile", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
    const j = await r.json();
    setBusy(false);
    if (j.ok) {
      toast("Profile updated");
      router.refresh();
    } else toast(j.error, "err");
  }
  return (
    <form onSubmit={save} className="glass-strong space-y-3 rounded-[32px] p-5">
      <h3 className="font-display text-xl font-semibold">Your details</h3>
      <input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Full name" required />
      <input className="input opacity-60" value={f.email} disabled />
      <input className="input" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="Phone" inputMode="tel" />
      <textarea className="input" rows={2} value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} placeholder="Default delivery address" />
      <button disabled={busy} className="btn btn-dark w-full">{busy ? <Loader2 size={16} className="animate-spin" /> : "Save changes"}</button>
    </form>
  );
}

export function LogoutButton() {
  const [busy, setBusy] = useState(false);
  return (
    <button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await fetch("/api/auth/logout", { method: "POST" });
        window.location.href = "/";
      }}
      className="btn btn-light w-full text-rose-600"
    >
      <LogOut size={16} /> Sign out
    </button>
  );
}

export function BookingActions({ code, canCancel }: { code: string; canCancel: boolean }) {
  const [busy, setBusy] = useState(false);
  const { toast } = useApp();
  const router = useRouter();
  if (!canCancel) return null;
  return (
    <button
      disabled={busy}
      onClick={async () => {
        if (!confirm("Cancel this booking? Refunds go to your gowayy wallet.")) return;
        setBusy(true);
        const r = await fetch(`/api/bookings/${code}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "cancel" }) });
        const j = await r.json();
        setBusy(false);
        if (j.ok) {
          toast(j.refund ? `Cancelled — ${inr(j.refund)} refunded to wallet` : "Booking cancelled");
          router.refresh();
        } else toast(j.error, "err");
      }}
      className="btn btn-light w-full text-rose-600"
    >
      {busy ? <Loader2 size={16} className="animate-spin" /> : "Cancel booking"}
    </button>
  );
}

export type Notif = { id: number; title: string; body: string; kind: string; link: string; read: boolean; createdAt: string | Date };

export function NotificationList({ items }: { items: Notif[] }) {
  const router = useRouter();
  const [list, setList] = useState(items);
  const mark = async (id?: number) => {
    setList((l) => l.map((n) => (id && n.id !== id ? n : { ...n, read: true })));
    await fetch("/api/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    router.refresh();
  };
  const icon: Record<string, LucideIcon> = { order: Bike, booking: Ticket, payment: CreditCard, promo: Gift, info: Info };
  return (
    <div className="mx-auto max-w-2xl">
      {list.some((n) => !n.read) && (
        <button onClick={() => mark()} className="btn btn-light btn-sm mb-3 ml-auto flex">Mark all as read</button>
      )}
      <div className="space-y-2.5">
        {list.map((n, i) => (
          <button
            key={n.id}
            style={{ "--i": i % 8 } as React.CSSProperties}
            onClick={async () => {
              if (!n.read) await mark(n.id);
              if (n.link) router.push(n.link);
            }}
            className={`anim-up lift flex w-full items-start gap-3 rounded-[28px] p-4 text-left ${n.read ? "glass" : "glass-strong ring-2 ring-brand-300"}`}
          >
            {(() => {
              const Icon = icon[n.kind] ?? Info;
              return <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-700"><Icon size={19} /></span>;
            })()}
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2 font-bold"><span className="min-w-0 break-words">{n.title}</span>{!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-rose-500" />}</span>
              <span className="mt-0.5 block text-sm text-ink/65">{n.body}</span>
              <span className="mt-1 block text-[11px] text-ink/40">{new Date(n.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
