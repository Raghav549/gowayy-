import { Heart } from "lucide-react";
import { redirect } from "next/navigation";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { attractions, destinations, favorites, hotels, packages, vendors } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getDestMap } from "@/lib/data";
import { AttractionCard, DestinationCard, HotelCard, PackageCard, VendorCard } from "@/components/Cards";
import { PageHeader } from "@/components/PageHeader";
import { Empty, SectionHead } from "@/components/ui";

export const metadata = { title: "Saved" };
export const dynamic = "force-dynamic";

export default async function FavoritesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth?next=/favorites");
  const favs = await db.select().from(favorites).where(eq(favorites.userId, user.id));
  const ids = (k: string) => favs.filter((f) => f.kind === k).map((f) => f.refId);
  const dm = await getDestMap();
  const names = Object.fromEntries(dm.list.map((d) => [d.id, d.name]));
  const [ds, hs, ps, as, vs] = await Promise.all([
    ids("destination").length ? db.select().from(destinations).where(inArray(destinations.id, ids("destination"))) : [],
    ids("hotel").length ? db.select().from(hotels).where(inArray(hotels.id, ids("hotel"))) : [],
    ids("package").length ? db.select().from(packages).where(inArray(packages.id, ids("package"))) : [],
    ids("attraction").length ? db.select().from(attractions).where(inArray(attractions.id, ids("attraction"))) : [],
    ids("vendor").length ? db.select().from(vendors).where(inArray(vendors.id, ids("vendor"))) : [],
  ]);
  const total = ds.length + hs.length + ps.length + as.length + vs.length;
  return (
    <div className="page">
      <PageHeader title="Saved" sub={`${total} favourite${total === 1 ? "" : "s"}`} />
      {total === 0 ? (
        <Empty icon={Heart} title="Nothing saved yet" text="Tap the heart on any destination, stay, tour or store to keep it here." href="/explore" />
      ) : (
        <>
          {ds.length > 0 && (<><SectionHead title="Destinations" /><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{ds.map((d, i) => <DestinationCard key={d.id} d={d} i={i} className="min-h-60 w-full" />)}</div></>)}
          {ps.length > 0 && (<><SectionHead title="Tours" /><div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{ps.map((p, i) => <PackageCard key={p.id} p={p} i={i} className="w-full" dests={p.destinationIds.map((x) => names[x]).join(" · ")} />)}</div></>)}
          {hs.length > 0 && (<><SectionHead title="Stays" /><div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{hs.map((h, i) => <HotelCard key={h.id} h={h} i={i} className="w-full" dest={names[h.destinationId]} />)}</div></>)}
          {as.length > 0 && (<><SectionHead title="Attractions" /><div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{as.map((a, i) => <AttractionCard key={a.id} a={a} i={i} className="w-full" dest={names[a.destinationId]} />)}</div></>)}
          {vs.length > 0 && (<><SectionHead title="Stores & restaurants" /><div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{vs.map((v, i) => <VendorCard key={v.id} v={v} i={i} className="w-full" dest={names[v.destinationId]} />)}</div></>)}
        </>
      )}
    </div>
  );
}
