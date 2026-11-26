import { and, asc, desc, eq, ilike, sql } from "drizzle-orm";
import { Search } from "lucide-react";
import { db } from "@/db";
import { products, vendors } from "@/db/schema";
import { getDestMap, getLoc } from "@/lib/data";
import { PageHeader } from "@/components/PageHeader";
import { VendorCard } from "@/components/Cards";
import { ProductCard } from "@/components/ProductCard";
import { Chip, Empty, SectionHead } from "@/components/ui";
import { CartBar } from "@/components/CartBar";
import { ExperienceButton } from "@/components/BookingForms";
import { Img } from "@/components/Img";
import { inr } from "@/lib/utils";

type Kind = "grocery" | "restaurant" | "shop";
const COPY: Record<Kind, { title: string; sub: string; path: string; ph: string; vendorsTitle: string }> = {
  grocery: { title: "Grocery & essentials", sub: "Delivered in ~10 minutes", path: "/grocery", ph: "Search milk, apples, rain poncho…", vendorsTitle: "Stores near you" },
  restaurant: { title: "Food", sub: "From local kitchens & cafés", path: "/food", ph: "Search momos, thali, biryani…", vendorsTitle: "Restaurants" },
  shop: { title: "Local shops", sub: "Crafts, tea & experiences", path: "/shops", ph: "Search tea, thangka, workshops…", vendorsTitle: "Shops & studios" },
};

export async function Market({ kind, sp }: { kind: Kind; sp: { cat?: string; q?: string; v?: string } }) {
  const loc = await getLoc();
  const dm = await getDestMap();
  const c = COPY[kind];
  const near = sql`(${vendors.destinationId} = ${loc?.id ?? 0}) desc`;
  const vlist = await db.select().from(vendors).where(eq(vendors.kind, kind)).orderBy(near, desc(vendors.rating));
  const vendor = vlist.find((v) => v.slug === sp.v);

  const conds = [eq(vendors.kind, kind)];
  if (sp.cat) conds.push(eq(products.category, sp.cat));
  if (sp.q) conds.push(ilike(products.name, `%${sp.q.replace(/[%_]/g, "")}%`));
  if (vendor) conds.push(eq(vendors.id, vendor.id));
  const rows = await db
    .select({ p: products, v: vendors })
    .from(products)
    .innerJoin(vendors, eq(vendors.id, products.vendorId))
    .where(and(...conds))
    .orderBy(near, desc(vendors.rating), asc(products.id));
  const catRows = await db.selectDistinct({ c: products.category }).from(products).innerJoin(vendors, eq(vendors.id, products.vendorId)).where(eq(vendors.kind, kind));
  const cats = catRows.map((x) => x.c).sort();

  let items = rows;
  if (!vendor) {
    const seen = new Set<string>();
    items = rows.filter((r) => (seen.has(r.p.name) ? false : seen.add(r.p.name)));
  }
  const exps = items.filter((r) => r.p.isExperience);
  const goods = items.filter((r) => !r.p.isExperience);
  const href = (o: { cat?: string; v?: string; q?: string }) => {
    const p = new URLSearchParams();
    if (o.cat) p.set("cat", o.cat);
    if (o.v) p.set("v", o.v);
    if (o.q) p.set("q", o.q);
    return `${c.path}${p.toString() ? `?${p}` : ""}`;
  };
  const names = Object.fromEntries(dm.list.map((d) => [d.id, d.name]));

  return (
    <div className="page">
      <PageHeader title={c.title} sub={loc ? `${c.sub} · ${loc.name}` : c.sub} />
      <form action={c.path} className="mb-5 flex h-14 items-center gap-3 rounded-full bg-white pl-5 pr-2 shadow-[0_10px_30px_-12px_rgba(124,58,237,0.3)] ring-1 ring-brand-100 focus-within:ring-2 focus-within:ring-brand-400">
        <Search size={18} className="text-ink/50" />
        <input name="q" defaultValue={sp.q} placeholder={c.ph} className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none" />
        {sp.cat && <input type="hidden" name="cat" value={sp.cat} />}
        {sp.v && <input type="hidden" name="v" value={sp.v} />}
        <button className="btn btn-dark btn-sm">Search</button>
      </form>

      <SectionHead title={c.vendorsTitle} sub={loc ? `${loc.name} first` : undefined} />
      <div className="hscroll !pt-0">
        {vlist.map((v, i) => <VendorCard key={v.id} v={v} i={i} dest={names[v.destinationId]} className="w-64" />)}
      </div>

      <div className="hscroll !pb-4 !pt-2">
        <Chip href={href({ v: sp.v, q: sp.q })} on={!sp.cat}>All</Chip>
        {cats.map((x) => <Chip key={x} href={href({ cat: x, v: sp.v, q: sp.q })} on={sp.cat === x}>{x}</Chip>)}
      </div>
      {vendor && (
        <div className="mb-4 flex items-center justify-between rounded-3xl bg-brand-100 px-4 py-3 text-sm font-semibold">
          Showing items from {vendor.name}
          <a href={href({ cat: sp.cat, q: sp.q })} className="text-brand-700 underline">Clear</a>
        </div>
      )}

      {exps.length > 0 && (
        <>
          <h2 className="font-display mb-3 text-xl font-semibold">Experiences you can book</h2>
          <div className="mb-6 grid gap-3 sm:grid-cols-2">
            {exps.map(({ p, v }, i) => (
              <div key={p.id} style={{ "--i": i } as React.CSSProperties} className="anim-up glass-strong flex items-center gap-3 rounded-[28px] p-2.5">
                <Img src={p.image || v.image} alt={p.name} className="h-20 w-20 shrink-0 rounded-2xl object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase text-brand-700">{v.name}</p>
                  <p className="line-clamp-1 font-bold">{p.emoji} {p.name}</p>
                  <p className="text-sm font-semibold">{inr(p.price)} <span className="text-xs font-normal text-ink/50">{p.unit}</span></p>
                </div>
                <ExperienceButton exp={{ id: p.id, name: p.name, price: p.price, unit: p.unit }} vendor={v.name} />
              </div>
            ))}
          </div>
        </>
      )}

      {goods.length ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {goods.map(({ p, v }, i) => <ProductCard key={p.id} p={p} i={i} vendor={v.name} />)}
        </div>
      ) : exps.length ? null : (
        <Empty title="Nothing found" text="Try another search or category." href={c.path} cta="Clear filters" />
      )}
      <CartBar />
    </div>
  );
}
