import { databaseUrl } from "@/db";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";

/** Liveness + readiness: confirms the database is reachable, migrated and seeded. */
export async function GET() {
  if (!databaseUrl()) {
    return Response.json({ ok: false, database: "not configured", hint: "Set DATABASE_URL or connect a Postgres database to the project." }, { status: 503 });
  }
  try {
    await ensureSeeded();
    return Response.json({ ok: true, database: "ready" });
  } catch (e) {
    console.error("[health] database not ready:", e);
    return Response.json({ ok: false, database: "unreachable" }, { status: 503 });
  }
}
