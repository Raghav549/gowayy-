import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import { Search } from "lucide-react";
import { db } from "@/db";
import { products, vendors } from "@/db/schema";
import { getDestMap, getLoc } from "@/lib/data";
import { PageHeader } from "@/components/PageHeader";
import { VendorCard } from "@/components/Cards";
import { ProductCard } from "@/components/ProductCard";
import { Chip, Empty, ListingSearch, NearYouNote, SectionHead } from "@/components/ui";
import { LocationPicker } from "@/components/Nav";
import { CartBar } from "@/components/CartBar";
import { ExperienceButton } from "@/components/BookingForms";
import { Img } from "@/components/Img";
import { inr } from "@/lib/utils";

type Kind = "grocery" | "restaurant" | "shop";
const COPY: Record<Kind, { title: string; sub: string; path: string; ph: string; vendorsTitle: string; noun: string; recTitle: string }> = {
  grocery: { title: "Grocery & essentials", sub: "Delivered in ~10 minutes", path: "/grocery", ph: "Search milk, apples, rain poncho…", vendorsTitle: "All stores", noun: "stores", recTitle: "Recommended for you" },
  restaurant: { title: "Food", sub: "From local kitchens & cafés", path: "/food", ph: "Search momos, thali, biryani…", vendorsTitle: "All restaurants", noun: "restaurants", recTitle: "Popular dishes" },
  shop: { title: "Local shops", sub: "Crafts, tea & experiences", path: "/shops", ph: "Search tea, thangka, workshops…", vendorsTitle: "All shops & studios", noun: "shops", recTitle: "Local favourites" },
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
  const q = (sp.q ?? "").trim().slice(0, 80);
  if (q) {
    const like = `%${q.replace(/[%_\\]/g, "")}%`;
    conds.push(or(ilike(products.name, like), ilike(products.category, like), ilike(products.description, like), ilike(vendors.name, like))!);
  }
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
  const filtered = !!(q || sp.cat || vendor);
  const nearVendors = loc ? vlist.filter((v) => v.destinationId === loc.id) : [];
  const recommended = filtered
    ? []
    : [...items]
        .filter((r) => r.p.available && !r.p.isExperience)
        .sort((a, b) => Number(!!b.p.tag) - Number(!!a.p.tag) || Number(b.v.destinationId === loc?.id) - Number(a.v.destinationId === loc?.id) || b.v.rating - a.v.rating)
        .slice(0, 10);
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
      <ListingSearch action={c.path} q={q} placeholder={c.ph} hidden={{ cat: sp.cat, v: sp.v }} />

      {/* filters */}
      <div className="hscroll !pb-3 !pt-0" aria-label="Filter by category">
        <Chip href={href({ v: sp.v, q })} on={!sp.cat}>All</Chip>
        {cats.map((x) => <Chip key={x} href={href({ cat: x, v: sp.v, q })} on={sp.cat === x}>{x}</Chip>)}
      </div>
      {vendor && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-3xl bg-brand-100 px-4 py-3 text-sm font-semibold">
          <span className="min-w-0">Showing items from {vendor.name}</span>
          <a href={href({ cat: sp.cat, q })} className="shrink-0 text-brand-700 underline">Clear</a>
        </div>
      )}

      {!filtered && (
        <>
          <SectionHead title="Near you" />
          {!loc ? (
            <NearYouNote action={<LocationPicker light compact />}>Choose your area to see {c.noun} near you.</NearYouNote>
          ) : nearVendors.length ? (
            <div className="hscroll !pt-0">
              {nearVendors.map((v, i) => <VendorCard key={v.id} v={v} i={i} dest={names[v.destinationId]} />)}
            </div>
          ) : (
            <NearYouNote action={<LocationPicker light compact />}>No {c.noun} in {loc.name} yet — browse all {c.noun} below.</NearYouNote>
          )}

          {recommended.length > 0 && (
            <>
              <SectionHead title={c.recTitle} />
              <div className="hscroll !pt-0">
                {recommended.map(({ p, v }, i) => (
                  <div key={p.id} className="w-[min(11rem,44vw)]"><ProductCard p={p} i={i} vendor={v.name} /></div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {exps.length > 0 && (
        <>
          <h2 className="font-display mb-3 mt-6 text-xl font-semibold">Experiences you can book</h2>
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {exps.map(({ p, v }, i) => (
              <div key={p.id} style={{ "--i": i } as React.CSSProperties} className="anim-up glass-strong flex items-center gap-3 rounded-[28px] p-2.5">
                <Img src={p.image || v.image} alt={p.name} className="h-16 w-16 shrink-0 rounded-2xl object-cover sm:h-20 sm:w-20" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[10px] font-bold uppercase text-brand-700">{v.name}</p>
                  <p className="line-clamp-2 font-bold leading-snug">{p.name}</p>
                  <p className="text-sm font-semibold">{inr(p.price)} <span className="text-xs font-normal text-ink/50">{p.unit}</span></p>
                </div>
                <ExperienceButton exp={{ id: p.id, name: p.name, price: p.price, unit: p.unit }} vendor={v.name} />
              </div>
            ))}
          </div>
        </>
      )}

      <div className="mb-3 mt-8 flex items-end justify-between gap-3">
        <h2 className="font-display min-w-0 text-[1.45rem] font-semibold leading-tight">{q ? `Results for “${q}”` : sp.cat ?? (kind === "restaurant" ? "Full menu" : "All items")}</h2>
        {goods.length > 0 && <span className="shrink-0 text-xs font-semibold text-ink/50">{goods.length} item{goods.length === 1 ? "" : "s"}</span>}
      </div>
      {goods.length ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {goods.map(({ p, v }, i) => <ProductCard key={p.id} p={p} i={i} vendor={v.name} />)}
        </div>
      ) : exps.length ? null : (
        <Empty icon={Search} title="Nothing found" text="Try another search or category." href={c.path} cta="Clear filters" />
      )}

      <SectionHead title={c.vendorsTitle} />
      <div className="hscroll !pt-0">
        {vlist.map((v, i) => <VendorCard key={v.id} v={v} i={i} dest={names[v.destinationId]} />)}
      </div>
      <CartBar />
    </div>
  );
}
