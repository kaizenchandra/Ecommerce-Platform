import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHmac,randomUUID} from 'node:crypto';
const a='local-customer-a',b='local-customer-b';
function guest(exp=Math.floor(Date.now()/1000)+3600){const p=`guest:${randomUUID()}:${exp}`;return p+':'+createHmac('sha256','local-only-guest-signing-secret-rotate-before-sharing').update(p).digest('hex');}
async function api(path,token,body,headers={}){const r=await fetch('http://127.0.0.1:8080/api/'+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token,...headers},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,data:await r.json().catch(()=>null)};}
async function offer(){const o=await api('seller/offers','local-seller-a',{title:'Account '+randomUUID(),category:'Ceramics',description:'Account fixture',pricePaise:10000,stock:5});assert.equal(o.status,201);await api(`admin/offers/${o.data.id}/publish`,'local-admin',{});return o.data;}
async function set(token,id,quantity){const cart=await api('cart',token);return api('cart/items',token,{offerId:id,quantity,expectedVersion:cart.data.version});}
async function clear(token){for(const item of (await api('cart',token)).data.items)assert.equal((await set(token,item.offerId,0)).status,200);}
test('registered accounts isolate profiles and reject guest/seller access',async()=>{
 assert.equal((await api('account',guest())).status,403);assert.equal((await api('account','local-seller-a')).status,403);
 const p=(await api('account',a)).data,other=(await api('account',b)).data;
 const update={displayName:'Customer '+randomUUID(),expectedVersion:p.version,address:{name:'Account A',line:'123 Account Lane',city:'Pune',pin:'411001'}};
 const saved=await api('account',a,update);assert.equal(saved.status,200);assert.equal(saved.data.address.name,'Account A');
 assert.equal((await api('account',a,update)).data.version,saved.data.version);
 assert.equal((await api('account',a,{...update,displayName:'Changed'})).status,409);
 assert.deepEqual((await api('account',b)).data,other);
});
test('guest merge requires proof, is exactly-once by claim, and cannot be reused by another account',async()=>{
 await clear(a);await clear(b);const token=guest(),o=await offer();await set(token,o.id,2);await set(a,o.id,1);
 assert.equal((await api('account/merge-cart',a,{}, {'X-Guest-Proof':token.slice(0,-1)+'x'})).status,400);
 assert.equal((await api('account/merge-cart',a,{}, {'X-Guest-Proof':guest(1000000000)})).status,403);
 const results=await Promise.all([1,2,3].map(()=>api('account/merge-cart',a,{}, {'X-Guest-Proof':token})));
 assert.ok(results.every(r=>r.status===200));assert.equal(results[0].data.items.find(i=>i.offerId===o.id).quantity,3);
 assert.equal((await api('cart',token)).data.items.length,0);
 assert.equal((await api('account/merge-cart',b,{}, {'X-Guest-Proof':token})).status,409);
 assert.equal((await set(token,o.id,1)).status,409);
 await clear(a);
});
test('merge exceeding quantity cap rolls back both carts and can be retried after correction',async()=>{
 await clear(a);const token=guest(),o=await offer();await set(a,o.id,8);await set(token,o.id,3);
 assert.equal((await api('account/merge-cart',a,{}, {'X-Guest-Proof':token})).status,409);
 assert.equal((await api('cart',token)).data.items[0].quantity,3);assert.equal((await api('cart',a)).data.items[0].quantity,8);
 await set(a,o.id,5);assert.equal((await api('account/merge-cart',a,{}, {'X-Guest-Proof':token})).data.items[0].quantity,8);await clear(a);
});
test('account purchase history is scoped and guest checkouts remain separate',async()=>{
 const o=await offer();const r=await api('checkouts',a,{offerId:o.id,quantity:1,expectedPricePaise:o.pricePaise,address:{name:'Account A',line:'123 Fixture Lane',city:'Pune',pin:'411001'}},{'Idempotency-Key':randomUUID()});assert.equal(r.status,201);
 assert.ok((await api('account/orders',a)).data.some(x=>x.id===r.data.id));assert.ok(!(await api('account/orders',b)).data.some(x=>x.id===r.data.id));
 assert.equal((await api(`checkouts/${r.data.id}`,b)).status,404);
 assert.equal((await api(`checkouts/${r.data.id}/simulate-capture`,a,{})).data.state,'CONFIRMED');
});
