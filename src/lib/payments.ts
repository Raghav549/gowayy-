import crypto from "node:crypto";
import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { payments, users } from "@/db/schema";

/**
 * Payment architecture
 * --------------------
 * `PaymentGateway` is the adapter boundary. The bundled `sandbox` gateway validates UPI/card
 * details and simulates authorisation without moving real money. To go live, implement the same
 * interface with Razorpay / Stripe / PayU (using secrets from process.env) and assign it to `gateway`.
 * Wallet and COD are handled natively and every attempt is written to the `payments` ledger.
 */
export type PayInput = {
  method: "wallet" | "upi" | "card" | "cod";
  upi?: string;
  card?: { number: string; expiry: string; cvv: string; name?: string };
};

export type ChargeResult =
  | { ok: true; status: "paid" | "pending"; method: string; txnId: string }
  | { ok: false; error: string };

interface PaymentGateway {
  name: string;
  charge(a: { amount: number; method: "upi" | "card"; input: PayInput }): Promise<{ ok: boolean; txnId: string; error?: string }>;
}

const luhn = (n: string) => {
  let sum = 0;
  let alt = false;
  for (let i = n.length - 1; i >= 0; i--) {
    let d = Number(n[i]);
    if (alt) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    alt = !alt;
  }
  return sum % 10 === 0;
};

const sandbox: PaymentGateway = {
  name: "gowayy-sandbox",
  async charge({ method, input }) {
    await new Promise((r) => setTimeout(r, 500));
    const txnId = "gw_" + crypto.randomBytes(8).toString("hex");
    if (method === "upi") {
      if (!/^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test((input.upi ?? "").trim())) return { ok: false, txnId, error: "Enter a valid UPI ID (e.g. name@okbank)" };
      return { ok: true, txnId };
    }
    const c = input.card;
    const num = (c?.number ?? "").replace(/\s+/g, "");
    if (!/^\d{13,19}$/.test(num) || !luhn(num)) return { ok: false, txnId, error: "Card number looks invalid" };
    const m = /^(\d{2})\s*\/\s*(\d{2})$/.exec(c?.expiry ?? "");
    if (!m || Number(m[1]) < 1 || Number(m[1]) > 12) return { ok: false, txnId, error: "Expiry must be MM/YY" };
    const exp = new Date(2000 + Number(m[2]), Number(m[1]), 1).getTime();
    if (exp < Date.now()) return { ok: false, txnId, error: "Card has expired" };
    if (!/^\d{3,4}$/.test(c?.cvv ?? "")) return { ok: false, txnId, error: "Enter a valid CVV" };
    if (num.endsWith("0002")) return { ok: false, txnId, error: "Card declined by issuer (sandbox test card)" };
    return { ok: true, txnId };
  },
};

const gateway: PaymentGateway = sandbox;

async function record(userId: number, kind: string, refCode: string, amount: number, method: string, status: string, txnId: string) {
  await db.insert(payments).values({ userId, kind, refCode, amount, method, status, txnId, provider: gateway.name });
}

export async function charge(a: {
  userId: number;
  amount: number;
  input: PayInput;
  kind: "order" | "booking";
  refCode: string;
  allowCod?: boolean;
}): Promise<ChargeResult> {
  const { userId, amount, input, kind, refCode } = a;
  // Fail closed: a simulated PSP must never create a paid real-money transaction.
  if (process.env.NODE_ENV === "production" && (input.method === "upi" || input.method === "card")) return { ok: false, error: "Verified online payments are not yet configured" };
  if (amount <= 0) {
    const txnId = "gw_free_" + crypto.randomBytes(4).toString("hex");
    await record(userId, kind, refCode, 0, "free", "paid", txnId);
    return { ok: true, status: "paid", method: "free", txnId };
  }
  if (input.method === "cod") {
    if (!a.allowCod) return { ok: false, error: "Pay on delivery is not available for this purchase" };
    const txnId = "cod_" + crypto.randomBytes(5).toString("hex");
    await record(userId, kind, refCode, amount, "cod", "pending", txnId);
    return { ok: true, status: "pending", method: "cod", txnId };
  }
  if (input.method === "wallet") {
    const res = await db
      .update(users)
      .set({ wallet: sql`${users.wallet} - ${amount}` })
      .where(and(eq(users.id, userId), gte(users.wallet, amount)))
      .returning({ wallet: users.wallet });
    if (!res.length) return { ok: false, error: "Insufficient gowayy wallet balance" };
    const txnId = "wal_" + crypto.randomBytes(6).toString("hex");
    await record(userId, kind, refCode, amount, "wallet", "paid", txnId);
    return { ok: true, status: "paid", method: "wallet", txnId };
  }
  if (input.method === "upi" || input.method === "card") {
    const r = await gateway.charge({ amount, method: input.method, input });
    if (!r.ok) {
      await record(userId, kind, refCode, amount, input.method, "failed", r.txnId);
      return { ok: false, error: r.error ?? "Payment failed" };
    }
    await record(userId, kind, refCode, amount, input.method, "paid", r.txnId);
    return { ok: true, status: "paid", method: input.method, txnId: r.txnId };
  }
  return { ok: false, error: "Choose a payment method" };
}

export async function refundToWallet(userId: number, amount: number, refCode: string) {
  if (amount <= 0) return;
  await db.update(users).set({ wallet: sql`${users.wallet} + ${amount}` }).where(eq(users.id, userId));
  await record(userId, "refund", refCode, amount, "wallet", "paid", "rf_" + crypto.randomBytes(5).toString("hex"));
}

export async function topUpWallet(userId: number, amount: number, input: PayInput): Promise<ChargeResult> {
  if (input.method !== "upi" && input.method !== "card") return { ok: false, error: "Use UPI or card to add money" };
  if (process.env.NODE_ENV === "production") return { ok: false, error: "Wallet top-ups require a verified payment gateway" };
  if (!Number.isFinite(amount) || amount < 100 || amount > 50000) return { ok: false, error: "Enter an amount between ₹100 and ₹50,000" };
  const r = await gateway.charge({ amount, method: input.method, input });
  if (!r.ok) {
    await record(userId, "topup", "wallet", amount, input.method, "failed", r.txnId);
    return { ok: false, error: r.error ?? "Payment failed" };
  }
  await db.update(users).set({ wallet: sql`${users.wallet} + ${amount}` }).where(eq(users.id, userId));
  await record(userId, "topup", "wallet", amount, input.method, "paid", r.txnId);
  return { ok: true, status: "paid", method: input.method, txnId: r.txnId };
}
