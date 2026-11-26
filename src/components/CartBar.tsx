"use client";

import Link from "next/link";
import { ArrowRight, ShoppingBag } from "lucide-react";
import { useApp } from "@/components/Providers";

export function CartBar() {
  const { cartCount } = useApp();
  if (!cartCount) return null;
  return (
    <>
      {/* in-flow spacer so the floating bar never covers the last row of the page */}
      <div aria-hidden className="h-20 lg:h-16" />
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(5.9rem+env(safe-area-inset-bottom))] z-40 flex justify-center px-4 lg:bottom-6">
        <Link href="/cart" className="anim-pop pointer-events-auto glass-dark flex h-14 w-full max-w-sm items-center justify-between gap-2 rounded-full pl-5 pr-2 text-white">
          <span className="flex min-w-0 items-center gap-2 text-sm font-bold"><ShoppingBag size={18} className="shrink-0" /> <span className="truncate">{cartCount} item{cartCount > 1 ? "s" : ""} in bag</span></span>
          <span className="flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-white px-4 text-xs font-bold text-ink">View bag <ArrowRight size={14} /></span>
        </Link>
      </div>
    </>
  );
}
