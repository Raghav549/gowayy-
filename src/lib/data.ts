import { cookies } from "next/headers";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  attractions,
  cartItems,
  destinations,
  favorites,
  hotels,
  notifications,
  packages,
  vendors,
} from "@/db/schema";
import { ensureSeeded } from "@/lib/seed";

export async function getDestMap() {
  await ensureSeeded();
  const rows = await db.select().from(destinations);
  return {
    list: rows,
    byId: Object.fromEntries(rows.map((d) => [d.id, d])) as Record<number, (typeof rows)[number]>,
  };
}

export async function getLoc() {
  const jar = await cookies();
  const slug = jar.get("gw_loc")?.value;
  const { list } = await getDestMap();
  return list.find((d) => d.slug === slug) ?? null;
}

export async function getConnected(destIds: number[], limit = 6) {
  await ensureSeeded();
  if (!destIds.length) return { hotels: [], attractions: [], restaurants: [], groceries: [], shops: [], packages: [] };
  const arr = sql.raw(`ARRAY[${destIds.map((n) => Number(n)).join(",")}]::int[]`);
  const [h, a, v, p] = await Promise.all([
    db.select().from(hotels).where(inArray(hotels.destinationId, destIds)).orderBy(desc(hotels.rating)).limit(limit),
    db.select().from(attractions).where(inArray(attractions.destinationId, destIds)).orderBy(desc(attractions.rating)).limit(limit),
    db.select().from(vendors).where(inArray(vendors.destinationId, destIds)).orderBy(desc(vendors.rating)),
    db.select().from(packages).where(sql`${packages.destinationIds} && ${arr}`).orderBy(desc(packages.rating)).limit(limit),
  ]);
  return {
    hotels: h,
    attractions: a,
    restaurants: v.filter((x) => x.kind === "restaurant").slice(0, limit),
    groceries: v.filter((x) => x.kind === "grocery").slice(0, limit),
    shops: v.filter((x) => x.kind === "shop").slice(0, limit),
    packages: p,
  };
}

export async function getShellData(userId: number | null) {
  if (!userId) return { cart: {} as Record<number, number>, unread: 0, favs: [] as string[] };
  const [c, n, f] = await Promise.all([
    db.select().from(cartItems).where(eq(cartItems.userId, userId)),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.read, false))),
    db.select().from(favorites).where(eq(favorites.userId, userId)),
  ]);
  return {
    cart: Object.fromEntries(c.map((x) => [x.productId, x.qty])) as Record<number, number>,
    unread: n[0]?.n ?? 0,
    favs: f.map((x) => `${x.kind}:${x.refId}`),
  };
}
