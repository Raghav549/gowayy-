import Link from "next/link";
import { HOME_CATEGORIES } from "@/components/categories";

/**
 * Horizontally swipeable row of circular, story-inspired category photos.
 * Each item links to a real, filtered listing page.
 */
export function CategoryRail({ active, className = "" }: { active?: string; className?: string }) {
  return (
    <nav aria-label="Categories" className={`cat-rail ${className}`}>
      {HOME_CATEGORIES.map((c, i) => {
        const on = active === c.href;
        return (
          <Link
            key={c.href}
            href={c.href}
            aria-current={on ? "page" : undefined}
            style={{ "--i": Math.min(i, 7) } as React.CSSProperties}
            className="anim-pop group flex w-[4.6rem] flex-col items-center gap-2 outline-none sm:w-[5.4rem]"
          >
            <span
              className={`grid aspect-square w-full place-items-center rounded-full bg-gradient-to-tr p-[2.5px] transition duration-300 group-hover:-translate-y-0.5 group-active:scale-95 group-focus-visible:ring-2 group-focus-visible:ring-brand-500 group-focus-visible:ring-offset-2 ${c.ring} ${on ? "shadow-lg shadow-brand-600/30" : "shadow-md shadow-brand-900/10"}`}
            >
              <span className="block h-full w-full overflow-hidden rounded-full bg-white p-[3px]">
                {/* eslint-disable-next-line @next/next/no-img-element -- small pre-sized local webp */}
                <img
                  src={c.img}
                  alt=""
                  width={120}
                  height={120}
                  loading={i < 6 ? "eager" : "lazy"}
                  decoding="async"
                  draggable={false}
                  className="h-full w-full rounded-full bg-brand-50 object-cover transition duration-500 group-hover:scale-110"
                />
              </span>
            </span>
            <span className={`w-full truncate text-center text-[12.5px] leading-tight ${on ? "font-bold text-brand-700" : "font-semibold text-ink/80"}`}>{c.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
