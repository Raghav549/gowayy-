import { and, eq, gt, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { attractions, destinations, hotels, packages, products, vendors } from "@/db/schema";
import { ensureSeeded } from "@/lib/seed";

export type SearchHit = { type: string; title: string; sub: string; href: string; image: string; emoji?: string };

export async function searchAll(q: string, limit = 5): Promise<SearchHit[]> {
  await ensureSeeded();
  const like = `%${q.replace(/[%_]/g, "")}%`;
  const [d, a, h, p, v, pr] = await Promise.all([
    db.select().from(destinations).where(or(ilike(destinations.name, like), ilike(destinations.tagline, like))).limit(limit),
    db.select().from(attractions).where(or(ilike(attractions.name, like), ilike(attractions.category, like))).limit(limit),
    db.select().from(hotels).where(and(eq(hotels.active,true),or(ilike(hotels.name, like), ilike(hotels.type, like)))).limit(limit),
    db.select().from(packages).where(and(eq(packages.active,true),or(ilike(packages.name, like), ilike(packages.theme, like)))).limit(limit),
    db.select().from(vendors).where(and(eq(vendors.active,true),or(ilike(vendors.name, like), ilike(vendors.tagline, like)))).limit(limit),
    db
      .select({ p: products, v: vendors })
      .from(products)
      .innerJoin(vendors, eq(vendors.id, products.vendorId))
      .where(and(eq(products.available,true),gt(products.stock,0),eq(vendors.active,true),or(ilike(products.name, like), ilike(products.category, like))))
      .limit(limit * 2),
  ]);
  return [
    ...d.map((x) => ({ type: "Destination", title: x.name, sub: x.tagline, href: `/destinations/${x.slug}`, image: x.image })),
    ...a.map((x) => ({ type: "Attraction", title: x.name, sub: x.category, href: `/attractions/${x.slug}`, image: x.image })),
    ...h.map((x) => ({ type: "Hotel", title: x.name, sub: `${x.type} · from ₹${x.pricePerNight}`, href: `/hotels/${x.slug}`, image: x.image })),
    ...p.map((x) => ({ type: "Tour", title: x.name, sub: `${x.days} days · ₹${x.price}`, href: `/tours/${x.slug}`, image: x.image })),
    ...v.map((x) => ({ type: x.kind === "restaurant" ? "Restaurant" : x.kind === "grocery" ? "Grocery" : "Shop", title: x.name, sub: x.tagline, href: `/store/${x.slug}`, image: x.image })),
    ...pr.map((x) => ({ type: x.p.isExperience ? "Experience" : "Product", title: x.p.name, sub: `${x.v.name} · ₹${x.p.price}`, href: `/store/${x.v.slug}`, image: x.p.image, emoji: x.p.emoji })),
  ];
}

