import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { NotificationList } from "@/components/ProfileClient";
import { Empty } from "@/components/ui";

export const metadata = { title: "Notifications" };
export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth?next=/notifications");
  const list = await db.select().from(notifications).where(eq(notifications.userId, user.id)).orderBy(desc(notifications.id)).limit(60);
  return (
    <div className="page">
      <PageHeader title="Notifications" sub="Orders, trips & offers" />
      {list.length ? <NotificationList items={list} /> : <Empty emoji="🔔" title="All caught up" text="Order updates and offers will appear here." href="/explore" />}
    </div>
  );
}
