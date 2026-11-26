import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, desc, eq, gte, ne, sql } from "drizzle-orm";
import { CalendarCheck, IndianRupee, Receipt, Users } from "lucide-react";
import { db } from "@/db";
import { bookings, orders, products, users, vendors } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { ensureSeeded } from "@/lib/seed";
import { ORDER_FLOW } from "@/lib/services";
import { inr, timeAgo } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";
import { Chip, Stat, StatusPill } from "@/components/ui";
import { BroadcastForm, ProductForm, ProductToggle, StatusSelect } from "@/components/AdminClient";

export const metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

const TABS = ["overview", "orders", "bookings", "catalog", "users", "broadcast"] as const;

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth?next=/admin");
  if (user.role !== "admin") notFound();
  await ensureSeeded();
  const { tab = "overview" } = await searchParams;

  const [[uc], [oc], [bc], [og], [bg]] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(users),
    db.select({ n: sql<number>`count(*)::int` }).from(orders),
    db.select({ n: sql<number>`count(*)::int` }).from(bookings),
    db.select({ n: sql<number>`coalesce(sum(${orders.total}),0)::int` }).from(orders).where(ne(orders.status, "cancelled")),
    db.select({ n: sql<number>`coalesce(sum(${bookings.amount}),0)::int` }).from(bookings).where(ne(bookings.status, "cancelled")),
  ]);

  const body = await (async () => {
    if (tab === "orders") {
      const rows = await db.select({ o: orders, u: users.name, v: vendors.name }).from(orders).innerJoin(users, eq(users.id, orders.userId)).innerJoin(vendors, eq(vendors.id, orders.vendorId)).orderBy(desc(orders.id)).limit(50);
      return (
        <div className="grid grid-cols-1 gap-2.5">
          {rows.length === 0 && <p className="glass rounded-3xl p-6 text-sm text-ink/60">No orders yet.</p>}
          {rows.map(({ o, u, v }) => (
            <div key={o.id} className="glass-strong flex flex-wrap items-center gap-3 rounded-3xl p-4">
              <div className="w-full min-w-0 sm:w-auto sm:flex-1"><Link href={`/orders/${o.code}`} className="font-bold text-brand-700">{o.code}</Link><p className="break-words text-xs text-ink/55">{u} · {v} · {timeAgo(o.createdAt)}</p></div>
              <span className="font-display font-semibold">{inr(o.total)}</span>
              <StatusPill status={o.paymentStatus} />
              <StatusSelect kind="order-status" id={o.id} status={o.status} options={[...ORDER_FLOW, "cancelled"]} />
            </div>
          ))}
        </div>
      );
    }
    if (tab === "bookings") {
      const rows = await db.select({ b: bookings, u: users.name }).from(bookings).innerJoin(users, eq(users.id, bookings.userId)).orderBy(desc(bookings.id)).limit(50);
      return (
        <div className="grid grid-cols-1 gap-2.5">
          {rows.length === 0 && <p className="glass rounded-3xl p-6 text-sm text-ink/60">No bookings yet.</p>}
          {rows.map(({ b, u }) => (
            <div key={b.id} className="glass-strong flex flex-wrap items-center gap-3 rounded-3xl p-4">
              <div className="w-full min-w-0 sm:w-auto sm:flex-1"><Link href={`/bookings/${b.code}`} className="font-bold text-brand-700">{b.code}</Link> <span className="text-[10px] font-bold uppercase text-ink/45">{b.type}</span><p className="line-clamp-2 break-words text-xs text-ink/55">{b.title} · {u} · {b.startDate}</p></div>
              <span className="font-display font-semibold">{inr(b.amount)}</span>
              <StatusPill status={b.paymentStatus} />
              <StatusSelect kind="booking-status" id={b.id} status={b.status} options={["confirmed", "completed", "cancelled"]} />
            </div>
          ))}
        </div>
      );
    }
    if (tab === "catalog") {
      const [vs, rows] = await Promise.all([
        db.select({ id: vendors.id, name: vendors.name }).from(vendors).orderBy(vendors.name),
        db.select({ p: products, v: vendors.name }).from(products).innerJoin(vendors, eq(vendors.id, products.vendorId)).orderBy(desc(products.id)).limit(40),
      ]);
      return (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <ProductForm vendors={vs} />
          <div className="glass-strong rounded-[32px] p-4">
            <h3 className="font-display mb-2 px-1 text-xl font-semibold">Latest catalogue</h3>
            <div className="divide-y divide-brand-100">
              {rows.map(({ p, v }) => (
                <div key={p.id} className="flex items-center gap-3 py-2.5">
                  <span className="text-2xl">{p.emoji}</span>
                  <div className="min-w-0 flex-1"><p className="line-clamp-1 text-sm font-bold">{p.name}</p><p className="line-clamp-1 text-xs text-ink/50">{v} · {inr(p.price)}</p></div>
                  <ProductToggle id={p.id} available={p.available} />
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }
    if (tab === "users") {
      const rows = await db
        .select({ id: users.id, name: users.name, role: users.role, email: users.email, createdAt: users.createdAt, wallet: users.wallet })
        .from(users)
        .orderBy(desc(users.id))
        .limit(100);
      return (
        <div className="glass-strong divide-y divide-brand-100 rounded-[32px] px-4">
          {rows.map((u) => (
            <div key={u.id} className="flex items-center gap-3 py-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-brand-100 font-bold text-brand-700">{u.name[0]}</span>
              <div className="min-w-0 flex-1"><p className="font-bold">{u.name} {u.role === "admin" && <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] uppercase text-brand-700">admin</span>}</p><p className="text-xs text-ink/55">{u.email} · joined {timeAgo(u.createdAt)}</p></div>
              <span className="font-display font-semibold">{inr(u.wallet)}</span>
            </div>
          ))}
        </div>
      );
    }
    if (tab === "broadcast") return <BroadcastForm />;

    // overview
    const since = startOfDayDaysAgo(6);
    const [ro, rb, top, recent] = await Promise.all([
      db.select({ t: orders.total, c: orders.createdAt }).from(orders).where(and(ne(orders.status, "cancelled"), gte(orders.createdAt, since))),
      db.select({ t: bookings.amount, c: bookings.createdAt }).from(bookings).where(and(ne(bookings.status, "cancelled"), gte(bookings.createdAt, since))),
      db.select({ name: vendors.name, n: sql<number>`count(${orders.id})::int`, s: sql<number>`coalesce(sum(${orders.total}),0)::int` }).from(orders).innerJoin(vendors, eq(vendors.id, orders.vendorId)).groupBy(vendors.name).orderBy(desc(sql`count(${orders.id})`)).limit(5),
      db.select({ o: orders, u: users.name }).from(orders).innerJoin(users, eq(users.id, orders.userId)).orderBy(desc(orders.id)).limit(5),
    ]);
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(since.getTime() + i * 86400000);
      const key = d.toDateString();
      const sum = [...ro, ...rb].filter((x) => new Date(x.c).toDateString() === key).reduce((s, x) => s + x.t, 0);
      return { label: d.toLocaleDateString("en-IN", { weekday: "short" }), sum };
    });
    const max = Math.max(1, ...days.map((d) => d.sum));
    return (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="glass-strong rounded-[32px] p-5">
          <h3 className="font-display text-xl font-semibold">Revenue · last 7 days</h3>
          <div className="mt-5 flex h-48 items-end gap-3">
            {days.map((d) => (
              <div key={d.label} className="flex flex-1 flex-col items-center gap-2">
                <span className="text-[10px] font-bold text-ink/50">{d.sum ? inr(d.sum) : ""}</span>
                <div className="w-full rounded-2xl bg-gradient-to-t from-brand-700 to-brand-300 transition-all duration-700" style={{ height: `${Math.max(6, (d.sum / max) * 100)}%` }} />
                <span className="text-xs font-semibold text-ink/55">{d.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <div className="glass-strong rounded-[32px] p-5">
            <h3 className="font-display text-xl font-semibold">Top stores</h3>
            {top.length === 0 && <p className="mt-2 text-sm text-ink/55">Orders will appear here.</p>}
            {top.map((t) => <div key={t.name} className="mt-2.5 flex justify-between text-sm"><span className="font-semibold">{t.name}</span><span className="text-ink/60">{t.n} orders · {inr(t.s)}</span></div>)}
          </div>
          <div className="glass-strong rounded-[32px] p-5">
            <h3 className="font-display text-xl font-semibold">Recent orders</h3>
            {recent.length === 0 && <p className="mt-2 text-sm text-ink/55">No orders yet.</p>}
            {recent.map(({ o, u }) => <div key={o.id} className="mt-2.5 flex items-center justify-between gap-2 text-sm"><span className="font-semibold">{o.code} <span className="font-normal text-ink/50">· {u}</span></span><StatusPill status={o.status} /></div>)}
          </div>
        </div>
      </div>
    );
  })();

  return (
    <div className="page">
      <PageHeader title="Admin" sub="gowayy operations" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Users" value={uc.n} icon={<Users size={16} />} />
        <Stat label="Orders" value={oc.n} icon={<Receipt size={16} />} />
        <Stat label="Bookings" value={bc.n} icon={<CalendarCheck size={16} />} />
        <Stat label="Gross revenue" value={inr(og.n + bg.n)} icon={<IndianRupee size={16} />} />
      </div>
      <div className="hscroll !pb-3 !pt-5">
        {TABS.map((t) => <Chip key={t} href={`/admin?tab=${t}`} on={tab === t}>{t[0].toUpperCase() + t.slice(1)}</Chip>)}
      </div>
      {body}
    </div>
  );
}

/** Midnight `days` days ago — the start of the overview's 7-day window. */
function startOfDayDaysAgo(days: number) {
  const d = new Date(Date.now() - days * 86400000);
  d.setHours(0, 0, 0, 0);
  return d;
}
