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

export function DestinationCard({ d, i = 0, className = "min-h-72 w-[min(15rem,70vw)]" }: { d: Dest; i?: number; className?: string }) {
  return (
    <Link href={`/destinations/${d.slug}`} style={idx(i)} className={`anim-up group lift zoom relative flex flex-col justify-end overflow-hidden rounded-[32px] pt-16 ${className}`}>
      <Img src={d.image} alt={d.name} className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#1b0b3d]/85 via-[#1b0b3d]/10 to-transparent" />
      <FavButton kind="destination" id={d.id} className="absolute right-3 top-3" />
      <div className="relative p-4 text-white">
        <p className="flex flex-wrap items-center gap-x-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/70">
          <span>{d.region}</span>
          <span className="flex items-center gap-1 normal-case tracking-normal"><Mountain size={11} aria-hidden /> {d.altitude}</span>
        </p>
        <h3 className="font-display break-words text-[clamp(1.2rem,5.6vw,1.5rem)] font-semibold leading-tight">{d.name}</h3>
        <div className="mt-1 flex items-center justify-between">
          <p className="min-w-0 truncate text-xs text-white/80">{d.tagline}</p>
          <Rating value={d.rating} className="shrink-0 text-white" />
        </div>
      </div>
    </Link>
  );
}

export function AttractionCard({ a, dest, i = 0, className = "w-[min(16rem,78vw)]" }: { a: Attr; dest?: string; i?: number; className?: string }) {
  return (
    <Link href={`/attractions/${a.slug}`} style={idx(i)} className={`anim-up group lift glass-strong block overflow-hidden rounded-[30px] p-2 ${className}`}>
      <div className="zoom relative h-40 overflow-hidden rounded-[24px]">
        <Img src={a.image} alt={a.name} className="h-full w-full object-cover" />
        <FavButton kind="attraction" id={a.id} className="absolute right-2.5 top-2.5" />
        <span className="glass-tint absolute bottom-2.5 left-2.5 rounded-full px-2.5 py-1 text-[11px] font-bold text-white">{a.category}</span>
      </div>
      <div className="px-2.5 pb-2 pt-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display line-clamp-2 min-w-0 text-[1.05rem] font-semibold leading-snug">{a.name}</h3>
          <Rating value={a.rating} className="shrink-0" />
        </div>
        <div className="mt-1.5 flex min-w-0 items-center gap-3 text-xs text-ink/55">
          <span className="flex shrink-0 items-center gap-1"><Clock size={12} /> {a.duration}</span>
          {dest && <span className="flex min-w-0 items-center gap-1"><MapPin size={12} className="shrink-0" /> <span className="truncate">{dest}</span></span>}
          <span className="ml-auto shrink-0 font-bold text-ink">{a.entryFee ? inr(a.entryFee) : "Free"}</span>
        </div>
      </div>
    </Link>
  );
}

export function HotelCard({ h, dest, i = 0, className = "w-[min(18rem,80vw)]" }: { h: Hotel; dest?: string; i?: number; className?: string }) {
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
          <h3 className="font-display line-clamp-1 min-w-0 text-[1.05rem] font-semibold">{h.name}</h3>
          <Rating value={h.rating} className="shrink-0" />
        </div>
        <p className="mt-0.5 flex min-w-0 items-center gap-1 text-xs text-ink/55"><MapPin size={12} className="shrink-0" /> <span className="truncate">{h.area}{dest ? `, ${dest}` : ""}</span></p>
        <div className="mt-2.5 flex items-end justify-between gap-2">
          <div className="flex min-w-0 flex-wrap gap-1">
            {h.amenities.slice(0, 2).map((x) => (
              <span key={x} className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-700">{x}</span>
            ))}
          </div>
          <p className="shrink-0 text-right"><span className="font-display text-lg font-semibold">{inr(h.pricePerNight)}</span><span className="text-[10px] text-ink/50"> /night</span></p>
        </div>
      </div>
    </Link>
  );
}

export function PackageCard({ p, dests, i = 0, className = "w-[min(20rem,82vw)]" }: { p: Pkg; dests?: string; i?: number; className?: string }) {
  return (
    <Link href={`/tours/${p.slug}`} style={idx(i)} className={`anim-up group lift zoom relative flex min-h-[26rem] flex-col justify-between gap-6 overflow-hidden rounded-[34px] ${className}`}>
      <Img src={p.image} alt={p.name} className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#14082e]/90 via-[#14082e]/25 to-transparent" />
      <div className="relative flex flex-wrap gap-2 pl-4 pr-[4.5rem] pt-4">
        <span className="rounded-full bg-white px-3 py-1.5 text-[11px] font-bold">{p.days} days</span>
        <span className="glass-tint rounded-full px-3 py-1.5 text-[11px] font-bold text-white">{p.theme}</span>
      </div>
      <FavButton kind="package" id={p.id} className="absolute right-4 top-4" />
      <div className="relative p-5 text-white">
        <Rating value={p.rating} className="text-white" />
        <h3 className="font-display mt-1 text-[1.6rem] font-semibold leading-[1.1]">{p.name}</h3>
        {dests && <p className="mt-1 text-xs text-white/70">{dests}</p>}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {p.highlights.slice(0, 3).map((h) => (
            <span key={h} className="glass-tint rounded-full px-2.5 py-1 text-[10px] font-semibold">{h}</span>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between gap-2">
          <p className="min-w-0"><span className="text-[10px] uppercase text-white/60">from</span> <span className="font-display text-2xl font-semibold">{inr(p.price)}</span><span className="text-[10px] text-white/60"> /person</span></p>
          <span className="shrink-0 rounded-full bg-white px-4 py-2 text-xs font-bold text-ink transition group-hover:bg-brand-100">View trip</span>
        </div>
      </div>
    </Link>
  );
}

const KIND_LABEL: Record<string, string> = { grocery: "Grocery", restaurant: "Restaurant", shop: "Local shop" };

export function VendorCard({ v, dest, i = 0, className = "w-[min(18rem,80vw)]" }: { v: Vendor; dest?: string; i?: number; className?: string }) {
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
          <h3 className="font-display line-clamp-1 min-w-0 text-[1.05rem] font-semibold">{v.name}</h3>
          <Rating value={v.rating} className="shrink-0" />
        </div>
        <p className="line-clamp-1 text-xs text-ink/55">{v.tagline}</p>
        <div className="mt-2 flex min-w-0 items-start gap-2 text-[11px] font-semibold text-ink/60">
          <span className="shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-brand-700">{KIND_LABEL[v.kind]}</span>
          <span className="flex min-w-0 items-start gap-1"><MapPin size={11} className="mt-[3px] shrink-0" /> <span className="min-w-0 break-words leading-snug">{v.area}{dest ? `, ${dest}` : ""}</span></span>
          {v.kind !== "shop" && <span className="ml-auto flex shrink-0 items-center gap-1"><Bike size={12} /> {v.deliveryFee ? inr(v.deliveryFee) : "Free"}</span>}
        </div>
      </div>
    </Link>
  );
}
