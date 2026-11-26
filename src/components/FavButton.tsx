"use client";

import { Heart } from "lucide-react";
import { useApp } from "@/components/Providers";

export function FavButton({ kind, id, className = "" }: { kind: string; id: number; className?: string }) {
  const { isFav, toggleFav } = useApp();
  const on = isFav(kind, id);
  return (
    <button
      type="button"
      aria-label={on ? "Remove from favourites" : "Save to favourites"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleFav(kind, id);
      }}
      className={`glass-tint grid h-10 w-10 place-items-center rounded-full text-white transition active:scale-75 ${className}`}
    >
      <Heart size={18} className={`transition ${on ? "fill-rose-500 text-rose-500 scale-110" : ""}`} />
    </button>
  );
}
