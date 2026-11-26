import Link from "next/link";
import { notFound } from "next/navigation";
import { eq, ilike } from "drizzle-orm";
import { CalendarDays, CarTaxiFront, Mountain, Star, Sunrise } from "lucide-react";
import { db } from "@/db";
import { cabTypes, destinations, locations } from "@/db/schema";
import { getConnected, getDestMap } from "@/lib/data";
import { cabFare } from "@/lib/pricing";
import { hillMinutes, inr, roadKm } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";
import { Fact, Hero } from "@/components/Hero";
import { ConnectedSections } from "@/components/Connected";

export const dynamic = "force-dynamic";

export default async function DestinationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const dm = await getDestMap();
  const [d] = await db.select().from(destinations).where(eq(destinations.slug, slug)).limit(1);
  if (!d) notFound();
  const [data, hubs, [njp], cabs] = await Promise.all([
    getConnected([d.id], 8),
    db.select().from(locations).where(eq(locations.destinationId, d.id)),
    db.select().from(locations).where(ilike(locations.name, "New Jalpaiguri%")).limit(1),
    db.select().from(cabTypes),
  ]);
  const hub = hubs.find((l) => l.kind !== "attraction" && l.kind !== "hotel") ?? hubs[0];
  const names = Object.fromEntries(dm.list.map((x) => [x.id, x.name]));
  const km = hub && njp ? roadKm(njp.lat, njp.lng, hub.lat, hub.lng) : 0;
  const sedan = cabs.find((c) => c.slug === "sedan");
  const suv = cabs.find((c) => c.slug === "suv");

  return (
    <div className="page">
      <PageHeader title={d.name} sub={d.region} />
      <Hero image={d.image} title={d.name} eyebrow={d.region} fav={{ kind: "destination", id: d.id }}
        badges={d.tags.map((t) => <span key={t} className="glass-tint rounded-full px-3 py-1.5 text-[11px] font-bold text-white">{t}</span>)}>
        <p className="mt-1 max-w-xl text-sm text-white/80">{d.tagline}</p>
      </Hero>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Fact icon={<Mountain size={18} />} label="Altitude" value={d.altitude} />
        <Fact icon={<CalendarDays size={18} />} label="Best season" value={d.bestSeason} />
        <Fact icon={<Star size={18} />} label="Traveller rating" value={`${d.rating.toFixed(1)} / 5`} />
        <Fact icon={<Sunrise size={18} />} label="Things to do" value={`${data.attractions.length}+ places`} />
      </div>

      <p className="glass mt-5 rounded-[28px] p-5 text-[15px] leading-relaxed text-ink/75">{d.description}</p>

      {hub && km > 5 && sedan && suv && (
        <div className="glass-strong mt-5 flex flex-col gap-4 rounded-[32px] p-5 sm:flex-row sm:items-center">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-amber-100 text-amber-700"><CarTaxiFront size={26} /></span>
          <div className="flex-1">
            <h3 className="font-display text-xl font-semibold">Getting to {d.name}</h3>
            <p className="text-sm text-ink/60">From NJP station · {km} km · about {Math.floor(hillMinutes(km) / 60)}h {hillMinutes(km) % 60}m by road</p>
            <p className="mt-1 text-sm font-semibold">Sedan {inr(cabFare(sedan, km, false))} · SUV {inr(cabFare(suv, km, false))}</p>
          </div>
          <Link href={`/cabs?from=${njp.id}&to=${hub.id}`} className="btn btn-brand">Book this ride</Link>
        </div>
      )}

      <ConnectedSections
        data={data}
        destName={d.name}
        destNames={names}
        show={["attractions", "packages", "hotels", "restaurants", "groceries", "shops"]}
        heading={`Everything in ${d.name}, connected`}
      />
    </div>
  );
}
