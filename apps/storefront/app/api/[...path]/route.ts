import {createHmac,randomUUID} from "node:crypto";
import {NextRequest,NextResponse} from "next/server";
import {enabled,resolveSession,revoke,SessionExpired,SESSION_COOKIE} from "@/lib/oidc";
export const runtime="nodejs";
const uuid="[a-f0-9-]{36}";
const allowedGet=new RegExp(`^(session-context|account(/orders|/wishlist)?|cart|seller/(offers|finance|orders)|admin/(offers|payments)|admin/payments/${uuid}/history|checkouts/${uuid}(/payment-config|/shipments)?)$`);
const allowedPost=new RegExp(`^(account(/merge-cart|/wishlist)?|cart/items|checkouts/basket|seller/offers|seller/orders/${uuid}/fulfillment|admin/offers/${uuid}/publish|admin/payments/${uuid}/(reconcile|link)|checkouts|checkouts/${uuid}/(simulate-capture|callback))$`);
async function handler(req:NextRequest,{params}:{params:Promise<{path:string[]}>}) {
  const path=(await params).path.join("/");
  // Behind Docker/ingress, nextUrl can contain the internal host. Trust explicit origins, never forwarded headers.
  const allowedOrigins=(process.env.APP_ORIGINS||"http://127.0.0.1:3000,http://localhost:3000").split(",");
  const origin=req.headers.get("origin")||"";
  if(req.method==="POST" && !allowedOrigins.includes(origin)) return NextResponse.json({error:"Request origin rejected"},{status:403});
  if(Number(req.headers.get("content-length")||0)>16384)return NextResponse.json({error:"Request too large"},{status:413});
  if(path==="auth-config"&&req.method==="GET")return NextResponse.json({oidc:enabled(),local:process.env.LOCAL_MODE==="true"});
  if(path==="account-session"&&req.method==="POST"){
    if(process.env.LOCAL_MODE!=="true")return NextResponse.json({error:"Local account sign-in is disabled"},{status:404});
    if(req.cookies.get(SESSION_COOKIE))return NextResponse.json({error:"Sign out of the existing session first"},{status:409});
    const body=await req.json().catch(()=>null);
    if(!body||typeof body.token!=="string"||body.token.length>200)return NextResponse.json({error:"Invalid credential"},{status:400});
    try{
      const check=await fetch((process.env.COMMERCE_URL||"http://localhost:8080")+"/api/account",{headers:{Authorization:`Bearer ${body.token}`},cache:"no-store",signal:AbortSignal.timeout(6000)});
      if(!check.ok)return NextResponse.json({error:"Customer sign-in rejected"},{status:401});
      const response=NextResponse.json({ok:true},{headers:{"Cache-Control":"no-store"}});
      response.cookies.set("aangan_customer",body.token,{httpOnly:true,sameSite:"strict",secure:req.nextUrl.protocol==="https:",path:"/api",maxAge:3600});return response;
    }catch{return NextResponse.json({error:"Sign-in service unavailable"},{status:503});}
  }
  if(path==="account-logout"&&req.method==="POST"){
    try{await revoke(req.cookies.get(SESSION_COOKIE)?.value||"");}catch{return NextResponse.json({error:"Session revocation unavailable. Retry sign-out."},{status:503});}
    const response=NextResponse.json({ok:true},{headers:{"Cache-Control":"no-store"}});
    response.cookies.set(SESSION_COOKIE,"",{httpOnly:true,secure:process.env.LOCAL_MODE!=="true"||req.nextUrl.protocol==="https:",sameSite:"lax",path:"/",maxAge:0});
    response.cookies.set("aangan_customer","",{path:"/api",maxAge:0});return response;
  }
  if(path==="session" && req.method==="POST") {
    if(process.env.LOCAL_MODE!=="true")return NextResponse.json({error:"Local sign-in is disabled"},{status:404});
    const body=await req.json().catch(()=>null);
    if(!body || typeof body.token!=="string" || body.token.length>200)return NextResponse.json({error:"Invalid credential"},{status:400});
    const response=NextResponse.json({ok:true});
    response.cookies.set("aangan_operator",body.token,{httpOnly:true,sameSite:"strict",secure:req.nextUrl.protocol==="https:",path:"/api",maxAge:3600});
    return response;
  }
  if(!(req.method==="GET"?allowedGet:allowedPost).test(path) && !(path==="guest-session"&&req.method==="POST"))return NextResponse.json({error:"Route not found"},{status:404});
  let guest=req.cookies.get("aangan_guest")?.value;
  if(!guest){
    const secret=process.env.GUEST_SECRET;
    if(!secret || secret.length<32)return NextResponse.json({error:"Session service is not configured"},{status:503});
    const payload=`guest:${randomUUID()}:${Math.floor(Date.now()/1000)+86400*7}`;
    guest=payload+":"+createHmac("sha256",secret).update(payload).digest("hex");
  }
  if(path==="guest-session") {
    const response=NextResponse.json({ok:true},{headers:{"Cache-Control":"no-store"}});
    response.cookies.set("aangan_guest",guest,{httpOnly:true,sameSite:"lax",secure:req.nextUrl.protocol==="https:",path:"/",maxAge:86400*7});
    return response;
  }
  let session:{token:string;identity:string}|undefined;
  try{const id=req.cookies.get(SESSION_COOKIE)?.value;if(id)session=await resolveSession(id);}catch(e){return NextResponse.json({error:e instanceof SessionExpired?e.message:"Session service unavailable. Retry without changing identity."},{status:e instanceof SessionExpired?401:503,headers:{"Cache-Control":"no-store"}});}
  const customer=session?.token||(process.env.LOCAL_MODE==="true"?req.cookies.get("aangan_customer")?.value:undefined);
  const identityKey=createHmac("sha256",process.env.GUEST_SECRET!).update(session?.identity||customer||guest).digest("hex");
  if(path==="session-context")return NextResponse.json({identityKey,registered:Boolean(customer)},{headers:{"Cache-Control":"no-store"}});
  const identityWrite=req.method==="POST"&&(path==="checkouts"||path==="checkouts/basket"||path==="cart/items"||path==="account"||path.startsWith("account/"));
  if(identityWrite&&req.headers.get("X-Identity-Key")!==identityKey)return NextResponse.json({error:"Your identity changed. Reload this view or sign back into the original account before retrying checkout."},{status:409});
  const token=path.startsWith("account")?customer:path.startsWith("checkouts")||path==="cart"||path.startsWith("cart/")?(customer||guest):req.cookies.get("aangan_operator")?.value;
  const raw=req.method==="POST"?await req.text():undefined;
  if(raw && Buffer.byteLength(raw)>16384)return NextResponse.json({error:"Request too large"},{status:413});
  try {
    const upstream=await fetch((process.env.COMMERCE_URL||"http://localhost:8080")+"/api/"+path,{method:req.method,headers:{"Content-Type":"application/json",Authorization:`Bearer ${token||""}`,"Idempotency-Key":req.headers.get("Idempotency-Key")||"",...(path==="account/merge-cart"?{"X-Guest-Proof":guest}:{})},body:raw,cache:"no-store",signal:AbortSignal.timeout(12000)});
    let data=await upstream.json().catch(()=>({error:upstream.status===401?"Sign in to continue.":"Request rejected."}));
    if(upstream.ok&&path==="account/wishlist")data={items:data,identityKey};
    if(upstream.ok&&(path==="cart"||path==="cart/items"||path==="account"||path==="account/merge-cart"))data.identityKey=identityKey;
    const response=NextResponse.json(data,{status:upstream.status,headers:{"Cache-Control":"no-store"}});
    response.cookies.set("aangan_guest",guest,{httpOnly:true,sameSite:"lax",secure:req.nextUrl.protocol==="https:",path:"/",maxAge:86400*7});
    return response;
  } catch {
    const response=NextResponse.json({error:"The service did not respond. Keep this page and retry with the same checkout details."},{status:503,headers:{"Cache-Control":"no-store"}});
    // Preserve ownership even if the upstream committed before the connection timed out.
    response.cookies.set("aangan_guest",guest,{httpOnly:true,sameSite:"lax",secure:req.nextUrl.protocol==="https:",path:"/",maxAge:86400*7});
    return response;
  }
}
export {handler as GET,handler as POST};
