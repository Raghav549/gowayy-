import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { BedDouble, CarTaxiFront, Mountain, Sparkles } from "lucide-react";
import { db } from "@/db";
import { bookings } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { fmtDate, inr, todayISO } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";
import { Empty, StatusPill } from "@/components/ui";
import { Img } from "@/components/Img";

export const metadata = { title: "My trips" };
export const dynamic = "force-dynamic";

const ICON = { hotel: BedDouble, cab: CarTaxiFront, package: Mountain, experience: Sparkles } as const;

export default async function BookingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth?next=/bookings");
  const list = await db.select().from(bookings).where(eq(bookings.userId, user.id)).orderBy(desc(bookings.createdAt));
  const today = todayISO();
  const upcoming = list.filter((b) => b.status === "confirmed" && (b.endDate || b.startDate) >= today);
  const past = list.filter((b) => !upcoming.includes(b));

  const Card = ({ b, i }: { b: (typeof list)[number]; i: number }) => {
    const Icon = ICON[b.type as keyof typeof ICON] ?? Sparkles;
    return (
      <Link href={`/bookings/${b.code}`} style={{ "--i": i } as React.CSSProperties} className="anim-up lift glass-strong flex items-center gap-4 rounded-[30px] p-2.5">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-[24px]">
          <Img src={b.image} alt={b.title} className="h-full w-full object-cover" />
          <span className="glass-tint absolute left-1.5 top-1.5 grid h-8 w-8 place-items-center rounded-full text-white"><Icon size={15} /></span>
        </div>
        <div className="min-w-0 flex-1 py-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-brand-700">{b.type}</p>
          <p className="line-clamp-1 font-display text-lg font-semibold">{b.title}</p>
          <p className="line-clamp-1 text-xs text-ink/55">{b.subtitle}</p>
          <p className="mt-1 text-xs font-semibold text-ink/70">{fmtDate(b.startDate)}{b.endDate ? ` → ${fmtDate(b.endDate)}` : ""}</p>
        </div>
        <div className="flex flex-col items-end gap-2 pr-2">
          <StatusPill status={b.status} />
          <p className="font-display font-semibold">{inr(b.amount)}</p>
        </div>
      </Link>
    );
  };

  return (
    <div className="page">
      <PageHeader title="My trips" sub="Tours, stays, cabs & experiences" />
      {list.length === 0 ? (
        <Empty emoji="🧳" title="No bookings yet" text="Book a tour, stay or ride — we'll keep everything together here." href="/tours" cta="Browse tours" />
      ) : (
        <div className="mx-auto max-w-3xl">
          <h2 className="font-display mb-3 text-xl font-semibold">Upcoming</h2>
          <div className="grid gap-3">{upcoming.length ? upcoming.map((b, i) => <Card key={b.id} b={b} i={i} />) : <p className="glass rounded-3xl p-5 text-sm text-ink/60">Nothing upcoming. <Link href="/tours" className="font-bold text-brand-700">Plan a trip →</Link></p>}</div>
          {past.length > 0 && (
            <>
              <h2 className="font-display mb-3 mt-8 text-xl font-semibold">Past & cancelled</h2>
              <div className="grid gap-3 opacity-90">{past.map((b, i) => <Card key={b.id} b={b} i={i} />)}</div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
