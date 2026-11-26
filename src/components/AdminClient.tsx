"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useApp } from "@/components/Providers";

async function call(action: string, body: object) {
  const r = await fetch(`/api/admin/${action}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return r.json();
}

export function StatusSelect({ kind, id, status, options }: { kind: "order-status" | "booking-status"; id: number; status: string; options: string[] }) {
  const router = useRouter();
  const { toast } = useApp();
  const [v, setV] = useState(status);
  const [busy, setBusy] = useState(false);
  return (
    <select
      value={v}
      disabled={busy}
      onChange={async (e) => {
        const prev = v;
        setV(e.target.value);
        setBusy(true);
        const j = await call(kind, { id, status: e.target.value });
        setBusy(false);
        if (j.ok) {
          toast("Status updated");
          router.refresh();
        } else {
          setV(prev);
          toast(j.error, "err");
        }
      }}
      className="h-9 rounded-full bg-white px-3 text-xs font-bold capitalize ring-1 ring-brand-200 outline-none focus:ring-2 focus:ring-brand-500"
    >
      {options.map((o) => <option key={o} value={o}>{o.replace(/_/g, " ")}</option>)}
    </select>
  );
}

export function ProductToggle({ id, available }: { id: number; available: boolean }) {
  const router = useRouter();
  const [on, setOn] = useState(available);
  return (
    <button
      aria-label="Toggle availability"
      onClick={async () => {
        setOn(!on);
        const j = await call("product-toggle", { id });
        if (!j.ok) setOn(on);
        router.refresh();
      }}
      className={`relative h-6 w-11 rounded-full transition ${on ? "bg-emerald-500" : "bg-ink/20"}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}

export function ProductForm({ vendors }: { vendors: { id: number; name: string }[] }) {
  const router = useRouter();
  const { toast } = useApp();
  const [f, setF] = useState({ vendorId: vendors[0]?.id ?? 0, name: "", emoji: "🛍️", price: "", mrp: "", unit: "", category: "" });
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="glass-strong grid gap-2.5 rounded-[32px] p-5 sm:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const j = await call("product-create", { ...f, price: Number(f.price), mrp: Number(f.mrp) });
        setBusy(false);
        if (j.ok) {
          toast("Product added");
          setF({ ...f, name: "", price: "", mrp: "" });
          router.refresh();
        } else toast(j.error, "err");
      }}
    >
      <h3 className="font-display text-xl font-semibold sm:col-span-2">Add product / dish</h3>
      <select className="input sm:col-span-2" value={f.vendorId} onChange={(e) => setF({ ...f, vendorId: Number(e.target.value) })}>
        {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
      </select>
      <input className="input" placeholder="Name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required />
      <input className="input" placeholder="Emoji" value={f.emoji} onChange={(e) => setF({ ...f, emoji: e.target.value })} />
      <input className="input" placeholder="Price ₹" inputMode="numeric" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} required />
      <input className="input" placeholder="MRP ₹ (optional)" inputMode="numeric" value={f.mrp} onChange={(e) => setF({ ...f, mrp: e.target.value })} />
      <input className="input" placeholder="Unit (e.g. 500 g)" value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })} />
      <input className="input" placeholder="Category" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} />
      <button disabled={busy} className="btn btn-brand sm:col-span-2">{busy ? <Loader2 size={16} className="animate-spin" /> : "Add to catalogue"}</button>
    </form>
  );
}

export function BroadcastForm() {
  const { toast } = useApp();
  const [f, setF] = useState({ title: "", body: "", link: "" });
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="glass-strong max-w-xl space-y-2.5 rounded-[32px] p-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const j = await call("broadcast", f);
        setBusy(false);
        if (j.ok) {
          toast(`Sent to ${j.sent} users`);
          setF({ title: "", body: "", link: "" });
        } else toast(j.error, "err");
      }}
    >
      <h3 className="font-display text-xl font-semibold">Send announcement</h3>
      <input className="input" placeholder="Title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} required />
      <textarea className="input" rows={3} placeholder="Message" value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} required />
      <input className="input" placeholder="Link (optional, e.g. /tours)" value={f.link} onChange={(e) => setF({ ...f, link: e.target.value })} />
      <button disabled={busy} className="btn btn-brand w-full">{busy ? <Loader2 size={16} className="animate-spin" /> : "Broadcast to all users"}</button>
    </form>
  );
}
