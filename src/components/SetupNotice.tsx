import type { DbProblem } from "@/lib/db-status";

/** A friendly service screen; infrastructure details stay in server logs. */
export function SetupNotice({ problem: _problem }: { problem: DbProblem }) {
  return (
    <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: 20, boxSizing: "border-box", background: "linear-gradient(160deg,#f6f2ff,#ffeefe)", color: "#17151f" }}>
      <div style={{ maxWidth: 460, width: "100%", background: "rgba(255,255,255,.9)", borderRadius: 28, padding: "28px 22px", boxSizing: "border-box", boxShadow: "0 20px 50px -24px rgba(76,29,149,.35)" }}>
        <p className="font-display" style={{ margin: 0, fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", textAlign: "center" }}>
          gowa<span style={{ color: "#7c3aed" }}>yy</span>
        </p>
        <h1 style={{ margin: "16px 0 6px", fontSize: 19, textAlign: "center" }}>
          We&apos;ll be right back
        </h1>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: "rgba(23,21,31,.7)", textAlign: "center" }}>Gowayy is temporarily unavailable. Please retry in a moment.</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", marginTop: 18 }}>
          {/* A full reload on purpose: it retries the server-side database setup. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/" style={{ display: "inline-flex", alignItems: "center", minHeight: 44, padding: "0 20px", borderRadius: 999, background: "#7c3aed", color: "#fff", fontWeight: 700, fontSize: 14, textDecoration: "none" }}>
            Try again
          </a>
        </div>
      </div>
    </main>
  );
}
