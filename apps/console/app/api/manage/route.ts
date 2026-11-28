import crypto from "node:crypto";
import {NextResponse} from "next/server";
import {pool,getUser,mode,sameOrigin,nextPath,safeImage,safeRoute} from "@/lib/core";
export const dynamic="force-dynamic";
const f=(b:FormData,k:string,n=300)=>String(b.get(k)||"").trim().slice(0,n);
const n=(b:FormData,k:string)=>Math.floor(Number(b.get(k))||0);
const go=(r:Request,status:"updated"|"error")=>NextResponse.redirect(nextPath(r,"/?"+status+"=1"),303);
const allowedTransitions:Record<string,string[]>={
 placed:["confirmed","cancelled"],confirmed:["preparing","cancelled"],
 preparing:["out_for_delivery","cancelled"],out_for_delivery:["delivered"],delivered:[],cancelled:[],
};
const ringMap:Record<string,string>={
 violet:"from-brand-400 via-fuchsia-400 to-brand-700",green:"from-emerald-400 via-teal-400 to-brand-500",orange:"from-orange-400 via-rose-400 to-brand-500",amber:"from-amber-400 via-orange-400 to-brand-500",pink:"from-pink-400 via-fuchsia-400 to-brand-500",sky:"from-sky-400 via-indigo-400 to-brand-500",red:"from-red-500 via-orange-400 to-brand-500"
};
async function hasVendor(uid:number,id:number){
 const {rowCount}=await pool.query(`SELECT 1 FROM gw_organization_memberships m
 JOIN gw_organizations o ON o.id=m.organization_id AND o.status='approved'
 JOIN gw_organization_resources r ON r.organization_id=o.id
 WHERE m.user_id=$1 AND m.status='active' AND m.role IN ('owner','manager') AND r.resource_type='vendor' AND r.resource_id=$2 LIMIT 1`,[uid,id]);
 return Boolean(rowCount);
}
async function act(req:Request,b:FormData,user:{id:number;role:string}){
 const action=f(b,"action",50);
 if(action==="apply-business"&&mode==="business"){
  const kind=f(b,"kind",20),name=f(b,"name",150),email=f(b,"email",250).toLowerCase(),phone=f(b,"phone",30),address=f(b,"address",500);
  if(!["shop","grocery","restaurant","hotel","cab","tour"].includes(kind)||name.length<3||!/^\S+@\S+\.\S+$/.test(email))throw new Error("Invalid application");
  const client=await pool.connect();
  try{await client.query("BEGIN");const id=crypto.randomUUID();await client.query("INSERT INTO gw_organizations(id,kind,display_name,contact_email,contact_phone,address) VALUES($1,$2,$3,$4,$5,$6)",[id,kind,name,email,phone,address]);await client.query("INSERT INTO gw_organization_memberships(user_id,organization_id,role) VALUES($1,$2,'owner')",[user.id,id]);await client.query("INSERT INTO gw_partner_audit(actor_id,organization_id,action) VALUES($1,$2,'partner_applied')",[user.id,id]);await client.query("COMMIT");}catch(e){await client.query("ROLLBACK").catch(()=>{});throw e;}finally{client.release();}
  return;
 }
 if(action==="product-create"){
  const vendor=n(b,"vendorId"),name=f(b,"name",200),price=n(b,"price"),mrp=Math.max(price,n(b,"mrp")),category=f(b,"category",100),image=f(b,"image",1200);
  if(!name||!category||price<=0||vendor<=0||(image&&!safeImage(image)))throw new Error("Invalid item");
  if(mode==="business"&&!await hasVendor(user.id,vendor))throw new Error("No vendor access");
  await pool.query(`INSERT INTO products(vendor_id,name,description,image,emoji,price,mrp,unit,category,veg,available,tag,is_experience) VALUES($1,$2,'',$3,'🛍️',$4,$5,'',$6,true,true,'',false)`,[vendor,name,image,price,mrp,category]);return;
 }
 if(action==="product-toggle"&&mode==="business"){
  const id=n(b,"productId");
  const {rows}=await pool.query<{vendor_id:number}>("SELECT vendor_id FROM products WHERE id=$1",[id]);
  if(!rows[0]||!await hasVendor(user.id,rows[0].vendor_id))throw new Error("No access");
  await pool.query("UPDATE products SET available=NOT available WHERE id=$1",[id]);return;
 }
 if(action==="order-status"&&mode==="business"){
  const id=n(b,"orderId"),status=f(b,"status",40);
  const client=await pool.connect();
  try{
   await client.query("BEGIN");
   const {rows}=await client.query<{vendor_id:number;status:string;user_id:number;code:string}>("SELECT vendor_id,status,user_id,code FROM orders WHERE id=$1 FOR UPDATE",[id]);
   const o=rows[0];
   if(!o||!await hasVendor(user.id,o.vendor_id)||!allowedTransitions[o.status]?.includes(status))throw new Error("Invalid status or access");
   await client.query("UPDATE orders SET status=$1,auto_progress=false WHERE id=$2",[status,id]);
   await client.query("INSERT INTO order_events(order_id,status,note) VALUES($1,$2,$3)",[id,status,"Updated by verified business partner"]);
   await client.query("INSERT INTO notifications(user_id,title,body,kind,link) VALUES($1,$2,$3,'order',$4)",[o.user_id,"Order "+o.code+" "+status,"Your order status was updated by the store","/orders/"+o.code]);
   await client.query("COMMIT");
  }catch(e){await client.query("ROLLBACK").catch(()=>{});throw e;}finally{client.release();}
  return;
 }
 if(mode!=="admin"||user.role!=="admin")throw new Error("Admins only");
 if(action==="approve"){
  const id=f(b,"organizationId",100),status=f(b,"status",40);
  if(!["pending","approved","rejected","suspended"].includes(status))throw new Error("Invalid status");
  const client=await pool.connect();
  try{await client.query("BEGIN");const {rowCount}=await client.query("UPDATE gw_organizations SET status=$1,updated_at=now() WHERE id=$2",[status,id]);if(!rowCount)throw new Error("Missing organization");await client.query("INSERT INTO gw_partner_audit(actor_id,organization_id,action,payload) VALUES($1,$2,'partner_decision',$3::jsonb)",[user.id,id,JSON.stringify({status})]);await client.query("COMMIT");}catch(e){await client.query("ROLLBACK").catch(()=>{});throw e;}finally{client.release();}
  return;
 }
 if(action==="link-resource"){
  const org=f(b,"organizationId",100),kind=f(b,"resourceType",40),id=n(b,"resourceId");
  const table:Record<string,string>={vendor:"vendors",hotel:"hotels",cab_type:"cab_types",package:"packages"};
  if(!table[kind]||!org||id<=0)throw new Error("Invalid mapping");
  const o=await pool.query("SELECT 1 FROM gw_organizations WHERE id=$1 AND status='approved'",[org]);
  const x=await pool.query("SELECT 1 FROM "+table[kind]+" WHERE id=$1",[id]);
  if(!o.rowCount||!x.rowCount)throw new Error("Organization or listing unavailable");
  await pool.query("INSERT INTO gw_organization_resources(organization_id,resource_type,resource_id) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING",[org,kind,id]);return;
 }
 if(action==="cms-save"){
  const type=f(b,"type",12),id=f(b,"id",100)||crypto.randomUUID(),label=f(b,"label",100),href=f(b,"href",350),img=f(b,"image",1200),position=Math.min(500,Math.max(0,n(b,"position"))),enabled=b.has("enabled");
  if(!["category","banner"].includes(type)||!label||!safeRoute(href)||!safeImage(img))throw new Error("Invalid CMS values");
  const table=type==="category"?"gw_home_categories":"gw_home_banners";
  if(b.get("archive")==="true"){await pool.query("UPDATE "+table+" SET enabled=false,updated_at=now() WHERE id=$1",[id]);return;}
  if(type==="category"){
   const ring=ringMap[f(b,"ring",20)]||ringMap.violet;
   await pool.query(`INSERT INTO gw_home_categories(id,label,href,image_url,ring,position,enabled) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(id) DO UPDATE SET label=excluded.label,href=excluded.href,image_url=excluded.image_url,ring=excluded.ring,position=excluded.position,enabled=excluded.enabled,updated_at=now()`,[id,label,href,img,ring,position,enabled]);
  }else{
   await pool.query(`INSERT INTO gw_home_banners(id,label,title,detail,href,image_url,code,position,enabled) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(id) DO UPDATE SET label=excluded.label,title=excluded.title,detail=excluded.detail,href=excluded.href,image_url=excluded.image_url,code=excluded.code,position=excluded.position,enabled=excluded.enabled,updated_at=now()`,[id,label,f(b,"title",200),f(b,"detail",400),href,img,f(b,"code",50),position,enabled]);
  }
  return;
 }
 if(action==="edit-entity"){
  const kind=f(b,"entity",20),id=n(b,"id"),name=f(b,"name",200),img=f(b,"image",1200),price=n(b,"price");
  const tables:Record<string,{table:string;image:boolean;price?:string}>={vendor:{table:"vendors",image:true},product:{table:"products",image:true,price:"price"},hotel:{table:"hotels",image:true,price:"price_per_night"},package:{table:"packages",image:true,price:"price"},cab_type:{table:"cab_types",image:false,price:"base_fare"}};
  const spec=tables[kind];if(!spec||id<=0||!name||spec.image&&img&&!safeImage(img)||spec.price&&price<0)throw new Error("Invalid listing data");
  const args:unknown[]=[name],sets=["name=$1"];
  if(spec.image){args.push(img);sets.push("image=$"+args.length);}
  if(spec.price){args.push(price);sets.push(spec.price+"=$"+args.length);}
  args.push(id);await pool.query("UPDATE "+spec.table+" SET "+sets.join(",")+" WHERE id=$"+args.length,args);return;
 }
 throw new Error("Invalid action");
}
export async function POST(req:Request){
 if(!sameOrigin(req))return NextResponse.json({error:"Origin not allowed"},{status:403});
 const user=await getUser();if(!user)return NextResponse.redirect(nextPath(req,"/login"),303);
 try{await act(req,await req.formData(),user);return go(req,"updated");}
 catch(e){console.error("[console mutation]",(e as Error).message);return go(req,"error");}
}
