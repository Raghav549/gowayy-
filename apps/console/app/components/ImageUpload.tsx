"use client";
import {useState} from "react";

/** A CMS upload uses a signed-in admin session; saved form value is the CDN URL. */
export function ImageUpload({initial=""}:{initial?:string}) {
 const [url,setUrl]=useState(initial),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
 async function upload(file:File){
  setBusy(true);setMessage("");
  const form=new FormData();form.set("image",file);
  try{const response=await fetch("/api/media",{method:"POST",body:form,credentials:"same-origin"});
   const data=await response.json() as {url?:string;error?:string};
   if(!response.ok||!data.url)throw new Error(data.error||"Image could not be uploaded");
   setUrl(data.url);setMessage("Image uploaded. Save the listing to publish it.");
  }catch(e){setMessage((e as Error).message);}finally{setBusy(false);}
 }
 return <div className="field"><span>Image URL or upload</span>
  <input name="image" className="input" value={url} onChange={e=>setUrl(e.target.value)} placeholder="/media/... or HTTPS image URL"/>
  <label className="field"><span>Upload a new image (up to 5 MB)</span><input type="file" accept="image/png,image/jpeg,image/webp,image/avif" disabled={busy} onChange={e=>{const file=e.target.files?.[0];if(file)void upload(file);}}/></label>
  {url&&/^https:\/\//.test(url)?<img src={url} alt="Selected preview" width={160} height={88} style={{objectFit:"cover",borderRadius:12}}/>:null}
  <div aria-live="polite" className="copy">{busy?"Uploading image…":message}</div>
 </div>;
}
