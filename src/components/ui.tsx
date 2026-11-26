import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, MapPin, Mountain, Search, Star, type LucideIcon } from "lucide-react";

export function SectionHead({ title, sub, href, label = "See all" }: { title: string; sub?: string; href?: string; label?: string }) {
  return (
    <div className="mb-3 mt-9 flex items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 className="font-display text-[1.45rem] font-semibold leading-tight">{title}</h2>
        {sub && <p className="mt-0.5 text-xs text-ink/55">{sub}</p>}
      </div>
      {href && (
        <Link href={href} className="flex shrink-0 items-center gap-1 text-xs font-bold text-brand-700 transition hover:gap-2">
          {label} <ArrowRight size={14} />
        </Link>
      )}
    </div>
  );
}

export function Rating({ value, className = "" }: { value: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold ${className}`}>
      <Star size={13} className="fill-amber-400 text-amber-400" />
      {value.toFixed(1)}
    </span>
  );
}

export function Chip({ href, on, children }: { href: string; on?: boolean; children: ReactNode }) {
  return (
    <Link href={href} scroll={false} className={`chip ${on ? "chip-on" : ""}`}>
      {children}
    </Link>
  );
}

export function Empty({ icon: Icon = Mountain, title, text, href, cta }: { icon?: LucideIcon; title: string; text: string; href?: string; cta?: string }) {
  return (
    <div className="glass anim-up mx-auto my-10 max-w-md rounded-[32px] p-6 text-center sm:p-8">
      <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-brand-100 text-brand-700 ring-8 ring-brand-50">
        <Icon size={28} strokeWidth={1.8} />
      </span>
      <h3 className="font-display mt-4 text-xl font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-ink/60">{text}</p>
      {href && (
        <Link href={href} className="btn btn-brand mt-5">
          {cta ?? "Explore"}
        </Link>
      )}
    </div>
  );
}

export function Stat({ label, value, icon }: { label: string; value: ReactNode; icon?: ReactNode }) {
  return (
    <div className="glass rounded-3xl p-4">
      <div className="flex items-start justify-between gap-2 text-ink/55">
        <span className="min-w-0 break-words text-[11px] font-bold uppercase leading-tight tracking-wide">{label}</span>
        {icon && <span className="shrink-0">{icon}</span>}
      </div>
      <p className="font-display mt-2 break-words text-[clamp(1.25rem,6vw,1.5rem)] font-semibold">{value}</p>
    </div>
  );
}

const STATUS_TONES: Record<string, string> = {
  confirmed: "bg-emerald-100 text-emerald-700",
  delivered: "bg-emerald-100 text-emerald-700",
  completed: "bg-emerald-100 text-emerald-700",
  paid: "bg-emerald-100 text-emerald-700",
  placed: "bg-amber-100 text-amber-700",
  pending: "bg-amber-100 text-amber-700",
  preparing: "bg-amber-100 text-amber-700",
  out_for_delivery: "bg-sky-100 text-sky-700",
  cancelled: "bg-rose-100 text-rose-700",
  refunded: "bg-rose-100 text-rose-700",
  failed: "bg-rose-100 text-rose-700",
};

export function StatusPill({ status }: { status: string }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ${STATUS_TONES[status] ?? "bg-brand-100 text-brand-700"}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

/** Small eyebrow label that introduces a group of connected recommendations. */
export function SmartBadge({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-1 mt-10 flex items-center gap-3">
      <span className="h-px w-6 shrink-0 bg-brand-400" />
      <span className="min-w-0 text-[11px] font-bold uppercase tracking-[0.14em] text-brand-700">{children}</span>
      <span className="h-px flex-1 bg-gradient-to-r from-brand-200 to-transparent" />
    </div>
  );
}

/** GET search form for listing pages; keeps the other active filters as hidden fields. */
export function ListingSearch({ action, q, placeholder, hidden = {} }: { action: string; q?: string; placeholder: string; hidden?: Record<string, string | undefined> }) {
  return (
    <form action={action} role="search" className="mb-4 flex h-14 w-full items-center gap-3 rounded-full bg-white pl-5 pr-1.5 shadow-[0_10px_30px_-12px_rgba(124,58,237,0.3)] ring-1 ring-brand-100 focus-within:ring-2 focus-within:ring-brand-400">
      <Search size={18} className="shrink-0 text-brand-600" />
      <input name="q" type="search" enterKeyHint="search" aria-label={placeholder} defaultValue={q} placeholder={placeholder} className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none [&::-webkit-search-cancel-button]:hidden" />
      {Object.entries(hidden).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
      <button className="btn btn-dark btn-sm shrink-0 !px-4">Search</button>
    </form>
  );
}

/** Shown in "Near you" sections when no area is selected or nothing exists there. */
export function NearYouNote({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="glass flex flex-wrap items-center justify-between gap-3 rounded-3xl p-4">
      <p className="flex min-w-0 flex-1 items-center gap-2 text-sm text-ink/70"><MapPin size={16} className="shrink-0 text-brand-600" /> <span className="min-w-0">{children}</span></p>
      {action}
    </div>
  );
}
