import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { packages } from "@/db/schema";
import { getDestMap, getLoc } from "@/lib/data";
import { PackageCard } from "@/components/Cards";
import { PageHeader } from "@/components/PageHeader";
import { LocationPicker } from "@/components/Nav";
import { Chip, Empty, ListingSearch, NearYouNote, SectionHead } from "@/components/ui";

export const metadata = { title: "Tour packages" };
export const dynamic = "force-dynamic";

const LENGTHS: Record<string, [number, number, string]> = {
  short: [0, 3, "Up to 3 days"],
  mid: [4, 5, "4–5 days"],
  long: [6, 99, "6+ days"],
};

export default async function ToursPage({ searchParams }: { searchParams: Promise<{ theme?: string; dest?: string; len?: string; q?: string }> }) {
  const sp = await searchParams;
  const [dm, loc] = await Promise.all([getDestMap(), getLoc()]);
  const all = await db.select().from(packages).where(eq(packages.active,true)).orderBy(desc(packages.rating));
  const names = Object.fromEntries(dm.list.map((d) => [d.id, d.name]));
  const themes = [...new Set(all.map((p) => p.theme))];
  const dest = dm.list.find((d) => d.slug === sp.dest);
  const len = sp.len ? LENGTHS[sp.len] : undefined;
  const q = (sp.q ?? "").trim().toLowerCase().slice(0, 80);
  const matches = (p: (typeof all)[number]) =>
    !q ||
    [p.name, p.theme, p.description, p.difficulty, ...p.highlights, ...p.destinationIds.map((x) => names[x] ?? "")].some((t) => t.toLowerCase().includes(q));
  const list = all.filter(
    (p) => (!sp.theme || p.theme === sp.theme) && (!dest || p.destinationIds.includes(dest.id)) && (!len || (p.days >= len[0] && p.days <= len[1])) && matches(p),
  );
  const filtered = !!(sp.theme || dest || len || q);
  const near = loc ? all.filter((p) => p.destinationIds.includes(loc.id)) : [];
  const recommended = all.filter((p) => p.featured).slice(0, 6);

  const href = (o: { theme?: string; dest?: string; len?: string }) => {
    const p = new URLSearchParams();
    if (o.theme) p.set("theme", o.theme);
    if (o.dest) p.set("dest", o.dest);
    if (o.len) p.set("len", o.len);
    if (sp.q) p.set("q", sp.q);
    return `/tours${p.toString() ? `?${p}` : ""}`;
  };
  const card = (p: (typeof all)[number], i: number, className?: string) => (
    <PackageCard key={p.id} p={p} i={i} className={className} dests={p.destinationIds.map((x) => names[x]).join(" · ")} />
  );

  return (
    <div className="page">
      <PageHeader title="Tour packages" sub="Stay, cab & sightseeing — bundled" />
      <ListingSearch action="/tours" q={sp.q} placeholder="Search treks, tea trails, Gangtok…" hidden={{ theme: sp.theme, dest: sp.dest, len: sp.len }} />

      <div className="hscroll !pb-2 !pt-0" aria-label="Filter by theme">
        <Chip href={href({ dest: sp.dest, len: sp.len })} on={!sp.theme}>All themes</Chip>
        {themes.map((t) => <Chip key={t} href={href({ theme: t, dest: sp.dest, len: sp.len })} on={sp.theme === t}>{t}</Chip>)}
      </div>
      <div className="hscroll !pb-2 !pt-0" aria-label="Filter by destination">
        <Chip href={href({ theme: sp.theme, len: sp.len })} on={!dest}>Anywhere</Chip>
        {dm.list.filter((d) => d.slug !== "siliguri").map((d) => <Chip key={d.id} href={href({ theme: sp.theme, dest: d.slug, len: sp.len })} on={dest?.id === d.id}>{d.name}</Chip>)}
      </div>
      <div className="hscroll !pb-4 !pt-0" aria-label="Filter by length">
        <Chip href={href({ theme: sp.theme, dest: sp.dest })} on={!len}>Any length</Chip>
        {Object.entries(LENGTHS).filter(([, v]) => all.some((p) => p.days >= v[0] && p.days <= v[1])).map(([k, v]) => <Chip key={k} href={href({ theme: sp.theme, dest: sp.dest, len: k })} on={sp.len === k}>{v[2]}</Chip>)}
      </div>

      {!filtered && (
        <>
          <SectionHead title={loc ? `Near ${loc.name}` : "Near you"} />
          {!loc ? (
            <NearYouNote action={<LocationPicker light compact />}>Choose your area to see trips that start or pass near you.</NearYouNote>
          ) : near.length ? (
            <div className="hscroll !pt-0">{near.map((p, i) => card(p, i))}</div>
          ) : (
            <NearYouNote action={<LocationPicker light compact />}>No packages pass through {loc.name} yet — explore all trips below.</NearYouNote>
          )}

          {recommended.length > 0 && (
            <>
              <SectionHead title="Recommended" />
              <div className="hscroll !pt-0">{recommended.map((p, i) => card(p, i))}</div>
            </>
          )}
        </>
      )}

      <div className="mb-3 mt-8 flex items-end justify-between gap-3">
        <h2 className="font-display min-w-0 text-[1.45rem] font-semibold leading-tight">{q ? `Results for “${sp.q?.trim()}”` : filtered ? "Matching trips" : "All trips"}</h2>
        {list.length > 0 && <span className="shrink-0 text-xs font-semibold text-ink/50">{list.length} trip{list.length === 1 ? "" : "s"}</span>}
      </div>
      {list.length ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{list.map((p, i) => card(p, i, "w-full"))}</div>
      ) : (
        <Empty title="No trips match" text="Try a different search, theme or destination." href="/tours" cta="Show all trips" />
      )}
    </div>
  );
}
