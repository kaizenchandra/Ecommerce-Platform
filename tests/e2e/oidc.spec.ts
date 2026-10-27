import {test,expect} from '../../apps/storefront/node_modules/@playwright/test';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
test.skip(process.env.OIDC_TESTS!=='true','Requires isolated compose.oidc.yaml fixture');
test('OIDC MFA policy, replay protection, coordinated refresh, expiry and revocation',async({page,context})=>{
 const request=context.request;
 await page.goto('/auth/login');await page.getByRole('link',{name:'Continue without MFA'}).click();await expect(page.getByText(/Sign-in could not be verified/)).toBeVisible();
 let callback='';page.on('request',r=>{if(new URL(r.url()).pathname==='/auth/callback')callback=r.url();});
 await page.goto('/auth/login');await page.getByRole('link',{name:'Continue with simulated MFA'}).click();await expect(page.getByLabel('Display name')).toBeVisible();
 const cookie=(await context.cookies()).find(c=>c.name==='aangan_session')!;expect(cookie.value).toMatch(/^[A-Za-z0-9_-]{43}$/);expect(cookie.httpOnly).toBe(true);
 expect(callback).toContain('/auth/callback?');expect((await request.get(callback)).status()).toBe(401);
 const baseline=await (await request.get('http://127.0.0.1:8090/test/stats')).json();
 await new Promise(r=>setTimeout(r,6500));
 const results=await Promise.all(Array.from({length:6},()=>request.get('/api/session-context')));expect(results.every(r=>r.status()===200)).toBe(true);
 const after=await (await request.get('http://127.0.0.1:8090/test/stats')).json();expect(after.refreshCount-baseline.refreshCount).toBe(1);
 const identity=(await (await request.get('/api/session-context')).json()).identityKey;
 execFileSync('docker',['compose','restart','storefront'],{cwd:process.cwd().replace(/\/apps\/storefront$/,''),stdio:'pipe'});
 await expect.poll(async()=>{try{return (await request.get('/api/account')).status();}catch{return 0;}},{timeout:20000}).toBe(200);
 const sessionId=createHash('sha256').update(cookie.value).digest('hex');
 execFileSync('docker',['compose','exec','-T','auth-postgres','psql','-U','storefront_auth','-d','storefront_auth','-c',`UPDATE auth_session SET idle_until=now()-interval '1 second' WHERE id='${sessionId}'`],{cwd:process.cwd().replace(/\/apps\/storefront$/,''),stdio:'pipe'});
 expect((await request.get('/api/cart')).status()).toBe(401);
 await page.goto('/auth/login');await page.getByRole('link',{name:'Continue with simulated MFA'}).click();await expect(page.getByLabel('Display name')).toBeVisible();
 expect((await (await request.get('/api/session-context')).json()).identityKey).toBe(identity);
 expect((await request.get('/api/account',{headers:{Cookie:`aangan_session=${cookie.value}`}})).status()).toBe(401);
 const fresh=(await context.cookies()).find(c=>c.name==='aangan_session')!;await page.getByRole('button',{name:'Sign out',exact:true}).click();
 expect((await request.get('/api/account',{headers:{Cookie:`aangan_session=${fresh.value}`}})).status()).toBe(401);
});
test('backend rejects wrong audience, missing MFA assurance and forged JWT signatures',async({request})=>{
 for(const query of ['aud=web-client','acr=password']){const token=(await (await request.get('http://127.0.0.1:8090/test/token?'+query)).json()).access_token;expect((await request.get('http://127.0.0.1:8080/api/account',{headers:{Authorization:'Bearer '+token}})).status()).toBe(401);}
 const token=(await (await request.get('http://127.0.0.1:8090/test/token')).json()).access_token;
 expect((await request.get('http://127.0.0.1:8080/api/account',{headers:{Authorization:'Bearer '+token}})).status()).toBe(200);
 const parts=token.split('.');parts[2]=(parts[2][0]==='A'?'B':'A')+parts[2].slice(1);
 expect((await request.get('http://127.0.0.1:8080/api/account',{headers:{Authorization:'Bearer '+parts.join('.')}})).status()).toBe(401);
 expect((await request.get('http://127.0.0.1:8080/api/admin/payments',{headers:{Authorization:'Bearer '+token}})).status()).toBe(403);
});
test('refresh cannot change account even when the provider omits a new ID token',async({page,context})=>{
 await page.goto('/auth/login');
 const href=await page.getByRole('link',{name:'Continue with simulated MFA'}).getAttribute('href');
 await page.goto('http://127.0.0.1:8090'+href+'&refresh_subject=another-customer');
 await expect(page.getByLabel('Display name')).toBeVisible();
 await new Promise(r=>setTimeout(r,6500));
 expect((await context.request.get('/api/session-context')).status()).toBe(401);
 expect((await context.request.get('/api/cart')).status()).toBe(401);
});
