import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="page">
      <div className="glass anim-up mx-auto my-12 max-w-md rounded-[32px] p-6 text-center sm:p-8">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-brand-100 text-brand-700 ring-8 ring-brand-50">
          <Compass size={28} strokeWidth={1.8} />
        </span>
        <h1 className="font-display mt-4 text-xl font-semibold">This trail doesn&apos;t exist</h1>
        <p className="mt-1 text-sm text-ink/60">The page you&apos;re looking for has moved or never existed.</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Link href="/" className="btn btn-brand">Back home</Link>
          <Link href="/explore" className="btn btn-light">Explore</Link>
        </div>
      </div>
    </div>
  );
}
