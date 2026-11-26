/**
 * gowayy category icon set — a consistent duotone line style:
 * 32×32 grid, 1.9px rounded strokes in currentColor plus one soft tinted fill.
 */
import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };

function Base({ size = 28, children, ...rest }: P & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...rest}
    >
      {children}
    </svg>
  );
}

const tint = { fill: "currentColor", fillOpacity: 0.16, stroke: "none" } as const;

/** Basket with fresh greens. */
export function GroceryIcon(p: P) {
  return (
    <Base {...p}>
      <path d="M6.5 14h19l-2.1 10.2a2.4 2.4 0 0 1-2.35 1.9H10.95a2.4 2.4 0 0 1-2.35-1.9L6.5 14Z" {...tint} />
      <path d="M5 14h22" />
      <path d="M6.5 14l2.1 10.2a2.4 2.4 0 0 0 2.35 1.9h10.1a2.4 2.4 0 0 0 2.35-1.9L25.5 14" />
      <path d="M11 14l3.2-7.2M21 14l-3.2-7.2" />
      <path d="M13 18.5v3.5M16 18.5v3.5M19 18.5v3.5" />
      <path d="M20.5 9.2c1.6-2.4 3.9-3 5.6-2.7-.2 1.8-1.5 3.8-4.1 4.3" />
    </Base>
  );
}

/** Steaming bowl with chopsticks. */
export function FoodIcon(p: P) {
  return (
    <Base {...p}>
      <path d="M5 16.5h22a11 11 0 0 1-22 0Z" {...tint} />
      <path d="M5 16.5h22a11 11 0 0 1-22 0Z" />
      <path d="M12 27h8" />
      <path d="M11.5 11.5c-1-1.1-1-2.4 0-3.5s1-2.4 0-3.5M16 11.5c-1-1.1-1-2.4 0-3.5s1-2.4 0-3.5" />
      <path d="M20.5 13.2 27.5 6M23 14.3l5.5-5.3" />
    </Base>
  );
}

/** Taxi, front view. */
export function CabIcon(p: P) {
  return (
    <Base {...p}>
      <path d="M7.4 15.5 9.6 9.9A2.4 2.4 0 0 1 11.8 8.4h8.4a2.4 2.4 0 0 1 2.2 1.5l2.2 5.6" />
      <rect x="4.8" y="15.5" width="22.4" height="7.6" rx="2.6" {...tint} />
      <rect x="4.8" y="15.5" width="22.4" height="7.6" rx="2.6" />
      <path d="M13.5 8.4V5.5h5v2.9" />
      <path d="M7.8 23.1v2.4M24.2 23.1v2.4" />
      <circle cx="9.6" cy="19.3" r="1.3" />
      <circle cx="22.4" cy="19.3" r="1.3" />
      <path d="M14 19.3h4" />
    </Base>
  );
}

/** Twin peaks with a summit flag. */
export function TourIcon(p: P) {
  return (
    <Base {...p}>
      <path d="M3.5 26 12.5 11l5 8.2 3-4.6L28.5 26h-25Z" {...tint} />
      <path d="M3.5 26 12.5 11l5 8.2" />
      <path d="M15.6 16.2 20.5 8.6 28.5 26h-25" />
      <path d="M9.6 15.8l2.9 2 2.4-1.6" />
      <path d="M20.5 8.6V3.8l4 1.6-4 1.6" />
    </Base>
  );
}

/** Hill cottage with a lit window. */
export function StayIcon(p: P) {
  return (
    <Base {...p}>
      <path d="M7 14.5V26h18V14.5L16 6.5l-9 8Z" {...tint} />
      <path d="M4 16.5 16 6l12 10.5" />
      <path d="M7 14.5V26h18V14.5" />
      <path d="M13.5 26v-6.2a2.5 2.5 0 0 1 5 0V26" />
      <path d="M21.5 8.8V5.5h2.7v5.7" />
      <path d="M3 26h26" />
    </Base>
  );
}

/** Storefront with a scalloped awning. */
export function ShopIcon(p: P) {
  return (
    <Base {...p}>
      <path d="M6.5 15v11h19V15" {...tint} />
      <path d="M6.5 15v11h19V15" />
      <path d="M5.2 6h21.6l1.7 6.2a3.1 3.1 0 0 1-5.6 1.9 3.1 3.1 0 0 1-5.4 0 3.1 3.1 0 0 1-5.4 0 3.1 3.1 0 0 1-5.6-1.9L5.2 6Z" />
      <path d="M13.5 26v-5.5h5V26" />
      <path d="M3.5 26h25" />
    </Base>
  );
}
