import { and, eq, gt, sql } from "drizzle-orm";
import { db } from "@/db";
import { coupons, products, vendors } from "@/db/schema";
import { inr } from "@/lib/utils";

export type Coupon = typeof coupons.$inferSelect;

/** "Flat ₹100 off" / "15% off" */
export const couponHeadline = (c: Coupon) => (c.flat > 0 ? `Flat ${inr(c.flat)} off` : `${c.percent}% off`);

/** "Above ₹5,000 · up to ₹1,500" */
export const couponTerms = (c: Coupon) =>
  [c.minAmount > 0 ? `above ${inr(c.minAmount)}` : "", c.percent > 0 && c.maxDiscount > 0 ? `up to ${inr(c.maxDiscount)}` : ""]
    .filter(Boolean)
    .join(" · ")
    .replace(/^./, (m) => m.toUpperCase());

/** Where a coupon can be used, with the listing to go to. */
export const couponUse = (c: Coupon) =>
  c.scope === "order" ? { label: "Food & grocery orders", href: "/food" } : c.scope === "booking" ? { label: "Trips, stays & cabs", href: "/tours" } : { label: "Everything on gowayy", href: "/" };

export type OfferSlide = { key: string; href: string; img: string; badge: string; title: string; detail: string; code?: string };

/**
 * Home banner slides. Every number comes from live data: coupon terms from the
 * coupons table, "up to N% off" from the real price/MRP gap of listed products.
 */
export async function getOfferSlides(): Promise<OfferSlide[]> {
  const pct = sql<number>`coalesce(max(round((${products.mrp} - ${products.price}) * 100.0 / ${products.mrp})), 0)::int`;
  const live = and(eq(products.available, true), gt(products.mrp, products.price));
  const [cs, byKind, pizza] = await Promise.all([
    db.select().from(coupons),
    db.select({ kind: vendors.kind, pct }).from(products).innerJoin(vendors, eq(vendors.id, products.vendorId)).where(live).groupBy(vendors.kind),
    db
      .select({ pct, from: sql<number>`min(${products.price})::int` })
      .from(products)
      .where(and(eq(products.category, "Pizza"), eq(products.available, true))),
  ]);
  const c = Object.fromEntries(cs.map((x) => [x.code, x]));
  const upTo = (kind: string) => byKind.find((k) => k.kind === kind)?.pct ?? 0;
  const slides: (OfferSlide | null)[] = [
    c.WELCOME100
      ? { key: "food", href: "/food", img: "/media/slides/food.webp", badge: couponHeadline(c.WELCOME100), title: "Hill kitchens, delivered hot", detail: `${couponTerms(c.WELCOME100)} · code WELCOME100`, code: "WELCOME100" }
      : null,
    pizza[0]?.from
      ? { key: "pizza", href: "/food?cat=Pizza", img: "/media/slides/pizza.webp", badge: pizza[0].pct > 0 ? `Up to ${pizza[0].pct}% off` : "New", title: "Wood-fired pizzas are here", detail: `Starting at ${inr(pizza[0].from)}` }
      : null,
    { key: "grocery", href: "/grocery", img: "/media/slides/grocery.webp", badge: upTo("grocery") > 0 ? `Up to ${upTo("grocery")}% off` : "Fresh daily", title: "Groceries in ~10 minutes", detail: "Fresh produce, dairy & hill essentials" },
    c.GOWAYY15
      ? { key: "tours", href: "/tours", img: "/media/slides/tours.webp", badge: couponHeadline(c.GOWAYY15), title: "Tea trails & Himalayan treks", detail: `Trips ${couponTerms(c.GOWAYY15).toLowerCase()} · code GOWAYY15`, code: "GOWAYY15" }
      : null,
    c.HILLS10
      ? { key: "stays", href: "/hotels", img: "/media/slides/stays.webp", badge: couponHeadline(c.HILLS10), title: "Stays with a mountain view", detail: `Bookings ${couponTerms(c.HILLS10).toLowerCase()} · code HILLS10`, code: "HILLS10" }
      : null,
    c.FIRSTRIDE
      ? { key: "cabs", href: "/cabs", img: "/media/slides/cabs.webp", badge: couponHeadline(c.FIRSTRIDE), title: "Hill cabs with local drivers", detail: `Rides ${couponTerms(c.FIRSTRIDE).toLowerCase()} · code FIRSTRIDE`, code: "FIRSTRIDE" }
      : null,
  ];
  return slides.filter((s): s is OfferSlide => s !== null);
}
