import { AttractionCard, HotelCard, PackageCard, VendorCard } from "@/components/Cards";
import { SectionHead, SmartBadge } from "@/components/ui";
import type { getConnected } from "@/lib/data";

export { SmartBadge };

type Data = Awaited<ReturnType<typeof getConnected>>;
export type SectionKey = "hotels" | "attractions" | "restaurants" | "groceries" | "shops" | "packages";

const META: Record<SectionKey, { title: (p: string) => string; href: string }> = {
  hotels: { title: (p) => `Stay near ${p}`, href: "/hotels" },
  attractions: { title: (p) => `Things to do in ${p}`, href: "/explore" },
  restaurants: { title: (p) => `Eat around ${p}`, href: "/food" },
  groceries: { title: (p) => `Groceries in ${p}`, href: "/grocery" },
  shops: { title: (p) => `Local shops in ${p}`, href: "/shops" },
  packages: { title: (p) => `Tour packages via ${p}`, href: "/tours" },
};

export function ConnectedSections({
  data, destName, destNames, show, heading,
}: {
  data: Data;
  destName: string;
  destNames: Record<number, string>;
  show: SectionKey[];
  heading?: string;
}) {
  const body = show.filter((k) => data[k].length > 0);
  if (!body.length) return null;
  return (
    <section>
      <SmartBadge>{heading ?? `Smart picks for ${destName}`}</SmartBadge>
      {body.map((k) => (
        <div key={k}>
          <SectionHead title={META[k].title(destName)} href={META[k].href} />
          <div className="hscroll">
            {k === "hotels" && data.hotels.map((h, i) => <HotelCard key={h.id} h={h} i={i} dest={destNames[h.destinationId]} />)}
            {k === "attractions" && data.attractions.map((a, i) => <AttractionCard key={a.id} a={a} i={i} dest={destNames[a.destinationId]} />)}
            {(k === "restaurants" || k === "groceries" || k === "shops") &&
              data[k].map((v, i) => <VendorCard key={v.id} v={v} i={i} dest={destNames[v.destinationId]} />)}
            {k === "packages" && data.packages.map((p, i) => <PackageCard key={p.id} p={p} i={i} className="w-[min(18rem,78vw)]" dests={p.destinationIds.map((x) => destNames[x]).join(" · ")} />)}
          </div>
        </div>
      ))}
    </section>
  );
}
