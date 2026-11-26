import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq, inArray } from "drizzle-orm";
import { ChevronRight } from "lucide-react";
import { db } from "@/db";
import { orderItems, orders, vendors } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { syncOrder } from "@/lib/services";
import { inr, timeAgo } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";
import { Empty, StatusPill } from "@/components/ui";

export const metadata = { title: "My orders" };
export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth?next=/orders");
  const raw = await db.select().from(orders).where(eq(orders.userId, user.id)).orderBy(desc(orders.createdAt));
  const list = await Promise.all(raw.map(syncOrder));
  const ids = list.map((o) => o.id);
  const [items, vs] = await Promise.all([
    ids.length ? db.select().from(orderItems).where(inArray(orderItems.orderId, ids)) : [],
    db.select().from(vendors),
  ]);
  return (
    <div className="page">
      <PageHeader title="My orders" sub="Groceries, food & shop orders" />
      {list.length ? (
        <div className="mx-auto grid max-w-3xl gap-3">
          {list.map((o, i) => {
            const its = items.filter((x) => x.orderId === o.id);
            const v = vs.find((x) => x.id === o.vendorId);
            const active = !["delivered", "cancelled"].includes(o.status);
            return (
              <Link key={o.id} href={`/orders/${o.code}`} style={{ "--i": i } as React.CSSProperties} className={`anim-up lift flex items-center gap-4 rounded-[30px] p-4 ${active ? "glass-strong ring-2 ring-brand-400" : "glass"}`}>
                <div className="flex -space-x-3">
                  {its.slice(0, 3).map((it) => <span key={it.id} className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-2xl ring-2 ring-white">{it.emoji}</span>)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 font-bold">{v?.name}</p>
                  <p className="line-clamp-1 text-xs text-ink/55">{its.map((x) => `${x.qty}× ${x.name}`).join(", ")}</p>
                  <p className="mt-1 text-xs text-ink/45">{o.code} · {timeAgo(o.createdAt)}</p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <StatusPill status={o.status} />
                  <p className="font-display font-semibold">{inr(o.total)}</p>
                  {active && <span className="text-[11px] font-bold text-brand-700">Track live →</span>}
                </div>
                <ChevronRight size={16} className="text-ink/30" />
              </Link>
            );
          })}
        </div>
      ) : (
        <Empty emoji="🛵" title="No orders yet" text="Order groceries or momos and track your rider live." href="/grocery" cta="Start shopping" />
      )}
    </div>
  );
}
