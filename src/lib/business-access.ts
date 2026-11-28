import { pool } from "@/db";
import { getCurrentUser } from "@/lib/auth";

export type BusinessKind = "shop" | "grocery" | "restaurant" | "hotel" | "cab" | "tour";
export type BusinessScope = { organizationId: string; kind: BusinessKind; role: string; status: string };

/** Server-side tenant membership; never trust an organization ID from client input alone. */
export async function getBusinessScopes(): Promise<BusinessScope[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  try {
    const { rows } = await pool.query<{ organization_id: string; kind: BusinessKind; role: string; status: string }>(
      `SELECT o.id AS organization_id, o.kind, m.role, m.status
       FROM gw_organization_memberships m JOIN gw_organizations o ON o.id=m.organization_id
       WHERE m.user_id=$1 AND m.status='active' AND o.status='approved'`, [user.id]);
    return rows.map((r) => ({ organizationId: r.organization_id, kind: r.kind, role: r.role, status: r.status }));
  } catch (e) {
    if ((e as {code?: string}).code === "42P01") return [];
    throw e;
  }
}

export async function requireOrganization(orgId: string, allow: string[] = ["owner","manager"]) {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, status: 401 };
  const scopes = await getBusinessScopes();
  const scope = scopes.find((s) => s.organizationId === orgId && allow.includes(s.role));
  if (!scope) return { ok: false as const, status: 403 };
  return { ok: true as const, scope, user };
}
