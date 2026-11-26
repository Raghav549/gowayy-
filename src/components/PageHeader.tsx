"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";

export function PageHeader({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) {
  const router = useRouter();
  return (
    <div className="mb-5 flex items-center gap-3">
      <button onClick={() => router.back()} aria-label="Go back" className="glass grid h-12 w-12 shrink-0 place-items-center rounded-2xl transition active:scale-90">
        <ArrowLeft size={20} />
      </button>
      <div className="min-w-0 flex-1 text-center sm:text-left">
        <h1 className="font-display truncate text-xl font-semibold sm:text-2xl">{title}</h1>
        {sub && <p className="truncate text-xs text-ink/55">{sub}</p>}
      </div>
      <div className="flex min-w-12 justify-end">{right}</div>
    </div>
  );
}
