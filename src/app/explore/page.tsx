import { desc } from "drizzle-orm";
import { db } from "@/db";
import { attractions } from "@/db/schema";
import { getDestMap } from "@/lib/data";
import { AttractionCard, DestinationCard } from "@/components/Cards";
import { PageHeader } from "@/components/PageHeader";
import { Chip, Empty, SectionHead } from "@/components/ui";

export const metadata = { title: "Explore" };
export const dynamic = "force-dynamic";

export default async function ExplorePage({ searchParams }: { searchParams: Promise<{ dest?: string; cat?: string }> }) {
  const sp = await searchParams;
  const dm = await getDestMap();
  const dest = dm.list.find((d) => d.slug === sp.dest);
  const all = await db.select().from(attractions).orderBy(desc(attractions.rating));
  const cats = [...new Set(all.map((a) => a.category))];
  const list = all.filter((a) => (!dest || a.destinationId === dest.id) && (!sp.cat || a.category === sp.cat));
  const q = (o: { dest?: string; cat?: string }) => {
    const p = new URLSearchParams();
    if (o.dest) p.set("dest", o.dest);
    if (o.cat) p.set("cat", o.cat);
    const s = p.toString();
    return `/explore${s ? `?${s}` : ""}`;
  };
  return (
    <div className="page">
      <PageHeader title="Explore" sub="Destinations & things to do" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {dm.list.map((d, i) => (
          <DestinationCard key={d.id} d={d} i={i} className="h-60 w-full sm:h-72" />
        ))}
      </div>

      <SectionHead title="Things to do" sub={dest ? `In ${dest.name}` : "Across every destination"} />
      <div className="hscroll !pb-3">
        <Chip href={q({ cat: sp.cat })} on={!dest}>All places</Chip>
        {dm.list.map((d) => (
          <Chip key={d.id} href={q({ dest: d.slug, cat: sp.cat })} on={dest?.id === d.id}>{d.name}</Chip>
        ))}
      </div>
      <div className="hscroll !pb-4">
        <Chip href={q({ dest: sp.dest })} on={!sp.cat}>Everything</Chip>
        {cats.map((c) => (
          <Chip key={c} href={q({ dest: sp.dest, cat: c })} on={sp.cat === c}>{c}</Chip>
        ))}
      </div>
      {list.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((a, i) => (
            <AttractionCard key={a.id} a={a} i={i} dest={dm.byId[a.destinationId]?.name} className="w-full" />
          ))}
        </div>
      ) : (
        <Empty title="Nothing here yet" text="Try another category or destination." href="/explore" cta="Reset filters" />
      )}
    </div>
  );
}
