import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { Check, Gauge, Star, Users, CalendarRange } from "lucide-react";
import { db } from "@/db";
import { locations, packages } from "@/db/schema";
import { getConnected, getDestMap } from "@/lib/data";
import { transferFares } from "@/lib/transfer";
import { PageHeader } from "@/components/PageHeader";
import { Fact, Hero } from "@/components/Hero";
import { ConnectedSections } from "@/components/Connected";
import { PackageBooking } from "@/components/BookingForms";

export const dynamic = "force-dynamic";

export default async function TourPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [p] = await db.select().from(packages).where(eq(packages.slug, slug)).limit(1);
  if (!p) notFound();
  const dm = await getDestMap();
  const names = Object.fromEntries(dm.list.map((x) => [x.id, x.name]));
  const [hub] = await db.select().from(locations).where(eq(locations.destinationId, p.destinationIds[0])).limit(1);
  const [data, fares] = await Promise.all([getConnected(p.destinationIds, 6), transferFares(hub?.id)]);
  data.packages = data.packages.filter((x) => x.id !== p.id);
  const destList = p.destinationIds.map((x) => names[x]).join(" · ");

  return (
    <div className="page">
      <PageHeader title={p.name} sub={destList} />
      <Hero image={p.image} title={p.name} eyebrow={destList} fav={{ kind: "package", id: p.id }} badges={<span className="rounded-full bg-white px-3 py-1.5 text-[11px] font-bold">{p.days} days · {p.theme}</span>}>
        <p className="mt-2 max-w-xl text-sm text-white/80">{p.description}</p>
      </Hero>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Fact icon={<CalendarRange size={18} />} label="Duration" value={`${p.days} days / ${p.days - 1} nights`} />
        <Fact icon={<Users size={18} />} label="Group size" value={p.groupSize} />
        <Fact icon={<Gauge size={18} />} label="Difficulty" value={p.difficulty} />
        <Fact icon={<Star size={18} />} label="Rating" value={`${p.rating.toFixed(1)} / 5`} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div>
          <h2 className="font-display text-2xl font-semibold">Highlights</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {p.highlights.map((h) => <span key={h} className="chip">{h}</span>)}
          </div>

          <h2 className="font-display mb-4 mt-8 text-2xl font-semibold">Day-by-day itinerary</h2>
          <ol className="relative space-y-4 border-l-2 border-dashed border-brand-300 pl-6">
            {p.itinerary.map((d, i) => (
              <li key={d.day} style={{ "--i": i } as React.CSSProperties} className="anim-up relative">
                <span className="absolute -left-[39px] top-4 grid h-8 w-8 place-items-center rounded-full bg-brand-600 text-xs font-bold text-white ring-4 ring-white">{d.day}</span>
                <div className="glass rounded-3xl p-4">
                  <h3 className="font-display text-lg font-semibold">{d.title}</h3>
                  <p className="mt-1 text-sm text-ink/65">{d.desc}</p>
                </div>
              </li>
            ))}
          </ol>

          <h2 className="font-display mb-3 mt-8 text-2xl font-semibold">What&apos;s included</h2>
          <div className="glass grid grid-cols-1 gap-2 rounded-3xl p-5 sm:grid-cols-2">
            {p.inclusions.map((x) => (
              <p key={x} className="flex items-center gap-2 text-sm font-semibold"><span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-100 text-emerald-600"><Check size={12} /></span>{x}</p>
            ))}
          </div>
        </div>
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <PackageBooking pkg={{ id: p.id, price: p.price, days: p.days }} sedanFare={fares.sedan} suvFare={fares.suv} />
        </aside>
      </div>

      <ConnectedSections data={data} destName={destList} destNames={names} show={["hotels", "attractions", "restaurants", "groceries", "shops", "packages"]} heading="Make this trip even better" />
    </div>
  );
}
