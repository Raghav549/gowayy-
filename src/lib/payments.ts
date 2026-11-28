import crypto from "node:crypto";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { payments, users } from "@/db/schema";

export type PayInput = {
  method: "wallet" | "upi" | "card" | "cod";
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
};

export type RazorpaySession = {
  provider: "razorpay";
  key: string;
  orderId: string;
  amount: number;
  currency: "INR";
  name: "Gowayy";
  description: string;
};

export type ChargeResult =
  | { ok: true; status: "paid" | "pending"; method: string; txnId: string }
  | { ok: true; status: "requires_action"; method: "upi" | "card"; txnId: string; gateway: RazorpaySession }
  | { ok: false; error: string };

function credentials() {
  const key = process.env.RAZORPAY_KEY_ID?.trim() ?? "";
  const secret = process.env.RAZORPAY_KEY_SECRET?.trim() ?? "";
  return key && secret ? { key, secret } : null;
}

async function razorpayRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const c = credentials();
  if (!c) throw new Error("Secure online payments are temporarily unavailable. Choose wallet or pay on delivery.");
  const res = await fetch(`https://api.razorpay.com/v1${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      Authorization: `Basic ${Buffer.from(`${c.key}:${c.secret}`).toString("base64")}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: { description?: string } };
  if (!res.ok) throw new Error(data.error?.description || "Payment provider could not process this request");
  return data;
}

async function prepareRazorpay(amount: number, method: "upi" | "card", refCode: string): Promise<ChargeResult> {
  const c = credentials();
  if (!c) return { ok: false, error: "Secure online payments are temporarily unavailable. Choose wallet or pay on delivery." };
  try {
    const receipt = `${refCode.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 24)}-${crypto.randomBytes(4).toString("hex")}`;
    const order = await razorpayRequest<{ id: string; amount: number; currency: string }>("/orders", {
      method: "POST",
      body: JSON.stringify({ amount: amount * 100, currency: "INR", receipt, notes: { refCode, source: "gowayy" } }),
    });
    if (!order.id || order.amount !== amount * 100 || order.currency !== "INR") throw new Error("Payment provider returned an invalid order");
    return {
      ok: true,
      status: "requires_action",
      method,
      txnId: order.id,
      gateway: { provider: "razorpay", key: c.key, orderId: order.id, amount: order.amount, currency: "INR", name: "Gowayy", description: `Gowayy ${refCode}` },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not start secure payment" };
  }
}

async function verifyRazorpay(amount: number, input: PayInput) {
  const c = credentials();
  if (!c) return { ok: false as const, error: "Online payment configuration is unavailable" };
  const orderId = input.razorpayOrderId ?? "";
  const paymentId = input.razorpayPaymentId ?? "";
  const signature = input.razorpaySignature ?? "";
  if (!/^order_[\w-]+$/.test(orderId) || !/^pay_[\w-]+$/.test(paymentId) || !/^[a-f0-9]{64}$/i.test(signature)) {
    return { ok: false as const, error: "Payment confirmation is incomplete" };
  }
  const expected = crypto.createHmac("sha256", c.secret).update(`${orderId}|${paymentId}`).digest("hex");
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return { ok: false as const, error: "Payment signature verification failed" };
  }
  try {
    let payment = await razorpayRequest<{ id: string; order_id: string; amount: number; currency: string; status: string }>(`/payments/${encodeURIComponent(paymentId)}`);
    if (payment.order_id !== orderId || payment.amount !== amount * 100 || payment.currency !== "INR") {
      return { ok: false as const, error: "Payment amount verification failed" };
    }
    if (payment.status === "authorized") {
      payment = await razorpayRequest<typeof payment>(`/payments/${encodeURIComponent(paymentId)}/capture`, {
        method: "POST",
        body: JSON.stringify({ amount: amount * 100, currency: "INR" }),
      });
    }
    if (payment.status !== "captured") return { ok: false as const, error: "Payment has not been captured" };
    return { ok: true as const, txnId: payment.id };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Could not verify payment" };
  }
}

async function record(userId: number, kind: string, refCode: string, amount: number, method: string, status: string, txnId: string, provider = "gowayy") {
  await db.insert(payments).values({ userId, kind, refCode, amount, method, status, txnId, provider });
}

export async function charge(a: {
  userId: number;
  amount: number;
  input: PayInput;
  kind: "order" | "booking" | "topup";
  refCode: string;
  allowCod?: boolean;
}): Promise<ChargeResult> {
  const { userId, amount, input, kind, refCode } = a;
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
    const res = await db.update(users).set({ wallet: sql`${users.wallet} - ${amount}` }).where(and(eq(users.id, userId), gte(users.wallet, amount))).returning({ wallet: users.wallet });
    if (!res.length) return { ok: false, error: "Insufficient Gowayy wallet balance" };
    const txnId = "wal_" + crypto.randomBytes(6).toString("hex");
    await record(userId, kind, refCode, amount, "wallet", "paid", txnId, "gowayy-wallet");
    return { ok: true, status: "paid", method: "wallet", txnId };
  }
  if (input.method === "upi" || input.method === "card") {
    if (!input.razorpayPaymentId) return prepareRazorpay(amount, input.method, refCode);
    const verified = await verifyRazorpay(amount, input);
    if (!verified.ok) {
      await record(userId, kind, refCode, amount, input.method, "failed", input.razorpayPaymentId || input.razorpayOrderId || "missing", "razorpay");
      return verified;
    }
    await record(userId, kind, refCode, amount, input.method, "paid", verified.txnId, "razorpay");
    return { ok: true, status: "paid", method: input.method, txnId: verified.txnId };
  }
  return { ok: false, error: "Choose a payment method" };
}

export async function refundToWallet(userId: number, amount: number, refCode: string) {
  if (amount <= 0) return;
  await db.update(users).set({ wallet: sql`${users.wallet} + ${amount}` }).where(eq(users.id, userId));
  await record(userId, "refund", refCode, amount, "wallet", "paid", "rf_" + crypto.randomBytes(5).toString("hex"), "gowayy-wallet");
}

export async function refundPayment(userId: number, amount: number, refCode: string, method: string, txnId: string) {
  if (amount <= 0 || method === "cod") return;
  if (method === "upi" || method === "card") {
    const refund = await razorpayRequest<{ id: string; amount: number }>(`/payments/${encodeURIComponent(txnId)}/refund`, {
      method: "POST",
      body: JSON.stringify({ amount: amount * 100, notes: { refCode, source: "gowayy-auto-refund" } }),
    });
    await record(userId, "refund", refCode, amount, method, "paid", refund.id, "razorpay");
    return;
  }
  await refundToWallet(userId, amount, refCode);
}

export async function refundOriginalPayment(userId: number, amount: number, refCode: string, method: string) {
  if (method !== "upi" && method !== "card") return refundToWallet(userId, amount, refCode);
  const [payment] = await db.select().from(payments).where(and(
    eq(payments.userId, userId), eq(payments.method, method), eq(payments.status, "paid"),
    sql`${payments.refCode} LIKE ${`%${refCode}%`}`,
  )).orderBy(desc(payments.id)).limit(1);
  if (!payment) throw new Error("Original provider payment could not be found");
  return refundPayment(userId, amount, refCode, method, payment.txnId);
}

export async function topUpWallet(userId: number, amount: number, input: PayInput): Promise<ChargeResult> {
  if (input.method !== "upi" && input.method !== "card") return { ok: false, error: "Use UPI or card to add money" };
  if (!Number.isFinite(amount) || amount < 100 || amount > 50000) return { ok: false, error: "Enter an amount between ₹100 and ₹50,000" };
  const result = await charge({ userId, amount, input, kind: "topup", refCode: "wallet" });
  if (!result.ok || result.status === "requires_action") return result;
  await db.update(users).set({ wallet: sql`${users.wallet} + ${amount}` }).where(eq(users.id, userId));
  return result;
}
