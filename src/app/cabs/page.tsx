import { asc, ilike } from "drizzle-orm";
import { db } from "@/db";
import { cabTypes, locations } from "@/db/schema";
import { ensureSeeded } from "@/lib/seed";
import { PageHeader } from "@/components/PageHeader";
import { CabBooker } from "@/components/CabBooker";

export const metadata = { title: "Cabs & transfers" };
export const dynamic = "force-dynamic";

export default async function CabsPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const sp = await searchParams;
  await ensureSeeded();
  const [locs, cabs] = await Promise.all([
    db.select().from(locations).orderBy(asc(locations.name)),
    db.select().from(cabTypes).orderBy(asc(cabTypes.baseFare)),
  ]);
  const [njp] = await db.select().from(locations).where(ilike(locations.name, "New Jalpaiguri%")).limit(1);
  const [dj] = await db.select().from(locations).where(ilike(locations.name, "Darjeeling Chowrasta%")).limit(1);
  const pickId = (v: string | undefined, d: number) => (v && locs.some((l) => l.id === Number(v)) ? Number(v) : d);
  const from = pickId(sp.from, njp?.id ?? locs[0].id);
  let to = pickId(sp.to, dj?.id ?? locs[1].id);
  if (to === from) to = locs.find((l) => l.id !== from)!.id;
  return (
    <div className="page">
      <PageHeader title="Cabs & transfers" sub="Verified hill drivers · fixed estimates" />
      <CabBooker locs={locs.map((l) => ({ id: l.id, name: l.name, kind: l.kind, lat: l.lat, lng: l.lng }))} cabs={cabs} initialFrom={from} initialTo={to} />
    </div>
  );
}
