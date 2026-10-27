import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHmac} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const db=sql=>execFileSync('docker',['compose','exec','-T','postgres','psql','-v','ON_ERROR_STOP=1','-U','commerce','-d','commerce','-At','-c',sql],{encoding:'utf8'}).trim();
async function api(path,token,body,key){const r=await fetch('http://127.0.0.1:8080/api/'+path,{method:body===undefined?'GET':'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json',...(key?{'Idempotency-Key':key}:{})},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,data:await r.json()};}
async function fixture(){
 const p=`guest:${randomUUID()}:${Math.floor(Date.now()/1000)+3600}`,token=p+':'+createHmac('sha256','local-only-guest-signing-secret-rotate-before-sharing').update(p).digest('hex');
 const items=[];
 for(const seller of ['a','b']){const o=await api('seller/offers','local-seller-'+seller,{title:'Shipment '+randomUUID(),category:'Ceramics',description:'Fixture',pricePaise:10000,stock:2});assert.equal(o.status,201);await api('admin/offers/'+o.data.id+'/publish','local-admin',{});items.push({offerId:o.data.id,quantity:1,expectedPricePaise:10000});}
 const c=await api('checkouts/basket',token,{items,address:{name:'Test',line:'123 Test Lane',city:'Pune',pin:'411001'}},randomUUID());assert.equal(c.status,201);return {id:c.data.id,token,items};
}
const change=(state,expectedVersion,extra={})=>({state,expectedVersion,expectedSellerId:'seller-a',carrier:'',trackingReference:'',...extra});
test('fulfillment requires capture, isolates seller lines, validates transitions and deduplicates concurrent writes',async()=>{
 const {id,token,items}=await fixture();
 assert.equal((await api(`seller/orders/${id}/fulfillment`,'local-seller-a',change('PACKED',0))).status,409);
 assert.deepEqual((await api(`checkouts/${id}/shipments`,token)).data,[]);
 await api(`checkouts/${id}/simulate-capture`,token,{});
 const a=(await api('seller/orders','local-seller-a')).data.find(o=>o.checkoutId===id),b=(await api('seller/orders','local-seller-b')).data.find(o=>o.checkoutId===id);
 assert.equal(a.items.length,1);assert.equal(b.items.length,1);assert.notEqual(a.items[0].offerId,b.items[0].offerId);
 assert.equal((await api(`seller/orders/${id}/fulfillment`,'local-seller-b',change('PACKED',0))).status,409);
 assert.equal((await api(`seller/orders/${id}/fulfillment`,'local-customer-a',change('PACKED',0))).status,403);
 assert.equal((await api(`checkouts/${id}/shipments`,'local-customer-a')).status,404);
 assert.equal((await api(`seller/orders/${id}/fulfillment`,'local-seller-a',change('DELIVERED',0,{carrier:'Test',trackingReference:'x'}))).status,409);
 const packed=await Promise.all(Array.from({length:5},()=>api(`seller/orders/${id}/fulfillment`,'local-seller-a',change('PACKED',0))));assert.ok(packed.every(r=>r.status===200&&r.data.version===1));
 assert.equal((await api(`seller/orders/${id}/fulfillment`,'local-seller-a',change('SHIPPED',1))).status,400);
 const shipped=change('SHIPPED',1,{carrier:'Test carrier',trackingReference:'TEST-1'});
 assert.equal((await api(`seller/orders/${id}/fulfillment`,'local-seller-a',shipped)).status,200);
 assert.equal((await api(`seller/orders/${id}/fulfillment`,'local-seller-a',shipped)).data.version,2);
 assert.equal((await api(`seller/orders/${id}/fulfillment`,'local-seller-a',{...shipped,trackingReference:'different'})).status,409);
 assert.equal((await api(`seller/orders/${id}/fulfillment`,'local-seller-a',change('DELIVERED',2,{carrier:'Test carrier',trackingReference:'changed'}))).status,409);
 assert.equal((await api(`seller/orders/${id}/fulfillment`,'local-seller-a',change('DELIVERED',2,{carrier:'Test carrier',trackingReference:'TEST-1'}))).status,200);
 const tracking=(await api(`checkouts/${id}/shipments`,token)).data;assert.equal(tracking.find(s=>s.sellerId==='seller-a').state,'DELIVERED');assert.equal(tracking.find(s=>s.sellerId==='seller-b').state,'AWAITING_FULFILLMENT');
 assert.equal(db(`SELECT count(*) FROM outbox WHERE aggregate_id='${id}' AND topic='commerce.fulfillment.v1'`),'3');
 let published='0';for(let i=0;i<20;i++){published=db(`SELECT count(*) FROM outbox WHERE aggregate_id='${id}' AND topic='commerce.fulfillment.v1' AND published_at IS NOT NULL`);if(published==='3')break;await new Promise(r=>setTimeout(r,500));}assert.equal(published,'3');
 assert.equal(db(`SELECT count(*) FROM outbox WHERE aggregate_id='${id}' AND topic='commerce.fulfillment.v1' AND (payload ? 'address' OR payload ? 'trackingReference' OR payload ? 'customerId')`),'0');
 assert.equal(db(`SELECT count(*) FROM audit WHERE aggregate_id='${id}' AND action LIKE 'FULFILLMENT_%'`),'3');
 assert.equal(db(`SELECT sum(on_hand)||','||sum(reserved) FROM offer WHERE id IN ('${items[0].offerId}','${items[1].offerId}')`),'2,0');
 const other=await api('seller/offers','local-seller-a',{title:'Only seller A '+randomUUID(),category:'Ceramics',description:'Fixture',pricePaise:100,stock:1});await api(`admin/offers/${other.data.id}/publish`,'local-admin',{});
 const own=await api('checkouts',token,{offerId:other.data.id,quantity:1,expectedPricePaise:100,address:{name:'Test',line:'123 Test Lane',city:'Pune',pin:'411001'}},randomUUID());
 assert.equal((await api(`seller/orders/${own.data.id}/fulfillment`,'local-seller-b',change('PACKED',0,{expectedSellerId:'seller-b'}))).status,404);
});
