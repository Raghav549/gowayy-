import Link from "next/link";
import {redirect} from "next/navigation";
import {mode,getUser} from "@/lib/core";
export default async function Register({searchParams}:{searchParams:Promise<{error?:string}>}){
 if(mode!=="business")redirect("/");
 if(await getUser())redirect("/");
 const {error}=await searchParams;
 return <div className="glass auth"><span className="tag">Gowayy Business · Step 1 of 3</span><h1 style={{marginTop:18}}>Build your local business</h1>
 <p className="sub">Create your identity, choose the business type, and submit your store or fleet for approval. Admin verification is mandatory before listings go live.</p>
 {error?<p className="error">Registration failed. Check your details, and use a new email address.</p>:null}
 <form action="/api/session" method="post">
  <input type="hidden" name="action" value="register"/>
  <label className="field"><span>Your name</span><input className="input" name="name" minLength={2} maxLength={100} required/></label>
  <label className="field"><span>Email</span><input className="input" name="email" type="email" required/></label>
  <label className="field"><span>Password (10+ characters)</span><input className="input" name="password" type="password" minLength={10} autoComplete="new-password" required/></label>
  <label className="field"><span>Business type</span><select className="input" name="kind"><option value="shop">Shop</option><option value="grocery">Grocery store</option><option value="restaurant">Restaurant / food</option><option value="hotel">Hotel / homestay</option><option value="cab">Cab fleet / travel</option><option value="tour">Tour company</option></select></label>
  <label className="field"><span>Business name</span><input className="input" name="businessName" minLength={3} maxLength={150} required/></label>
  <label className="field"><span>Contact phone</span><input className="input" name="phone" inputMode="tel"/></label>
  <label className="field"><span>Business address</span><textarea className="input" name="address" rows={3}/></label>
  <button className="btn" style={{width:"100%"}}>Submit for verification</button>
 </form>
 <p className="copy" style={{marginTop:16}}>Already registered? <Link href="/login" style={{color:"#7c3aed"}}>Sign in</Link>. This application does not immediately grant inventory publishing rights.</p>
 </div>;
}
