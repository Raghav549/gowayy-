"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { useApp } from "@/components/Providers";

/** Coupon code chip that copies itself — paste it in the promo field at checkout. */
export function CopyCode({ code }: { code: string }) {
  const { toast } = useApp();
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(code);
          setDone(true);
          toast(`${code} copied — apply it at checkout`);
          setTimeout(() => setDone(false), 1800);
        } catch {
          toast(`Use code ${code} at checkout`);
        }
      }}
      aria-label={`Copy code ${code}`}
      className="flex min-w-0 items-center gap-1.5 rounded-full border border-dashed border-brand-400 bg-brand-50 px-3 py-1.5 text-xs font-extrabold tracking-wide text-brand-800 transition active:scale-95"
    >
      <span className="truncate">{code}</span>
      {done ? <Check size={13} className="shrink-0" /> : <Copy size={13} className="shrink-0" />}
    </button>
  );
}
