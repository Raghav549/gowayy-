import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { ArrowDownLeft, ArrowUpRight, Bell, ChevronRight, Heart, Luggage, Receipt, ShieldCheck } from "lucide-react";
import { db } from "@/db";
import { payments } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { inr, timeAgo } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";
import { LogoutButton, ProfileForm, WalletTopUp } from "@/components/ProfileClient";
import { StatusPill } from "@/components/ui";
import { AvatarEditor } from "@/components/Avatar";

export const metadata = { title: "Profile" };
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth?next=/profile");
  const txns = await db.select().from(payments).where(eq(payments.userId, user.id)).orderBy(desc(payments.id)).limit(12);
  const links = [
    { href: "/bookings", label: "My trips & bookings", icon: Luggage },
    { href: "/orders", label: "My orders", icon: Receipt },
    { href: "/favorites", label: "Saved places", icon: Heart },
    { href: "/notifications", label: "Notifications", icon: Bell },
    ...(user.role === "admin" ? [{ href: "/admin", label: "Admin dashboard", icon: ShieldCheck }] : []),
  ];
  return (
    <div className="page">
      <PageHeader title="Profile" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <AvatarEditor
            name={user.name}
            email={user.email}
            avatar={user.avatar}
            badge={user.role === "admin" ? <span className="mt-1 inline-block rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-bold uppercase text-brand-700">admin</span> : null}
          />
          <WalletTopUp balance={user.wallet} />
          <div className="glass overflow-hidden rounded-[32px]">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="flex items-center gap-3 border-b border-white/70 px-5 py-4 transition last:border-0 hover:bg-white/60">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-brand-100 text-brand-700"><l.icon size={18} /></span>
                <span className="min-w-0 flex-1 truncate font-semibold">{l.label}</span>
                <ChevronRight size={16} className="text-ink/30" />
              </Link>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <ProfileForm initial={{ name: user.name, email: user.email, phone: user.phone, address: user.address }} />
          <div className="glass-strong rounded-[32px] p-5">
            <h3 className="font-display text-xl font-semibold">Payments</h3>
            <div className="mt-3 divide-y divide-brand-100">
              {txns.length === 0 && <p className="py-4 text-sm text-ink/55">No transactions yet.</p>}
              {txns.map((t) => {
                const credit = ["topup", "refund", "bonus"].includes(t.kind);
                return (
                  <div key={t.id} className="flex items-center gap-3 py-3">
                    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl ${credit ? "bg-emerald-100 text-emerald-600" : "bg-lav text-brand-700"}`}>{credit ? <ArrowDownLeft size={17} /> : <ArrowUpRight size={17} />}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold capitalize">{t.kind === "bonus" ? "Welcome bonus" : t.kind} · {t.method}</p>
                      <p className="truncate text-xs text-ink/50">{t.refCode.split(",")[0]} · {timeAgo(t.createdAt)}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className={`font-display font-semibold ${credit ? "text-emerald-600" : ""}`}>{credit ? "+" : "−"}{inr(t.amount)}</p>
                      <StatusPill status={t.status} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <LogoutButton />
        </div>
      </div>
    </div>
  );
}
