import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { Bike, MapPin, Timer, Wallet } from "lucide-react";
import { db } from "@/db";
import { products, vendors } from "@/db/schema";
import { getConnected, getDestMap } from "@/lib/data";
import { inr } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";
import { Fact, Hero } from "@/components/Hero";
import { ProductCard } from "@/components/ProductCard";
import { CartBar } from "@/components/CartBar";
import { ConnectedSections, type SectionKey } from "@/components/Connected";
import { ExperienceButton } from "@/components/BookingForms";
import { Img } from "@/components/Img";

export const dynamic = "force-dynamic";

export default async function StorePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [v] = await db.select().from(vendors).where(eq(vendors.slug, slug)).limit(1);
  if (!v) notFound();
  const dm = await getDestMap();
  const dest = dm.byId[v.destinationId];
  const names = Object.fromEntries(dm.list.map((x) => [x.id, x.name]));
  const [items, data] = await Promise.all([
    db.select().from(products).where(eq(products.vendorId, v.id)).orderBy(asc(products.id)),
    getConnected([v.destinationId], 6),
  ]);
  data.restaurants = data.restaurants.filter((x) => x.id !== v.id);
  data.groceries = data.groceries.filter((x) => x.id !== v.id);
  data.shops = data.shops.filter((x) => x.id !== v.id);
  const goods = items.filter((p) => !p.isExperience);
  const exps = items.filter((p) => p.isExperience);
  const cats = [...new Set(goods.map((p) => p.category))];
  const show: SectionKey[] = v.kind === "restaurant" ? ["groceries", "attractions", "hotels", "restaurants"] : v.kind === "grocery" ? ["restaurants", "shops", "attractions", "hotels"] : ["restaurants", "attractions", "hotels", "shops"];

  return (
    <div className="page">
      <PageHeader title={v.name} sub={`${v.area}, ${dest?.name}`} />
      <Hero image={v.image} title={v.name} eyebrow={v.kind === "restaurant" ? "Restaurant" : v.kind === "grocery" ? "Grocery store" : "Local shop"} fav={{ kind: "vendor", id: v.id }}
        badges={v.cuisines.map((c) => <span key={c} className="glass-tint rounded-full px-3 py-1.5 text-[11px] font-bold text-white">{c}</span>)}>
        <p className="mt-1 max-w-xl text-sm text-white/80">{v.description}</p>
      </Hero>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Fact icon={<Timer size={18} />} label="Delivery" value={`~${v.etaMins} min`} />
        <Fact icon={<Bike size={18} />} label="Delivery fee" value={v.deliveryFee ? `${inr(v.deliveryFee)} (free ≥ ₹499)` : "Free"} />
        <Fact icon={<Wallet size={18} />} label="Minimum order" value={v.minOrder ? inr(v.minOrder) : "None"} />
        <Fact icon={<MapPin size={18} />} label="Area" value={`${v.area}, ${dest?.name}`} />
      </div>

      {exps.length > 0 && (
        <>
          <h2 className="font-display mb-3 mt-8 text-2xl font-semibold">Book an experience</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {exps.map((p, i) => (
              <div key={p.id} style={{ "--i": i } as React.CSSProperties} className="anim-up glass-strong flex items-center gap-3 rounded-[28px] p-2.5">
                <Img src={p.image || v.image} alt={p.name} className="h-20 w-20 shrink-0 rounded-2xl object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 font-bold">{p.emoji} {p.name}</p>
                  <p className="line-clamp-1 text-xs text-ink/55">{p.description}</p>
                  <p className="text-sm font-semibold">{inr(p.price)} <span className="text-xs font-normal text-ink/50">{p.unit}</span></p>
                </div>
                <ExperienceButton exp={{ id: p.id, name: p.name, price: p.price, unit: p.unit }} vendor={v.name} />
              </div>
            ))}
          </div>
        </>
      )}

      {cats.map((c) => (
        <section key={c}>
          <h2 className="font-display mb-3 mt-8 text-2xl font-semibold">{c}</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {goods.filter((p) => p.category === c).map((p, i) => <ProductCard key={p.id} p={p} i={i} />)}
          </div>
        </section>
      ))}

      <ConnectedSections data={data} destName={dest?.name ?? ""} destNames={names} show={show} heading={`More around ${v.area}`} />
      <CartBar />
    </div>
  );
}
