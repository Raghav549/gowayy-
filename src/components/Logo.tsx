export function LogoMark({ size = 40, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} role="img" aria-label="gowayy logo" fill="none">
      <defs>
        <linearGradient id="gwBg" x1="8" y1="4" x2="58" y2="62" gradientUnits="userSpaceOnUse">
          <stop stopColor="#A07BFF" />
          <stop offset="0.55" stopColor="#7C3AED" />
          <stop offset="1" stopColor="#4C1D95" />
        </linearGradient>
        <linearGradient id="gwSheen" x1="32" y1="0" x2="32" y2="34" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fff" stopOpacity="0.38" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="gwPeak" x1="30" y1="22" x2="30" y2="34" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#E3D6FF" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="19" fill="url(#gwBg)" />
      <rect width="64" height="64" rx="19" fill="url(#gwSheen)" />
      {/* the lowercase g: ring + descender */}
      <circle cx="30" cy="27.5" r="11" stroke="#fff" strokeWidth="6.5" />
      <path d="M41 17.5V41c0 6.4-4.8 10.5-11.4 10.5H22.5" stroke="#fff" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* a Himalayan peak living in the counter of the g */}
      <path d="M23.2 33.2 28 24.6l2.4 3.6 2.2-3.2 4.2 8.2c.3.6-.1 1.2-.8 1.2H24c-.7 0-1.1-.7-.8-1.2Z" fill="url(#gwPeak)" />
      <circle cx="49.5" cy="50" r="3.2" fill="#F5C2FF" />
    </svg>
  );
}

export function Logo({ size = 36, dark = false, className = "" }: { size?: number; dark?: boolean; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} />
      <span
        className={`font-display font-bold lowercase leading-none ${dark ? "text-white" : "text-ink"}`}
        style={{ fontSize: size * 0.68 }}
      >
        gowa<span className={dark ? "text-brand-300" : "text-brand-600"}>yy</span>
      </span>
    </span>
  );
}
