import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { favorites } from "@/db/schema";
import { body, fail, ok, needUser } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const u = await needUser();
  if (!u) return fail("Sign in to save favourites", 401);
  const b = await body<{ kind?: string; refId?: number }>(req);
  const kind = String(b.kind);
  const refId = Number(b.refId);
  if (!["destination", "hotel", "package", "attraction", "vendor"].includes(kind) || !refId) return fail("Invalid item");
  const where = and(eq(favorites.userId, u.id), eq(favorites.kind, kind), eq(favorites.refId, refId));
  const [ex] = await db.select().from(favorites).where(where).limit(1);
  if (ex) {
    await db.delete(favorites).where(where);
    return ok({ saved: false });
  }
  await db.insert(favorites).values({ userId: u.id, kind, refId });
  return ok({ saved: true });
}
