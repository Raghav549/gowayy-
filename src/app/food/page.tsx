import { Market } from "@/components/Market";

export const metadata = { title: "Food" };
export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ cat?: string; q?: string; v?: string }> }) {
  return <Market kind="restaurant" sp={await searchParams} />;
}
