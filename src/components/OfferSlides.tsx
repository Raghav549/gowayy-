"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { OfferSlide } from "@/lib/offers";

const ADVANCE_MS = 4500;
const RESUME_MS = 7000;

/**
 * Swipeable offer banners: native scroll-snap (so touch, trackpad and keyboard
 * scrolling all just work), no dots or progress indicator. It drifts to the next
 * banner on its own, pausing while the user touches, hovers or focuses it, while
 * it's off-screen or the tab is hidden, and never when reduced motion is preferred.
 */
export function OfferSlides({ slides, className = "" }: { slides: OfferSlide[]; className?: string }) {
  const track = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = track.current;
    if (!el || slides.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let visible = true;
    let pausedUntil = 0;
    const hold = (ms = RESUME_MS) => (pausedUntil = Date.now() + ms);
    const hover = { on: false };

    const next = () => {
      if (!visible || document.hidden || hover.on || Date.now() < pausedUntil) return;
      if (el.contains(document.activeElement)) return;
      const items = Array.from(el.children) as HTMLElement[];
      const pad = parseFloat(getComputedStyle(el).scrollPaddingLeft) || 0;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 8;
      const target = atEnd ? null : items.find((c) => c.offsetLeft - pad > el.scrollLeft + 8);
      el.scrollTo({ left: target ? target.offsetLeft - pad : 0, behavior: "smooth" });
    };

    const t = setInterval(next, ADVANCE_MS);
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting), { threshold: 0.5 });
    io.observe(el);
    const touch = () => hold();
    const enter = () => (hover.on = true);
    const leave = () => {
      hover.on = false;
      hold(2500);
    };
    el.addEventListener("pointerdown", touch, { passive: true });
    el.addEventListener("wheel", touch, { passive: true });
    el.addEventListener("touchstart", touch, { passive: true });
    el.addEventListener("mouseenter", enter);
    el.addEventListener("mouseleave", leave);
    return () => {
      clearInterval(t);
      io.disconnect();
      el.removeEventListener("pointerdown", touch);
      el.removeEventListener("wheel", touch);
      el.removeEventListener("touchstart", touch);
      el.removeEventListener("mouseenter", enter);
      el.removeEventListener("mouseleave", leave);
    };
  }, [slides.length]);

  if (!slides.length) return null;
  return (
    <section aria-label="Offers" className={className}>
      <div ref={track} className="offer-track">
        {slides.map((s, i) => (
          <Link
            key={s.key}
            href={s.href}
            className="group relative flex aspect-[16/9] min-h-[10.5rem] w-full min-w-0 flex-col justify-between overflow-hidden rounded-[28px] bg-brand-900 p-4 text-white shadow-lg shadow-brand-900/15 outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 sm:aspect-[2/1] sm:p-5"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- pre-sized local webp */}
            <img
              src={s.img}
              alt=""
              width={960}
              height={480}
              loading={i < 2 ? "eager" : "lazy"}
              fetchPriority={i === 0 ? "high" : undefined}
              decoding="async"
              draggable={false}
              className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
            />
            <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#14082e]/90 via-[#14082e]/40 to-[#14082e]/5" />
            <span className="relative self-start rounded-full bg-white px-3 py-1.5 text-[12px] font-extrabold leading-none text-brand-700 shadow-md">{s.badge}</span>
            <div className="relative flex items-end justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-display line-clamp-2 break-words text-[clamp(1.15rem,5.2vw,1.5rem)] font-semibold leading-[1.08]">{s.title}</h3>
                <p className="mt-1 line-clamp-2 break-words text-xs font-semibold text-white/85">{s.detail}</p>
              </div>
              <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/95 text-ink transition group-hover:translate-x-0.5">
                <ArrowRight size={17} />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
