import { pool } from "@/db";
import { needUser, fail, ok, body } from "@/lib/api";
import { DEFAULT_CATEGORIES } from "@/lib/platform-cms";

export const dynamic = "force-dynamic";
const VALID_RING = new Set(["from-emerald-400 via-teal-400 to-brand-500","from-orange-400 via-rose-400 to-brand-500","from-amber-400 via-orange-400 to-brand-500","from-brand-400 via-fuchsia-400 to-brand-700","from-sky-400 via-indigo-400 to-brand-500","from-pink-400 via-fuchsia-400 to-brand-500","from-red-500 via-orange-400 to-brand-500"]);
type Item = { type?: string; id?: string; label?: string; title?: string; detail?: string; href?: string; img?: string; code?: string; ring?: string; position?: number; enabled?: boolean };
const str = (v: unknown, n = 200) => String(v ?? "").trim().slice(0, n);
const image = (v: string) => v.startsWith("/media/") || v.startsWith("/uploads/") || /^https:\/\//.test(v);
const href = (v: string) => v.startsWith("/") && !v.startsWith("//") && !v.includes("\\") && !v.includes("\r") && !v.includes("\n");

export async function GET() {
  const u = await needUser();
  if (!u || u.role !== "admin") return fail("Admins only", 403);
  const [cats, banners] = await Promise.all([
    pool.query("SELECT * FROM gw_home_categories ORDER BY position,id"),
    pool.query("SELECT * FROM gw_home_banners ORDER BY position,id"),
  ]);
  return ok({ categories: cats.rows, banners: banners.rows });
}

export async function POST(req: Request) {
  const u = await needUser();
  if (!u || u.role !== "admin") return fail("Admins only", 403);
  const b = await body<Item & { operation?: string }>(req);
  const type = str(b.type, 15);
  if (type !== "category" && type !== "banner") return fail("Invalid CMS collection");
  if (b.operation === "archive") {
    const id = str(b.id, 100);
    if (!id) return fail("Missing ID");
    const table = type === "category" ? "gw_home_categories" : "gw_home_banners";
    await pool.query(`UPDATE ${table} SET enabled=false, updated_at=now() WHERE id=$1`, [id]);
    return ok();
  }
  const id = str(b.id, 100) || crypto.randomUUID();
  const label = str(b.label, 100), link = str(b.href, 400), img = str(b.img, 1200);
  if (!label || !href(link) || !image(img)) return fail("Label, internal route and approved image URL are required");
  const position = Math.min(500, Math.max(0, Math.floor(Number(b.position) || 0)));
  const enabled = b.enabled !== false;
  if (type === "category") {
    const ring = VALID_RING.has(str(b.ring)) ? str(b.ring) : DEFAULT_CATEGORIES[0].ring;
    await pool.query(`INSERT INTO gw_home_categories (id,label,href,image_url,ring,position,enabled,updated_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,now()) ON CONFLICT(id) DO UPDATE SET label=excluded.label,href=excluded.href,image_url=excluded.image_url,ring=excluded.ring,position=excluded.position,enabled=excluded.enabled,updated_at=now()`, [id,label,link,img,ring,position,enabled]);
  } else {
    await pool.query(`INSERT INTO gw_home_banners (id,label,title,detail,href,image_url,code,position,enabled,updated_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,now()) ON CONFLICT(id) DO UPDATE SET label=excluded.label,title=excluded.title,detail=excluded.detail,href=excluded.href,image_url=excluded.image_url,code=excluded.code,position=excluded.position,enabled=excluded.enabled,updated_at=now()`, [id,label,str(b.title,200),str(b.detail,500),link,img,str(b.code,50),position,enabled]);
  }
  return ok({ id });
}
