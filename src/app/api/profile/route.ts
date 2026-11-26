import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { body, fail, ok, needUser } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const u = await needUser();
  if (!u) return fail("Please sign in", 401);
  const b = await body<{ name?: string; phone?: string; address?: string }>(req);
  const name = String(b.name ?? "").trim();
  if (name.length < 2) return fail("Please enter your name");
  await db
    .update(users)
    .set({ name, phone: String(b.phone ?? "").trim().slice(0, 20), address: String(b.address ?? "").trim().slice(0, 240) })
    .where(eq(users.id, u.id));
  return ok();
}
