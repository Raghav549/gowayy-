import { eq, ilike, inArray } from "drizzle-orm";
import { db } from "@/db";
import { bookings, cabTypes, coupons, hotels, locations, packages, products, vendors } from "@/db/schema";
import { body, fail, ok, needUser } from "@/lib/api";
import { photo } from "@/lib/photos";
import { pick } from "@/lib/images";
import { charge, refundToWallet, type PayInput } from "@/lib/payments";
import { cabFare, couponDiscount, TAX, withTax } from "@/lib/pricing";
import { notify } from "@/lib/services";
import { hillMinutes, makeCode, nightsBetween, roadKm, todayISO } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Draft = {
  type: string; refId: number; title: string; subtitle: string; image: string; destinationId: number;
  startDate: string; endDate: string; guests: number; subtotal: number; taxRate: number;
  details: Record<string, string | number | boolean>; bundle?: boolean;
};

const DRIVERS = ["Karma Sherpa", "Ramesh Chettri", "Pasang Bhutia", "Nirmal Subba", "Tashi Lama", "Mohan Rai"];

type B = {
  type?: string; refId?: number; startDate?: string; endDate?: string; guests?: number; rooms?: number; coupon?: string;
  payment?: PayInput; addCab?: boolean; pickupId?: number;
  cab?: { fromId?: number; toId?: number; cabTypeId?: number; roundTrip?: boolean; time?: string };
};

async function buildCab(opts: { fromId: number; toId: number; cabTypeId: number; roundTrip: boolean; time: string; date: string; guests: number; bundle?: boolean }): Promise<Draft | string> {
  const locs = await db.select().from(locations).where(inArray(locations.id, [opts.fromId, opts.toId]));
  const from = locs.find((l) => l.id === opts.fromId);
  const to = locs.find((l) => l.id === opts.toId);
  const [cab] = await db.select().from(cabTypes).where(eq(cabTypes.id, opts.cabTypeId)).limit(1);
  if (!from || !to || !cab) return "Choose pickup, drop and a cab type";
  if (from.id === to.id) return "Pickup and drop must be different";
  if (opts.guests > cab.capacity) return `${cab.name} seats up to ${cab.capacity} passengers`;
  const km = roadKm(from.lat, from.lng, to.lat, to.lng);
  const fare = cabFare(cab, km, opts.roundTrip);
  return {
    type: "cab", refId: cab.id, title: `${from.name.split(" (")[0]} → ${to.name.split(" (")[0]}`,
    subtitle: `${cab.name} · ${km} km${opts.roundTrip ? " · round trip" : ""}`, image: photo("cab", cab.slug) ?? pick("jeep", cab.id, 800),
    destinationId: to.destinationId, startDate: opts.date, endDate: "", guests: opts.guests, subtotal: fare, taxRate: TAX.cab, bundle: opts.bundle,
    details: {
      from: from.name, to: to.name, km, mins: hillMinutes(km), cab: cab.name, model: cab.model, time: opts.time || "09:00",
      roundTrip: opts.roundTrip, driver: DRIVERS[Math.floor(Math.random() * DRIVERS.length)],
      vehicle: `WB 74 ${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${Math.floor(1000 + Math.random() * 8999)}`,
      otp: String(Math.floor(1000 + Math.random() * 8999)), toLat: to.lat, toLng: to.lng,
    },
  };
}

export async function POST(req: Request) {
  const u = await needUser();
  if (!u) return fail("Please sign in to book", 401);
  const b = await body<B>(req);
  const type = String(b.type);
  const startDate = String(b.startDate ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || startDate < todayISO()) return fail("Choose a valid travel date");
  const guests = Math.max(1, Math.min(20, Math.floor(Number(b.guests) || 1)));

  const drafts: Draft[] = [];

  if (type === "hotel") {
    const [h] = await db.select().from(hotels).where(eq(hotels.id, Number(b.refId))).limit(1);
    if (!h) return fail("Hotel not found", 404);
    const nights = nightsBetween(startDate, String(b.endDate));
    if (nights < 1) return fail("Check-out must be after check-in");
    const rooms = Math.max(1, Math.min(6, Math.floor(Number(b.rooms) || 1)));
    drafts.push({
      type, refId: h.id, title: h.name, subtitle: `${nights} night${nights > 1 ? "s" : ""} · ${rooms} room${rooms > 1 ? "s" : ""}`, image: h.image,
      destinationId: h.destinationId, startDate, endDate: String(b.endDate), guests, subtotal: h.pricePerNight * nights * rooms, taxRate: TAX.hotel,
      details: { nights, rooms, area: h.area, stay: h.type },
    });
    if (b.addCab) {
      const [njp] = await db.select().from(locations).where(ilike(locations.name, b.pickupId ? "%" : "New Jalpaiguri%")).limit(1);
      const fromId = Number(b.pickupId) || njp?.id;
      const cabId = guests > 4 ? 4 : 3;
      const c = await buildCab({ fromId, toId: h.locationId!, cabTypeId: cabId, roundTrip: true, time: "10:00", date: startDate, guests, bundle: true });
      if (typeof c === "string") return fail(c);
      drafts.push(c);
    }
  } else if (type === "package") {
    const [p] = await db.select().from(packages).where(eq(packages.id, Number(b.refId))).limit(1);
    if (!p) return fail("Package not found", 404);
    const end = new Date(new Date(startDate).getTime() + (p.days - 1) * 86400000).toISOString().slice(0, 10);
    drafts.push({
      type, refId: p.id, title: p.name, subtitle: `${p.days} days · ${guests} traveller${guests > 1 ? "s" : ""}`, image: p.image,
      destinationId: p.destinationIds[0], startDate, endDate: end, guests, subtotal: p.price * guests, taxRate: TAX.package,
      details: { days: p.days, theme: p.theme },
    });
    if (b.addCab) {
      const [hub] = await db.select().from(locations).where(eq(locations.destinationId, p.destinationIds[0])).limit(1);
      const [njp] = await db.select().from(locations).where(ilike(locations.name, "New Jalpaiguri%")).limit(1);
      const fromId = Number(b.pickupId) || njp?.id;
      if (hub && njp) {
        const c = await buildCab({ fromId, toId: hub.id, cabTypeId: guests > 4 ? 4 : 3, roundTrip: true, time: "10:00", date: startDate, guests: Math.min(guests, 6), bundle: true });
        if (typeof c === "string") return fail(c);
        drafts.push(c);
      }
    }
  } else if (type === "experience") {
    const [row] = await db.select({ p: products, v: vendors }).from(products).innerJoin(vendors, eq(vendors.id, products.vendorId)).where(eq(products.id, Number(b.refId))).limit(1);
    if (!row || !row.p.isExperience) return fail("Experience not found", 404);
    drafts.push({
      type, refId: row.p.id, title: row.p.name, subtitle: row.v.name, image: row.p.image || row.v.image, destinationId: row.v.destinationId,
      startDate, endDate: "", guests, subtotal: row.p.price * guests, taxRate: TAX.experience, details: { host: row.v.name, area: row.v.area },
    });
  } else if (type === "cab") {
    const c = await buildCab({
      fromId: Number(b.cab?.fromId), toId: Number(b.cab?.toId), cabTypeId: Number(b.cab?.cabTypeId),
      roundTrip: !!b.cab?.roundTrip, time: String(b.cab?.time ?? "09:00"), date: startDate, guests,
    });
    if (typeof c === "string") return fail(c);
    drafts.push(c);
  } else return fail("Unknown booking type");

  // coupon on the main (non-bundle) subtotal
  const mainSub = drafts.filter((d) => !d.bundle).reduce((s, d) => s + d.subtotal, 0);
  let promoDiscount = 0;
  if (b.coupon) {
    const [c] = await db.select().from(coupons).where(eq(coupons.code, String(b.coupon).toUpperCase())).limit(1);
    if (!c || !c.active) return fail("Promo code is not valid");
    const r = couponDiscount(c, mainSub, "booking");
    if (!r.ok) return fail(r.error);
    promoDiscount = r.discount;
  }
  const priced = drafts.map((d) => {
    const disc = d.bundle ? Math.round(d.subtotal * 0.05) : mainSub ? Math.round((promoDiscount * d.subtotal) / mainSub) : 0;
    const { tax, total } = withTax(d.subtotal, d.taxRate, disc);
    return { ...d, discount: disc, tax, total };
  });
  const grand = priced.reduce((s, d) => s + d.total, 0);
  const codes = priced.map((d) => makeCode(d.type === "cab" ? "CB" : d.type === "hotel" ? "HT" : d.type === "package" ? "TP" : "EX"));
  const tripId = makeCode("TRIP");

  const pay = await charge({
    userId: u.id, amount: grand, input: (b.payment ?? { method: "wallet" }) as PayInput, kind: "booking",
    refCode: codes[0], allowCod: priced.every((d) => d.type === "cab"),
  });
  if (!pay.ok) return fail(pay.error, 402);

  try {
    await db.insert(bookings).values(
      priced.map((d, i) => ({
        code: codes[i], tripId, userId: u.id, type: d.type, refId: d.refId, title: d.title, subtitle: d.subtitle, image: d.image,
        destinationId: d.destinationId, startDate: d.startDate, endDate: d.endDate, guests: d.guests, subtotal: d.subtotal, tax: d.tax,
        discount: d.discount, amount: d.total, status: "confirmed", paymentStatus: pay.status, paymentMethod: pay.method,
        details: d.bundle ? { ...d.details, bundle: true } : d.details,
      })),
    );
  } catch (e) {
    if (pay.status === "paid") await refundToWallet(u.id, grand, codes[0]);
    throw e;
  }
  await notify(u.id, `Booking confirmed · ${priced[0].title}`, `${codes[0]} · ₹${grand.toLocaleString("en-IN")}${priced.length > 1 ? " · cab transfers included" : ""}. Tap to plan the rest of your trip.`, "booking", `/bookings/${codes[0]}`);
  return ok({ codes, redirect: `/bookings/${codes[0]}?new=1` });
}
