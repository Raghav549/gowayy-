"use client";

import { useState } from "react";
import { CarTaxiFront, Minus, Plus, X } from "lucide-react";
import { BookingPanel } from "@/components/BookingPanel";
import { Portal } from "@/components/Portal";
import { inr, nightsBetween, todayISO } from "@/lib/utils";
import { TAX } from "@/lib/pricing";

function Counter({ label, value, set, min = 1, max = 20 }: { label: string; value: number; set: (n: number) => void; min?: number; max?: number }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-2xl bg-white/70 px-4 py-2.5 ring-1 ring-brand-100">
      <span className="min-w-0 truncate text-sm font-semibold">{label}</span>
      <div className="flex shrink-0 items-center gap-2">
        <button type="button" onClick={() => set(Math.max(min, value - 1))} className="grid h-8 w-8 place-items-center rounded-full bg-lav transition active:scale-75" aria-label={`Fewer ${label}`}><Minus size={14} /></button>
        <span className="w-6 text-center font-bold tabular-nums">{value}</span>
        <button type="button" onClick={() => set(Math.min(max, value + 1))} className="grid h-8 w-8 place-items-center rounded-full bg-lav transition active:scale-75" aria-label={`More ${label}`}><Plus size={14} /></button>
      </div>
    </div>
  );
}

function CabAddon({ on, set, fare, label }: { on: boolean; set: (b: boolean) => void; fare: number; label: string }) {
  return (
    <button type="button" onClick={() => set(!on)} className={`flex w-full items-center gap-3 rounded-2xl p-3.5 text-left ring-1 transition ${on ? "bg-brand-50 ring-2 ring-brand-500" : "bg-white/70 ring-brand-100"}`}>
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${on ? "bg-brand-600 text-white" : "bg-amber-100 text-amber-700"}`}><CarTaxiFront size={18} /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold">{label}</span>
        <span className="block text-xs text-ink/55">NJP pickup & drop · 5% bundle discount · ~{inr(fare)}</span>
      </span>
      <span className={`relative h-6 w-11 shrink-0 rounded-full transition ${on ? "bg-brand-600" : "bg-ink/15"}`}><span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`} /></span>
    </button>
  );
}

export function PackageBooking({ pkg, sedanFare, suvFare }: { pkg: { id: number; price: number; days: number }; sedanFare: number; suvFare: number }) {
  const [date, setDate] = useState(todayISO(14));
  const [guests, setGuests] = useState(2);
  const [cab, setCab] = useState(false);
  const fare = guests > 4 ? suvFare : sedanFare;
  const subtotal = pkg.price * guests;
  return (
    <div className="space-y-3">
      <div className="glass-strong space-y-3 rounded-[32px] p-5">
        <h3 className="font-display text-xl font-semibold">Plan your trip</h3>
        <label className="block">
          <span className="mb-1 block text-xs font-bold text-ink/55">Start date</span>
          <input type="date" min={todayISO()} value={date} onChange={(e) => setDate(e.target.value)} className="input" />
        </label>
        <Counter label="Travellers" value={guests} set={setGuests} />
        <CabAddon on={cab} set={setCab} fare={fare} label="Add airport / NJP transfers" />
      </div>
      <BookingPanel
        subtotal={subtotal}
        taxRate={TAX.package}
        lines={[{ label: `${inr(pkg.price)} × ${guests} traveller${guests > 1 ? "s" : ""}`, value: subtotal }]}
        extras={cab ? [{ label: "Round-trip transfers", subtotal: fare, taxRate: TAX.cab, discount: Math.round(fare * 0.05) }] : []}
        cta={`Book ${pkg.days}-day trip`}
        disabled={!date || date < todayISO()}
        disabledReason="Pick a valid date"
        buildBody={(payment, coupon) => ({ type: "package", refId: pkg.id, startDate: date, guests, addCab: cab, coupon, payment })}
      />
    </div>
  );
}

export function HotelBooking({ hotel, sedanFare, suvFare }: { hotel: { id: number; pricePerNight: number }; sedanFare: number; suvFare: number }) {
  const [inD, setIn] = useState(todayISO(7));
  const [outD, setOut] = useState(todayISO(9));
  const [guests, setGuests] = useState(2);
  const [rooms, setRooms] = useState(1);
  const [cab, setCab] = useState(false);
  const nights = nightsBetween(inD, outD);
  const subtotal = hotel.pricePerNight * nights * rooms;
  const fare = guests > 4 ? suvFare : sedanFare;
  return (
    <div className="space-y-3">
      <div className="glass-strong space-y-3 rounded-[32px] p-5">
        <h3 className="font-display text-xl font-semibold">Reserve your stay</h3>
        <div className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-2">
          <label className="block min-w-0">
            <span className="mb-1 block text-xs font-bold text-ink/55">Check-in</span>
            <input type="date" min={todayISO()} value={inD} onChange={(e) => { setIn(e.target.value); if (outD <= e.target.value) setOut(new Date(new Date(e.target.value).getTime() + 86400000).toISOString().slice(0, 10)); }} className="input" />
          </label>
          <label className="block min-w-0">
            <span className="mb-1 block text-xs font-bold text-ink/55">Check-out</span>
            <input type="date" min={inD} value={outD} onChange={(e) => setOut(e.target.value)} className="input" />
          </label>
        </div>
        <Counter label="Guests" value={guests} set={setGuests} />
        <Counter label="Rooms" value={rooms} set={setRooms} max={6} />
        <CabAddon on={cab} set={setCab} fare={fare} label="Add station / airport transfer" />
      </div>
      <BookingPanel
        subtotal={subtotal}
        taxRate={TAX.hotel}
        lines={[{ label: `${inr(hotel.pricePerNight)} × ${nights} night${nights === 1 ? "" : "s"} × ${rooms} room${rooms > 1 ? "s" : ""}`, value: subtotal }]}
        extras={cab ? [{ label: "Round-trip transfers", subtotal: fare, taxRate: TAX.cab, discount: Math.round(fare * 0.05) }] : []}
        cta="Reserve now"
        disabled={nights < 1 || inD < todayISO()}
        disabledReason="Choose valid dates"
        buildBody={(payment, coupon) => ({ type: "hotel", refId: hotel.id, startDate: inD, endDate: outD, guests, rooms, addCab: cab, coupon, payment })}
      />
    </div>
  );
}

export function ExperienceButton({ exp, vendor }: { exp: { id: number; name: string; price: number; unit: string }; vendor: string }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(todayISO(2));
  const [guests, setGuests] = useState(2);
  const subtotal = exp.price * guests;
  return (
    <>
      <button onClick={() => setOpen(true)} className="btn btn-dark btn-sm">Book</button>
      {open && (
        <Portal>
        <div className="fixed inset-0 z-[110] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={exp.name}>
          <div className="fade-in absolute inset-0 bg-ink/45 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="sheet-up glass-strong relative max-h-[92dvh] w-full max-w-md space-y-3 overflow-y-auto overscroll-contain rounded-t-[36px] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:rounded-[36px]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-display text-2xl font-semibold leading-tight">{exp.name}</h3>
                <p className="text-sm text-ink/55">{vendor} · {inr(exp.price)} {exp.unit}</p>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ink/5"><X size={18} /></button>
            </div>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-ink/55">Date</span>
              <input type="date" min={todayISO()} value={date} onChange={(e) => setDate(e.target.value)} className="input" />
            </label>
            <Counter label="Guests" value={guests} set={setGuests} max={12} />
            <BookingPanel
              title="Booking summary"
              subtotal={subtotal}
              taxRate={TAX.experience}
              lines={[{ label: `${inr(exp.price)} × ${guests}`, value: subtotal }]}
              cta="Book experience"
              disabled={!date || date < todayISO()}
              disabledReason="Pick a valid date"
              buildBody={(payment, coupon) => ({ type: "experience", refId: exp.id, startDate: date, guests, coupon, payment })}
            />
          </div>
        </div>
        </Portal>
      )}
    </>
  );
}
