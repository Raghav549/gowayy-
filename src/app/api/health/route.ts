import { databaseUrl } from "@/db";
import { describeConnection, describeDbError } from "@/lib/db-status";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";
// The very first call creates the tables and loads the catalogue.
export const maxDuration = 60;

/**
 * Liveness + readiness: confirms the database is reachable, migrated and
 * seeded — and if not, says exactly why. Safe to open in a browser: it never
 * shows the password or full connection string.
 */
export async function GET() {
  const connection = describeConnection();
  if (!databaseUrl()) {
    return Response.json({ ok: false, database: "not configured", ...describeDbError(null), connection }, { status: 503 });
  }
  const t0 = Date.now();
  try {
    await ensureSeeded();
    return Response.json({ ok: true, database: "ready", ms: Date.now() - t0, connection });
  } catch (e) {
    console.error("[health] database not ready:", e);
    return Response.json({ ok: false, database: "error", ms: Date.now() - t0, ...describeDbError(e), connection }, { status: 503 });
  }
}
