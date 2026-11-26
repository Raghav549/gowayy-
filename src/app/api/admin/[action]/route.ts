import { eq } from "drizzle-orm";
import { db } from "@/db";
import { bookings, notifications, orderEvents, orders, products, users } from "@/db/schema";
import { body, fail, ok, needUser } from "@/lib/api";
import { refundToWallet } from "@/lib/payments";
import { notify, ORDER_FLOW, STATUS_COPY } from "@/lib/services";

export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ action: string }> }) {
  const u = await needUser();
  if (!u || u.role !== "admin") return fail("Admins only", 403);
  const { action } = await ctx.params;
  const b = await body<Record<string, unknown>>(req);

  if (action === "order-status") {
    const status = String(b.status);
    if (![...ORDER_FLOW, "cancelled"].includes(status)) return fail("Invalid status");
    const [o] = await db.select().from(orders).where(eq(orders.id, Number(b.id))).limit(1);
    if (!o) return fail("Order not found", 404);
    await db
      .update(orders)
      .set({ status, autoProgress: false, paymentStatus: status === "delivered" && o.paymentMethod === "cod" ? "paid" : status === "cancelled" && o.paymentStatus === "paid" ? "refunded" : o.paymentStatus })
      .where(eq(orders.id, o.id));
    await db.insert(orderEvents).values({ orderId: o.id, status, note: STATUS_COPY[status].note });
    if (status === "cancelled" && o.paymentStatus === "paid") await refundToWallet(o.userId, o.total, o.code);
    await notify(o.userId, `Order ${o.code} · ${STATUS_COPY[status].label}`, STATUS_COPY[status].note, "order", `/orders/${o.code}`);
    return ok();
  }
  if (action === "booking-status") {
    const status = String(b.status);
    if (!["confirmed", "completed", "cancelled"].includes(status)) return fail("Invalid status");
    const [bk] = await db.select().from(bookings).where(eq(bookings.id, Number(b.id))).limit(1);
    if (!bk) return fail("Booking not found", 404);
    await db.update(bookings).set({ status, paymentStatus: status === "cancelled" && bk.paymentStatus === "paid" ? "refunded" : bk.paymentStatus }).where(eq(bookings.id, bk.id));
    if (status === "cancelled" && bk.paymentStatus === "paid") await refundToWallet(bk.userId, bk.amount, bk.code);
    await notify(bk.userId, `Booking ${bk.code} ${status}`, `Your booking "${bk.title}" is now ${status}.`, "booking", `/bookings/${bk.code}`);
    return ok();
  }
  if (action === "product-toggle") {
    const [p] = await db.select().from(products).where(eq(products.id, Number(b.id))).limit(1);
    if (!p) return fail("Product not found", 404);
    await db.update(products).set({ available: !p.available }).where(eq(products.id, p.id));
    return ok();
  }
  if (action === "product-create") {
    const price = Math.floor(Number(b.price));
    if (!String(b.name ?? "").trim() || !Number(b.vendorId) || !(price > 0)) return fail("Name, store and price are required");
    await db.insert(products).values({
      vendorId: Number(b.vendorId), name: String(b.name).trim(), emoji: String(b.emoji || "🛍️"), price, mrp: Math.max(price, Math.floor(Number(b.mrp)) || price),
      unit: String(b.unit ?? ""), category: String(b.category || "General"), veg: b.veg !== false, description: String(b.description ?? ""),
    });
    return ok();
  }
  if (action === "broadcast") {
    const title = String(b.title ?? "").trim();
    const msg = String(b.body ?? "").trim();
    if (!title || !msg) return fail("Title and message are required");
    const all = await db.select({ id: users.id }).from(users);
    if (all.length) await db.insert(notifications).values(all.map((x) => ({ userId: x.id, title, body: msg, kind: "promo", link: String(b.link ?? "") })));
    return ok({ sent: all.length });
  }
  return fail("Unknown action", 404);
}
