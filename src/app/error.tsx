"use client";

import Link from "next/link";
import { useEffect } from "react";
import { CloudOff, RotateCw } from "lucide-react";

/** Shown when a page fails to load (e.g. the database is briefly unreachable). */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="page">
      <div className="glass anim-up mx-auto my-12 max-w-md rounded-[32px] p-6 text-center sm:p-8">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-brand-100 text-brand-700 ring-8 ring-brand-50">
          <CloudOff size={28} strokeWidth={1.8} />
        </span>
        <h1 className="font-display mt-4 text-xl font-semibold">Something went wrong</h1>
        <p className="mt-1 text-sm text-ink/60">We couldn&apos;t load this page. Check your connection and try again.</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <button onClick={reset} className="btn btn-brand">
            <RotateCw size={16} /> Try again
          </button>
          <Link href="/" className="btn btn-light">
            Home
          </Link>
        </div>
        {error.digest && <p className="mt-4 text-[11px] text-ink/40">Ref {error.digest}</p>}
      </div>
    </div>
  );
}
