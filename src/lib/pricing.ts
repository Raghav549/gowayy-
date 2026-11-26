export type CouponLite = {
  code: string;
  description: string;
  percent: number;
  flat: number;
  minAmount: number;
  maxDiscount: number;
  scope: string;
};

export const TAX = { hotel: 0.12, package: 0.05, cab: 0.05, experience: 0.05 } as const;
export const FREE_DELIVERY_ABOVE = 499;

export function couponDiscount(c: CouponLite, amount: number, scope: "order" | "booking") {
  if (c.scope !== "all" && c.scope !== scope) return { ok: false as const, error: `This code works on ${c.scope}s only`, discount: 0 };
  if (amount < c.minAmount) return { ok: false as const, error: `Add ₹${c.minAmount - amount} more to use ${c.code}`, discount: 0 };
  let d = c.flat;
  if (c.percent) {
    d = Math.round((amount * c.percent) / 100);
    if (c.maxDiscount) d = Math.min(d, c.maxDiscount);
  }
  return { ok: true as const, discount: Math.min(d, amount) };
}

export function cabFare(cab: { baseFare: number; perKm: number }, km: number, roundTrip: boolean) {
  const one = Math.max(Math.round(cab.baseFare + cab.perKm * km), Math.round(cab.baseFare * 1.5));
  return roundTrip ? Math.round(one * 1.8) : one;
}

export function withTax(subtotal: number, rate: number, discount: number) {
  const tax = Math.round((subtotal - discount) * rate);
  return { tax, total: subtotal - discount + tax };
}
