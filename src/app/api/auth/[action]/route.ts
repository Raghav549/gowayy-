import { eq } from "drizzle-orm";
import { db } from "@/db";
import { payments, users } from "@/db/schema";
import { body, fail, ok } from "@/lib/api";
import { createSession, destroySession, hashPassword, verifyPassword } from "@/lib/auth";
import { ensureSeeded } from "@/lib/seed";
import { notify } from "@/lib/services";

export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ action: string }> }) {
  const { action } = await ctx.params;
  await ensureSeeded();
  const b = await body<{ name?: string; email?: string; password?: string; phone?: string }>(req);

  if (action === "logout") {
    await destroySession();
    return ok();
  }

  const email = String(b.email ?? "").trim().toLowerCase();
  const password = String(b.password ?? "");
  if (!/^\S+@\S+\.\S+$/.test(email)) return fail("Enter a valid email address");

  if (action === "login") {
    const [u] = await db.select({ id: users.id, role: users.role, passwordHash: users.passwordHash }).from(users).where(eq(users.email, email)).limit(1);
    if (!u || !verifyPassword(password, u.passwordHash)) return fail("Incorrect email or password", 401);
    // Block the historically shipped bootstrap admin credentials until rotated.
    if (process.env.NODE_ENV === "production" && email === "admin@gowayy.in" && u.role === "admin" && verifyPassword("admin123", u.passwordHash)) return fail("Administrator password must be rotated before access", 403);
    await createSession(u.id);
    return ok({ role: u.role });
  }

  if (action === "signup") {
    const name = String(b.name ?? "").trim();
    if (name.length < 2) return fail("Please enter your name");
    if (password.length < 6) return fail("Password must be at least 6 characters");
    const [exists] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (exists) return fail("An account with this email already exists", 409);
    const [u] = await db
      .insert(users)
      .values({ name, email, phone: String(b.phone ?? "").trim(), passwordHash: hashPassword(password), wallet: process.env.NODE_ENV === "production" ? 0 : 500 })
      .returning({ id: users.id, role: users.role });
    if (process.env.NODE_ENV !== "production") {
      await db.insert(payments).values({ userId: u.id, kind: "bonus", refCode: "welcome", amount: 500, method: "wallet", status: "paid", txnId: `bonus_${u.id}` });
    }
    await notify(u.id, "Welcome to gowayy", "Explore local shops, stays and journeys.", "info", "/explore");
    await createSession(u.id);
    return ok({ role: u.role });
  }
  return fail("Unknown action", 404);
}
