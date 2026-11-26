"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";

const noop = () => () => {};

/**
 * Renders overlays (sheets, dialogs) directly under <body>.
 * `position: fixed` is relative to the nearest ancestor with a transform, filter or
 * backdrop-filter — and most gowayy cards use glass backdrop-filters — so sheets
 * rendered in place got trapped inside their card instead of covering the screen.
 */
export function Portal({ children }: { children: ReactNode }) {
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  return mounted ? createPortal(children, document.body) : null;
}
