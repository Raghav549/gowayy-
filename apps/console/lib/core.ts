import crypto from "node:crypto";
import { cookies } from "next/headers";
import { Pool, type PoolConfig } from "pg";

export type Mode = "admin" | "business";
export const mode: Mode = process.env.CONSOLE_MODE === "admin" ? "admin" : "business";
export type User = { id: number; name: string; email: string; role: string };

const g = globalThis as typeof globalThis & { __gowayyConsolePool?: Pool };
function poolConfig(): PoolConfig {
 const url=process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
 if(!url) return { max: 1 };
 const u=new URL(url);
 const local = ["localhost","127.0.0.1"].includes(u.hostname);
 for(const p of ["sslmode","uselibpqcompat"])u.searchParams.delete(p);
 return {connectionString:u.toString(),ssl:local?false:{rejectUnauthorized:false},max:3,connectionTimeoutMillis:8000,idleTimeoutMillis:5000};
}
export const pool=g.__gowayyConsolePool??(g.__gowayyConsolePool=new Pool(poolConfig()));
export function configured(){return Boolean(process.env.DATABASE_URL||process.env.POSTGRES_URL);}
export function verifyPassword(pw:string,stored:string):boolean {
 try{const [salt,hash]=stored.split(":");if(!salt||!hash)return false;const left=crypto.scryptSync(pw,salt,64),right=Buffer.from(hash,"hex");return left.length===right.length && crypto.timingSafeEqual(left,right);}catch{return false;}
}
export function hashPassword(pw:string){const salt=crypto.randomBytes(16).toString("hex");return salt+":"+crypto.scryptSync(pw,salt,64).toString("hex");}
const COOKIE="gw_console_session";
function secret(){return process.env.AUTH_SECRET || "";}
function sign(v:string){return crypto.createHmac("sha256",secret()).update(v).digest("base64url");}
export function createToken(userId:number){if(!secret()||secret().length<32)throw new Error("AUTH_SECRET must be configured securely");const payload=Buffer.from(JSON.stringify({uid:userId,exp:Date.now()+7*86400000,mode})).toString("base64url");return payload+"."+sign(payload);}
export function sessionCookie(){return {name:COOKIE,httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax" as const,path:"/",maxAge:7*86400};}
export async function getUser():Promise<User|null>{
 if(!configured()||!secret())return null;
 const raw=(await cookies()).get(COOKIE)?.value;
 if(!raw)return null;
 try{const [payload,sig]=raw.split(".");if(!payload||!sig)return null;const expected=sign(payload);if(sig.length!==expected.length||!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))return null;const session=JSON.parse(Buffer.from(payload,"base64url").toString()) as {uid:number;exp:number;mode:string};if(!Number.isSafeInteger(session.uid)||session.exp<Date.now()||session.mode!==mode)return null;
 const {rows}=await pool.query<User>("SELECT id,name,email,role FROM users WHERE id=$1",[session.uid]);const user=rows[0];if(!user || (mode==="admin"&&user.role!=="admin"))return null;return user;
 }catch{return null;}
}
export async function requireUser(){const user=await getUser();return user;}
export async function activeOrganizations(uid:number){
 return (await pool.query<{id:string;kind:string;display_name:string;status:string;role:string}>(`SELECT o.id,o.kind,o.display_name,o.status,m.role FROM gw_organizations o JOIN gw_organization_memberships m ON o.id=m.organization_id WHERE m.user_id=$1 ORDER BY o.created_at DESC`,[uid])).rows;
}
export function sameOrigin(req:Request){
 const origin=req.headers.get("origin");return !origin || origin===new URL(req.url).origin;
}
export function nextPath(req:Request,path:string){return new URL(path,new URL(req.url).origin);}
export function safeImage(value:string){return value.startsWith("/media/")||value.startsWith("/uploads/")||/^https:\/\//.test(value);}
export function safeRoute(value:string){return value.startsWith("/")&&!value.startsWith("//")&&!value.includes("\\");}
