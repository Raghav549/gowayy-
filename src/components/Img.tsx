"use client";

import { useState } from "react";

export function Img({ src, alt, className = "", eager = false }: { src: string; alt: string; className?: string; eager?: boolean }) {
  const [bad, setBad] = useState(false);
  if (!src || bad) {
    return <div className={`${className} bg-gradient-to-br from-brand-200 via-brand-100 to-pink-100`} aria-label={alt} />;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} loading={eager ? "eager" : "lazy"} decoding="async" onError={() => setBad(true)} className={className} />;
}
