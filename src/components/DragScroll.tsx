"use client";

import { useEffect } from "react";

const RAILS = ".cat-rail, .offer-track, .hscroll";

/**
 * Lets mouse users drag any horizontal rail sideways, the way touch users swipe.
 * Touch and pen keep native scrolling; a drag never triggers the link under it.
 * Mounted once in the root layout (event delegation, so it covers every page).
 */
export function DragScroll() {
  useEffect(() => {
    let el: HTMLElement | null = null;
    let startX = 0;
    let startLeft = 0;
    let dragged = false;

    const down = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      const t = e.target as Element;
      if (t.closest("input, textarea, select")) return;
      const rail = t.closest<HTMLElement>(RAILS);
      if (!rail || rail.scrollWidth <= rail.clientWidth + 1) return;
      el = rail;
      startX = e.clientX;
      startLeft = rail.scrollLeft;
      dragged = false;
    };
    const move = (e: PointerEvent) => {
      if (!el) return;
      const dx = e.clientX - startX;
      if (!dragged && Math.abs(dx) < 6) return;
      if (!dragged) {
        dragged = true;
        el.classList.add("is-dragging");
      }
      el.scrollLeft = startLeft - dx;
    };
    const up = () => {
      if (!el) return;
      const rail = el;
      el = null;
      if (!dragged) return;
      // swallow the click that ends a drag so it doesn't open whatever is under the pointer
      const stop = (ev: MouseEvent) => {
        ev.preventDefault();
        ev.stopPropagation();
      };
      window.addEventListener("click", stop, { capture: true, once: true });
      setTimeout(() => window.removeEventListener("click", stop, { capture: true }), 0);
      rail.classList.remove("is-dragging"); // re-enables snapping, which settles on the nearest item
    };
    // links and images are natively draggable; inside a rail that would hijack the gesture
    const nativeDrag = (e: DragEvent) => {
      if ((e.target as Element | null)?.closest?.(RAILS)) e.preventDefault();
    };

    document.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    document.addEventListener("dragstart", nativeDrag);
    return () => {
      document.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      document.removeEventListener("dragstart", nativeDrag);
    };
  }, []);
  return null;
}
