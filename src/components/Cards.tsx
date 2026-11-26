import Link from "next/link";
import { Clock, MapPin, Mountain, Timer, Bike, Sun } from "lucide-react";
import { Img } from "@/components/Img";
import { FavButton } from "@/components/FavButton";
import { Rating } from "@/components/ui";
import { inr } from "@/lib/utils";
import type { attractions, destinations, hotels, packages, vendors } from "@/db/schema";

type Dest = typeof destinations.$inferSelect;
type Attr = typeof attractions.$inferSelect;
type Hotel = typeof hotels.$inferSelect;
type Pkg = typeof packages.$inferSelect;
type Vendor = typeof vendors.$inferSelect;

const idx = (i: number) => ({ "--i": i }) as React.CSSProperties;

export function DestinationCard({ d, i = 0, className = "h-72 w-60" }: { d: Dest; i?: number; className?: string }) {
  return (
    <Link href={`/destinations/${d.slug}`} style={idx(i)} className={`anim-up group lift zoom relative block overflow-hidden rounded-[32px] ${className}`}>
      <Img src={d.image} alt={d.name} className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#1b0b3d]/85 via-[#1b0b3d]/10 to-transparent" />
      <div className="absolute left-3 top-3 flex gap-2">
        <span className="glass-tint flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold text-white">
          <Mountain size={12} /> {d.altitude}
        </span>
      </div>
      <FavButton kind="destination" id={d.id} className="absolute right-3 top-3" />
      <div className="absolute inset-x-0 bottom-0 p-4 text-white">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-white/70">{d.region}</p>
        <h3 className="font-display text-2xl font-semibold leading-tight">{d.name}</h3>
        <div className="mt-1 flex items-center justify-between">
          <p className="truncate text-xs text-white/80">{d.tagline}</p>
          <Rating value={d.rating} className="text-white" />
        </div>
      </div>
    </Link>
  );
}

export function AttractionCard({ a, dest, i = 0, className = "w-64" }: { a: Attr; dest?: string; i?: number; className?: string }) {
  return (
    <Link href={`/attractions/${a.slug}`} style={idx(i)} className={`anim-up group lift glass-strong block overflow-hidden rounded-[30px] p-2 ${className}`}>
      <div className="zoom relative h-40 overflow-hidden rounded-[24px]">
        <Img src={a.image} alt={a.name} className="h-full w-full object-cover" />
        <FavButton kind="attraction" id={a.id} className="absolute right-2.5 top-2.5" />
        <span className="glass-tint absolute bottom-2.5 left-2.5 rounded-full px-2.5 py-1 text-[11px] font-bold text-white">{a.category}</span>
      </div>
      <div className="px-2.5 pb-2 pt-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display line-clamp-2 text-[1.05rem] font-semibold leading-snug">{a.name}</h3>
          <Rating value={a.rating} />
        </div>
        <div className="mt-1.5 flex items-center gap-3 text-xs text-ink/55">
          <span className="flex items-center gap-1"><Clock size={12} /> {a.duration}</span>
          {dest && <span className="flex items-center gap-1"><MapPin size={12} /> {dest}</span>}
          <span className="ml-auto font-bold text-ink">{a.entryFee ? inr(a.entryFee) : "Free"}</span>
        </div>
      </div>
    </Link>
  );
}

export function HotelCard({ h, dest, i = 0, className = "w-72" }: { h: Hotel; dest?: string; i?: number; className?: string }) {
  return (
    <Link href={`/hotels/${h.slug}`} style={idx(i)} className={`anim-up group lift glass-strong block overflow-hidden rounded-[30px] p-2 ${className}`}>
      <div className="zoom relative h-44 overflow-hidden rounded-[24px]">
        <Img src={h.image} alt={h.name} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        <FavButton kind="hotel" id={h.id} className="absolute right-2.5 top-2.5" />
        <span className="glass-tint absolute bottom-2.5 left-2.5 rounded-full px-2.5 py-1 text-[11px] font-bold text-white">{h.type}</span>
      </div>
      <div className="px-2.5 pb-2 pt-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display line-clamp-1 text-[1.05rem] font-semibold">{h.name}</h3>
          <Rating value={h.rating} />
        </div>
        <p className="mt-0.5 flex items-center gap-1 text-xs text-ink/55"><MapPin size={12} /> {h.area}{dest ? `, ${dest}` : ""}</p>
        <div className="mt-2.5 flex items-end justify-between">
          <div className="flex flex-wrap gap-1">
            {h.amenities.slice(0, 2).map((x) => (
              <span key={x} className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-700">{x}</span>
            ))}
          </div>
          <p className="text-right"><span className="font-display text-lg font-semibold">{inr(h.pricePerNight)}</span><span className="text-[10px] text-ink/50"> /night</span></p>
        </div>
      </div>
    </Link>
  );
}

export function PackageCard({ p, dests, i = 0, className = "w-80" }: { p: Pkg; dests?: string; i?: number; className?: string }) {
  return (
    <Link href={`/tours/${p.slug}`} style={idx(i)} className={`anim-up group lift zoom relative block h-[26rem] overflow-hidden rounded-[34px] ${className}`}>
      <Img src={p.image} alt={p.name} className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#14082e]/90 via-[#14082e]/25 to-transparent" />
      <div className="absolute left-4 top-4 flex gap-2">
        <span className="rounded-full bg-white px-3 py-1.5 text-[11px] font-bold">{p.days} days</span>
        <span className="glass-tint rounded-full px-3 py-1.5 text-[11px] font-bold text-white">{p.theme}</span>
      </div>
      <FavButton kind="package" id={p.id} className="absolute right-4 top-4" />
      <div className="absolute inset-x-0 bottom-0 p-5 text-white">
        <Rating value={p.rating} className="text-white" />
        <h3 className="font-display mt-1 text-[1.6rem] font-semibold leading-[1.1]">{p.name}</h3>
        {dests && <p className="mt-1 text-xs text-white/70">{dests}</p>}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {p.highlights.slice(0, 3).map((h) => (
            <span key={h} className="glass-tint rounded-full px-2.5 py-1 text-[10px] font-semibold">{h}</span>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between">
          <p><span className="text-[10px] uppercase text-white/60">from</span> <span className="font-display text-2xl font-semibold">{inr(p.price)}</span><span className="text-[10px] text-white/60"> /person</span></p>
          <span className="rounded-full bg-white px-4 py-2 text-xs font-bold text-ink transition group-hover:bg-brand-100">View trip</span>
        </div>
      </div>
    </Link>
  );
}

const KIND_LABEL: Record<string, string> = { grocery: "Grocery", restaurant: "Restaurant", shop: "Local shop" };

export function VendorCard({ v, dest, i = 0, className = "w-72" }: { v: Vendor; dest?: string; i?: number; className?: string }) {
  return (
    <Link href={`/store/${v.slug}`} style={idx(i)} className={`anim-up group lift glass-strong block overflow-hidden rounded-[30px] p-2 ${className}`}>
      <div className="zoom relative h-36 overflow-hidden rounded-[24px]">
        <Img src={v.image} alt={v.name} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" />
        <FavButton kind="vendor" id={v.id} className="absolute right-2.5 top-2.5" />
        <span className="absolute bottom-2.5 left-2.5 flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold">
          {v.kind === "shop" ? <Sun size={12} /> : <Timer size={12} />} {v.kind === "shop" ? "Local shop" : `${v.etaMins} min`}
        </span>
      </div>
      <div className="px-2.5 pb-2 pt-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display line-clamp-1 text-[1.05rem] font-semibold">{v.name}</h3>
          <Rating value={v.rating} />
        </div>
        <p className="line-clamp-1 text-xs text-ink/55">{v.tagline}</p>
        <div className="mt-2 flex items-center gap-2 text-[11px] font-semibold text-ink/60">
          <span className="rounded-full bg-brand-50 px-2 py-0.5 text-brand-700">{KIND_LABEL[v.kind]}</span>
          <span className="flex items-center gap-1"><MapPin size={11} /> {v.area}{dest ? `, ${dest}` : ""}</span>
          {v.kind !== "shop" && <span className="ml-auto flex items-center gap-1"><Bike size={12} /> {v.deliveryFee ? inr(v.deliveryFee) : "Free"}</span>}
        </div>
      </div>
    </Link>
  );
}
