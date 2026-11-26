import { SearchX } from "lucide-react";
import Link from "next/link";
import { searchAll } from "@/lib/search";
import { PageHeader } from "@/components/PageHeader";
import { SearchBox } from "@/components/SearchBox";
import { Img } from "@/components/Img";
import { Empty } from "@/components/ui";

export const metadata = { title: "Search" };
export const dynamic = "force-dynamic";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const hits = q.trim().length >= 2 ? await searchAll(q.trim(), 8) : [];
  const groups = [...new Set(hits.map((h) => h.type))];
  return (
    <div className="page">
      <PageHeader title="Search" sub={q ? `Results for “${q}”` : "Find anything on gowayy"} />
      <div className="mb-6 max-w-2xl"><SearchBox big /></div>
      {q && hits.length === 0 && <Empty icon={SearchX} title="No matches" text="Try “momo”, “tea”, “Darjeeling” or “cab”." href="/explore" />}
      {groups.map((g) => (
        <section key={g} className="mb-6">
          <h2 className="font-display mb-2 text-xl font-semibold">{g}s</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {hits.filter((h) => h.type === g).map((h, i) => (
              <Link key={h.href + h.title + i} href={h.href} className="anim-up lift glass-strong flex items-center gap-3 rounded-3xl p-2.5">
                <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-brand-100 text-3xl">{h.image ? <Img src={h.image} alt="" className="h-full w-full object-cover" /> : h.emoji}</div>
                <div className="min-w-0"><p className="line-clamp-1 font-bold">{h.title}</p><p className="line-clamp-1 text-xs text-ink/55">{h.sub}</p></div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
