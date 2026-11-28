import { pool } from "@/db";
import { body, fail, needUser, ok } from "@/lib/api";

export const dynamic = "force-dynamic";
export async function POST(req: Request) {
 const u=await needUser(); if (!u || u.role!=="admin") return fail("Admins only",403);
 const b=await body<{id?: string; status?: string}>(req);
 const id=String(b.id??"").trim(), status=String(b.status??"");
 if (!id || !["approved","rejected","suspended"].includes(status)) return fail("Invalid decision");
 const client=await pool.connect();
 try {
  await client.query("BEGIN");
  const r=await client.query("UPDATE gw_organizations SET status=$1,updated_at=now() WHERE id=$2 RETURNING id",[status,id]);
  if (!r.rowCount) { await client.query("ROLLBACK"); return fail("Business not found",404); }
  await client.query("INSERT INTO gw_partner_audit(actor_id,organization_id,action,payload) VALUES($1,$2,'partner_decision',$3::jsonb)",[u.id,id,JSON.stringify({status})]);
  await client.query("COMMIT"); return ok({status});
 } catch(e) {await client.query("ROLLBACK").catch(()=>{}); console.error("Approval failed",e);return fail("Could not update approval",503);}
 finally {client.release();}
}
