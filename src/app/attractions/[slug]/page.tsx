import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { CarTaxiFront, Clock, Lightbulb, MapPin, Ticket, Timer } from "lucide-react";
import { db } from "@/db";
import { attractions } from "@/db/schema";
import { getConnected, getDestMap } from "@/lib/data";
import { inr } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";
import { Fact, Hero } from "@/components/Hero";
import { ConnectedSections } from "@/components/Connected";
import { Rating } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AttractionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [a] = await db.select().from(attractions).where(eq(attractions.slug, slug)).limit(1);
  if (!a) notFound();
  const dm = await getDestMap();
  const dest = dm.byId[a.destinationId];
  const data = await getConnected([a.destinationId], 8);
  data.attractions = data.attractions.filter((x) => x.id !== a.id);
  const names = Object.fromEntries(dm.list.map((x) => [x.id, x.name]));

  return (
    <div className="page">
      <PageHeader title={a.name} sub={`${dest?.name} · ${a.category}`} />
      <Hero image={a.image} title={a.name} eyebrow={`${dest?.name} · ${dest?.region}`} fav={{ kind: "attraction", id: a.id }}
        badges={<span className="glass-tint rounded-full px-3 py-1.5 text-[11px] font-bold text-white">{a.category}</span>}>
        <div className="mt-2 text-white"><Rating value={a.rating} className="text-white" /></div>
      </Hero>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Fact icon={<Ticket size={18} />} label="Entry" value={a.entryFee ? `${inr(a.entryFee)} / person` : "Free"} />
        <Fact icon={<Timer size={18} />} label="Plan for" value={a.duration} />
        <Fact icon={<Clock size={18} />} label="Timings" value={a.timings} />
        <Fact icon={<MapPin size={18} />} label="Area" value={dest?.name ?? ""} />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="glass rounded-[28px] p-5">
          <h3 className="font-display text-xl font-semibold">About</h3>
          <p className="mt-2 text-[15px] leading-relaxed text-ink/75">{a.description}</p>
          <div className="mt-4 flex items-start gap-3 rounded-2xl bg-amber-50 p-3.5 text-sm text-amber-900">
            <Lightbulb size={18} className="mt-0.5 shrink-0" /> <span><b>Local tip:</b> {a.tip}</span>
          </div>
        </div>
        <div className="glass-strong flex flex-col justify-between gap-4 rounded-[28px] p-5">
          <div>
            <h3 className="font-display text-xl font-semibold">Plan your visit</h3>
            <p className="mt-1 text-sm text-ink/60">Get there, stay close and eat well — all from gowayy.</p>
          </div>
          <div className="grid gap-2">
            <Link href={`/cabs?to=${a.locationId}`} className="btn btn-brand"><CarTaxiFront size={17} /> Book a cab here</Link>
            <Link href={`/hotels?dest=${dest?.slug}`} className="btn btn-light">Stays near {dest?.name}</Link>
            <Link href="/tours" className="btn btn-light">Tours including {dest?.name}</Link>
          </div>
        </div>
      </div>

      <ConnectedSections data={data} destName={dest?.name ?? ""} destNames={names} show={["hotels", "restaurants", "groceries", "shops", "packages", "attractions"]} heading={`Around ${a.name}`} />
    </div>
  );
}
