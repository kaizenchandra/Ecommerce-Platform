// Protocol test double only. Anyone can authenticate here. NOT MFA or a deployable IdP.
import http from 'node:http';
import {generateKeyPairSync,createSign,createHash,randomUUID} from 'node:crypto';
const issuer='http://127.0.0.1:8090',client='aangan-web',redirect='http://127.0.0.1:3000/auth/callback';
const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:2048}),jwk={...publicKey.export({format:'jwk'}),kid:randomUUID(),use:'sig',alg:'RS256'};
const codes=new Map(),refreshes=new Map();let refreshCount=0;
function jwt(claims){const head=Buffer.from(JSON.stringify({alg:'RS256',kid:jwk.kid,typ:'JWT'})).toString('base64url'),body=Buffer.from(JSON.stringify(claims)).toString('base64url'),value=head+'.'+body;return value+'.'+createSign('RSA-SHA256').update(value).sign(privateKey).toString('base64url');}
function issue(entry){const now=Math.floor(Date.now()/1000),rt=randomUUID();refreshes.set(rt,entry);return {access_token:jwt({iss:issuer,sub:entry.sub,aud:entry.aud||'aangan-api',iat:now,exp:now+60,acr:entry.acr}),id_token:jwt({iss:issuer,sub:entry.sub,aud:client,iat:now,exp:now+300,acr:entry.acr,nonce:entry.nonce,auth_time:now}),refresh_token:rt,token_type:'Bearer',expires_in:35,scope:'openid profile offline_access'};}
http.createServer(async(req,res)=>{
 const url=new URL(req.url,issuer);const send=(data,status=200)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
 if(url.pathname==='/.well-known/openid-configuration')return send({issuer,authorization_endpoint:issuer+'/authorize',token_endpoint:issuer+'/token',jwks_uri:issuer+'/jwks',response_types_supported:['code'],subject_types_supported:['public'],id_token_signing_alg_values_supported:['RS256'],token_endpoint_auth_methods_supported:['client_secret_post'],code_challenge_methods_supported:['S256']});
 if(url.pathname==='/jwks')return send({keys:[jwk]});
 if(url.pathname==='/authorize'){
  if(url.searchParams.get('client_id')!==client||url.searchParams.get('redirect_uri')!==redirect||url.searchParams.get('code_challenge_method')!=='S256')return send({error:'invalid_request'},400);
  const action='/approve?'+url.searchParams.toString();res.writeHead(200,{'Content-Type':'text/html'});return res.end(`<h1>Local OIDC protocol fixture</h1><p>Simulated claims. No real credentials or MFA.</p><a href="${action}&assurance=mfa">Continue with simulated MFA</a><br><a href="${action}&assurance=password">Continue without MFA</a>`);
 }
 if(url.pathname==='/approve'){
  if(url.searchParams.get('redirect_uri')!==redirect)return send({error:'invalid_request'},400);
  const code=randomUUID();codes.set(code,{sub:'fixture-customer',refreshSubject:url.searchParams.get('refresh_subject'),acr:url.searchParams.get('assurance')==='mfa'?'urn:aangan:test:mfa':'password',nonce:url.searchParams.get('nonce'),challenge:url.searchParams.get('code_challenge'),created:Date.now()});
  const callback=new URL(redirect);callback.searchParams.set('code',code);callback.searchParams.set('state',url.searchParams.get('state'));res.writeHead(302,{Location:callback.href});return res.end();
 }
 if(url.pathname==='/token'&&req.method==='POST'){
  let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>10000)return send({error:'invalid_request'},400);}const p=new URLSearchParams(raw);
  if(p.get('client_id')!==client||p.get('client_secret')!=='local-oidc-client-only')return send({error:'invalid_client'},401);
  if(p.get('grant_type')==='refresh_token'){const e=refreshes.get(p.get('refresh_token'));refreshes.delete(p.get('refresh_token'));if(!e)return send({error:'invalid_grant'},400);refreshCount++;const issued=issue(e.refreshSubject?{...e,sub:e.refreshSubject}:e);if(e.refreshSubject)delete issued.id_token;return send(issued);}
  const e=codes.get(p.get('code'));codes.delete(p.get('code'));
  if(!e||Date.now()-e.created>600000||p.get('redirect_uri')!==redirect||createHash('sha256').update(p.get('code_verifier')||'').digest('base64url')!==e.challenge)return send({error:'invalid_grant'},400);
  return send(issue(e));
 }
 if(url.pathname==='/test/stats')return send({refreshCount});
 if(url.pathname==='/test/token')return send(issue({sub:url.searchParams.get('sub')||'fixture-customer',acr:url.searchParams.get('acr')||'urn:aangan:test:mfa',aud:url.searchParams.get('aud')||'aangan-api'}));
 return send({error:'not_found'},404);
}).listen(8090,'0.0.0.0');
