import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { body, fail, ok, needUser } from "@/lib/api";
import { avatarUrl, ensureAvatarColumn } from "@/lib/auth";
import crypto from "node:crypto";

export const dynamic = "force-dynamic";

// The client resizes photos to 320×320 JPEG/WebP (~20–60 KB). Anything larger is rejected.
const MAX_BYTES = 300 * 1024;
const DATA_URL = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/;

/** Streams the signed-in user's profile photo. URLs are versioned (?v=hash) so they can be cached. */
export async function GET() {
  const u = await needUser();
  if (!u) return new Response(null, { status: 401 });
  await ensureAvatarColumn();
  const [row] = await db.select({ avatar: users.avatar }).from(users).where(eq(users.id, u.id)).limit(1);
  const m = row?.avatar.match(DATA_URL);
  if (!m) return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  return new Response(Buffer.from(m[2], "base64"), {
    headers: { "Content-Type": m[1], "Cache-Control": "private, max-age=31536000, immutable" },
  });
}

export async function POST(req: Request) {
  const u = await needUser();
  if (!u) return fail("Please sign in", 401);
  const b = await body<{ image?: string }>(req);
  const image = String(b.image ?? "");
  const m = image.match(DATA_URL);
  if (!m) return fail("Please choose a JPG, PNG or WebP image");
  if (Buffer.byteLength(m[2], "base64") > MAX_BYTES) return fail("That photo is too large — try a smaller one");
  await ensureAvatarColumn();
  await db.update(users).set({ avatar: image }).where(eq(users.id, u.id));
  const v = crypto.createHash("md5").update(image).digest("hex").slice(0, 12);
  return ok({ avatar: avatarUrl(v) });
}

export async function DELETE() {
  const u = await needUser();
  if (!u) return fail("Please sign in", 401);
  await ensureAvatarColumn();
  await db.update(users).set({ avatar: "" }).where(eq(users.id, u.id));
  return ok({ avatar: "" });
}
