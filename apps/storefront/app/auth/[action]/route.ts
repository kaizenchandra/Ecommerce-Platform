import {NextRequest,NextResponse} from "next/server";
import {appURL,beginLogin,enabled,finishLogin,FLOW_COOKIE,SESSION_COOKIE} from "@/lib/oidc";
export const runtime="nodejs";
export async function GET(req:NextRequest,{params}:{params:Promise<{action:string}>}){
 const action=(await params).action;
 if(!enabled()||!["login","callback"].includes(action))return NextResponse.json({error:"OIDC is not configured"},{status:404});
 try{
  const previous=req.cookies.get(SESSION_COOKIE)?.value||"";
  if(action==="login"){
   const flow=await beginLogin(previous),response=NextResponse.redirect(flow.url);
   response.cookies.set(FLOW_COOKIE,flow.ticket,{httpOnly:true,secure:appURL().protocol==="https:",sameSite:"lax",path:"/",maxAge:600});response.headers.set("Cache-Control","no-store");return response;
  }
  const callback=new URL("/auth/callback",appURL());callback.search=req.nextUrl.search;
  const id=await finishLogin(req.cookies.get(FLOW_COOKIE)?.value||"",callback,previous);
  const response=NextResponse.redirect(new URL("/account",appURL()));
  response.cookies.set(SESSION_COOKIE,id,{httpOnly:true,secure:appURL().protocol==="https:",sameSite:"lax",path:"/",maxAge:28800});
  response.cookies.set(FLOW_COOKIE,"",{httpOnly:true,secure:appURL().protocol==="https:",sameSite:"lax",path:"/",maxAge:0});response.cookies.set("aangan_customer","",{path:"/api",maxAge:0});response.headers.set("Cache-Control","no-store");return response;
 }catch{return NextResponse.json({error:"Sign-in could not be verified. Restart sign-in; no checkout was created."},{status:401,headers:{"Cache-Control":"no-store"}});}
}
