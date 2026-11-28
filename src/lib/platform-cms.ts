import { pool } from "@/db";
import { HOME_CATEGORIES, type HomeCategory } from "@/components/categories";
import type { OfferSlide } from "@/lib/offers";

export type CmsCategory = HomeCategory & { id: string; position: number; enabled: boolean };
export type CmsBanner = OfferSlide & { id: string; position: number; enabled: boolean };

const categories = HOME_CATEGORIES.map((c, i) => ({ ...c, id: "category-" + i, position: i, enabled: true }));

export async function readCategories(): Promise<CmsCategory[]> {
  try {
    const { rows } = await pool.query<{ id: string; label: string; href: string; image_url: string; ring: string; position: number; enabled: boolean }>(
      "SELECT id, label, href, image_url, ring, position, enabled FROM gw_home_categories ORDER BY position, id",
    );
    return rows.filter((r) => r.enabled).map((r) => ({ id: r.id, label: r.label, href: r.href, img: r.image_url, ring: r.ring, position: r.position, enabled: r.enabled }));
  } catch (e) {
    if ((e as { code?: string }).code === "42P01") return categories;
    throw e;
  }
}

export async function readBanners(fallback: OfferSlide[]): Promise<CmsBanner[]> {
  try {
    const { rows } = await pool.query<{ id: string; label: string; title: string; detail: string; href: string; image_url: string; code: string; position: number; enabled: boolean }>(
      "SELECT id, label, title, detail, href, image_url, code, position, enabled FROM gw_home_banners ORDER BY position, id",
    );
    return rows.filter((r) => r.enabled).map((r) => ({ key: r.id, id: r.id, badge: r.label, title: r.title, detail: r.detail, href: r.href, img: r.image_url, code: r.code || undefined, position: r.position, enabled: r.enabled }));
  } catch (e) {
    if ((e as { code?: string }).code === "42P01") return fallback.map((x, i) => ({ ...x, id: x.key, position: i, enabled: true }));
    throw e;
  }
}

export const DEFAULT_CATEGORIES: CmsCategory[] = categories;
