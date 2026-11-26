"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/Logo";
import { px } from "@/lib/images";

const SLIDES = [
  {
    title: "Ready for your Himalayan escape.",
    text: "Discover Darjeeling, Kalimpong and beyond — tours, stays and sights curated in one smooth experience.",
    imgs: [12174800, 103875, 31477804],
  },
  {
    title: "Fresh groceries & food, delivered in minutes.",
    text: "From hill-fresh vegetables to steaming momos — order from trusted local stores and track every step.",
    imgs: [37321079, 41076413, 32797056],
  },
  {
    title: "One app. Every journey connected.",
    text: "Book a tour and we line up the stay, the cab and the best local food — automatically.",
    imgs: [38115533, 39333422, 28849374],
  },
];

export function Onboarding() {
  const path = usePathname();
  const [show, setShow] = useState(false);
  const [i, setI] = useState(0);

  useEffect(() => {
    if (path === "/" && !localStorage.getItem("gw_onboarded")) setShow(true);
  }, [path]);

  if (!show) return null;
  const s = SLIDES[i];
  const last = i === SLIDES.length - 1;
  const done = () => {
    localStorage.setItem("gw_onboarded", "1");
    setShow(false);
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-gradient-to-b from-[#e7dcff] to-white sm:p-6">
      <div className="relative flex h-full w-full max-w-md flex-col overflow-hidden bg-gradient-to-b from-white via-[#f6f1ff] to-[#d9c8fb] sm:h-[min(100%,820px)] sm:rounded-[44px] sm:shadow-2xl">
        <div className="flex items-center justify-between px-6 pt-[max(1.5rem,env(safe-area-inset-top))]">
          <Logo size={30} />
          <button onClick={done} className="rounded-full bg-white/70 px-4 py-2 text-xs font-bold">
            Skip
          </button>
        </div>
        <div key={i} className="relative mt-4 flex-1">
          {s.imgs.map((id, k) => (
            <div
              key={id}
              className="anim-pop absolute overflow-hidden rounded-[34px] bg-brand-100 shadow-2xl ring-4 ring-white/80"
              style={{
                "--i": k,
                width: k === 0 ? "62%" : "46%",
                height: k === 0 ? "62%" : "34%",
                left: k === 1 ? "auto" : k === 0 ? "8%" : "10%",
                right: k === 1 ? "6%" : "auto",
                top: k === 0 ? "2%" : k === 1 ? "12%" : "auto",
                bottom: k === 2 ? "2%" : "auto",
                transform: `rotate(${k === 0 ? -4 : k === 1 ? 5 : -2}deg)`,
              } as React.CSSProperties}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={px(id, 700)} alt="" className="h-full w-full object-cover" />
            </div>
          ))}
        </div>
        <div className="px-7 pb-[max(2rem,env(safe-area-inset-bottom))] pt-4">
          <h2 key={s.title} className="font-display anim-up text-[2rem] font-semibold leading-[1.05]">
            {s.title}
          </h2>
          <p key={s.text} className="anim-up mt-3 text-sm text-ink/65" style={{ "--i": 1 } as React.CSSProperties}>
            {s.text}
          </p>
          <div className="mt-7 flex items-center justify-between">
            <div className="flex gap-1.5">
              {SLIDES.map((_, k) => (
                <span key={k} className={`h-2 rounded-full transition-all duration-500 ${k === i ? "w-6 bg-ink" : "w-2 bg-ink/20"}`} />
              ))}
            </div>
            <button
              onClick={() => (last ? done() : setI(i + 1))}
              aria-label={last ? "Get started" : "Next"}
              className="grid h-16 w-16 place-items-center rounded-full bg-ink text-white shadow-xl transition active:scale-90"
            >
              <ArrowRight size={24} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
