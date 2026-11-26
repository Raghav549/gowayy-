import { eq } from "drizzle-orm";
import { db } from "@/db";
import { coupons } from "@/db/schema";
import { body, fail, ok } from "@/lib/api";
import { couponDiscount } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const b = await body<{ code?: string; amount?: number; scope?: string }>(req);
  const code = String(b.code ?? "").trim().toUpperCase();
  const [c] = await db.select().from(coupons).where(eq(coupons.code, code)).limit(1);
  if (!c || !c.active) return fail("That promo code isn't valid");
  const r = couponDiscount(c, Number(b.amount) || 0, b.scope === "order" ? "order" : "booking");
  if (!r.ok) return fail(r.error);
  return ok({ code: c.code, description: c.description, discount: r.discount });
}
