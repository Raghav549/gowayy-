"use client";

import { useState } from "react";

const FALLBACK = "bg-gradient-to-br from-brand-200 via-brand-100 to-pink-100";

export function Img({ src, alt, className = "", eager = false }: { src: string; alt: string; className?: string; eager?: boolean }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  if (!src || failedSrc === src) {
    return <div role="img" aria-label={alt} className={`${className} ${FALLBACK}`} />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      onError={() => setFailedSrc(src)}
      // An image that already failed while the server-rendered page was loading
      // fired its error event before React attached `onError`; catch it here.
      ref={(el) => {
        if (el?.complete && el.naturalWidth === 0) setFailedSrc(src);
      }}
      // Tinted while loading; transparent text keeps a failed image's alt text
      // from spilling over badges and buttons (screen readers still get it).
      className={`${className} ${FALLBACK} text-transparent`}
    />
  );
}
