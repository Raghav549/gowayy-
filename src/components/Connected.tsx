import { Sparkles } from "lucide-react";
import { AttractionCard, HotelCard, PackageCard, VendorCard } from "@/components/Cards";
import { SectionHead } from "@/components/ui";
import type { getConnected } from "@/lib/data";

type Data = Awaited<ReturnType<typeof getConnected>>;
export type SectionKey = "hotels" | "attractions" | "restaurants" | "groceries" | "shops" | "packages";

const META: Record<SectionKey, { title: (p: string) => string; sub: string; href: string }> = {
  hotels: { title: (p) => `Stay near ${p}`, sub: "Hand-picked hotels & homestays", href: "/hotels" },
  attractions: { title: (p) => `Things to do in ${p}`, sub: "Sightseeing & experiences nearby", href: "/explore" },
  restaurants: { title: (p) => `Eat around ${p}`, sub: "Local kitchens delivering to you", href: "/food" },
  groceries: { title: (p) => `Groceries in ${p}`, sub: "Stock up in minutes", href: "/grocery" },
  shops: { title: (p) => `Local shops in ${p}`, sub: "Crafts, tea & experiences", href: "/shops" },
  packages: { title: (p) => `Tour packages via ${p}`, sub: "Curated multi-day trips", href: "/tours" },
};

export function SmartBadge({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-1 mt-9 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-brand-600 to-fuchsia-500 px-3 py-1.5 text-[11px] font-bold text-white shadow-lg shadow-brand-600/30">
      <Sparkles size={13} /> {children}
    </div>
  );
}

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
          <SectionHead title={META[k].title(destName)} sub={META[k].sub} href={META[k].href} />
          <div className="hscroll">
            {k === "hotels" && data.hotels.map((h, i) => <HotelCard key={h.id} h={h} i={i} dest={destNames[h.destinationId]} />)}
            {k === "attractions" && data.attractions.map((a, i) => <AttractionCard key={a.id} a={a} i={i} dest={destNames[a.destinationId]} />)}
            {(k === "restaurants" || k === "groceries" || k === "shops") &&
              data[k].map((v, i) => <VendorCard key={v.id} v={v} i={i} dest={destNames[v.destinationId]} />)}
            {k === "packages" && data.packages.map((p, i) => <PackageCard key={p.id} p={p} i={i} className="w-72" dests={p.destinationIds.map((x) => destNames[x]).join(" · ")} />)}
          </div>
        </div>
      ))}
    </section>
  );
}
