import type {Metadata} from "next";
import Link from "next/link";
import type {ReactNode} from "react";
import {mode,getUser} from "@/lib/core";
import "./globals.css";
export const metadata:Metadata={title:mode==="admin"?"Gowayy Admin":"Gowayy Business",description:"Gowayy connected commerce operations"};
export default async function Layout({children}:{children:ReactNode}){
 const user=await getUser();
 return <html lang="en"><body><div className="shell">
 <header className="head">
  <div><Link href="/" className="brand" aria-label="gowayy home"><span>gowa</span><strong>yy</strong></Link><div className="mode">{mode==="admin"?"Administration":"Business Partner"}</div></div>
  <div className="nav"><Link href="/">Dashboard</Link>{mode==="business"&&!user?<Link href="/register">Join Gowayy</Link>:null}{user?<form action="/api/session" method="post"><input type="hidden" name="action" value="logout"/><button className="btn secondary small">Sign out</button></form>:<Link href="/login">Sign in</Link>}</div>
 </header>
 {children}
 <footer className="copy" style={{marginTop:45,textAlign:"center"}}>gowayy · Connected commerce · Business & admin workflows require verified inventory and approved partners</footer>
 </div></body></html>;
}
