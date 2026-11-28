import { eq } from "drizzle-orm";
import { db } from "@/db";
import { bookings } from "@/db/schema";
import { body, fail, ok, needUser } from "@/lib/api";
import { refundOriginalPayment } from "@/lib/payments";
import { notify } from "@/lib/services";
import { todayISO } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const u = await needUser();
  if (!u) return fail("Please sign in", 401);
  const { code } = await ctx.params;
  const b = await body<{ action?: string }>(req);
  const [bk] = await db.select().from(bookings).where(eq(bookings.code, code)).limit(1);
  if (!bk || bk.userId !== u.id) return fail("Booking not found", 404);
  if (b.action !== "cancel") return fail("Unknown action");
  if (!["requested", "confirmed"].includes(bk.status)) return fail("This booking cannot be cancelled");
  if (bk.startDate < todayISO()) return fail("Past bookings cannot be cancelled");
  const daysLeft = Math.round((new Date(bk.startDate).getTime() - new Date(todayISO()).getTime()) / 86400000);
  const pct = bk.type === "cab" ? 1 : daysLeft >= 2 ? 1 : 0.5;
  const refund = bk.paymentStatus === "paid" ? Math.round(bk.amount * pct) : 0;
  await db.update(bookings).set({ status: "cancelled", paymentStatus: refund ? "refunded" : bk.paymentStatus }).where(eq(bookings.id, bk.id));
  if (refund) await refundOriginalPayment(u.id, refund, bk.code, bk.paymentMethod);
  await notify(u.id, `Booking ${bk.code} cancelled`, refund ? `₹${refund} refund issued to your original payment method (${pct * 100}%).` : "No payment was taken.", "booking", `/bookings/${bk.code}`);
  return ok({ refund });
}
