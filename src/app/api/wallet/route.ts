import { body, fail, ok, needUser } from "@/lib/api";
import { topUpWallet, type PayInput } from "@/lib/payments";
import { notify } from "@/lib/services";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const u = await needUser();
  if (!u) return fail("Please sign in", 401);
  const b = await body<{ amount?: number; payment?: PayInput }>(req);
  const amount = Math.floor(Number(b.amount));
  const r = await topUpWallet(u.id, amount, (b.payment ?? { method: "upi" }) as PayInput);
  if (!r.ok) return fail(r.error, 402);
  await notify(u.id, "Wallet topped up", `₹${amount.toLocaleString("en-IN")} added to your gowayy wallet.`, "payment", "/profile");
  return ok();
}
