import Link from "next/link";
import { ArrowRight, BedDouble, CarTaxiFront, Route } from "lucide-react";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { attractions, hotels, packages, products, vendors } from "@/db/schema";
import { getDestMap, getLoc } from "@/lib/data";
import { Logo } from "@/components/Logo";
import { SearchBox } from "@/components/SearchBox";
import { LocationPicker, ProfileButton } from "@/components/Nav";
import { CategoryRail } from "@/components/CategoryRail";
import { AttractionCard, DestinationCard, HotelCard, PackageCard, VendorCard } from "@/components/Cards";
import { ProductCard } from "@/components/ProductCard";
import { SectionHead } from "@/components/ui";
import { Img } from "@/components/Img";
import { inr } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [loc, dm] = await Promise.all([getLoc(), getDestMap()]);
  const near = (destCol: typeof vendors.destinationId) => sql`(${destCol} = ${loc?.id ?? 0}) desc`;

  const [pkgs, groceryRows, restaurants, stays, shops, attrs] = await Promise.all([
    db.select().from(packages).where(eq(packages.featured, true)).orderBy(desc(packages.rating)).limit(6),
    db
      .select({ p: products, v: vendors })
      .from(products)
      .innerJoin(vendors, eq(vendors.id, products.vendorId))
      .where(and(eq(vendors.kind, "grocery"), eq(products.available, true)))
      .orderBy(near(vendors.destinationId), desc(products.tag), desc(vendors.rating))
      .limit(60),
    db.select().from(vendors).where(eq(vendors.kind, "restaurant")).orderBy(near(vendors.destinationId), desc(vendors.rating)).limit(6),
    db.select().from(hotels).orderBy(sql`(${hotels.destinationId} = ${loc?.id ?? 0}) desc`, desc(hotels.rating)).limit(6),
    db.select().from(vendors).where(eq(vendors.kind, "shop")).orderBy(near(vendors.destinationId), desc(vendors.rating)).limit(6),
    db.select().from(attractions).orderBy(sql`(${attractions.destinationId} = ${loc?.id ?? 0}) desc`, desc(attractions.rating)).limit(6),
  ]);
  const seen = new Set<string>();
  const groceries = groceryRows.filter((r) => (seen.has(r.p.name) ? false : seen.add(r.p.name))).slice(0, 10);
  const names = Object.fromEntries(dm.list.map((d) => [d.id, d.name]));
  const hero = pkgs[0];
  const featuredDests = dm.list.filter((d) => d.slug !== "siliguri");

  return (
    <div className="page">
      {/* mobile header: wordmark · location · profile */}
      <header className="mb-4 flex items-center justify-between gap-3 lg:hidden">
        <Link href="/" aria-label="gowayy home" className="shrink-0 py-1">
          <Logo size={30} />
        </Link>
        <div className="flex min-w-0 items-center gap-2">
          <LocationPicker compact />
          <ProfileButton size={44} />
        </div>
      </header>

      <div className="anim-up">
        <SearchBox big placeholder="Search stays, food, tours…" />
      </div>

      <CategoryRail className="mt-5" />

      {hero && (
        <Link href={`/tours/${hero.slug}`} className="anim-up group lift zoom relative mt-5 block h-48 overflow-hidden rounded-[30px] sm:h-60 lg:h-72" style={{ "--i": 2 } as React.CSSProperties}>
          <Img src={hero.image} alt={hero.name} className="absolute inset-0 h-full w-full object-cover" eager />
          <div className="absolute inset-0 bg-gradient-to-t from-[#14082e]/90 via-[#14082e]/35 to-transparent" />
          <span className="glass-tint absolute left-4 top-4 rounded-full px-3 py-1.5 text-[11px] font-bold text-white">Trip of the week</span>
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 text-white sm:p-6">
            <div className="min-w-0">
              <p className="text-xs text-white/75">{hero.days} days · {hero.theme}</p>
              <h2 className="font-display line-clamp-2 text-2xl font-semibold leading-[1.05] sm:text-3xl">{hero.name}</h2>
              <p className="mt-1 text-sm font-semibold text-white/90">from {inr(hero.price)} /person</p>
            </div>
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-white px-4 py-2.5 text-xs font-bold text-ink transition group-hover:gap-2">
              View trip <ArrowRight size={14} />
            </span>
          </div>
        </Link>
      )}

      <SectionHead title="Explore destinations" href="/explore" />
      <div className="hscroll">
        {featuredDests.map((d, i) => <DestinationCard key={d.id} d={d} i={i} />)}
      </div>

      <SectionHead title="Fresh for you, every day" href="/grocery" />
      <div className="hscroll">
        {groceries.map((g, i) => (
          <div key={g.p.id} className="w-44"><ProductCard p={g.p} i={i} vendor={g.v.name} /></div>
        ))}
      </div>

      <SectionHead title="Hungry? Order local" href="/food" />
      <div className="hscroll">{restaurants.map((v, i) => <VendorCard key={v.id} v={v} i={i} dest={names[v.destinationId]} />)}</div>

      <SectionHead title="Curated tour packages" href="/tours" />
      <div className="hscroll">{pkgs.map((p, i) => <PackageCard key={p.id} p={p} i={i} dests={p.destinationIds.map((x) => names[x]).join(" · ")} />)}</div>

      <SectionHead title="Top stays" href="/hotels" />
      <div className="hscroll">{stays.map((h, i) => <HotelCard key={h.id} h={h} i={i} dest={names[h.destinationId]} />)}</div>

      <SectionHead title="Don't-miss attractions" href="/explore" />
      <div className="hscroll">{attrs.map((a, i) => <AttractionCard key={a.id} a={a} i={i} dest={names[a.destinationId]} />)}</div>

      <SectionHead title="Local shops & experiences" href="/shops" />
      <div className="hscroll">{shops.map((v, i) => <VendorCard key={v.id} v={v} i={i} dest={names[v.destinationId]} />)}</div>

      {/* connected booking flow */}
      <section className="glass-strong mt-10 rounded-[36px] p-5 sm:p-8">
        <h2 className="font-display max-w-xl text-2xl font-semibold leading-tight sm:text-3xl">Book one thing. We line up the rest.</h2>
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { icon: Route, t: "Book a tour", s: "Matching stays, cabs & sights", href: "/tours" },
            { icon: CarTaxiFront, t: "Hop in a cab", s: "Food & shops around your drop", href: "/cabs" },
            { icon: BedDouble, t: "Reserve a stay", s: "Add transfers & sightseeing", href: "/hotels" },
          ].map((c, i) => (
            <Link key={c.t} href={c.href} style={{ "--i": i } as React.CSSProperties} className="anim-up lift group flex items-center gap-3 rounded-[24px] bg-gradient-to-br from-brand-50 to-white p-4 ring-1 ring-brand-100">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-600 text-white"><c.icon size={20} /></span>
              <span className="min-w-0 flex-1">
                <span className="font-display block text-lg font-semibold leading-tight">{c.t}</span>
                <span className="block text-xs text-ink/60">{c.s}</span>
              </span>
              <ArrowRight size={16} className="shrink-0 text-brand-600 transition group-hover:translate-x-0.5" />
            </Link>
          ))}
        </div>
      </section>

      <footer className="mt-12 flex flex-col items-center gap-3 pb-4 text-center">
        <Logo size={30} />
        <p className="text-xs text-ink/50">Made in the hills · Darjeeling · Kalimpong · Sikkim</p>
      </footer>
    </div>
  );
}
