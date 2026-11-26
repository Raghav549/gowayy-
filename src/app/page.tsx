import Link from "next/link";
import { Bell, Bike, Compass, CarTaxiFront, Gift, Route, Sparkles, Ticket } from "lucide-react";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { attractions, hotels, packages, products, vendors } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getDestMap, getLoc } from "@/lib/data";
import { Logo } from "@/components/Logo";
import { SearchBox } from "@/components/SearchBox";
import { LocationPicker } from "@/components/Nav";
import { SERVICES } from "@/components/nav-data";
import { AttractionCard, DestinationCard, HotelCard, PackageCard, VendorCard } from "@/components/Cards";
import { ProductCard } from "@/components/ProductCard";
import { SectionHead } from "@/components/ui";
import { Img } from "@/components/Img";
import { inr } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [user, loc, dm] = await Promise.all([getCurrentUser(), getLoc(), getDestMap()]);
  const first = (user?.name ?? "").split(" ")[0];
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
      {/* mobile header */}
      <div className="mb-6 flex items-center justify-between lg:hidden">
        <div className="glass flex items-center gap-1.5 rounded-[22px] p-1.5">
          <Link href={user ? "/profile" : "/auth"} className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-700 text-lg font-bold text-white">
            {user ? user.name[0].toUpperCase() : <Logo size={28} className="[&>span:last-child]:hidden" />}
          </Link>
          <Link href="/bookings" aria-label="My trips" className="grid h-12 w-12 place-items-center rounded-2xl bg-white">
            <Compass size={20} />
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <LocationPicker />
          <Link href="/notifications" aria-label="Notifications" className="glass grid h-12 w-12 place-items-center rounded-2xl">
            <Bell size={19} />
          </Link>
        </div>
      </div>

      <div className="grid items-end gap-8 lg:grid-cols-[1.1fr_1fr]">
        <div className="anim-up">
          <p className="mb-2 text-sm font-semibold text-brand-700">{first ? `Hi ${first} 👋` : "Welcome to gowayy 👋"}</p>
          <h1 className="font-display text-[3rem] font-semibold leading-[0.98] sm:text-6xl">
            Discover
            <br />
            <span className="text-ink/40">Your Himalayas.</span>
          </h1>
          <p className="mt-4 max-w-md text-sm text-ink/60">
            Tours, stays, cabs, groceries, food and local shops across Darjeeling, Kalimpong & beyond — one connected app.
          </p>
          <div className="mt-6 max-w-xl">
            <SearchBox big />
          </div>
        </div>

        {hero && (
          <Link href={`/tours/${hero.slug}`} className="anim-up group lift zoom relative block h-72 overflow-hidden rounded-[36px] sm:h-80" style={{ "--i": 2 } as React.CSSProperties}>
            <Img src={hero.image} alt={hero.name} className="absolute inset-0 h-full w-full object-cover" eager />
            <div className="absolute inset-0 bg-gradient-to-t from-[#14082e]/90 via-[#14082e]/30 to-transparent" />
            <span className="glass-tint absolute left-4 top-4 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold text-white">
              <Sparkles size={13} /> Trip of the week
            </span>
            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-5 text-white">
              <div>
                <p className="text-xs text-white/70">{hero.days} days · {hero.theme}</p>
                <h3 className="font-display text-3xl font-semibold leading-none">{hero.name}</h3>
                <p className="mt-1.5 text-sm text-white/80">from {inr(hero.price)} /person</p>
              </div>
              <span className="rounded-full bg-white px-4 py-2.5 text-xs font-bold text-ink">Shop now</span>
            </div>
          </Link>
        )}
      </div>

      {/* services */}
      <div className="mt-8 grid grid-cols-3 gap-3 sm:grid-cols-6">
        {SERVICES.map((s, i) => (
          <Link key={s.href} href={s.href} style={{ "--i": i + 2 } as React.CSSProperties} className={`anim-pop lift group flex flex-col items-center gap-2.5 rounded-[28px] bg-gradient-to-b ${s.bg} p-4 text-center ring-1 ring-white/70`}>
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/80 shadow-sm transition group-hover:scale-110 group-hover:-rotate-6">
              <s.icon size={24} className={s.fg} />
            </span>
            <span className="text-sm font-bold leading-none">{s.label}</span>
            <span className="-mt-1.5 hidden text-[10px] text-ink/55 sm:block">{s.sub}</span>
          </Link>
        ))}
      </div>

      {/* promo strip */}
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {[
          { icon: Bike, t: "Groceries in ~10 min", s: "Free delivery above ₹499", href: "/grocery" },
          { icon: Ticket, t: "WELCOME100", s: "₹100 off your first order", href: "/food" },
          { icon: Gift, t: "HILLS10", s: "10% off stays & tours", href: "/tours" },
        ].map((p) => (
          <Link key={p.t} href={p.href} className="glass lift flex items-center gap-3 rounded-3xl p-3.5">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-600 text-white"><p.icon size={20} /></span>
            <div>
              <p className="text-sm font-bold">{p.t}</p>
              <p className="text-xs text-ink/55">{p.s}</p>
            </div>
          </Link>
        ))}
      </div>

      <SectionHead title="Explore destinations" sub={loc ? `Showing ${loc.name} first` : "Hills, valleys & ridgelines"} href="/explore" />
      <div className="hscroll">
        {featuredDests.map((d, i) => <DestinationCard key={d.id} d={d} i={i} />)}
      </div>

      <SectionHead title="Fresh for you, every day" sub="Hill-fresh groceries & daily essentials" href="/grocery" />
      <div className="hscroll">
        {groceries.map((g, i) => (
          <div key={g.p.id} className="w-44"><ProductCard p={g.p} i={i} vendor={g.v.name} /></div>
        ))}
      </div>

      <SectionHead title="Hungry? Order local" sub="Momos, thalis, cafés & more" href="/food" />
      <div className="hscroll">{restaurants.map((v, i) => <VendorCard key={v.id} v={v} i={i} dest={names[v.destinationId]} />)}</div>

      <SectionHead title="Curated tour packages" sub="Everything arranged, end to end" href="/tours" />
      <div className="hscroll">{pkgs.map((p, i) => <PackageCard key={p.id} p={p} i={i} dests={p.destinationIds.map((x) => names[x]).join(" · ")} />)}</div>

      <SectionHead title="Top stays" sub="Hotels, homestays & tea villas" href="/hotels" />
      <div className="hscroll">{stays.map((h, i) => <HotelCard key={h.id} h={h} i={i} dest={names[h.destinationId]} />)}</div>

      <SectionHead title="Don't-miss attractions" sub="Sunrise points, monasteries, toy trains" href="/explore" />
      <div className="hscroll">{attrs.map((a, i) => <AttractionCard key={a.id} a={a} i={i} dest={names[a.destinationId]} />)}</div>

      <SectionHead title="Local shops & experiences" sub="Tea tastings, crafts and workshops" href="/shops" />
      <div className="hscroll">{shops.map((v, i) => <VendorCard key={v.id} v={v} i={i} dest={names[v.destinationId]} />)}</div>

      {/* connected ecosystem */}
      <section className="glass-strong mt-10 overflow-hidden rounded-[40px] p-6 sm:p-9">
        <div className="flex items-center gap-2 text-xs font-bold text-brand-700"><Sparkles size={15} /> THE GOWAYY ECOSYSTEM</div>
        <h2 className="font-display mt-2 max-w-xl text-3xl font-semibold leading-tight sm:text-4xl">Book one thing. We line up the rest.</h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            { icon: Route, t: "Book a tour", s: "Get matching hotels, airport cabs and nearby attractions in the same flow.", href: "/tours" },
            { icon: CarTaxiFront, t: "Hop in a cab", s: "See restaurants, grocers and shops around your drop-off before you arrive.", href: "/cabs" },
            { icon: Compass, t: "Reserve a stay", s: "Add sightseeing, transfers and local food recommendations in one tap.", href: "/hotels" },
          ].map((c, i) => (
            <Link key={c.t} href={c.href} style={{ "--i": i } as React.CSSProperties} className="anim-up lift rounded-[28px] bg-gradient-to-br from-brand-50 to-white p-5 ring-1 ring-brand-100">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-600 text-white"><c.icon size={20} /></span>
              <h3 className="font-display mt-4 text-xl font-semibold">{c.t}</h3>
              <p className="mt-1 text-sm text-ink/60">{c.s}</p>
            </Link>
          ))}
        </div>
      </section>

      <footer className="mt-12 flex flex-col items-center gap-3 pb-4 text-center">
        <Logo size={34} />
        <p className="text-xs text-ink/50">Made in the hills · Darjeeling · Kalimpong · Sikkim</p>
      </footer>
    </div>
  );
}
