import type { ReactNode } from "react";
import { Img } from "@/components/Img";
import { FavButton } from "@/components/FavButton";

export function Hero({
  image, title, eyebrow, children, fav, badges,
}: {
  image: string;
  title: string;
  eyebrow?: string;
  children?: ReactNode;
  fav?: { kind: string; id: number };
  badges?: ReactNode;
}) {
  return (
    // Content sits in normal flow (min height, not a fixed one) so long names
    // and descriptions grow the hero instead of running into the badges.
    <div className="anim-up relative flex min-h-80 flex-col justify-between gap-8 overflow-hidden rounded-[40px] sm:min-h-[26rem]">
      <Img src={image} alt={title} className="absolute inset-0 h-full w-full object-cover" eager />
      <div className="absolute inset-0 bg-gradient-to-t from-[#14082e]/90 via-[#14082e]/25 to-transparent" />
      <div className={`relative flex min-h-[4.5rem] flex-wrap content-start gap-2 pl-4 pt-4 ${fav ? "pr-[4.5rem]" : "pr-4"}`}>{badges}</div>
      {fav && <FavButton kind={fav.kind} id={fav.id} className="absolute right-4 top-4" />}
      <div className="relative p-6 text-white sm:p-8">
        {eyebrow && <p className="text-xs font-semibold uppercase tracking-wider text-white/70">{eyebrow}</p>}
        <h1 className="font-display break-words text-[clamp(1.9rem,9vw,2.25rem)] font-semibold leading-[1.02] sm:text-5xl">{title}</h1>
        {children}
      </div>
    </div>
  );
}

export function Fact({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    // Stacks icon over text until there's room side by side, and lets values
    // wrap: these hold fees, timings and addresses that must not be cut off.
    <div className="glass flex min-w-0 flex-col items-start gap-2 rounded-3xl p-3.5 lg:flex-row lg:items-center lg:gap-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-brand-100 text-brand-700 lg:h-10 lg:w-10">{icon}</span>
      <div className="min-w-0 max-w-full">
        <p className="break-words text-[10px] font-bold uppercase leading-tight tracking-wide text-ink/45">{label}</p>
        <p className="mt-0.5 break-words text-sm font-bold leading-snug">{value}</p>
      </div>
    </div>
  );
}
