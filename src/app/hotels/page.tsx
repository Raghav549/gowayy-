import { asc } from "drizzle-orm";
import { db } from "@/db";
import { hotels } from "@/db/schema";
import { getDestMap } from "@/lib/data";
import { HotelCard } from "@/components/Cards";
import { PageHeader } from "@/components/PageHeader";
import { Chip, Empty } from "@/components/ui";

export const metadata = { title: "Hotels & stays" };
export const dynamic = "force-dynamic";

const BANDS: Record<string, [number, number, string]> = {
  budget: [0, 3000, "Under ₹3,000"],
  mid: [3000, 6000, "₹3,000 – ₹6,000"],
  lux: [6000, 1e9, "Luxury ₹6,000+"],
};

export default async function HotelsPage({ searchParams }: { searchParams: Promise<{ dest?: string; band?: string }> }) {
  const sp = await searchParams;
  const dm = await getDestMap();
  const all = await db.select().from(hotels).orderBy(asc(hotels.pricePerNight));
  const dest = dm.list.find((d) => d.slug === sp.dest);
  const band = sp.band ? BANDS[sp.band] : undefined;
  const list = all.filter((h) => (!dest || h.destinationId === dest.id) && (!band || (h.pricePerNight >= band[0] && h.pricePerNight < band[1])));
  const href = (o: { dest?: string; band?: string }) => {
    const p = new URLSearchParams();
    if (o.dest) p.set("dest", o.dest);
    if (o.band) p.set("band", o.band);
    return `/hotels${p.toString() ? `?${p}` : ""}`;
  };
  const hasHotels = new Set(all.map((h) => h.destinationId));
  return (
    <div className="page">
      <PageHeader title="Stays" sub="Hotels, homestays & tea villas" />
      <div className="hscroll !pb-2">
        <Chip href={href({ band: sp.band })} on={!dest}>All places</Chip>
        {dm.list.filter((d) => hasHotels.has(d.id)).map((d) => <Chip key={d.id} href={href({ dest: d.slug, band: sp.band })} on={dest?.id === d.id}>{d.name}</Chip>)}
      </div>
      <div className="hscroll !pb-4">
        <Chip href={href({ dest: sp.dest })} on={!band}>Any budget</Chip>
        {Object.entries(BANDS).map(([k, v]) => <Chip key={k} href={href({ dest: sp.dest, band: k })} on={sp.band === k}>{v[2]}</Chip>)}
      </div>
      {list.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((h, i) => <HotelCard key={h.id} h={h} i={i} className="w-full" dest={dm.byId[h.destinationId]?.name} />)}
        </div>
      ) : (
        <Empty title="No stays found" text="Try another area or budget." href="/hotels" cta="Reset filters" />
      )}
    </div>
  );
}
