import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, orders, vendors } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { orderEventsFor, syncOrder } from "@/lib/services";
import { PageHeader } from "@/components/PageHeader";
import { OrderTracker } from "@/components/OrderTracker";

export const metadata = { title: "Track order" };
export const dynamic = "force-dynamic";

export default async function OrderPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/auth?next=/orders/${code}`);
  let [o] = await db.select().from(orders).where(eq(orders.code, code)).limit(1);
  if (!o || (o.userId !== user.id && user.role !== "admin")) notFound();
  o = await syncOrder(o);
  const [items, events, [v]] = await Promise.all([
    db.select().from(orderItems).where(eq(orderItems.orderId, o.id)),
    orderEventsFor(o.id),
    db.select().from(vendors).where(eq(vendors.id, o.vendorId)),
  ]);
  return (
    <div className="page">
      <PageHeader title="Order Status" sub={o.code} />
      <OrderTracker initial={{ order: o, items, events, vendor: { name: v.name, slug: v.slug, etaMins: v.etaMins, area: v.area } }} />
    </div>
  );
}
