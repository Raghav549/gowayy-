import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, asc, eq, ne } from "drizzle-orm";
import { CarTaxiFront, KeyRound, MapPin, Phone, ShoppingBasket, UtensilsCrossed, Compass, PartyPopper } from "lucide-react";
import { db } from "@/db";
import { bookings, hotels, locations } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getConnected, getDestMap } from "@/lib/data";
import { fmtDate, inr, todayISO } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";
import { Img } from "@/components/Img";
import { StatusPill } from "@/components/ui";
import { BookingActions } from "@/components/ProfileClient";
import { ConnectedSections, SmartBadge, type SectionKey } from "@/components/Connected";

export const metadata = { title: "Booking" };
export const dynamic = "force-dynamic";

export default async function BookingPage({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<{ new?: string }> }) {
  const { code } = await params;
  const sp = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect(`/auth?next=/bookings/${code}`);
  const [b] = await db.select().from(bookings).where(eq(bookings.code, code)).limit(1);
  if (!b || (b.userId !== user.id && user.role !== "admin")) notFound();
  const dm = await getDestMap();
  const names = Object.fromEntries(dm.list.map((x) => [x.id, x.name]));
  const dest = dm.byId[b.destinationId];
  const linked = await db.select().from(bookings).where(and(eq(bookings.tripId, b.tripId), ne(bookings.id, b.id))).orderBy(asc(bookings.id));
  const destIds = b.type === "package" ? [...new Set([b.destinationId])] : [b.destinationId];
  const data = await getConnected(destIds, 6);

  // location for "book a cab here"
  let locId: number | undefined;
  if (b.type === "hotel") locId = (await db.select().from(hotels).where(eq(hotels.id, b.refId)).limit(1))[0]?.locationId ?? undefined;
  if (!locId) locId = (await db.select().from(locations).where(eq(locations.destinationId, b.destinationId)).limit(1))[0]?.id;

  const d = b.details as Record<string, string | number | boolean>;
  const show: SectionKey[] = b.type === "cab" ? ["restaurants", "groceries", "shops", "attractions"] : b.type === "hotel" ? ["attractions", "restaurants", "groceries", "packages"] : b.type === "package" ? ["hotels", "restaurants", "groceries", "attractions"] : ["restaurants", "attractions", "hotels"];
  const canCancel = b.status === "confirmed" && b.startDate >= todayISO();
  const rows: [string, React.ReactNode][] = [
    ["Booking ID", b.code],
    ["Date", `${fmtDate(b.startDate)}${b.endDate ? ` → ${fmtDate(b.endDate)}` : ""}`],
    [b.type === "cab" ? "Riders" : "Guests", b.guests],
  ];
  if (b.type === "hotel") rows.push(["Rooms", String(d.rooms)], ["Nights", String(d.nights)]);
  if (b.type === "package") rows.push(["Days", String(d.days)]);
  if (b.type === "cab") rows.push(["Pickup time", String(d.time)], ["Distance", `${d.km} km · ~${d.mins} min`], ["Cab", `${d.cab} (${d.model})`], ["Trip", d.roundTrip ? "Round trip" : "One way"]);

  return (
    <div className="page">
      <PageHeader title="Booking" sub={b.code} />
      {sp.new && (
        <div className="anim-pop mb-5 flex items-center gap-3 rounded-[28px] bg-gradient-to-r from-emerald-500 to-teal-500 p-4 text-white shadow-xl shadow-emerald-500/30">
          <PartyPopper size={28} />
          <div><p className="font-display text-xl font-semibold">Booking confirmed!</p><p className="text-sm text-white/85">Scroll down — we&apos;ve lined up the rest of your trip.</p></div>
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-4">
          <div className="glass-strong anim-up overflow-hidden rounded-[36px]">
            <div className="relative h-52"><Img src={b.image} alt={b.title} className="h-full w-full object-cover" eager />
              <div className="absolute inset-0 bg-gradient-to-t from-[#14082e]/85 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                <p className="text-xs font-bold uppercase tracking-wider text-white/70">{b.type} · {dest?.name}</p>
                <h1 className="font-display text-3xl font-semibold leading-tight">{b.title}</h1>
                <p className="text-sm text-white/80">{b.subtitle}</p>
              </div>
            </div>
            <div className="relative p-5">
              <div className="absolute -top-3 left-0 right-0 flex justify-between px-0"><span className="h-6 w-6 -translate-x-1/2 rounded-full bg-[#f3eeff]" /><span className="h-6 w-6 translate-x-1/2 rounded-full bg-[#f3eeff]" /></div>
              <div className="flex items-center justify-between"><StatusPill status={b.status} /><StatusPill status={b.paymentStatus} /></div>
              <dl className="mt-4 space-y-2.5 text-sm">
                {rows.map(([k, v]) => <div key={k} className="flex justify-between gap-4"><dt className="text-ink/55">{k}</dt><dd className="text-right font-semibold">{v}</dd></div>)}
              </dl>
              {b.type === "cab" && (
                <div className="mt-4 rounded-3xl bg-brand-50 p-4">
                  <p className="flex items-center gap-2 text-sm"><MapPin size={15} className="text-brand-600" /> <b>{String(d.from)}</b> → <b>{String(d.to)}</b></p>
                  <div className="mt-3 flex items-center gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-xl">🧑‍✈️</span>
                    <div className="flex-1"><p className="text-sm font-bold">{String(d.driver)}</p><p className="text-xs text-ink/55">{String(d.vehicle)}</p></div>
                    <span className="flex items-center gap-1.5 rounded-full bg-ink px-3 py-2 text-xs font-bold text-white"><KeyRound size={13} /> OTP {String(d.otp)}</span>
                  </div>
                </div>
              )}
              <div className="mt-4 space-y-1.5 border-t border-dashed border-brand-200 pt-4 text-sm">
                <div className="flex justify-between text-ink/60"><span>Subtotal</span><span>{inr(b.subtotal)}</span></div>
                {b.discount > 0 && <div className="flex justify-between text-emerald-600"><span>Discounts</span><span>−{inr(b.discount)}</span></div>}
                <div className="flex justify-between text-ink/60"><span>Taxes</span><span>{inr(b.tax)}</span></div>
                <div className="flex items-baseline justify-between"><span className="font-semibold">Total · {b.paymentMethod}</span><span className="font-display text-2xl font-semibold">{inr(b.amount)}</span></div>
              </div>
            </div>
          </div>
          <BookingActions code={b.code} canCancel={canCancel} />
        </div>

        <div className="space-y-4">
          {linked.length > 0 && (
            <div className="glass rounded-[32px] p-4">
              <h3 className="font-display mb-2 px-1 text-lg font-semibold">Part of this trip</h3>
              {linked.map((l) => (
                <Link key={l.id} href={`/bookings/${l.code}`} className="lift flex items-center gap-3 rounded-3xl bg-white/70 p-2.5">
                  <Img src={l.image} alt={l.title} className="h-14 w-14 rounded-2xl object-cover" />
                  <div className="min-w-0 flex-1"><p className="line-clamp-1 text-sm font-bold">{l.title}</p><p className="text-xs text-ink/55 capitalize">{l.type} · {fmtDate(l.startDate)}</p></div>
                  <StatusPill status={l.status} />
                </Link>
              ))}
            </div>
          )}
          <div className="glass-strong rounded-[32px] p-5">
            <SmartBadge>Complete your trip</SmartBadge>
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              {[
                { href: `/cabs?to=${locId ?? ""}`, label: "Book a cab", sub: "Local rides & transfers", icon: CarTaxiFront, bg: "bg-amber-100 text-amber-700" },
                { href: "/food", label: "Order food", sub: "Local kitchens", icon: UtensilsCrossed, bg: "bg-orange-100 text-orange-600" },
                { href: "/grocery", label: "Groceries", sub: "Delivered in 10 min", icon: ShoppingBasket, bg: "bg-emerald-100 text-emerald-700" },
                { href: `/destinations/${dest?.slug}`, label: `Explore ${dest?.name}`, sub: "Sights & more", icon: Compass, bg: "bg-violet-100 text-violet-700" },
              ].map((a) => (
                <Link key={a.label} href={a.href} className="lift rounded-3xl bg-white/80 p-3.5">
                  <span className={`grid h-10 w-10 place-items-center rounded-2xl ${a.bg}`}><a.icon size={18} /></span>
                  <p className="mt-2 text-sm font-bold leading-tight">{a.label}</p>
                  <p className="text-[11px] text-ink/50">{a.sub}</p>
                </Link>
              ))}
            </div>
            <a href="tel:+919000000001" className="btn btn-light mt-3 w-full"><Phone size={15} /> Contact gowayy support</a>
          </div>
        </div>
      </div>
      <ConnectedSections data={data} destName={dest?.name ?? ""} destNames={names} show={show} heading={`Recommended for your ${b.type === "cab" ? "ride" : "trip"}`} />
    </div>
  );
}
