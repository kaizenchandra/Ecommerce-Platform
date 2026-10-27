import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHmac,randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const base='http://127.0.0.1:8080/api/';
test('operational metrics are administrator-only and contain aggregate measurements',async()=>{
 const url='http://127.0.0.1:8080/actuator/metrics/commerce.payment.review';
 assert.equal((await fetch(url)).status,401);
 assert.equal((await fetch(url,{headers:{Authorization:'Bearer local-seller-a'}})).status,403);
 const response=await fetch(url,{headers:{Authorization:'Bearer local-admin'}});assert.equal(response.status,200);
 const metric=await response.json();assert.equal(metric.name,'commerce.payment.review');assert.ok(metric.measurements[0].value>=0);
 assert.deepEqual(metric.availableTags,[]);
 const sampled=await fetch('http://127.0.0.1:8080/actuator/metrics/commerce.metrics.sample.epoch.seconds',{headers:{Authorization:'Bearer local-admin'}});
 assert.ok(Math.abs(Date.now()/1000-(await sampled.json()).measurements[0].value)<30);
});
const db=sql=>execFileSync('docker',['compose','exec','-T','postgres','psql','-v','ON_ERROR_STOP=1','-U','commerce','-d','commerce','-At','-c',sql],{encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();
async function api(path,token,body,key){const r=await fetch(base+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`,...(key?{'Idempotency-Key':key}:{})},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,data:await r.json().catch(()=>null)};}
async function fixture(){
 const p=`guest:${randomUUID()}:${Math.floor(Date.now()/1000)+3600}`,token=p+':'+createHmac('sha256','local-only-guest-signing-secret-rotate-before-sharing').update(p).digest('hex');
 const offer=await api('seller/offers','local-seller-a',{title:'Recovery '+randomUUID(),category:'Ceramics',description:'Controlled provider fixture',pricePaise:10000,stock:1});assert.equal(offer.status,201);
 assert.equal((await api(`admin/offers/${offer.data.id}/publish`,'local-admin',{})).status,200);
 const checkout=await api('checkouts',token,{offerId:offer.data.id,quantity:1,expectedPricePaise:10000,address:{name:'Test',line:'123 Test Lane',city:'Pune',pin:'411001'}},randomUUID());assert.equal(checkout.status,201);
 return {id:checkout.data.id,offer:offer.data.id,token};
}
async function reconcile(id){for(let i=0;i<20;i++){const r=await api(`admin/payments/${id}/reconcile`,'local-admin',{});if(r.status!==409)return r;await new Promise(r=>setTimeout(r,100));}throw Error('Lease did not release');}
test('interrupted browser capture recovers automatically and posts once',async()=>{
 const {id,offer,token}=await fixture();
 assert.equal((await api(`checkouts/${id}/simulate-provider-capture`,token,{})).status,200);
 let state;for(let i=0;i<30;i++){state=(await api(`checkouts/${id}`,token)).data.state;if(state==='CONFIRMED')break;await new Promise(r=>setTimeout(r,1000));}
 assert.equal(state,'CONFIRMED');
 await Promise.all(Array.from({length:4},()=>reconcile(id)));
 assert.equal(db(`SELECT count(*) FROM capture_journal WHERE checkout_id='${id}'`),'1');
 assert.equal(db(`SELECT on_hand || ',' || reserved FROM offer WHERE id='${offer}'`),'0,0');
 assert.equal(db(`SELECT count(*) FROM audit WHERE aggregate_id='${id}' AND action='ORDER_CONFIRMED'`),'1');
 const history=await api(`admin/payments/${id}/history`,'local-admin');assert.ok(history.data.some(a=>a.outcome==='CAPTURE_VERIFIED'));
 const own=await api('seller/finance','local-seller-a'),other=await api('seller/finance','local-seller-b');
 assert.ok(own.data.entries.some(e=>e.checkout_id===id));assert.ok(!other.data.entries.some(e=>e.checkout_id===id));
 assert.equal((await api('admin/payments','local-seller-a')).status,403);
 assert.equal((await api(`admin/payments/${id}/reconcile`,'local-seller-a',{})).status,403);
 assert.throws(()=>db(`UPDATE capture_journal SET amount_paise=1 WHERE checkout_id='${id}'`),/append-only/);
});
test('ambiguous order linking requires matching provider receipt and never confirms by itself',async()=>{
 const a=await fixture(),b=await fixture();
 // Fixture models a provider create response lost before the commerce order ID was saved.
 db(`UPDATE checkout SET provider_order_id=NULL,provider_state='UNKNOWN',reconcile_lease_until=NULL,reconcile_after=now()+interval '1 hour' WHERE id='${a.id}'`);
 assert.equal((await reconcile(a.id)).data.outcome,'ORDER_LINK_REQUIRED');
 assert.equal((await api(`admin/payments/${a.id}/link`,'local-admin',{providerOrderId:'mock_'+b.id})).status,409);
 assert.equal((await api(`admin/payments/${a.id}/link`,'local-admin',{providerOrderId:'mock_'+a.id})).data.outcome,'ORDER_LINK_VERIFIED');
 assert.equal((await api(`checkouts/${a.id}`,a.token)).data.state,'PENDING');
 assert.equal((await reconcile(a.id)).data.outcome,'AWAITING_CAPTURE');
 assert.equal(db(`SELECT count(*) FROM capture_journal WHERE checkout_id='${a.id}'`),'0');
});
test('mismatched provider evidence fails closed and exhausted automation requires manual recovery',async()=>{
 const {id,token}=await fixture();
 db(`UPDATE checkout SET reconcile_attempts=12,reconcile_after=now()+interval '1 hour' WHERE id='${id}'`);
 await api(`checkouts/${id}/simulate-provider-capture`,token,{});
 db(`UPDATE local_provider_order SET amount=999 WHERE receipt='${id}'`);
 assert.equal((await reconcile(id)).data.outcome,'EVIDENCE_MISMATCH');
 assert.equal((await api(`checkouts/${id}`,token)).data.state,'PENDING');
 assert.equal(db(`SELECT count(*) FROM capture_journal WHERE checkout_id='${id}'`),'0');
 db(`UPDATE local_provider_order SET amount=10000 WHERE receipt='${id}'`);
 db(`UPDATE checkout SET reconcile_after=now() WHERE id='${id}'`);
 await new Promise(r=>setTimeout(r,3000));
 assert.equal((await api(`checkouts/${id}`,token)).data.state,'PENDING');
 assert.equal((await reconcile(id)).data.outcome,'CAPTURE_VERIFIED');
 assert.equal((await api(`checkouts/${id}`,token)).data.state,'CONFIRMED');
});
test('reconciled late capture posts refund liability without consuming reallocated stock',async()=>{
 const {id,offer,token}=await fixture();
 db(`UPDATE checkout SET expires_at=now()-interval '1 minute',reconcile_after=now()+interval '1 hour' WHERE id='${id}'`);
 await api(`checkouts/${id}/simulate-provider-capture`,token,{});
 assert.equal((await reconcile(id)).data.outcome,'CAPTURE_VERIFIED');
 assert.equal((await api(`checkouts/${id}`,token)).data.state,'REVIEW');
 assert.equal(db(`SELECT credit_account FROM capture_journal WHERE checkout_id='${id}'`),'CUSTOMER_REFUND_LIABILITY');
 assert.equal(db(`SELECT on_hand || ',' || reserved FROM offer WHERE id='${offer}'`),'1,0');
});
