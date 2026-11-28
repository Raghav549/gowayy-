import { pool } from "@/db";
import { needUser, fail, ok, body } from "@/lib/api";
import type { BusinessKind } from "@/lib/business-access";

export const dynamic = "force-dynamic";
const kinds = new Set<BusinessKind>(["shop","grocery","restaurant","hotel","cab","tour"]);
export async function POST(req: Request) {
  const u = await needUser();
  if (!u) return fail("Sign in before registering a business",401);
  const b = await body<{ kind?: BusinessKind; name?: string; email?: string; phone?: string; address?: string }>(req);
  const name = String(b.name??"").trim().slice(0,150), email=String(b.email??"").trim().toLowerCase().slice(0,250);
  if (!kinds.has(b.kind as BusinessKind) || name.length < 3 || !/^\S+@\S+\.\S+$/.test(email)) return fail("Valid business type, name and email are required");
  const client=await pool.connect();
  try {
    await client.query("BEGIN");
    const id=crypto.randomUUID();
    await client.query("INSERT INTO gw_organizations(id,kind,display_name,contact_email,contact_phone,address) VALUES($1,$2,$3,$4,$5,$6)",[id,b.kind,name,email,String(b.phone??"").trim().slice(0,30),String(b.address??"").trim().slice(0,500)]);
    await client.query("INSERT INTO gw_organization_memberships(user_id,organization_id,role) VALUES($1,$2,'owner')",[u.id,id]);
    await client.query("INSERT INTO gw_partner_audit(actor_id,organization_id,action) VALUES($1,$2,'partner_applied')",[u.id,id]);
    await client.query("COMMIT");
    return ok({ id, status: "pending" });
  } catch(e) { await client.query("ROLLBACK").catch(()=>{}); console.error("Business registration failed",e); return fail("Registration unavailable, please try again",503); }
  finally { client.release(); }
}
