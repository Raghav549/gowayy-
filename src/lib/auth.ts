import crypto from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

const SECRET = process.env.AUTH_SECRET ?? "gowayy-local-secret-change-me-in-production";
const COOKIE = "gw_session";
const MAX_AGE = 60 * 60 * 24 * 30;

export function hashPassword(pw: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(pw, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(pw: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const test = crypto.scryptSync(pw, salt, 64);
  const orig = Buffer.from(hash, "hex");
  return orig.length === test.length && crypto.timingSafeEqual(orig, test);
}

function sign(value: string) {
  return crypto.createHmac("sha256", SECRET).update(value).digest("base64url");
}

export async function createSession(userId: number) {
  const payload = Buffer.from(JSON.stringify({ uid: userId, exp: Date.now() + MAX_AGE * 1000 })).toString("base64url");
  const jar = await cookies();
  jar.set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

async function readUserId(): Promise<number | null> {
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  if (!raw) return null;
  const [payload, sig] = raw.split(".");
  if (!payload || !sig) return null;
  const expected = sign(payload);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (typeof data.uid !== "number" || data.exp < Date.now()) return null;
    return data.uid;
  } catch {
    return null;
  }
}

export type SessionUser = {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: string;
  wallet: number;
  address: string;
};

export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const uid = await readUserId();
  if (!uid) return null;
  const [u] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      role: users.role,
      wallet: users.wallet,
      address: users.address,
    })
    .from(users)
    .where(eq(users.id, uid))
    .limit(1);
  return u ?? null;
});
