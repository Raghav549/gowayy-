"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDownUp, Clock, Flag, MapPin, Minus, Plus, Route, Sparkles, Users } from "lucide-react";
import { BookingPanel } from "@/components/BookingPanel";
import { Img } from "@/components/Img";
import { cabFare, TAX } from "@/lib/pricing";
import { hillMinutes, inr, roadKm, todayISO } from "@/lib/utils";

export type Loc = { id: number; name: string; kind: string; lat: number; lng: number };
export type Cab = { id: number; name: string; model: string; emoji: string; capacity: number; baseFare: number; perKm: number; etaMins: number };
type Near = { id: number; slug: string; name: string; image: string; rating: number };
type Around = { location: string; restaurants: Near[]; groceries: Near[]; shops: Near[]; attractions: Near[]; hotels: Near[] };

const GROUPS: [string, string[]][] = [
  ["Stations & airports", ["station", "airport"]],
  ["Towns", ["town"]],
  ["Attractions", ["attraction"]],
  ["Hotels", ["hotel"]],
];

function LocSelect({ value, onChange, locs, icon }: { value: number; onChange: (n: number) => void; locs: Loc[]; icon: React.ReactNode }) {
  return (
    <label className="flex items-center gap-3 rounded-2xl bg-white/85 px-4 ring-1 ring-brand-100 focus-within:ring-2 focus-within:ring-brand-400">
      {icon}
      <select value={value} onChange={(e) => onChange(Number(e.target.value))} className="h-14 min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none">
        {GROUPS.map(([label, kinds]) => (
          <optgroup key={label} label={label}>
            {locs.filter((l) => kinds.includes(l.kind)).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </optgroup>
        ))}
      </select>
    </label>
  );
}

export function CabBooker({ locs, cabs, initialFrom, initialTo }: { locs: Loc[]; cabs: Cab[]; initialFrom: number; initialTo: number }) {
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [cabId, setCabId] = useState(cabs.find((c) => c.name === "Sedan")?.id ?? cabs[0].id);
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState("09:00");
  const [guests, setGuests] = useState(2);
  const [round, setRound] = useState(false);
  const [around, setAround] = useState<Around | null>(null);

  const a = locs.find((l) => l.id === from);
  const b = locs.find((l) => l.id === to);
  const km = a && b ? roadKm(a.lat, a.lng, b.lat, b.lng) : 0;
  const same = from === to;
  const cab = cabs.find((c) => c.id === cabId) ?? cabs[0];
  const fare = useMemo(() => cabFare(cab, km, round), [cab, km, round]);

  useEffect(() => {
    let live = true;
    setAround(null);
    fetch(`/api/connected?locationId=${to}`).then((r) => r.json()).then((j) => live && j.ok && setAround(j));
    return () => { live = false; };
  }, [to]);

  useEffect(() => {
    if (guests > cab.capacity) {
      const fit = cabs.find((c) => c.capacity >= guests);
      if (fit) setCabId(fit.id);
    }
  }, [guests, cab, cabs]);

  const mins = hillMinutes(km);
  const sections: [string, string, Near[]][] = around
    ? [
        ["🍜 Eat nearby", "store", around.restaurants],
        ["🛒 Grocery stores", "store", around.groceries],
        ["🛍️ Local shops", "store", around.shops],
        ["📍 Sights to see", "attractions", around.attractions],
        ["🛏️ Stays", "hotels", around.hotels],
      ]
    : [];

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <div className="space-y-4">
        <div className="glass-strong rounded-[32px] p-5">
          <div className="relative space-y-2.5">
            <LocSelect value={from} onChange={setFrom} locs={locs} icon={<span className="h-3 w-3 rounded-full border-[3px] border-brand-600" />} />
            <LocSelect value={to} onChange={setTo} locs={locs} icon={<MapPin size={16} className="text-rose-500" />} />
            <button onClick={() => { setFrom(to); setTo(from); }} aria-label="Swap pickup and drop" className="absolute right-12 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-ink text-white shadow-lg transition active:rotate-180 active:scale-90">
              <ArrowDownUp size={16} />
            </button>
          </div>

          {/* route visual */}
          <div className="relative mt-5 h-24 overflow-hidden rounded-3xl bg-gradient-to-br from-brand-100 to-white p-4">
            <svg viewBox="0 0 400 80" className="h-full w-full" preserveAspectRatio="none">
              <path d="M20 55 C 90 5, 150 80, 210 38 S 330 10, 380 30" fill="none" stroke="#c2a5ff" strokeWidth="5" strokeLinecap="round" />
              <path d="M20 55 C 90 5, 150 80, 210 38 S 330 10, 380 30" fill="none" stroke="#7c3aed" strokeWidth="5" strokeLinecap="round" strokeDasharray="2 14" style={{ animation: "dash 1.2s linear infinite" }} />
              <circle cx="20" cy="55" r="8" fill="#fff" stroke="#7c3aed" strokeWidth="4" />
              <circle cx="380" cy="30" r="8" fill="#f43f5e" />
            </svg>
            <div className="absolute inset-x-0 bottom-2 flex justify-center">
              <span className="glass rounded-full px-3 py-1 text-xs font-bold">{same ? "Choose different locations" : `${km} km · ~${Math.floor(mins / 60) ? `${Math.floor(mins / 60)}h ` : ""}${mins % 60}m`}</span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <label className="block"><span className="mb-1 block text-xs font-bold text-ink/55">Date</span><input type="date" min={todayISO()} value={date} onChange={(e) => setDate(e.target.value)} className="input" /></label>
            <label className="block"><span className="mb-1 block text-xs font-bold text-ink/55">Pickup time</span><input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="input" /></label>
          </div>
          <div className="mt-2.5 grid grid-cols-2 gap-2.5">
            <div className="flex items-center justify-between rounded-2xl bg-white/70 px-4 py-2.5 ring-1 ring-brand-100">
              <span className="flex items-center gap-1.5 text-sm font-semibold"><Users size={15} /> Riders</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setGuests(Math.max(1, guests - 1))} aria-label="Fewer riders" className="grid h-8 w-8 place-items-center rounded-full bg-lav active:scale-75"><Minus size={14} /></button>
                <b className="w-4 text-center tabular-nums">{guests}</b>
                <button onClick={() => setGuests(Math.min(12, guests + 1))} aria-label="More riders" className="grid h-8 w-8 place-items-center rounded-full bg-lav active:scale-75"><Plus size={14} /></button>
              </div>
            </div>
            <button onClick={() => setRound(!round)} className={`flex items-center justify-between rounded-2xl px-4 text-sm font-semibold ring-1 transition ${round ? "bg-brand-50 ring-2 ring-brand-500" : "bg-white/70 ring-brand-100"}`}>
              <span className="flex items-center gap-1.5"><Route size={15} /> Round trip</span>
              <span className={`relative h-6 w-11 rounded-full transition ${round ? "bg-brand-600" : "bg-ink/15"}`}><span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${round ? "left-[22px]" : "left-0.5"}`} /></span>
            </button>
          </div>
        </div>

        <div>
          <h3 className="font-display mb-3 text-xl font-semibold">Choose your ride</h3>
          <div className="space-y-2.5">
            {cabs.map((c, i) => {
              const f = cabFare(c, km, round);
              const off = c.capacity < guests;
              return (
                <button key={c.id} disabled={off} onClick={() => setCabId(c.id)} style={{ "--i": i } as React.CSSProperties}
                  className={`anim-up flex w-full items-center gap-4 rounded-3xl p-3.5 text-left ring-1 transition ${cabId === c.id ? "bg-white ring-2 ring-brand-500 shadow-xl shadow-brand-600/15" : "glass ring-white/60 hover:bg-white/80"} ${off ? "opacity-40" : ""}`}>
                  <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-brand-100 to-white text-3xl">{c.emoji}</span>
                  <span className="flex-1">
                    <span className="block font-bold">{c.name}</span>
                    <span className="block text-xs text-ink/55">{c.model} · {c.capacity} seats</span>
                    <span className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-emerald-600"><Clock size={11} /> {c.etaMins} min away</span>
                  </span>
                  <span className="font-display text-xl font-semibold">{same ? "—" : inr(f)}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-28 lg:self-start">
        <BookingPanel
          title="Fare summary"
          subtotal={same ? 0 : fare}
          taxRate={TAX.cab}
          lines={[{ label: `${cab.name} · ${km} km${round ? " · round trip" : ""}`, value: same ? 0 : fare }]}
          cta={`Book ${cab.name}`}
          disabled={same || !date || date < todayISO()}
          disabledReason={same ? "Pick different locations" : "Pick a valid date"}
          allowCod
          codLabel="Pay your driver"
          buildBody={(payment, coupon) => ({ type: "cab", startDate: date, guests, coupon, payment, cab: { fromId: from, toId: to, cabTypeId: cabId, roundTrip: round, time } })}
        />
        <div className="glass rounded-3xl p-4 text-xs text-ink/60">
          <Flag size={14} className="mb-1 text-brand-600" /> Fares are estimated from road distance in hill terrain. Verified local drivers, OTP-secured pickup and 24×7 support.
        </div>
      </aside>

      {/* Smart ecosystem: what's around the drop-off */}
      <div className="lg:col-span-2">
        <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-brand-600 to-fuchsia-500 px-3 py-1.5 text-[11px] font-bold text-white shadow-lg shadow-brand-600/30">
          <Sparkles size={13} /> Discover around {b?.name.split(" (")[0] ?? "your drop"}
        </div>
        {!around && <div className="shimmer mt-3 h-32 rounded-3xl bg-white/50" />}
        {sections.filter(([, , items]) => items.length).map(([title, base, items]) => (
          <div key={title}>
            <h4 className="font-display mb-2 mt-5 text-lg font-semibold">{title}</h4>
            <div className="hscroll !pb-2">
              {items.map((it, i) => (
                <Link key={it.id} href={`/${base}/${it.slug}`} style={{ "--i": i } as React.CSSProperties} className="anim-up lift glass-strong flex w-64 items-center gap-3 rounded-3xl p-2">
                  <Img src={it.image} alt={it.name} className="h-16 w-16 rounded-2xl object-cover" />
                  <span className="min-w-0 flex-1"><span className="line-clamp-2 text-sm font-bold leading-snug">{it.name}</span><span className="text-xs text-ink/55">★ {it.rating.toFixed(1)}</span></span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
