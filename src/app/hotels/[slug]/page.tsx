import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { CarTaxiFront, Check, MapPin, Star } from "lucide-react";
import { db } from "@/db";
import { hotels } from "@/db/schema";
import { getConnected, getDestMap } from "@/lib/data";
import { transferFares } from "@/lib/transfer";
import { PageHeader } from "@/components/PageHeader";
import { Hero } from "@/components/Hero";
import { Img } from "@/components/Img";
import { ConnectedSections } from "@/components/Connected";
import { HotelBooking } from "@/components/BookingForms";

export const dynamic = "force-dynamic";

export default async function HotelPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [h] = await db.select().from(hotels).where(eq(hotels.slug, slug)).limit(1);
  if (!h) notFound();
  const dm = await getDestMap();
  const dest = dm.byId[h.destinationId];
  const names = Object.fromEntries(dm.list.map((x) => [x.id, x.name]));
  const [data, fares] = await Promise.all([getConnected([h.destinationId], 6), transferFares(h.locationId)]);
  data.hotels = data.hotels.filter((x) => x.id !== h.id);

  return (
    <div className="page">
      <PageHeader title={h.name} sub={`${h.area}, ${dest?.name}`} />
      <Hero image={h.image} title={h.name} eyebrow={`${h.type} · ${dest?.name}`} fav={{ kind: "hotel", id: h.id }}
        badges={<span className="flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-[11px] font-bold"><Star size={12} className="fill-amber-400 text-amber-400" /> {h.rating.toFixed(1)} · {h.stars}★</span>}>
        <p className="mt-2 flex items-center gap-1 text-sm text-white/80"><MapPin size={14} /> {h.area}, {dest?.name}</p>
      </Hero>

      <div className="mt-3 grid grid-cols-3 gap-3">
        {h.gallery.map((g, i) => (
          <div key={i} className="zoom overflow-hidden rounded-3xl"><Img src={g} alt={`${h.name} ${i + 1}`} className="h-24 w-full object-cover sm:h-36" /></div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div>
          <div className="glass rounded-[28px] p-5">
            <h2 className="font-display text-2xl font-semibold">About this stay</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-ink/70">{h.description}</p>
          </div>
          <h2 className="font-display mb-3 mt-6 text-2xl font-semibold">Amenities</h2>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {h.amenities.map((a) => (
              <p key={a} className="glass flex items-center gap-2 rounded-2xl p-3 text-sm font-semibold"><span className="grid h-6 w-6 place-items-center rounded-full bg-brand-100 text-brand-700"><Check size={13} /></span>{a}</p>
            ))}
          </div>
          {fares.km > 0 && (
            <Link href={`/cabs?to=${h.locationId}`} className="glass-strong lift mt-6 flex items-center gap-4 rounded-[28px] p-4">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-100 text-amber-700"><CarTaxiFront size={22} /></span>
              <div className="flex-1">
                <p className="font-bold">Getting here</p>
                <p className="text-sm text-ink/60">{fares.km} km from NJP station · cabs from ₹{fares.sedan.toLocaleString("en-IN")} round trip</p>
              </div>
              <span className="btn btn-light btn-sm">Book cab</span>
            </Link>
          )}
        </div>
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <HotelBooking hotel={{ id: h.id, pricePerNight: h.pricePerNight }} sedanFare={fares.sedan} suvFare={fares.suv} />
        </aside>
      </div>

      <ConnectedSections data={data} destName={dest?.name ?? ""} destNames={names} show={["attractions", "restaurants", "groceries", "shops", "packages", "hotels"]} heading={`Make the most of your stay in ${dest?.name}`} />
    </div>
  );
}
