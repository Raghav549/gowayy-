import { eq } from "drizzle-orm";
import { db } from "@/db";
import { cartItems, coupons, orderEvents, orderItems, orders, products, users, vendors } from "@/db/schema";
import { body, fail, ok, needUser, rider } from "@/lib/api";
import { charge, refundToWallet, type PayInput } from "@/lib/payments";
import { couponDiscount, FREE_DELIVERY_ABOVE } from "@/lib/pricing";
import { notify } from "@/lib/services";
import { makeCode } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const u = await needUser();
  if (!u) return fail("Please sign in", 401);
  const b = await body<{ address?: string; note?: string; coupon?: string; payment?: PayInput }>(req);
  const address = String(b.address ?? "").trim();
  if (address.length < 6) return fail("Please add a delivery address");

  const rows = await db
    .select({ qty: cartItems.qty, p: products, v: vendors })
    .from(cartItems)
    .innerJoin(products, eq(products.id, cartItems.productId))
    .innerJoin(vendors, eq(vendors.id, products.vendorId))
    .where(eq(cartItems.userId, u.id));
  if (!rows.length) return fail("Your bag is empty");
  if (rows.some((r) => !r.p.available)) return fail("Some items are unavailable — please review your bag");

  const groups = new Map<number, typeof rows>();
  for (const r of rows) groups.set(r.v.id, [...(groups.get(r.v.id) ?? []), r]);

  const plans = [...groups.values()].map((items) => {
    const v = items[0].v;
    const subtotal = items.reduce((s, r) => s + r.p.price * r.qty, 0);
    return { v, items, subtotal, fee: subtotal >= FREE_DELIVERY_ABOVE ? 0 : v.deliveryFee, discount: 0, code: makeCode("GW") };
  });
  for (const pl of plans) if (pl.subtotal < pl.v.minOrder) return fail(`${pl.v.name} needs a minimum order of ₹${pl.v.minOrder}`);

  const allSub = plans.reduce((s, p) => s + p.subtotal, 0);
  let couponCode = "";
  if (b.coupon) {
    const [c] = await db.select().from(coupons).where(eq(coupons.code, String(b.coupon).toUpperCase())).limit(1);
    if (!c || !c.active) return fail("Promo code is not valid");
    const r = couponDiscount(c, allSub, "order");
    if (!r.ok) return fail(r.error);
    couponCode = c.code;
    let left = r.discount;
    plans.forEach((p, i) => {
      const d = i === plans.length - 1 ? left : Math.round((r.discount * p.subtotal) / allSub);
      p.discount = Math.min(d, left);
      left -= p.discount;
    });
  }
  const totals = plans.map((p) => p.subtotal + p.fee - p.discount);
  const grand = totals.reduce((s, t) => s + t, 0);

  const input = (b.payment ?? { method: "wallet" }) as PayInput;
  const pay = await charge({ userId: u.id, amount: grand, input, kind: "order", refCode: plans.map((p) => p.code).join(","), allowCod: true });
  if (!pay.ok) return fail(pay.error, 402);

  try {
    for (let i = 0; i < plans.length; i++) {
      const p = plans[i];
      const r = rider();
      const [o] = await db
        .insert(orders)
        .values({
          code: p.code, userId: u.id, vendorId: p.v.id, kind: p.v.kind, status: "placed", subtotal: p.subtotal, deliveryFee: p.fee,
          discount: p.discount, total: totals[i], address, note: String(b.note ?? "").slice(0, 200), couponCode,
          paymentMethod: pay.method, paymentStatus: pay.status, riderName: r.name, riderPhone: r.phone,
        })
        .returning();
      await db.insert(orderItems).values(
        p.items.map((it) => ({ orderId: o.id, productId: it.p.id, name: it.p.name, emoji: it.p.emoji, image: it.p.image, price: it.p.price, qty: it.qty })),
      );
      await db.insert(orderEvents).values({ orderId: o.id, status: "placed", note: "We've sent your order to the store." });
      await notify(u.id, `Order ${p.code} placed`, `${p.v.name} · ₹${totals[i]} · arriving in ~${p.v.etaMins} min`, "order", `/orders/${p.code}`);
    }
    await db.delete(cartItems).where(eq(cartItems.userId, u.id));
    if (!u.address) await db.update(users).set({ address }).where(eq(users.id, u.id));
  } catch (e) {
    if (pay.status === "paid") await refundToWallet(u.id, grand, plans[0].code);
    throw e;
  }
  return ok({ codes: plans.map((p) => p.code), redirect: plans.length === 1 ? `/orders/${plans[0].code}` : "/orders" });
}
