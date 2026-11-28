import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { orderEvents, orderItems, orders, products, vendors } from "@/db/schema";
import { body, fail, ok, needUser } from "@/lib/api";
import { refundOriginalPayment } from "@/lib/payments";
import { notify, orderEventsFor, syncOrder } from "@/lib/services";

export const dynamic = "force-dynamic";

async function load(code: string) {
  const [o] = await db.select().from(orders).where(eq(orders.code, code)).limit(1);
  return o;
}

export async function GET(_req: Request, ctx: { params: Promise<{ code: string }> }) {
  const u = await needUser();
  if (!u) return fail("Please sign in", 401);
  const { code } = await ctx.params;
  let o = await load(code);
  if (!o || (o.userId !== u.id && u.role !== "admin")) return fail("Order not found", 404);
  o = await syncOrder(o);
  const [items, events, [v]] = await Promise.all([
    db.select().from(orderItems).where(eq(orderItems.orderId, o.id)),
    orderEventsFor(o.id),
    db.select().from(vendors).where(eq(vendors.id, o.vendorId)),
  ]);
  return ok({ order: o, items, events, vendor: v });
}

export async function POST(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const u = await needUser();
  if (!u) return fail("Please sign in", 401);
  const { code } = await ctx.params;
  const b = await body<{ action?: string }>(req);
  let o = await load(code);
  if (!o || o.userId !== u.id) return fail("Order not found", 404);
  o = await syncOrder(o);
  if (b.action !== "cancel") return fail("Unknown action");
  if (!["placed", "confirmed"].includes(o.status)) return fail("This order can no longer be cancelled");
  const cancelled = await db.transaction(async (tx) => {
    const [updated] = await tx.update(orders).set({
      status: "cancelled",
      paymentStatus: o.paymentStatus === "paid" ? "refunded" : o.paymentStatus,
      inventoryReleased: true,
    }).where(and(eq(orders.id, o.id), inArray(orders.status, ["placed", "confirmed"]), eq(orders.inventoryReleased, false))).returning();
    if (!updated) return false;
    const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, o.id));
    for (const item of items) {
      await tx.update(products).set({ stock: sql`${products.stock} + ${item.qty}` }).where(eq(products.id, item.productId));
    }
    await tx.insert(orderEvents).values({ orderId: o.id, status: "cancelled", note: "Cancelled by customer; reserved stock released." });
    return true;
  });
  if (!cancelled) return fail("This order was already updated", 409);
  if (o.paymentStatus === "paid") await refundOriginalPayment(u.id, o.total, o.code, o.paymentMethod);
  await notify(u.id, `Order ${o.code} cancelled`, o.paymentStatus === "paid" ? `₹${o.total} refund was issued to your original payment method.` : "No charge was made.", "order", `/orders/${o.code}`);
  return ok();
}
