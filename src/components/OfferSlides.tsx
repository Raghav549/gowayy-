"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
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
            className="group relative isolate block aspect-[2/1] w-full min-w-0 overflow-hidden rounded-[24px] bg-[#123040] outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 sm:rounded-[28px]"
          >
            {/* Text-free banner artwork; the live offer terms sit on top as a chip. */}
            {/* eslint-disable-next-line @next/next/no-img-element -- pre-sized local webp */}
            <img
              src={s.img}
              srcSet={s.img.startsWith("/media/banners/") && s.img.endsWith(".webp") ? `${s.img.replace(/\.webp$/, "-960.webp")} 960w, ${s.img} 1456w` : undefined}
              sizes="(min-width: 640px) 50vw, 92vw"
              alt=""
              width={1456}
              height={720}
              loading={i < 2 ? "eager" : "lazy"}
              fetchPriority={i === 0 ? "high" : undefined}
              decoding="async"
              draggable={false}
              className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]"
            />
            <span className={`absolute right-2.5 top-2.5 flex max-w-[62%] items-center gap-1.5 rounded-full bg-white/95 py-1 pl-2.5 text-[11px] font-extrabold leading-none text-ink shadow-lg shadow-black/20 sm:right-3.5 sm:top-3.5 sm:text-[13px] ${s.code ? "pr-1" : "pr-2.5"}`}>
              <span className="truncate py-0.5">{s.badge}</span>
              {s.code && <span className="shrink-0 rounded-full bg-brand-600 px-2 py-1 tracking-wide text-white">{s.code}</span>}
            </span>
            <span className="sr-only">{s.title}. {s.detail}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
