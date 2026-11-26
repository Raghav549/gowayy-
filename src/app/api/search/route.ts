import { ok } from "@/lib/api";
import { searchAll } from "@/lib/search";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return ok({ results: [] });
  return ok({ results: (await searchAll(q, 3)).slice(0, 8) });
}
