import crypto from "node:crypto";
import { put } from "@vercel/blob";
import { getUser, mode, sameOrigin } from "@/lib/core";

export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function POST(req:Request) {
 if(!sameOrigin(req))return Response.json({error:"Invalid origin"},{status:403});
 const user=await getUser();
 if(mode!=="admin"||!user||user.role!=="admin")return Response.json({error:"Administrators only"},{status:403});
 if(!process.env.BLOB_READ_WRITE_TOKEN)return Response.json({error:"Media storage is not connected to this project"},{status:503});
 try{
  const form=await req.formData(), file=form.get("image");
  if(!(file instanceof File)||file.size<1||file.size>5*1024*1024)return Response.json({error:"Choose an image below 5 MB"},{status:400});
  const allowed:Record<string,string>={"image/jpeg":"jpg","image/png":"png","image/webp":"webp","image/avif":"avif"};
  const ext=allowed[file.type];
  if(!ext)return Response.json({error:"Only JPEG, PNG, WebP and AVIF are supported"},{status:400});
  const bytes=new Uint8Array(await file.slice(0,16).arrayBuffer());
  const valid=file.type==="image/jpeg"?bytes[0]===255&&bytes[1]===216:
    file.type==="image/png"?bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71:
    file.type==="image/webp"?String.fromCharCode(...bytes.slice(0,4))==="RIFF"&&String.fromCharCode(...bytes.slice(8,12))==="WEBP":
    String.fromCharCode(...bytes.slice(4,12)).includes("ftypavif");
  if(!valid)return Response.json({error:"Image content does not match its file type"},{status:400});
  const name="gowayy/cms/"+crypto.randomUUID()+"."+ext;
  const blob=await put(name,file,{access:"public",addRandomSuffix:false,contentType:file.type});
  return Response.json({ok:true,url:blob.url});
 }catch(e){console.error("[gowayy media]",(e as Error).message);return Response.json({error:"Upload failed"},{status:503});}
}
