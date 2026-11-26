import { eq } from "drizzle-orm";
import { db } from "@/db";
import { ensureSeeded } from "@/lib/seed";
import { locations } from "@/db/schema";
import { fail, ok } from "@/lib/api";
import { getConnected } from "@/lib/data";

export const dynamic = "force-dynamic";

/** Smart ecosystem endpoint: what's around a location (used by cab booking, trip hub, etc.). */
export async function GET(req: Request) {
  const id = Number(new URL(req.url).searchParams.get("locationId"));
  if (!id) return fail("locationId required");
  await ensureSeeded();
  const [loc] = await db.select().from(locations).where(eq(locations.id, id)).limit(1);
  if (!loc) return fail("Location not found", 404);
  const c = await getConnected([loc.destinationId], 4);
  const slim = <T extends { id: number; slug: string; name: string; image: string; rating: number }>(x: T[]) =>
    x.map((i) => ({ id: i.id, slug: i.slug, name: i.name, image: i.image, rating: i.rating }));
  return ok({
    location: loc.name,
    restaurants: slim(c.restaurants),
    groceries: slim(c.groceries),
    shops: slim(c.shops),
    attractions: slim(c.attractions),
    hotels: slim(c.hotels),
  });
}
