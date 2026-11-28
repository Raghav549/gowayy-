import {NextResponse} from "next/server";
import crypto from "node:crypto";
import {pool,mode,configured,verifyPassword,hashPassword,createToken,sessionCookie,sameOrigin,nextPath} from "@/lib/core";
export const dynamic="force-dynamic";
function err(req:Request,code:string){return NextResponse.redirect(nextPath(req,code==="register"?"/register?error=invalid":"/login?error="+encodeURIComponent(code)),303);}
function field(f:FormData,key:string,max=200){return String(f.get(key)||"").trim().slice(0,max);}
export async function POST(req:Request){
 if(!sameOrigin(req))return NextResponse.json({error:"Origin mismatch"},{status:403});
 const form=await req.formData(),action=field(form,"action");
 if(action==="logout"){const r=NextResponse.redirect(nextPath(req,"/login"),303);r.cookies.set({...sessionCookie(),value:"",maxAge:0});return r;}
 if(!configured() || !process.env.AUTH_SECRET || process.env.AUTH_SECRET.length<32)return err(req,"secure");
 if(action==="login"){
  const email=field(form,"email",250).toLowerCase(),password=String(form.get("password")||"");
  try {
   const {rows}=await pool.query<{id:number;role:string;password_hash:string;email:string}>("SELECT id,role,password_hash,email FROM users WHERE email=$1 LIMIT 1",[email]);
   const user=rows[0];
   if(!user||!verifyPassword(password,user.password_hash)||mode==="admin"&&user.role!=="admin")return err(req,"invalid");
   // Previously shipped bootstrap credentials must be rotated and must never authenticate the new console.
   if(user.role==="admin" && user.email==="admin@gowayy.in" && verifyPassword("admin123",user.password_hash))return err(req,"invalid");
   const r=NextResponse.redirect(nextPath(req,"/"),303);r.cookies.set({...sessionCookie(),value:createToken(user.id)});return r;
  }catch(e){console.error("[console login]",(e as Error).message);return err(req,"invalid");}
 }
 if(action==="register"&&mode==="business"){
  const email=field(form,"email",250).toLowerCase(),password=String(form.get("password")||""),name=field(form,"name",100);
  const kind=field(form,"kind",20),business=field(form,"businessName",150),phone=field(form,"phone",30),address=field(form,"address",500);
  if(!/^\S+@\S+\.\S+$/.test(email)||password.length<10||name.length<2||business.length<3||!["shop","grocery","restaurant","hotel","cab","tour"].includes(kind))return err(req,"register");
  const client=await pool.connect();
  try{
   await client.query("BEGIN");
   const {rows}=await client.query<{id:number}>("INSERT INTO users(name,email,password_hash,phone,role,wallet,address) VALUES ($1,$2,$3,$4,'user',0,'') RETURNING id",[name,email,hashPassword(password),phone]);
   const id=crypto.randomUUID();
   await client.query("INSERT INTO gw_organizations(id,kind,display_name,contact_email,contact_phone,address) VALUES($1,$2,$3,$4,$5,$6)",[id,kind,business,email,phone,address]);
   await client.query("INSERT INTO gw_organization_memberships(user_id,organization_id,role) VALUES($1,$2,'owner')",[rows[0].id,id]);
   await client.query("INSERT INTO gw_partner_audit(actor_id,organization_id,action) VALUES($1,$2,'partner_applied')",[rows[0].id,id]);
   await client.query("COMMIT");
   const r=NextResponse.redirect(nextPath(req,"/"),303);r.cookies.set({...sessionCookie(),value:createToken(rows[0].id)});return r;
  }catch(e){await client.query("ROLLBACK").catch(()=>{});console.error("[console register]",(e as Error).message);return err(req,"register");}finally{client.release();}
 }
 return NextResponse.json({error:"Invalid action"},{status:400});
}
