/**
 * Runs once when a server instance starts (each Vercel cold start). Kicks off
 * schema creation + seeding in the background so the first visitor doesn't
 * pay for it; requests that arrive meanwhile await the same promise.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  const { databaseUrl } = await import("@/db");
  if (!databaseUrl()) {
    console.warn("[gowayy] No database configured — set DATABASE_URL or connect a Postgres database.");
    return;
  }
  const { ensureSeeded } = await import("@/lib/seed");
  ensureSeeded().catch((e) => console.error("[gowayy] Database bootstrap failed (will retry on next request):", e));
}
