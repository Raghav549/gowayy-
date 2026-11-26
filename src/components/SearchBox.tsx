"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Search, X } from "lucide-react";
import { Img } from "@/components/Img";

type Hit = { type: string; title: string; sub: string; href: string; image: string; emoji?: string };

export function SearchBox({ big = false, placeholder = "Search hotels, momos, tours, cabs…" }: { big?: boolean; placeholder?: string }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  const showHits = q.trim().length >= 2 ? hits : [];

  useEffect(() => {
    if (q.trim().length < 2) return;
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`);
        const j = await r.json();
        setHits(j.results ?? []);
      } catch {
        setHits([]);
      }
    }, 220);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const h = (e: PointerEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", h);
    return () => document.removeEventListener("pointerdown", h);
  }, []);

  return (
    <div ref={box} className="relative w-full">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (q.trim()) {
            setOpen(false);
            router.push(`/search?q=${encodeURIComponent(q.trim())}`);
          }
        }}
        role="search"
        className={`flex w-full items-center gap-3 rounded-full bg-white shadow-[0_10px_30px_-12px_rgba(124,58,237,0.3)] ring-1 ring-brand-100 transition focus-within:ring-2 focus-within:ring-brand-400 ${big ? "h-14 pl-5 pr-1.5 sm:h-16" : "h-11 pl-4 pr-2"}`}
      >
        <Search size={big ? 20 : 17} className="shrink-0 text-brand-600" />
        <input
          type="search"
          enterKeyHint="search"
          aria-label="Search gowayy"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
          placeholder={placeholder}
          className={`min-w-0 flex-1 bg-transparent font-medium outline-none placeholder:text-ink/40 [&::-webkit-search-cancel-button]:hidden ${big ? "text-[15px]" : "text-sm"}`}
        />
        {q && (
          <button type="button" aria-label="Clear search" onClick={() => { setQ(""); setHits([]); }} className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink/45 transition hover:bg-ink/5">
            <X size={16} />
          </button>
        )}
        {big && (
          <button type="submit" aria-label="Search" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-ink text-white transition hover:bg-brand-700 active:scale-95 sm:h-12 sm:w-12">
            <ArrowRight size={18} />
          </button>
        )}
      </form>
      {open && showHits.length > 0 && (
        <div className="glass-strong anim-pop absolute left-0 right-0 top-full z-50 mt-2 max-h-[min(24rem,60vh)] overflow-y-auto overscroll-contain rounded-3xl p-2">
          {showHits.map((h, i) => (
            <Link key={i} href={h.href} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-2xl p-2 transition hover:bg-brand-50">
              <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-brand-100 text-xl">
                {h.image ? <Img src={h.image} alt="" className="h-full w-full object-cover" /> : h.emoji}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{h.title}</p>
                <p className="truncate text-xs text-ink/55">{h.sub}</p>
              </div>
              <span className="shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold uppercase text-brand-700">{h.type}</span>
            </Link>
          ))}
          <button onClick={() => router.push(`/search?q=${encodeURIComponent(q.trim())}`)} className="w-full rounded-2xl p-2 text-center text-xs font-bold text-brand-700 hover:bg-brand-50">
            See all results for “{q}”
          </button>
        </div>
      )}
    </div>
  );
}
