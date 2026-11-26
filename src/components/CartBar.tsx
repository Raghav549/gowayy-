"use client";

import Link from "next/link";
import { ArrowRight, ShoppingBag } from "lucide-react";
import { useApp } from "@/components/Providers";

export function CartBar() {
  const { cartCount } = useApp();
  if (!cartCount) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[6.2rem] z-40 flex justify-center px-4 lg:bottom-6">
      <Link href="/cart" className="anim-pop pointer-events-auto glass-dark flex h-14 w-full max-w-sm items-center justify-between rounded-full pl-5 pr-2 text-white">
        <span className="flex items-center gap-2 text-sm font-bold"><ShoppingBag size={18} /> {cartCount} item{cartCount > 1 ? "s" : ""} in bag</span>
        <span className="flex h-10 items-center gap-1.5 rounded-full bg-white px-4 text-xs font-bold text-ink">View bag <ArrowRight size={14} /></span>
      </Link>
    </div>
  );
}
