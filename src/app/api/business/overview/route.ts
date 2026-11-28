import { pool } from "@/db";
import { getBusinessScopes } from "@/lib/business-access";
import { needUser, fail, ok } from "@/lib/api";
export const dynamic="force-dynamic";
export async function GET() {
 const u=await needUser(); if(!u) return fail("Sign in",401);
 const scopes=await getBusinessScopes();
 const {rows:pending}=await pool.query("SELECT o.id,o.kind,o.display_name,o.status FROM gw_organizations o JOIN gw_organization_memberships m ON o.id=m.organization_id WHERE m.user_id=$1 AND o.status != 'approved' ORDER BY o.created_at DESC",[u.id]);
 return ok({organizations:scopes,pending});
}
