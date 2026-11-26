import crypto from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { eq, sql } from "drizzle-orm";
import { databaseUrl, db } from "@/db";
import { ensureSeeded } from "@/lib/seed";
import { users } from "@/db/schema";

/**
 * Session-signing key. Set AUTH_SECRET in production. Without it, a key is
 * derived from the (secret) database URL so a fresh deployment still has a
 * private, stable key instead of a public default.
 */
const SECRET =
  process.env.AUTH_SECRET ||
  (databaseUrl()
    ? crypto.createHash("sha256").update(`gowayy-session:${databaseUrl()}`).digest("hex")
    : "gowayy-local-dev-secret");
const COOKIE = "gw_session";
const MAX_AGE = 60 * 60 * 24 * 30;

export { hashPassword, verifyPassword } from "@/lib/password";

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
  /** versioned URL of the profile photo, or "" when the user has none */
  avatar: string;
};

export const avatarUrl = (version: string | null | undefined) => (version ? `/api/profile/avatar?v=${version}` : "");

export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const uid = await readUserId();
  if (!uid) return null;
  await ensureSeeded();
  const [u] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      role: users.role,
      wallet: users.wallet,
      address: users.address,
      avatarV: sql<string>`case when ${users.avatar} = '' then '' else substr(md5(${users.avatar}), 1, 12) end`,
    })
    .from(users)
    .where(eq(users.id, uid))
    .limit(1);
  if (!u) return null;
  const { avatarV, ...rest } = u;
  return { ...rest, avatar: avatarUrl(avatarV) };
});
