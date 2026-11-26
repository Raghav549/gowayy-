import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { body, fail, ok, needUser } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const u = await needUser();
  if (!u) return fail("Please sign in", 401);
  const b = await body<{ id?: number }>(req);
  if (b.id) await db.update(notifications).set({ read: true }).where(and(eq(notifications.userId, u.id), eq(notifications.id, Number(b.id))));
  else await db.update(notifications).set({ read: true }).where(eq(notifications.userId, u.id));
  return ok();
}
