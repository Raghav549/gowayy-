import { eq, ilike } from "drizzle-orm";
import { db } from "@/db";
import { cabTypes, locations } from "@/db/schema";
import { cabFare } from "@/lib/pricing";
import { roadKm } from "@/lib/utils";

/** Round-trip transfer fares (sedan / SUV) from NJP to a given location — powers cross-sell add-ons. */
export async function transferFares(toLocationId: number | null | undefined) {
  const [njp] = await db.select().from(locations).where(ilike(locations.name, "New Jalpaiguri%")).limit(1);
  const [to] = toLocationId ? await db.select().from(locations).where(eq(locations.id, toLocationId)).limit(1) : [];
  const cabs = await db.select().from(cabTypes).where(eq(cabTypes.active,true));
  const sedan = cabs.find((c) => c.slug === "sedan");
  const suv = cabs.find((c) => c.slug === "suv");
  if (!njp || !to || !sedan || !suv) return { sedan: 3000, suv: 4500, km: 0 };
  const km = roadKm(njp.lat, njp.lng, to.lat, to.lng);
  return { sedan: cabFare(sedan, km, true), suv: cabFare(suv, km, true), km };
}
