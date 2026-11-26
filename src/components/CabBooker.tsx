"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowDownUp, ArrowRight, BedDouble, Bike, Bus, Car, CarFront, CarTaxiFront, Clock, Flag, Landmark, MapPin, Minus, Navigation, Plus, Route, ShoppingBasket, Store, Truck, Users, UtensilsCrossed, type LucideIcon,
} from "lucide-react";
import { BookingPanel } from "@/components/BookingPanel";
import { Img } from "@/components/Img";
import { LocationPicker } from "@/components/Nav";
import { SmartBadge } from "@/components/ui";
import { cabFare, TAX } from "@/lib/pricing";
import { hillMinutes, inr, roadKm, todayISO } from "@/lib/utils";

export type Loc = { id: number; name: string; kind: string; lat: number; lng: number };
export type Cab = { id: number; slug: string; name: string; model: string; emoji: string; capacity: number; baseFare: number; perKm: number; etaMins: number };
type Near = { id: number; slug: string; name: string; image: string; rating: number };
export type PopularRoute = { fromId: number; toId: number; from: string; to: string; km: number };
type Around = { location: string; restaurants: Near[]; groceries: Near[]; shops: Near[]; attractions: Near[]; hotels: Near[] };

const GROUPS: [string, string[]][] = [
  ["Stations & airports", ["station", "airport"]],
  ["Towns", ["town"]],
  ["Attractions", ["attraction"]],
  ["Hotels", ["hotel"]],
];

const CAB_ICON: Record<string, LucideIcon> = { bike: Bike, hatchback: Car, sedan: CarFront, suv: Truck, innova: CarTaxiFront, tempo: Bus };
// Real photos of the model each cab type is served with (public/media/cab).
const CAB_PHOTO = new Set(["bike", "hatchback", "sedan", "suv", "innova", "tempo"]);
const short = (name: string) => name.split(" (")[0];

function LocSelect({ label, value, onChange, locs, icon }: { label: string; value: number; onChange: (n: number) => void; locs: Loc[]; icon: React.ReactNode }) {
  return (
    <label className="flex min-w-0 items-center gap-3 rounded-2xl bg-white/85 px-4 py-2 ring-1 ring-brand-100 focus-within:ring-2 focus-within:ring-brand-400">
      <span className="grid w-4 shrink-0 place-items-center">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-bold uppercase tracking-wider text-ink/45">{label}</span>
        <select value={value} onChange={(e) => onChange(Number(e.target.value))} className="block h-7 w-full min-w-0 truncate bg-transparent pr-1 text-sm font-semibold outline-none">
          {GROUPS.map(([g, kinds]) => (
            <optgroup key={g} label={g}>
              {locs.filter((l) => kinds.includes(l.kind)).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </optgroup>
          ))}
        </select>
      </span>
    </label>
  );
}

export function CabBooker({
  locs, cabs, initialFrom, initialTo, routes = [], nearName,
}: {
  locs: Loc[];
  cabs: Cab[];
  initialFrom: number;
  initialTo: number;
  routes?: PopularRoute[];
  nearName?: string;
}) {
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [cabId, setCabId] = useState(cabs.find((c) => c.name === "Sedan")?.id ?? cabs[0].id);
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState("09:00");
  const [guests, setGuestCount] = useState(2);
  const [round, setRound] = useState(false);
  // "what's around" data is tagged with the drop it belongs to, so a stale result is never shown
  const [aroundFor, setAroundFor] = useState<{ to: number; data: Around } | null>(null);
  const around = aroundFor?.to === to ? aroundFor.data : null;

  const a = locs.find((l) => l.id === from);
  const b = locs.find((l) => l.id === to);
  const km = a && b ? roadKm(a.lat, a.lng, b.lat, b.lng) : 0;
  const same = from === to;
  const cab = cabs.find((c) => c.id === cabId) ?? cabs[0];
  const fare = cabFare(cab, km, round);

  useEffect(() => {
    let live = true;
    fetch(`/api/connected?locationId=${to}`)
      .then((r) => r.json())
      .then((j) => live && j.ok && setAroundFor({ to, data: j }))
      .catch(() => {});
    return () => { live = false; };
  }, [to]);

  // when riders exceed the selected cab's seats, move up to the smallest cab that fits
  const setGuests = (n: number) => {
    setGuestCount(n);
    if (n > cab.capacity) {
      const fit = cabs.find((c) => c.capacity >= n);
      if (fit) setCabId(fit.id);
    }
  };

  const mins = hillMinutes(km);
  const sections: [string, LucideIcon, string, Near[]][] = around
    ? [
        ["Eat nearby", UtensilsCrossed, "store", around.restaurants],
        ["Grocery stores", ShoppingBasket, "store", around.groceries],
        ["Local shops", Store, "store", around.shops],
        ["Sights to see", Landmark, "attractions", around.attractions],
        ["Stays", BedDouble, "hotels", around.hotels],
      ]
    : [];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <div className="min-w-0 space-y-4">
        <div className="glass-strong rounded-[32px] p-4 sm:p-5">
          <div className="flex items-center gap-2.5">
            <div className="min-w-0 flex-1 space-y-2">
              <LocSelect label="Pickup" value={from} onChange={setFrom} locs={locs} icon={<span className="h-3 w-3 rounded-full border-[3px] border-brand-600" />} />
              <LocSelect label="Drop" value={to} onChange={setTo} locs={locs} icon={<MapPin size={16} className="text-rose-500" />} />
            </div>
            <button onClick={() => { setFrom(to); setTo(from); }} aria-label="Swap pickup and drop" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-ink text-white shadow-lg transition active:rotate-180 active:scale-90">
              <ArrowDownUp size={17} />
            </button>
          </div>

          {/* route visual */}
          <div className="relative mt-4 h-24 overflow-hidden rounded-3xl bg-gradient-to-br from-brand-100 to-white p-4">
            <svg viewBox="0 0 400 80" className="h-full w-full" preserveAspectRatio="none" aria-hidden>
              <path d="M20 55 C 90 5, 150 80, 210 38 S 330 10, 380 30" fill="none" stroke="#c2a5ff" strokeWidth="5" strokeLinecap="round" />
              <path d="M20 55 C 90 5, 150 80, 210 38 S 330 10, 380 30" fill="none" stroke="#7c3aed" strokeWidth="5" strokeLinecap="round" strokeDasharray="2 14" style={{ animation: "dash 1.2s linear infinite" }} />
              <circle cx="20" cy="55" r="8" fill="#fff" stroke="#7c3aed" strokeWidth="4" />
              <circle cx="380" cy="30" r="8" fill="#f43f5e" />
            </svg>
            <div className="absolute inset-x-0 bottom-2 flex justify-center px-3">
              <span className="glass max-w-full truncate rounded-full px-3 py-1 text-xs font-bold">{same ? "Choose different locations" : `${km} km · ~${Math.floor(mins / 60) ? `${Math.floor(mins / 60)}h ` : ""}${mins % 60}m`}</span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2.5 min-[360px]:grid-cols-2">
            <label className="block min-w-0"><span className="mb-1 block text-xs font-bold text-ink/55">Date</span><input type="date" min={todayISO()} value={date} onChange={(e) => setDate(e.target.value)} className="input" /></label>
            <label className="block min-w-0"><span className="mb-1 block text-xs font-bold text-ink/55">Pickup time</span><input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="input" /></label>
          </div>
          <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <div className="flex min-h-14 items-center justify-between gap-2 rounded-2xl bg-white/70 px-4 py-2 ring-1 ring-brand-100">
              <span className="flex min-w-0 items-center gap-1.5 text-sm font-semibold"><Users size={15} className="shrink-0" /> Riders</span>
              <div className="flex shrink-0 items-center gap-2">
                <button onClick={() => setGuests(Math.max(1, guests - 1))} aria-label="Fewer riders" className="grid h-9 w-9 place-items-center rounded-full bg-lav active:scale-75"><Minus size={14} /></button>
                <b className="w-5 text-center tabular-nums" aria-live="polite">{guests}</b>
                <button onClick={() => setGuests(Math.min(12, guests + 1))} aria-label="More riders" className="grid h-9 w-9 place-items-center rounded-full bg-lav active:scale-75"><Plus size={14} /></button>
              </div>
            </div>
            <button onClick={() => setRound(!round)} aria-pressed={round} className={`flex min-h-14 items-center justify-between gap-2 rounded-2xl px-4 text-sm font-semibold ring-1 transition ${round ? "bg-brand-50 ring-2 ring-brand-500" : "bg-white/70 ring-brand-100"}`}>
              <span className="flex min-w-0 items-center gap-1.5"><Route size={15} className="shrink-0" /> Round trip</span>
              <span className={`relative h-6 w-11 shrink-0 rounded-full transition ${round ? "bg-brand-600" : "bg-ink/15"}`}><span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${round ? "left-[22px]" : "left-0.5"}`} /></span>
            </button>
          </div>
        </div>

        {/* popular rides near the user's area */}
        <div>
          <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display text-xl font-semibold">{nearName ? `Popular near ${nearName}` : "Popular rides"}</h3>
            {!nearName && (
              <div className="flex items-center gap-2 text-xs text-ink/55">
                <span className="hidden min-[400px]:inline">Set your area for rides near you</span>
                <LocationPicker light compact />
              </div>
            )}
          </div>
          {routes.length ? (
            <div className="hscroll !pb-1 !pt-0">
              {routes.map((r) => {
                const on = r.fromId === from && r.toId === to;
                return (
                  <button
                    key={`${r.fromId}-${r.toId}`}
                    onClick={() => { setFrom(r.fromId); setTo(r.toId); }}
                    aria-pressed={on}
                    className={`flex w-[min(15rem,72vw)] items-center gap-3 rounded-3xl p-3 text-left ring-1 transition ${on ? "bg-white ring-2 ring-brand-500" : "glass ring-white/60 hover:bg-white/80"}`}
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-brand-100 text-brand-700"><Navigation size={17} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block break-words text-sm font-bold leading-snug">{short(r.from)}</span>
                      <span className="mt-0.5 flex min-w-0 items-start gap-1 text-xs text-ink/60"><ArrowRight size={11} className="mt-[3px] shrink-0" /> <span className="min-w-0 break-words leading-snug">{short(r.to)}</span></span>
                    </span>
                    <span className="shrink-0 text-xs font-bold text-ink/70">{r.km} km</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="glass rounded-3xl p-4 text-sm text-ink/60">Pick any pickup and drop above to see live fares.</p>
          )}
        </div>

        <div>
          <h3 className="font-display mb-3 text-xl font-semibold">Choose your ride</h3>
          <div className="space-y-2.5">
            {cabs.map((c, i) => {
              const f = cabFare(c, km, round);
              const off = c.capacity < guests;
              const Icon = CAB_ICON[c.slug] ?? CarFront;
              return (
                <button key={c.id} disabled={off} onClick={() => setCabId(c.id)} aria-pressed={cabId === c.id} style={{ "--i": i } as React.CSSProperties}
                  className={`anim-up flex w-full items-center gap-3 rounded-3xl p-3 text-left ring-1 transition sm:gap-4 sm:p-3.5 ${cabId === c.id ? "bg-white ring-2 ring-brand-500 shadow-xl shadow-brand-600/15" : "glass ring-white/60 hover:bg-white/80"} ${off ? "opacity-40" : ""}`}>
                  {CAB_PHOTO.has(c.slug) ? (
                    <Img src={`/media/cab/${c.slug}.webp`} alt={c.model} className={`h-12 w-16 shrink-0 rounded-2xl bg-white object-cover sm:h-14 sm:w-20 ${cabId === c.id ? "ring-2 ring-brand-500" : "ring-1 ring-brand-100"}`} />
                  ) : (
                    <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl sm:h-14 sm:w-14 ${cabId === c.id ? "bg-brand-600 text-white" : "bg-gradient-to-br from-brand-100 to-white text-brand-700"}`}><Icon size={24} /></span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">{c.name}</span>
                    <span className="flex min-w-0 gap-1 text-xs text-ink/55"><span className="truncate">{c.model}</span><span className="shrink-0">· {c.capacity} seat{c.capacity > 1 ? "s" : ""}</span></span>
                    {off ? (
                      <span className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-ink/60"><Users size={11} /> Seats up to {c.capacity}</span>
                    ) : (
                      <span className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-emerald-600"><Clock size={11} /> {c.etaMins} min away</span>
                    )}
                  </span>
                  <span className="font-display shrink-0 text-lg font-semibold sm:text-xl">{same ? "—" : inr(f)}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <aside className="min-w-0 space-y-4 lg:sticky lg:top-28 lg:self-start">
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
        <div className="glass flex gap-2.5 rounded-3xl p-4 text-xs text-ink/60">
          <Flag size={14} className="mt-0.5 shrink-0 text-brand-600" /> <span>Fares are estimated from road distance in hill terrain. Verified local drivers, OTP-secured pickup and 24×7 support.</span>
        </div>
      </aside>

      {/* Smart ecosystem: what's around the drop-off */}
      <div className="min-w-0 lg:col-span-2">
        <SmartBadge>Around {b ? short(b.name) : "your drop"}</SmartBadge>
        {!around && <div className="shimmer mt-3 h-32 rounded-3xl bg-white/50" />}
        {sections.filter(([, , , items]) => items.length).map(([title, Icon, base, items]) => (
          <div key={title}>
            <h4 className="font-display mb-2 mt-5 flex items-center gap-2 text-lg font-semibold"><Icon size={18} className="text-brand-600" /> {title}</h4>
            <div className="hscroll !pb-2">
              {items.map((it, i) => (
                <Link key={it.id} href={`/${base}/${it.slug}`} style={{ "--i": i } as React.CSSProperties} className="anim-up lift glass-strong flex w-[min(16rem,75vw)] items-center gap-3 rounded-3xl p-2">
                  <Img src={it.image} alt={it.name} className="h-16 w-16 shrink-0 rounded-2xl object-cover" />
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
