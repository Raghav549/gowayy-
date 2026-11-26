import Link from "next/link";
import { ArrowRight, BadgePercent } from "lucide-react";
import { and, desc, eq, gt, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { coupons, products, vendors } from "@/db/schema";
import { getLoc } from "@/lib/data";
import { couponHeadline, couponTerms, couponUse } from "@/lib/offers";
import { PageHeader } from "@/components/PageHeader";
import { ProductCard } from "@/components/ProductCard";
import { CartBar } from "@/components/CartBar";
import { CopyCode } from "@/components/CopyCode";
import { Chip, Empty, SectionHead } from "@/components/ui";

export const metadata = { title: "Best offers" };
export const dynamic = "force-dynamic";

const KINDS = [
  { id: "", label: "Everything" },
  { id: "grocery", label: "Grocery" },
  { id: "restaurant", label: "Food" },
  { id: "shop", label: "Local shops" },
] as const;

export default async function OffersPage({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const sp = await searchParams;
  const kind = KINDS.find((k) => k.id && k.id === sp.kind)?.id;
  const loc = await getLoc();
  const pct = sql<number>`round((${products.mrp} - ${products.price}) * 100.0 / ${products.mrp})`;

  const [cs, rows] = await Promise.all([
    db.select().from(coupons).orderBy(desc(coupons.flat), desc(coupons.percent)),
    db
      .select({ p: products, v: vendors, pct })
      .from(products)
      .innerJoin(vendors, eq(vendors.id, products.vendorId))
      .where(
        and(
          eq(products.available, true),
          eq(products.isExperience, false),
          gt(products.mrp, products.price),
          kind ? eq(vendors.kind, kind) : inArray(vendors.kind, ["grocery", "restaurant", "shop"]),
        ),
      )
      .orderBy(desc(pct), sql`(${vendors.destinationId} = ${loc?.id ?? 0}) desc`, desc(vendors.rating))
      .limit(200),
  ]);

  // one card per product name: the best deal (rows are already sorted best-first)
  const seen = new Set<string>();
  const deals = rows.filter((r) => (seen.has(r.p.name) ? false : seen.add(r.p.name))).slice(0, 30);

  return (
    <div className="page">
      <PageHeader title="Best offers" sub={loc ? `Coupons & price drops · ${loc.name}` : "Coupons & the biggest price drops"} />

      <SectionHead title="Coupon codes" sub="Copy a code and apply it in your bag or at booking" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cs.map((c, i) => {
          const use = couponUse(c);
          return (
            <div key={c.code} style={{ "--i": i } as React.CSSProperties} className="anim-up glass-strong flex flex-col gap-3 rounded-[28px] p-4">
              <div className="flex items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-md shadow-brand-600/30">
                  <BadgePercent size={20} />
                </span>
                <div className="min-w-0">
                  <p className="font-display break-words text-lg font-semibold leading-tight">{couponHeadline(c)}</p>
                  <p className="mt-0.5 break-words text-xs text-ink/60">{couponTerms(c) || c.description}</p>
                </div>
              </div>
              <div className="mt-auto flex flex-wrap items-center justify-between gap-2">
                <CopyCode code={c.code} />
                <Link href={use.href} className="flex min-w-0 items-center gap-1 text-xs font-bold text-brand-700">
                  <span className="truncate">{use.label}</span> <ArrowRight size={13} className="shrink-0" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      <SectionHead title="Biggest price drops" sub="Sorted by discount, best first" />
      <div className="hscroll !pb-3 !pt-0" aria-label="Filter offers">
        {KINDS.map((k) => (
          <Chip key={k.id || "all"} href={k.id ? `/offers?kind=${k.id}` : "/offers"} on={(kind ?? "") === k.id}>
            {k.label}
          </Chip>
        ))}
      </div>
      {deals.length ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {deals.map(({ p, v }, i) => <ProductCard key={p.id} p={p} i={i} vendor={v.name} />)}
        </div>
      ) : (
        <Empty icon={BadgePercent} title="No price drops right now" text="New deals land every day — check back soon." href="/" cta="Back home" />
      )}
      <CartBar />
    </div>
  );
}
