import Link from "next/link";
import {redirect} from "next/navigation";
import {pool,getUser,mode,configured,activeOrganizations} from "@/lib/core";

export const dynamic="force-dynamic";
type RecordRow=Record<string,string|number|boolean|null>;
function Stat({label,value}:{label:string;value:number}){return <div className="stat"><small>{label}</small><strong>{value.toLocaleString("en-IN")}</strong></div>;}
function TextField({name,label,defaultValue="",type="text",required=false}:{name:string;label:string;defaultValue?:string|number;type?:string;required?:boolean}){return <label className="field"><span>{label}</span><input name={name} className="input" type={type} defaultValue={defaultValue} required={required}/></label>;}
function Submit({children}:{children:React.ReactNode}){return <button className="btn small">{children}</button>;}
function Sheet({title,children}:{title:string;children:React.ReactNode}){return <section className="glass"><h2 style={{fontSize:21,marginBottom:13}}>{title}</h2>{children}</section>;}
function Status({value}:{value:string}){return <span className="badge">{value.replace(/_/g," ")}</span>;}
async function sqlRows(query:string,params:unknown[]=[]){return (await pool.query<RecordRow>(query,params)).rows;}
function ItemForm({row,kind}:{row:RecordRow;kind:string}) {
 const id=Number(row.id);
 return <details className="item" style={{display:"block"}}><summary style={{cursor:"pointer"}}><strong>{String(row.name)}</strong><small>{kind} #{id} · edit listing</small></summary>
 <form action="/api/manage" method="post" style={{paddingTop:14}}><input type="hidden" name="action" value="edit-entity"/><input type="hidden" name="entity" value={kind}/><input type="hidden" name="id" value={id}/>
  <TextField name="name" label="Listing name" defaultValue={String(row.name||"")} required/>
  {kind!=="cab_type"?<TextField name="image" label="Image URL" defaultValue={String(row.image||"")}/>:null}
  <TextField name="price" label="Price (₹)" type="number" defaultValue={Number(row[kind==="hotel"?"price_per_night":kind==="cab_type"?"base_fare":"price"]||0)}/>
  <Submit>Save changes</Submit>
 </form></details>;
}
function CmsForm({row,type}:{row?:RecordRow;type:"category"|"banner"}) {
 const isCategory=type==="category";const id=String(row?.id||"");
 return <form action="/api/manage" method="post" className="glass" style={{padding:16}}>
 <input type="hidden" name="action" value="cms-save"/><input type="hidden" name="type" value={type}/><input type="hidden" name="id" value={id}/>
 <TextField name="label" label={isCategory?"Category title":"Banner badge"} defaultValue={String(row?.label||"")} required/>
 {!isCategory?<><TextField name="title" label="Banner headline" defaultValue={String(row?.title||"")}/><TextField name="detail" label="Offer terms" defaultValue={String(row?.detail||"")}/><TextField name="code" label="Coupon code" defaultValue={String(row?.code||"")}/></>:null}
 <TextField name="href" label="Customer destination link" defaultValue={String(row?.href||"/")} required/>
 <TextField name="image" label="Image path / approved HTTPS URL" defaultValue={String(row?.image_url||"")} required/>
 {isCategory?<label className="field"><span>Category gradient</span><select name="ring" className="input" defaultValue={String(row?.ring||"violet")}><option value="violet">Violet</option><option value="green">Green</option><option value="orange">Orange</option><option value="amber">Amber</option><option value="pink">Pink</option><option value="sky">Sky</option><option value="red">Red</option></select></label>:null}
 <TextField name="position" label="Display order" type="number" defaultValue={Number(row?.position||0)}/>
 <label className="field" style={{display:"flex",alignItems:"center",gap:8}}><input type="checkbox" name="enabled" defaultChecked={row?.enabled!==false}/><span style={{margin:0}}>Visible</span></label>
 <Submit>{id?"Save":"Create"}</Submit>
 {id?<button className="btn danger small" style={{marginLeft:8}} name="archive" value="true">Archive</button>:null}
 </form>;
}
export default async function Dashboard({searchParams}:{searchParams:Promise<{updated?:string;error?:string}>}){
 if(!configured())return <div className="glass auth"><h1>Connect the shared database</h1><p className="sub">Configure the existing Gowayy Neon DATABASE_URL and a 32+ character AUTH_SECRET for this Vercel project. Do not publish sensitive keys.</p></div>;
 const user=await getUser();if(!user)redirect("/login");
 const params=await searchParams;
 let counts:Record<string,number>={};
 try{
  const rows=await sqlRows("SELECT (SELECT count(*) FROM orders)::int orders, (SELECT count(*) FROM bookings)::int bookings, (SELECT count(*) FROM products)::int products, (SELECT count(*) FROM vendors)::int shops, (SELECT count(*) FROM hotels)::int hotels, (SELECT count(*) FROM users)::int customers");
  counts=Object.fromEntries(Object.entries(rows[0]||{}).map(([k,v])=>[k,Number(v)]));
 }catch(e){return <div className="glass"><h2>Database unavailable</h2><p className="error">{(e as Error).message}</p></div>;}
 if(mode==="business"){
  let orgs:Awaited<ReturnType<typeof activeOrganizations>>=[];
  try{orgs=await activeOrganizations(user.id);}catch{return <div className="glass"><h2>Business migration required</h2><p className="sub">Apply the additive organization and ownership SQL migrations after a database backup. Customer production remains unchanged.</p></div>;}
  const approved=orgs.filter(o=>o.status==="approved");
  const ids=approved.map(o=>o.id);
  const linked=ids.length?await sqlRows(`SELECT r.organization_id,r.resource_type,r.resource_id,coalesce(v.name,h.name,c.name,p.name,'Listing') name
   FROM gw_organization_resources r LEFT JOIN vendors v ON r.resource_type='vendor' AND v.id=r.resource_id
   LEFT JOIN hotels h ON r.resource_type='hotel' AND h.id=r.resource_id
   LEFT JOIN cab_types c ON r.resource_type='cab_type' AND c.id=r.resource_id
   LEFT JOIN packages p ON r.resource_type='package' AND p.id=r.resource_id
   WHERE r.organization_id=ANY($1::text[]) ORDER BY r.resource_type,r.resource_id`,[ids]):[];
  const merchantVendors=linked.filter(r=>r.resource_type==="vendor").map(r=>Number(r.resource_id));
  const orderRows=merchantVendors.length?await sqlRows("SELECT o.id,o.code,o.status,o.payment_status,o.total,v.name vendor FROM orders o JOIN vendors v ON v.id=o.vendor_id WHERE o.vendor_id=ANY($1::int[]) ORDER BY o.id DESC LIMIT 20",[merchantVendors]):[];
  const productRows=merchantVendors.length?await sqlRows("SELECT p.id,p.name,p.image,p.price,p.available,p.vendor_id,v.name vendor FROM products p JOIN vendors v ON v.id=p.vendor_id WHERE p.vendor_id=ANY($1::int[]) ORDER BY p.id DESC LIMIT 25",[merchantVendors]):[];
  return <>
   <div className="hero"><span className="tag">Partner command centre</span><h1>Welcome, {user.name}</h1><p>Run your verified stores, restaurants, hotels, cab fleets and tour businesses in one place. Only your approved listings and orders are visible here.</p></div>
   {params.updated?<p className="success">Update submitted successfully.</p>:null}{params.error?<p className="error">Action failed. Check your access, input or migration state.</p>:null}
   <div className="stats"><Stat label="My organizations" value={orgs.length}/><Stat label="Approved" value={approved.length}/><Stat label="Linked listings" value={linked.length}/><Stat label="Visible orders" value={orderRows.length}/></div>
   <h2 className="section">Your businesses</h2><div className="grid">
   {orgs.map(o=><Sheet key={o.id} title={o.display_name}><p className="sub">{o.kind} · {o.role}</p><Status value={o.status}/>{o.status==="pending"?<p className="sub" style={{marginTop:15}}>Awaiting Gowayy Admin review. Inventory publishing is locked until approval.</p>:null}</Sheet>)}
   {orgs.length===0?<Sheet title="Apply to join"><p className="sub">Use the customer identity you already have. Submit a business for verification.</p><form action="/api/manage" method="post"><input type="hidden" name="action" value="apply-business"/><TextField name="name" label="Business name" required/><TextField name="email" label="Business contact email" type="email" defaultValue={user.email} required/><TextField name="phone" label="Contact number"/><TextField name="address" label="Business address"/><label className="field"><span>Type</span><select name="kind" className="input"><option value="shop">Shop</option><option value="grocery">Grocery</option><option value="restaurant">Restaurant</option><option value="hotel">Hotel</option><option value="cab">Cab fleet</option><option value="tour">Tour company</option></select></label><Submit>Submit application</Submit></form></Sheet>:null}
   </div>
   <h2 className="section">Assigned listings</h2><div className="grid">{linked.map((r,i)=><Sheet key={i} title={String(r.name)}><p className="sub">Resource: {String(r.resource_type)} #{String(r.resource_id)}</p><Status value="approved"/></Sheet>)}{!linked.length?<Sheet title="No linked catalogue yet"><p className="sub">An administrator must verify ownership and connect existing listings. New business listing creation is part of the following release phase.</p></Sheet>:null}</div>
   {merchantVendors.length?<><h2 className="section">Manage products</h2><div className="grid">
   <Sheet title="Add a product"><form action="/api/manage" method="post"><input type="hidden" name="action" value="product-create"/><label className="field"><span>Shop</span><select name="vendorId" className="input">{linked.filter(x=>x.resource_type==="vendor").map(x=><option key={String(x.resource_id)} value={String(x.resource_id)}>{String(x.name)}</option>)}</select></label><TextField name="name" label="Product name" required/><TextField name="price" label="Price (₹)" type="number" required/><TextField name="mrp" label="MRP (₹)" type="number"/><TextField name="category" label="Category" required/><TextField name="image" label="Product image HTTPS URL or /media/*"/><Submit>Create product</Submit></form></Sheet>
   <Sheet title="Current products">{productRows.map(p=><form key={Number(p.id)} action="/api/manage" method="post" className="item"><input type="hidden" name="action" value="product-toggle"/><input type="hidden" name="productId" value={Number(p.id)}/><span><strong>{String(p.name)}</strong><small>{String(p.vendor)} · ₹{Number(p.price)} · {p.available?"Published":"Hidden"}</small></span><Submit>{p.available?"Pause":"Activate"}</Submit></form>)}</Sheet>
   </div><h2 className="section">Actual orders</h2><Sheet title="Partner fulfillment queue">{orderRows.length?orderRows.map(o=><form key={Number(o.id)} action="/api/manage" method="post" className="item"><input type="hidden" name="action" value="order-status"/><input type="hidden" name="orderId" value={Number(o.id)}/><span><strong>{String(o.code)} · ₹{Number(o.total)}</strong><small>{String(o.vendor)} · Payment: {String(o.payment_status)}</small><Status value={String(o.status)}/></span><select className="input" style={{width:135}} name="status" defaultValue={String(o.status)}><option value="placed">Placed</option><option value="confirmed">Accept</option><option value="preparing">Preparing</option><option value="out_for_delivery">Dispatched</option><option value="delivered">Delivered</option><option value="cancelled">Cancelled</option></select><Submit>Save</Submit></form>):<p className="sub">No actual orders yet.</p>}</Sheet></>:null}
  </>;
 }
 const [orgs,categoryRows,bannerRows,orders,bookings,products,vendors,hotels,packages,cabs]=await Promise.all([
  sqlRows("SELECT id,kind,display_name,status,contact_email FROM gw_organizations ORDER BY created_at DESC LIMIT 40").catch(()=>[]),
  sqlRows("SELECT * FROM gw_home_categories ORDER BY position,id").catch(()=>[]),
  sqlRows("SELECT * FROM gw_home_banners ORDER BY position,id").catch(()=>[]),
  sqlRows("SELECT o.id,o.code,o.status,o.total,o.payment_status FROM orders o ORDER BY id DESC LIMIT 20"),
  sqlRows("SELECT id,code,type,title,status,amount FROM bookings ORDER BY id DESC LIMIT 20"),
  sqlRows("SELECT id,name,image,price,available,vendor_id FROM products ORDER BY id DESC LIMIT 12"),
  sqlRows("SELECT id,name,image FROM vendors ORDER BY id DESC LIMIT 12"),
  sqlRows("SELECT id,name,image,price_per_night FROM hotels ORDER BY id DESC LIMIT 12"),
  sqlRows("SELECT id,name,image,price FROM packages ORDER BY id DESC LIMIT 12"),
  sqlRows("SELECT id,name,model,base_fare FROM cab_types ORDER BY id DESC LIMIT 12")
 ]);
 return <>
  <div className="hero"><span className="tag">Platform administration · Secure workspace</span><h1>Gowayy operations</h1><p>Manage the central commerce catalogue, homepage imagery, partner approvals, bookings and fulfillment. Changes go directly to the same shared database as the customer application.</p></div>
  {params.updated?<p className="success">Changes saved.</p>:null}{params.error?<p className="error">Change failed. Verify migration or access rights.</p>:null}
  <div className="stats"><Stat label="Customers" value={counts.customers||0}/><Stat label="Products" value={counts.products||0}/><Stat label="Shops" value={counts.shops||0}/><Stat label="Hotels" value={counts.hotels||0}/><Stat label="Orders" value={counts.orders||0}/><Stat label="Bookings" value={counts.bookings||0}/></div>
  <h2 className="section">Partner approval queue</h2><div className="grid">{orgs.map(o=><Sheet key={String(o.id)} title={String(o.display_name)}><p className="sub">{String(o.kind)} · {String(o.contact_email)}</p><Status value={String(o.status)}/><form style={{marginTop:12}} method="post" action="/api/manage"><input type="hidden" name="action" value="approve"/><input type="hidden" name="organizationId" value={String(o.id)}/><select className="input" name="status" defaultValue={String(o.status)}><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="suspended">Suspended</option></select><div style={{marginTop:10}}><Submit>Apply decision</Submit></div></form></Sheet>)}{!orgs.length?<Sheet title="No partner applications"><p className="sub">Business applications will appear here after the organization migration is run.</p></Sheet>:null}</div>
  <h2 className="section">Assign verified catalogue ownership</h2><Sheet title="Link an existing listing to an approved partner"><p className="sub">Verify identity and legal ownership before assigning. One listing can be linked to multiple managers in an organization, not arbitrary businesses.</p><form action="/api/manage" method="post"><input type="hidden" name="action" value="link-resource"/><label className="field"><span>Organization</span><select className="input" name="organizationId">{orgs.filter(o=>o.status==="approved").map(o=><option value={String(o.id)} key={String(o.id)}>{String(o.display_name)}</option>)}</select></label><label className="field"><span>Listing type</span><select name="resourceType" className="input"><option value="vendor">Shop / restaurant / grocery</option><option value="hotel">Hotel</option><option value="cab_type">Cab type (pilot only)</option><option value="package">Tour package</option></select></label><TextField name="resourceId" label="Existing listing numeric ID" type="number" required/><Submit>Link ownership</Submit></form></Sheet>
  <h2 className="section">Homepage category manager</h2><p className="sub">Category names, 2.5D artwork URLs, order and links are database-controlled. Existing customer categories remain visible until these tables are backfilled.</p><div className="grid"><CmsForm type="category"/>{categoryRows.map(r=><CmsForm key={String(r.id)} row={r} type="category"/>)}</div>
  <h2 className="section">Homepage banner manager</h2><div className="grid"><CmsForm type="banner"/>{bannerRows.map(r=><CmsForm key={String(r.id)} row={r} type="banner"/>)}</div>
  <h2 className="section">Listing administration</h2><div className="grid"><Sheet title="Shop & restaurant catalog">{vendors.map(r=><ItemForm key={String(r.id)} row={r} kind="vendor"/>)}</Sheet><Sheet title="Latest products">{products.map(r=><ItemForm key={String(r.id)} row={r} kind="product"/>)}</Sheet><Sheet title="Hotels and stays">{hotels.map(r=><ItemForm key={String(r.id)} row={r} kind="hotel"/>)}</Sheet><Sheet title="Tour packages">{packages.map(r=><ItemForm key={String(r.id)} row={r} kind="package"/>)}</Sheet><Sheet title="Cab classes">{cabs.map(r=><ItemForm key={String(r.id)} row={r} kind="cab_type"/>)}</Sheet></div>
  <h2 className="section">Central orders</h2><Sheet title="Recent checkouts">{orders.map(o=><div className="item" key={Number(o.id)}><span><strong>{String(o.code)} · ₹{Number(o.total)}</strong><small>Payment {String(o.payment_status)}</small></span><Status value={String(o.status)}/></div>)}</Sheet>
  <h2 className="section">Bookings</h2><Sheet title="Hotels, cabs and tours">{bookings.map(b=><div className="item" key={Number(b.id)}><span><strong>{String(b.code)} · {String(b.title)}</strong><small>{String(b.type)} · ₹{Number(b.amount)}</small></span><Status value={String(b.status)}/></div>)}</Sheet>
 </>;
}
