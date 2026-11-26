import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { cartItems, products } from "@/db/schema";
import { body, fail, ok, needUser } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const u = await needUser();
  if (!u) return fail("Please sign in", 401);
  const b = await body<{ productId?: number; qty?: number }>(req);
  const productId = Number(b.productId);
  const qty = Math.max(0, Math.min(20, Math.floor(Number(b.qty))));
  if (!productId || Number.isNaN(qty)) return fail("Invalid item");
  if (qty === 0) {
    await db.delete(cartItems).where(and(eq(cartItems.userId, u.id), eq(cartItems.productId, productId)));
    return ok();
  }
  const [p] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
  if (!p || !p.available) return fail("This item is currently unavailable");
  if (p.isExperience) return fail("Experiences are booked, not added to the bag");
  await db
    .insert(cartItems)
    .values({ userId: u.id, productId, qty })
    .onConflictDoUpdate({ target: [cartItems.userId, cartItems.productId], set: { qty } });
  return ok();
}

export async function DELETE() {
  const u = await needUser();
  if (!u) return fail("Please sign in", 401);
  await db.delete(cartItems).where(eq(cartItems.userId, u.id));
  return ok();
}
