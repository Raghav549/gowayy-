/**
 * gowayy brand marks.
 *
 * `Logo` is the typographic wordmark used in headers, footers and auth/onboarding
 * screens. It is pure text on a transparent background — never wrap it in a
 * badge, tile or circle. The official name is always lowercase: "gowayy".
 *
 * `LogoMark` (the square app glyph) is kept for app-icon style usages only.
 */
export function LogoMark({ size = 40, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} role="img" aria-label="gowayy logo" fill="none">
      <defs>
        <linearGradient id="gwBg" x1="8" y1="4" x2="58" y2="62" gradientUnits="userSpaceOnUse">
          <stop stopColor="#A07BFF" />
          <stop offset="0.55" stopColor="#7C3AED" />
          <stop offset="1" stopColor="#4C1D95" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="19" fill="url(#gwBg)" />
      <circle cx="30" cy="27.5" r="11" stroke="#fff" strokeWidth="6.5" />
      <path d="M41 17.5V41c0 6.4-4.8 10.5-11.4 10.5H22.5" stroke="#fff" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ size = 28, dark = false, className = "" }: { size?: number; dark?: boolean; className?: string }) {
  return (
    <span
      role="img"
      aria-label="gowayy"
      className={`inline-flex select-none items-baseline whitespace-nowrap bg-transparent font-display font-bold lowercase leading-none ${className}`}
      style={{ fontSize: size, letterSpacing: "-0.055em" }}
    >
      <span aria-hidden className={dark ? "text-white" : "text-ink"}>gowa</span>
      <span
        aria-hidden
        className={`bg-clip-text pr-[0.04em] text-transparent ${dark ? "bg-gradient-to-br from-brand-200 to-fuchsia-300" : "bg-gradient-to-br from-brand-500 via-brand-600 to-brand-800"}`}
      >
        yy
      </span>
    </span>
  );
}
