import Link from "next/link";
import { SERVICES } from "@/components/nav-data";

/**
 * Horizontally swipeable row of circular, story-inspired category items.
 * Each item links to the category's listing/discovery page.
 */
export function CategoryRail({ active, className = "" }: { active?: string; className?: string }) {
  return (
    <nav aria-label="Categories" className={`cat-rail ${className}`}>
      {SERVICES.map((s, i) => {
        const on = active === s.href;
        return (
          <Link
            key={s.href}
            href={s.href}
            aria-current={on ? "page" : undefined}
            style={{ "--i": i } as React.CSSProperties}
            className="anim-pop group flex w-[4.6rem] flex-col items-center gap-2 outline-none sm:w-[5.4rem]"
          >
            <span
              className={`grid aspect-square w-full place-items-center rounded-full bg-gradient-to-tr p-[2.5px] transition duration-300 group-hover:-translate-y-0.5 group-active:scale-95 group-focus-visible:ring-2 group-focus-visible:ring-brand-500 group-focus-visible:ring-offset-2 ${s.ring} ${on ? "shadow-lg shadow-brand-600/30" : "shadow-md shadow-brand-900/10"}`}
            >
              <span className="grid h-full w-full place-items-center rounded-full bg-white p-[3px]">
                <span className={`grid h-full w-full place-items-center rounded-full ${s.tile} ${s.fg}`}>
                  <s.icon size={30} className="transition duration-300 group-hover:scale-110" />
                </span>
              </span>
            </span>
            <span className={`w-full truncate text-center text-[12.5px] leading-tight ${on ? "font-bold text-brand-700" : "font-semibold text-ink/80"}`}>{s.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
