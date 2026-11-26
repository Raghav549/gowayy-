import { Market } from "@/components/Market";

export const metadata = { title: "Grocery" };
export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ cat?: string; q?: string; v?: string }> }) {
  return <Market kind="grocery" sp={await searchParams} />;
}
