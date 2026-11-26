import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, Star } from "lucide-react";

export function SectionHead({ title, sub, href, label = "See all" }: { title: string; sub?: string; href?: string; label?: string }) {
  return (
    <div className="mb-3 mt-9 flex items-end justify-between gap-3">
      <div>
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

export function Empty({ emoji = "🏔️", title, text, href, cta }: { emoji?: string; title: string; text: string; href?: string; cta?: string }) {
  return (
    <div className="glass anim-up mx-auto my-10 max-w-md rounded-[32px] p-8 text-center">
      <div className="float text-5xl">{emoji}</div>
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
      <div className="flex items-center justify-between text-ink/55">
        <span className="text-[11px] font-bold uppercase tracking-wider">{label}</span>
        {icon}
      </div>
      <p className="font-display mt-2 text-2xl font-semibold">{value}</p>
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
