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
    <div className="anim-up relative h-80 overflow-hidden rounded-[40px] sm:h-[26rem]">
      <Img src={image} alt={title} className="absolute inset-0 h-full w-full object-cover" eager />
      <div className="absolute inset-0 bg-gradient-to-t from-[#14082e]/90 via-[#14082e]/25 to-transparent" />
      {badges && <div className="absolute left-4 top-4 flex flex-wrap gap-2">{badges}</div>}
      {fav && <FavButton kind={fav.kind} id={fav.id} className="absolute right-4 top-4" />}
      <div className="absolute inset-x-0 bottom-0 p-6 text-white sm:p-8">
        {eyebrow && <p className="text-xs font-semibold uppercase tracking-wider text-white/70">{eyebrow}</p>}
        <h1 className="font-display text-4xl font-semibold leading-[1.02] sm:text-5xl">{title}</h1>
        {children}
      </div>
    </div>
  );
}

export function Fact({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <div className="glass flex items-center gap-3 rounded-3xl p-3.5">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-brand-100 text-brand-700">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-ink/45">{label}</p>
        <p className="truncate text-sm font-bold">{value}</p>
      </div>
    </div>
  );
}
