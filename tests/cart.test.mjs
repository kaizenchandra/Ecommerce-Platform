import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHmac,randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const db=sql=>execFileSync('docker',['compose','exec','-T','postgres','psql','-v','ON_ERROR_STOP=1','-U','commerce','-d','commerce','-At','-c',sql],{encoding:'utf8'}).trim();
function guest(){const p=`guest:${randomUUID()}:${Math.floor(Date.now()/1000)+3600}`;return p+':'+createHmac('sha256','local-only-guest-signing-secret-rotate-before-sharing').update(p).digest('hex');}
async function api(path,token,body,key){const r=await fetch('http://127.0.0.1:8080/api/'+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token,...(key?{'Idempotency-Key':key}:{})},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,data:await r.json().catch(()=>null)};}
async function offer(seller='local-seller-a',stock=3,pricePaise=10000){const r=await api('seller/offers',seller,{title:'Basket '+randomUUID(),category:'Ceramics',description:'Local basket fixture',pricePaise,stock});assert.equal(r.status,201);assert.equal((await api(`admin/offers/${r.data.id}/publish`,'local-admin',{})).status,200);return r.data;}
const line=(o,quantity=1)=>({offerId:o.id,quantity,expectedPricePaise:o.pricePaise});
const body=items=>({items,address:{name:'Customer',line:'123 Fixture Lane',city:'Pune',pin:'411001'}});
const reserve=(token,items,key=randomUUID())=>api('checkouts/basket',token,body(items),key);
test('durable cart ownership, absolute replay, stale writes, quantity and removal',async()=>{
 const a=guest(),b=guest(),o=await offer();
 assert.equal((await api('cart','')).status,401);
 let cart=(await api('cart',a)).data;assert.equal(cart.version,0);
 const update={offerId:o.id,quantity:2,expectedVersion:0};
 cart=(await api('cart/items',a,update)).data;assert.equal(cart.version,1);
 assert.equal((await api('cart/items',a,update)).data.version,1);
 assert.equal((await api('cart',a)).data.items[0].quantity,2);
 assert.equal((await api('cart',b)).data.items.length,0);
 assert.equal((await api('cart/items',a,{...update,quantity:3})).status,409);
 assert.equal((await api('cart/items',a,{...update,quantity:11,expectedVersion:1})).status,400);
 assert.equal((await api('cart/items',a,{offerId:o.id,expectedVersion:1})).status,400);
 assert.equal((await api('cart/items',a,{...update,quantity:1.5,expectedVersion:1})).status,400);
 assert.equal((await api('cart/items',a,{...update,quantity:0,expectedVersion:1})).data.items.length,0);
 assert.equal(db(`SELECT reserved FROM offer WHERE id='${o.id}'`),'0');
});
test('multi-seller checkout snapshots, canonical retries and one capture split by seller',async()=>{
 const a=await offer(),b=await offer('local-seller-b',3,25000),c=await offer(),token=guest(),key=randomUUID();
 const lines=[line(a,2),line(b),line(c)];
 const checkout=await reserve(token,lines,key);assert.equal(checkout.status,201,JSON.stringify(checkout.data));const id=checkout.data.id;
 assert.equal(checkout.data.totalPaise,55000);assert.equal(checkout.data.items.length,3);
 assert.throws(()=>db(`UPDATE checkout_item SET unit_paise=1 WHERE checkout_id='${id}'`),/snapshots are immutable/);
 assert.equal((await reserve(token,[...lines].reverse(),key)).data.id,id);
 assert.equal((await reserve(token,[line(a),line(b),line(c)],key)).status,409);
 assert.equal((await api(`checkouts/${id}`,guest())).status,404);
 const captures=await Promise.all(Array.from({length:4},()=>api(`checkouts/${id}/simulate-capture`,token,{})));
 assert.ok(captures.every(r=>r.status===200&&r.data.state==='CONFIRMED'));
 assert.equal(db(`SELECT seller_id || ':' || amount_paise FROM capture_journal WHERE checkout_id='${id}' ORDER BY seller_id`),'seller-a:30000\nseller-b:25000');
 assert.equal(db(`SELECT sum(amount_paise) FROM capture_journal WHERE checkout_id='${id}'`),'55000');
 assert.equal(db(`SELECT on_hand || ',' || reserved FROM offer WHERE id='${a.id}'`),'1,0');
 const bFinance=(await api('seller/finance','local-seller-b')).data.entries.filter(e=>e.checkout_id===id);assert.equal(bFinance.length,1);assert.equal(bFinance[0].amount_paise,25000);
});
test('whole basket fails on unavailable stock, price drift and duplicate lines without partial reservation',async()=>{
 const a=await offer(),b=await offer('local-seller-b',0),token=guest();
 assert.equal((await reserve(token,[line(a),line(b)])).status,409);
 assert.equal(db(`SELECT reserved FROM offer WHERE id='${a.id}'`),'0');
 assert.equal((await reserve(token,[line(a),{...line(b),expectedPricePaise:1}])).status,409);
 assert.equal((await reserve(token,[line(a),line(a)])).status,400);
 assert.equal((await reserve(token,[])).status,400);
 assert.equal((await reserve(token,[{...line(a),quantity:1.5}])).status,400);
 assert.equal(db(`SELECT reserved FROM offer WHERE id='${a.id}'`),'0');
});
test('opposite-order concurrent baskets cannot oversell or deadlock',async()=>{
 const a=await offer('local-seller-a',1),b=await offer('local-seller-b',1);
 const results=await Promise.all([reserve(guest(),[line(a),line(b)]),reserve(guest(),[line(b),line(a)])]);
 assert.deepEqual(results.map(r=>r.status).sort(),[201,409]);
 assert.equal(db(`SELECT sum(reserved) FROM offer WHERE id IN ('${a.id}','${b.id}')`),'2');
});
test('all lines expire and a late multi-seller capture cannot consume replacement reservations',async()=>{
 const a=await offer('local-seller-a',1),b=await offer('local-seller-b',1),token=guest();
 const c=await reserve(token,[line(a),line(b)]);assert.equal(c.status,201);const id=c.data.id;
 db(`UPDATE checkout SET expires_at=now()-interval '1 minute' WHERE id='${id}'`);
 let state;for(let i=0;i<15;i++){state=(await api(`checkouts/${id}`,token)).data.state;if(state==='EXPIRED')break;await new Promise(r=>setTimeout(r,1000));}assert.equal(state,'EXPIRED');
 assert.equal(db(`SELECT sum(reserved) FROM offer WHERE id IN ('${a.id}','${b.id}')`),'0');
 const next=await reserve(guest(),[line(a),line(b)]);assert.equal(next.status,201);
 assert.equal((await api(`checkouts/${id}/simulate-capture`,token,{})).data.state,'REVIEW');
 assert.equal(db(`SELECT sum(reserved) FROM offer WHERE id IN ('${a.id}','${b.id}')`),'2');
 assert.equal(db(`SELECT count(*) FROM capture_journal WHERE checkout_id='${id}' AND credit_account='CUSTOMER_REFUND_LIABILITY'`),'2');
});
