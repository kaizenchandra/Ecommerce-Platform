import {createHash,createCipheriv,createDecipheriv,randomBytes} from "node:crypto";
import {Pool} from "pg";
import * as oidc from "openid-client";
export const SESSION_COOKIE=process.env.LOCAL_MODE==="true"?"aangan_session":"__Host-aangan_session",FLOW_COOKIE=process.env.LOCAL_MODE==="true"?"aangan_auth_flow":"__Host-aangan_auth_flow";
export class SessionExpired extends Error {}
const hash=(value:string)=>createHash("sha256").update(value).digest("hex");
let pool:Pool|undefined,configuration:Promise<oidc.Configuration>|undefined;
function database(){return pool??=new Pool({connectionString:process.env.AUTH_DATABASE_URL,max:5,connectionTimeoutMillis:4000,statement_timeout:15000});}
function key(){const k=Buffer.from(process.env.AUTH_ENCRYPTION_KEY||"","hex");if(k.length!==32)throw new Error("AUTH_ENCRYPTION_KEY requires 32 random bytes encoded as hex");return k;}
function seal(data:unknown){const iv=randomBytes(12),cipher=createCipheriv("aes-256-gcm",key(),iv);const payload=Buffer.concat([cipher.update(JSON.stringify(data)),cipher.final()]);return Buffer.concat([iv,cipher.getAuthTag(),payload]).toString("base64url");}
function unseal<T>(data:string):T{const raw=Buffer.from(data,"base64url"),decipher=createDecipheriv("aes-256-gcm",key(),raw.subarray(0,12));decipher.setAuthTag(raw.subarray(12,28));return JSON.parse(Buffer.concat([decipher.update(raw.subarray(28)),decipher.final()]).toString());}
export function enabled(){return Boolean(process.env.OIDC_ISSUER);}
export function appURL(){const value=new URL(process.env.APP_URL||"http://127.0.0.1:3000");if(process.env.LOCAL_MODE!=="true"&&value.protocol!=="https:")throw new Error("HTTPS APP_URL required");return value;}
async function config(){
 if(!process.env.OIDC_REQUIRED_ACR||!process.env.OIDC_AUDIENCE||!process.env.OIDC_CLIENT_ID||!process.env.AUTH_DATABASE_URL)throw new Error("Incomplete OIDC configuration");
 const fixture=process.env.LOCAL_MODE==="true"&&process.env.OIDC_ALLOW_HTTP==="true";
 return configuration??=oidc.discovery(new URL(process.env.OIDC_ISSUER!),process.env.OIDC_CLIENT_ID,{client_secret:process.env.OIDC_CLIENT_SECRET},undefined,{timeout:8,...(fixture?{execute:[oidc.allowInsecureRequests],...(process.env.OIDC_INTERNAL_ORIGIN?{[oidc.customFetch]:((url: string,options:RequestInit)=>{const target=new URL(url);if(target.origin===new URL(process.env.OIDC_ISSUER!).origin){const internal=new URL(process.env.OIDC_INTERNAL_ORIGIN!);target.host=internal.host;target.protocol=internal.protocol;}return fetch(target,options);}) as oidc.CustomFetch}:{})}:{})}).catch(e=>{configuration=undefined;throw e;});
}
type Flow={verifier:string;state:string;nonce:string;previous:string};
type Session={subject:string;access:string;refresh?:string;expires:number};
async function verifyAccessIdentity(access:string,subject:string){
 const proof=await fetch((process.env.COMMERCE_URL||"http://localhost:8080")+"/api/account/identity",{headers:{Authorization:`Bearer ${access}`},cache:"no-store",signal:AbortSignal.timeout(6000)});
 if(!proof.ok||(await proof.json()).subject!=="oidc:"+subject)throw new SessionExpired("API identity policy rejected the provider token");
}
export async function beginLogin(previous:string){
 const c=await config(),verifier=oidc.randomPKCECodeVerifier(),state=oidc.randomState(),nonce=oidc.randomNonce(),ticket=randomBytes(32).toString("base64url");
 await database().query("DELETE FROM auth_flow WHERE expires_at<now()");
 await database().query("DELETE FROM auth_session WHERE expires_at<now() OR idle_until<now()");
 await database().query("INSERT INTO auth_flow(id,payload,expires_at) VALUES($1,$2,now()+interval '10 minutes')",[hash(ticket),seal({verifier,state,nonce,previous:hash(previous)})]);
 const url=oidc.buildAuthorizationUrl(c,{redirect_uri:new URL("/auth/callback",appURL()).href,scope:"openid profile offline_access",code_challenge:await oidc.calculatePKCECodeChallenge(verifier),code_challenge_method:"S256",state,nonce,acr_values:process.env.OIDC_REQUIRED_ACR!,resource:process.env.OIDC_AUDIENCE!,prompt:"select_account"});
 return {ticket,url};
}
export async function finishLogin(ticket:string,url:URL,previous:string){
 if(!/^[A-Za-z0-9_-]{43}$/.test(ticket))throw new SessionExpired("Login expired");
 const row=await database().query("DELETE FROM auth_flow WHERE id=$1 AND expires_at>now() RETURNING payload",[hash(ticket)]);
 if(row.rowCount!==1)throw new SessionExpired("Login expired or replayed");
 const f=unseal<Flow>(row.rows[0].payload);if(f.previous!==hash(previous))throw new SessionExpired("Identity changed during sign-in");
 const tokens=await oidc.authorizationCodeGrant(await config(),url,{pkceCodeVerifier:f.verifier,expectedState:f.state,expectedNonce:f.nonce,idTokenExpected:true},{resource:process.env.OIDC_AUDIENCE!});
 const claims=tokens.claims();
 if(!claims?.sub||claims.acr!==process.env.OIDC_REQUIRED_ACR)throw new SessionExpired("Required MFA assurance was not supplied");
 await verifyAccessIdentity(tokens.access_token,hash(process.env.OIDC_ISSUER+"\n"+claims.sub));
 const id=randomBytes(32).toString("base64url"),session:Session={subject:hash(process.env.OIDC_ISSUER+"\n"+claims.sub),access:tokens.access_token,refresh:tokens.refresh_token,expires:Date.now()+Math.min(tokens.expires_in||60,3600)*1000};
 await database().query("INSERT INTO auth_session(id,payload,expires_at,idle_until) VALUES($1,$2,now()+interval '8 hours',now()+interval '30 minutes')",[hash(id),seal(session)]);
 if(previous)await revoke(previous);
 return id;
}
export async function resolveSession(id:string):Promise<{token:string;identity:string}>{
 if(!enabled())throw new SessionExpired("Identity provider is unavailable. End this session or restore provider configuration.");
 if(!/^[A-Za-z0-9_-]{43}$/.test(id))throw new SessionExpired("Sign in again");
 const db=await database().connect();
 try{
  await db.query("BEGIN");
  const rows=await db.query("SELECT payload,expires_at,idle_until FROM auth_session WHERE id=$1 FOR UPDATE",[hash(id)]);
  const row=rows.rows[0];if(!row||new Date(row.expires_at).getTime()<=Date.now()||new Date(row.idle_until).getTime()<=Date.now()){await db.query("DELETE FROM auth_session WHERE id=$1",[hash(id)]);await db.query("COMMIT");throw new SessionExpired("Session expired. Sign in again to the same account.");}
  const session=unseal<Session>(row.payload);
  if(session.expires<Date.now()+30000){
   try{
    if(!session.refresh)throw new Error("No refresh token");
    const tokens=await oidc.refreshTokenGrant(await config(),session.refresh,{resource:process.env.OIDC_AUDIENCE!});
    const claims=tokens.claims();if(claims&&(hash(process.env.OIDC_ISSUER+"\n"+claims.sub)!==session.subject||claims.acr!==process.env.OIDC_REQUIRED_ACR))throw new Error("Refresh identity changed");
    await verifyAccessIdentity(tokens.access_token,session.subject);
    session.access=tokens.access_token;session.refresh=tokens.refresh_token||session.refresh;session.expires=Date.now()+Math.min(tokens.expires_in||60,3600)*1000;
   }catch{await db.query("DELETE FROM auth_session WHERE id=$1",[hash(id)]);await db.query("COMMIT");throw new SessionExpired("Session renewal failed. Sign in again; do not resubmit payment under a different identity.");}
  }
  await db.query("UPDATE auth_session SET payload=$1,idle_until=least(expires_at,now()+interval '30 minutes') WHERE id=$2",[seal(session),hash(id)]);await db.query("COMMIT");return {token:session.access,identity:session.subject};
 }catch(e){await db.query("ROLLBACK");throw e;}finally{db.release();}
}
export async function revoke(id:string){if(id)await database().query("DELETE FROM auth_session WHERE id=$1",[hash(id)]);}
