"use client";

import { useEffect } from "react";

/**
 * Last-resort screen when the root layout itself fails (it loads the session
 * and destinations). It replaces the whole document, so it carries its own
 * minimal styles instead of relying on the app's CSS.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100dvh", display: "grid", placeItems: "center", padding: 24, boxSizing: "border-box", background: "linear-gradient(160deg,#f6f2ff,#ffeefe)", fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif", color: "#17151f" }}>
        <main style={{ maxWidth: 420, width: "100%", textAlign: "center", background: "rgba(255,255,255,.85)", borderRadius: 28, padding: "32px 24px", boxShadow: "0 20px 50px -24px rgba(76,29,149,.35)" }}>
          <p style={{ margin: 0, fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em" }}>
            gowa<span style={{ color: "#7c3aed" }}>yy</span>
          </p>
          <h1 style={{ margin: "16px 0 6px", fontSize: 20 }}>We&apos;ll be right back</h1>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: "rgba(23,21,31,.6)" }}>gowayy couldn&apos;t load just now. Please try again in a moment.</p>
          <button onClick={reset} style={{ marginTop: 20, height: 46, padding: "0 22px", border: 0, borderRadius: 999, background: "#7c3aed", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
            Try again
          </button>
          {error.digest && <p style={{ marginTop: 14, fontSize: 11, color: "rgba(23,21,31,.4)" }}>Ref {error.digest}</p>}
        </main>
      </body>
    </html>
  );
}
