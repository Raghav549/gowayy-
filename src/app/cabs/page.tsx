import { asc, eq, ilike } from "drizzle-orm";
import { db } from "@/db";
import { cabTypes, locations } from "@/db/schema";
import { ensureSeeded } from "@/lib/seed";
import { getDestMap, getLoc } from "@/lib/data";
import { roadKm } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";
import { CabBooker, type PopularRoute } from "@/components/CabBooker";

export const metadata = { title: "Cabs & transfers" };
export const dynamic = "force-dynamic";

type L = typeof locations.$inferSelect;

/** Suggested rides built from real locations: gateways → the user's area, then onward hops nearby. */
function popularRoutes(locs: L[], gatewayDestId: number | undefined, featured: Set<number>, nearDestId: number | null): PopularRoute[] {
  const gates = locs.filter((l) => (l.kind === "station" || l.kind === "airport") && l.destinationId === gatewayDestId);
  const towns = locs.filter((l) => l.kind === "town" && l.destinationId !== gatewayDestId);
  const mk = (a: L, b: L): PopularRoute => ({ fromId: a.id, toId: b.id, from: a.name, to: b.name, km: roadKm(a.lat, a.lng, b.lat, b.lng) });
  const out: PopularRoute[] = [];

  const local = nearDestId ? towns.find((t) => t.destinationId === nearDestId) : undefined;
  if (local) {
    gates.forEach((g) => out.push(mk(g, local)));
    // sights in the user's area, then the closest other hill towns
    locs.filter((l) => l.kind === "attraction" && l.destinationId === nearDestId).slice(0, 2).forEach((a) => out.push(mk(local, a)));
    towns
      .filter((t) => t.id !== local.id)
      .map((t) => mk(local, t))
      .sort((x, y) => x.km - y.km)
      .slice(0, 2)
      .forEach((r) => out.push(r));
  } else {
    const picks = towns.filter((t) => featured.has(t.destinationId)).slice(0, 5);
    picks.forEach((t, i) => gates.length && out.push(mk(gates[i % gates.length], t)));
  }
  return out.filter((r) => r.fromId !== r.toId && r.km > 0);
}

export default async function CabsPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const sp = await searchParams;
  await ensureSeeded();
  const [locs, cabs, loc, dm] = await Promise.all([
    db.select().from(locations).orderBy(asc(locations.name)),
    db.select().from(cabTypes).where(eq(cabTypes.active,true)).orderBy(asc(cabTypes.baseFare)),
    getLoc(),
    getDestMap(),
  ]);
  const [njp] = await db.select().from(locations).where(ilike(locations.name, "New Jalpaiguri%")).limit(1);
  const [dj] = await db.select().from(locations).where(ilike(locations.name, "Darjeeling Chowrasta%")).limit(1);
  const pickId = (v: string | undefined, d: number) => (v && locs.some((l) => l.id === Number(v)) ? Number(v) : d);
  const from = pickId(sp.from, njp?.id ?? locs[0].id);
  let to = pickId(sp.to, dj?.id ?? locs[1].id);
  if (to === from) to = locs.find((l) => l.id !== from)!.id;

  const gatewayDestId = dm.list.find((d) => d.slug === "siliguri")?.id ?? njp?.destinationId;
  const featured = new Set(dm.list.filter((d) => d.featured).map((d) => d.id));
  const nearDest = loc && loc.id !== gatewayDestId ? loc : null;
  const routes = popularRoutes(locs, gatewayDestId, featured, nearDest?.id ?? null);

  return (
    <div className="page">
      <PageHeader title="Cabs & transfers" sub="Verified hill drivers · fixed estimates" />
      <CabBooker
        key={`${from}-${to}`}
        locs={locs.map((l) => ({ id: l.id, name: l.name, kind: l.kind, lat: l.lat, lng: l.lng }))}
        cabs={cabs}
        initialFrom={from}
        initialTo={to}
        routes={routes}
        nearName={loc?.name}
      />
    </div>
  );
}
