import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { cartItems, products, vendors } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { CartClient, type CartLine } from "@/components/CartClient";

export const metadata = { title: "Shopping bag" };
export const dynamic = "force-dynamic";

export default async function CartPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth?next=/cart");
  const rows = await db
    .select({ qty: cartItems.qty, p: products, v: vendors })
    .from(cartItems)
    .innerJoin(products, eq(products.id, cartItems.productId))
    .innerJoin(vendors, eq(vendors.id, products.vendorId))
    .where(eq(cartItems.userId, user.id));
  const lines: CartLine[] = rows.map((r) => ({
    productId: r.p.id, name: r.p.name, emoji: r.p.emoji, image: r.p.image, price: r.p.price, mrp: r.p.mrp, unit: r.p.unit, veg: r.p.veg,
    vendorId: r.v.id, vendorName: r.v.name, vendorSlug: r.v.slug, deliveryFee: r.v.deliveryFee, minOrder: r.v.minOrder, etaMins: r.v.etaMins,
  }));
  return (
    <div className="page">
      <PageHeader title="Shopping Bag" sub="Review & checkout" />
      <CartClient lines={lines} address={user.address} />
    </div>
  );
}
