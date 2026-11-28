import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { hotels } from "@/db/schema";
import { getDestMap, getLoc } from "@/lib/data";
import { HotelCard } from "@/components/Cards";
import { PageHeader } from "@/components/PageHeader";
import { LocationPicker } from "@/components/Nav";
import { Chip, Empty, ListingSearch, NearYouNote, SectionHead } from "@/components/ui";

export const metadata = { title: "Hotels & stays" };
export const dynamic = "force-dynamic";

const BANDS: Record<string, [number, number, string]> = {
  budget: [0, 3000, "Under ₹3,000"],
  mid: [3000, 6000, "₹3,000 – ₹6,000"],
  lux: [6000, 1e9, "Luxury ₹6,000+"],
};

export default async function HotelsPage({ searchParams }: { searchParams: Promise<{ dest?: string; band?: string; q?: string }> }) {
  const sp = await searchParams;
  const [dm, loc] = await Promise.all([getDestMap(), getLoc()]);
  const all = await db.select().from(hotels).where(eq(hotels.active,true)).orderBy(asc(hotels.pricePerNight));
  const dest = dm.list.find((d) => d.slug === sp.dest);
  const band = sp.band ? BANDS[sp.band] : undefined;
  const q = (sp.q ?? "").trim().toLowerCase().slice(0, 80);
  const matches = (h: (typeof all)[number]) =>
    !q || [h.name, h.type, h.area, h.description, dm.byId[h.destinationId]?.name ?? "", ...h.amenities].some((t) => t.toLowerCase().includes(q));
  const list = all.filter((h) => (!dest || h.destinationId === dest.id) && (!band || (h.pricePerNight >= band[0] && h.pricePerNight < band[1])) && matches(h));
  const filtered = !!(dest || band || q);
  const near = loc ? all.filter((h) => h.destinationId === loc.id).sort((a, b) => b.rating - a.rating) : [];
  const recommended = [...all].sort((a, b) => b.rating - a.rating || b.stars - a.stars).slice(0, 6);

  const href = (o: { dest?: string; band?: string }) => {
    const p = new URLSearchParams();
    if (o.dest) p.set("dest", o.dest);
    if (o.band) p.set("band", o.band);
    if (sp.q) p.set("q", sp.q);
    return `/hotels${p.toString() ? `?${p}` : ""}`;
  };
  const hasHotels = new Set(all.map((h) => h.destinationId));
  const name = (id: number) => dm.byId[id]?.name;

  return (
    <div className="page">
      <PageHeader title="Stays" sub="Hotels, homestays & tea villas" />
      <ListingSearch action="/hotels" q={sp.q} placeholder="Search homestays, resorts, Mall Road…" hidden={{ dest: sp.dest, band: sp.band }} />

      <div className="hscroll !pb-2 !pt-0" aria-label="Filter by place">
        <Chip href={href({ band: sp.band })} on={!dest}>All places</Chip>
        {dm.list.filter((d) => hasHotels.has(d.id)).map((d) => <Chip key={d.id} href={href({ dest: d.slug, band: sp.band })} on={dest?.id === d.id}>{d.name}</Chip>)}
      </div>
      <div className="hscroll !pb-4 !pt-0" aria-label="Filter by budget">
        <Chip href={href({ dest: sp.dest })} on={!band}>Any budget</Chip>
        {Object.entries(BANDS).map(([k, v]) => <Chip key={k} href={href({ dest: sp.dest, band: k })} on={sp.band === k}>{v[2]}</Chip>)}
      </div>

      {!filtered && (
        <>
          <SectionHead title={loc ? `Near ${loc.name}` : "Near you"} />
          {!loc ? (
            <NearYouNote action={<LocationPicker light compact />}>Choose your area to see stays near you.</NearYouNote>
          ) : near.length ? (
            <div className="hscroll !pt-0">{near.map((h, i) => <HotelCard key={h.id} h={h} i={i} dest={name(h.destinationId)} />)}</div>
          ) : (
            <NearYouNote action={<LocationPicker light compact />}>No stays listed in {loc.name} yet — browse all stays below.</NearYouNote>
          )}

          <SectionHead title="Top rated" />
          <div className="hscroll !pt-0">{recommended.map((h, i) => <HotelCard key={h.id} h={h} i={i} dest={name(h.destinationId)} />)}</div>
        </>
      )}

      <div className="mb-3 mt-8 flex items-end justify-between gap-3">
        <h2 className="font-display min-w-0 text-[1.45rem] font-semibold leading-tight">{q ? `Results for “${sp.q?.trim()}”` : filtered ? "Matching stays" : "All stays"}</h2>
        {list.length > 0 && <span className="shrink-0 text-xs font-semibold text-ink/50">{list.length} stay{list.length === 1 ? "" : "s"}</span>}
      </div>
      {list.length ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((h, i) => <HotelCard key={h.id} h={h} i={i} className="w-full" dest={name(h.destinationId)} />)}
        </div>
      ) : (
        <Empty title="No stays found" text="Try another search, area or budget." href="/hotels" cta="Reset filters" />
      )}
    </div>
  );
}
