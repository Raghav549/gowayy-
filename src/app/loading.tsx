/**
 * Shown the instant a link is tapped, while the next (server-rendered) page loads,
 * so navigation always responds immediately. Mirrors the common page shape: a
 * header, a search bar, a row of chips and a grid of cards.
 */
function Skel({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`relative overflow-hidden bg-brand-100/60 ${className}`} style={style}>
      <div className="shimmer absolute inset-0" />
    </div>
  );
}

export default function Loading() {
  return (
    <div className="page" aria-busy="true" aria-label="Loading">
      <div className="mb-5 flex items-center gap-3">
        <Skel className="h-12 w-12 shrink-0 rounded-2xl" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skel className="h-5 w-2/5 max-w-56 rounded-full" />
          <Skel className="h-3 w-3/5 max-w-72 rounded-full" />
        </div>
      </div>
      <Skel className="h-14 w-full rounded-full" />
      <div className="mt-4 flex gap-2 overflow-hidden">
        {[5, 7, 6, 8, 5].map((w, i) => (
          <Skel key={i} className="h-10 shrink-0 rounded-full" style={{ width: `${w}rem` }} />
        ))}
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 10 }, (_, i) => (
          <Skel key={i} className={`aspect-[4/5] rounded-[28px] ${i >= 4 ? "hidden sm:block" : ""}`} />
        ))}
      </div>
    </div>
  );
}
