import Link from "next/link";
import {redirect} from "next/navigation";
import {getUser,mode,configured} from "@/lib/core";
export default async function Login({searchParams}:{searchParams:Promise<{error?:string}>}){
 if(await getUser())redirect("/");
 const {error}=await searchParams;
 return <div className="glass auth">
  <span className="tag">{mode==="admin"?"Protected administrator access":"Partner workspace"}</span>
  <h1 style={{marginTop:18}}>Welcome back</h1>
  <p className="sub">Sign in with your existing Gowayy account. All identities belong to the shared platform.</p>
  {!configured()?<p className="error">Sign in is temporarily unavailable. Please try again shortly.</p>:null}
  {error?<p className="error">{error==="invalid"?"Incorrect credentials or permission denied":error==="secure"?"Secure sign in is temporarily unavailable":"Unable to sign in"}</p>:null}
  <form action="/api/session" method="post">
   <input type="hidden" name="action" value="login"/>
   <label className="field"><span>Email address</span><input className="input" name="email" type="email" autoComplete="email" required/></label>
   <label className="field"><span>Password</span><input className="input" name="password" type="password" autoComplete="current-password" minLength={6} required/></label>
   <button className="btn" style={{width:"100%"}}>Sign in securely</button>
  </form>
  {mode==="business"?<p className="copy" style={{marginTop:20}}>New business? <Link href="/register" style={{color:"#7c3aed",fontWeight:800}}>Create a partner account</Link></p>:<p className="copy" style={{marginTop:18}}>Admin access is granted only to verified, existing platform administrators. Default demo credentials are rejected.</p>}
 </div>;
}
