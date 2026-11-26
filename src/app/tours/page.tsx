import { desc } from "drizzle-orm";
import { db } from "@/db";
import { packages } from "@/db/schema";
import { getDestMap } from "@/lib/data";
import { PackageCard } from "@/components/Cards";
import { PageHeader } from "@/components/PageHeader";
import { Chip, Empty } from "@/components/ui";

export const metadata = { title: "Tour packages" };
export const dynamic = "force-dynamic";

export default async function ToursPage({ searchParams }: { searchParams: Promise<{ theme?: string; dest?: string }> }) {
  const sp = await searchParams;
  const dm = await getDestMap();
  const all = await db.select().from(packages).orderBy(desc(packages.rating));
  const themes = [...new Set(all.map((p) => p.theme))];
  const dest = dm.list.find((d) => d.slug === sp.dest);
  const list = all.filter((p) => (!sp.theme || p.theme === sp.theme) && (!dest || p.destinationIds.includes(dest.id)));
  const href = (o: { theme?: string; dest?: string }) => {
    const p = new URLSearchParams();
    if (o.theme) p.set("theme", o.theme);
    if (o.dest) p.set("dest", o.dest);
    return `/tours${p.toString() ? `?${p}` : ""}`;
  };
  const names = Object.fromEntries(dm.list.map((d) => [d.id, d.name]));
  return (
    <div className="page">
      <PageHeader title="Tour packages" sub="Stay, cab & sightseeing — bundled" />
      <div className="hscroll !pb-2">
        <Chip href={href({ dest: sp.dest })} on={!sp.theme}>All themes</Chip>
        {themes.map((t) => <Chip key={t} href={href({ theme: t, dest: sp.dest })} on={sp.theme === t}>{t}</Chip>)}
      </div>
      <div className="hscroll !pb-4">
        <Chip href={href({ theme: sp.theme })} on={!dest}>Anywhere</Chip>
        {dm.list.filter((d) => d.slug !== "siliguri").map((d) => <Chip key={d.id} href={href({ theme: sp.theme, dest: d.slug })} on={dest?.id === d.id}>{d.name}</Chip>)}
      </div>
      {list.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((p, i) => <PackageCard key={p.id} p={p} i={i} className="w-full" dests={p.destinationIds.map((x) => names[x]).join(" · ")} />)}
        </div>
      ) : (
        <Empty title="No trips match" text="Try a different theme or destination." href="/tours" cta="Show all trips" />
      )}
    </div>
  );
}
