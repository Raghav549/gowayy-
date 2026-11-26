import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { notifications, orderEvents, orders } from "@/db/schema";

export async function notify(userId: number, title: string, body: string, kind = "info", link = "") {
  await db.insert(notifications).values({ userId, title, body, kind, link });
}

export const ORDER_FLOW = ["placed", "confirmed", "preparing", "out_for_delivery", "delivered"] as const;
// Demo-accelerated timings (seconds after placing) so the whole lifecycle can be watched live.
const AT = [0, 12, 35, 80, 150];

export const STATUS_COPY: Record<string, { label: string; note: string }> = {
  placed: { label: "Order placed", note: "We've sent your order to the store." },
  confirmed: { label: "Confirmed", note: "The store accepted your order." },
  preparing: { label: "Preparing", note: "Your items are being packed with care." },
  out_for_delivery: { label: "On the way", note: "Your rider is heading to you." },
  delivered: { label: "Delivered", note: "Enjoy! Rate your experience soon." },
  cancelled: { label: "Cancelled", note: "This order was cancelled." },
};

export type OrderRow = typeof orders.$inferSelect;

export async function syncOrder(o: OrderRow): Promise<OrderRow> {
  if (!o.autoProgress || o.status === "delivered" || o.status === "cancelled") return o;
  const secs = (Date.now() - new Date(o.createdAt).getTime()) / 1000;
  let target = 0;
  AT.forEach((t, i) => {
    if (secs >= t) target = i;
  });
  const cur = ORDER_FLOW.indexOf(o.status as (typeof ORDER_FLOW)[number]);
  if (target <= cur) return o;
  const patch: Partial<OrderRow> = { status: ORDER_FLOW[target] };
  if (ORDER_FLOW[target] === "delivered" && o.paymentMethod === "cod") patch.paymentStatus = "paid";
  const [u] = await db.update(orders).set(patch).where(eq(orders.id, o.id)).returning();
  for (let i = cur + 1; i <= target; i++) {
    await db.insert(orderEvents).values({
      orderId: o.id,
      status: ORDER_FLOW[i],
      note: STATUS_COPY[ORDER_FLOW[i]].note,
      createdAt: new Date(new Date(o.createdAt).getTime() + AT[i] * 1000),
    });
  }
  const s = ORDER_FLOW[target];
  await notify(o.userId, `Order ${o.code} · ${STATUS_COPY[s].label}`, STATUS_COPY[s].note, "order", `/orders/${o.code}`);
  return u ?? o;
}

export async function orderEventsFor(orderId: number) {
  return db.select().from(orderEvents).where(eq(orderEvents.orderId, orderId)).orderBy(desc(orderEvents.id));
}
