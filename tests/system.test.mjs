import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHmac,randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';

const base=process.env.COMMERCE_URL||'http://127.0.0.1:8080';
const seller=process.env.SELLER_TOKEN||'local-seller-a',sellerB=process.env.SELLER_B_TOKEN||'local-seller-b',admin=process.env.ADMIN_TOKEN||'local-admin';
function guest(){const p=`guest:${randomUUID()}:${Math.floor(Date.now()/1000)+3600}`;return p+':'+createHmac('sha256',process.env.GUEST_SECRET||'local-only-guest-signing-secret-rotate-before-sharing').update(p).digest('hex');}
async function request(path,{token,body,key}={}) {
 const response=await fetch(base+'/api/'+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`} : {}),...(key?{'Idempotency-Key':key}:{})},body:body===undefined?undefined:JSON.stringify(body)});
 const data=await response.json().catch(()=>null);return {status:response.status,data};
}
async function listing(stock=5){
 const title='Test ceramic '+randomUUID();
 const created=await request('seller/offers',{token:seller,body:{title,category:'Ceramics',description:'Integration fixture; no physical goods.',pricePaise:129900,stock}});
 assert.equal(created.status,201,JSON.stringify(created.data));return created.data;
}
async function published(stock=5){const o=await listing(stock);assert.equal((await request(`admin/offers/${o.id}/publish`,{token:admin,body:{}})).status,200);return o;}
function selection(o,quantity=1){return {offerId:o.id,quantity,expectedPricePaise:o.pricePaise,address:{name:'Test Customer',line:'123 Fixture Lane',city:'Pune',pin:'411001'}};}
const database=(sql)=>execFileSync('docker',['compose','exec','-T','postgres','psql','-U','commerce','-d','commerce','-At','-c',sql],{encoding:'utf8'}).trim();

test('seller identity, moderation and public projection',async()=>{
 assert.equal((await request('seller/offers')).status,401);
 const o=await listing();
 assert.equal((await request('catalog/'+o.id)).status,404);
 const other=await request('seller/offers',{token:sellerB});assert.equal(other.status,200);assert.ok(!other.data.some(x=>x.id===o.id));
 assert.equal((await request(`admin/offers/${o.id}/publish`,{token:seller,body:{}})).status,403);
 assert.equal((await request(`admin/offers/${o.id}/publish`,{token:admin,body:{}})).status,200);
 let found=false;
 for(let i=0;i<30;i++){
  const res=await fetch('http://127.0.0.1:8081/api/search?q='+encodeURIComponent(o.title));
  if(res.ok){const result=await res.json();if(result.source==='elasticsearch'&&result.items.some(x=>x.id===o.id)){found=true;break;}}
  await new Promise(r=>setTimeout(r,1000));
 }
 assert.ok(found,'Kafka → Elasticsearch projection did not become visible');
});
test('last-unit concurrency, idempotency, ownership and duplicate capture',async()=>{
 const o=await published(1),a=guest(),b=guest();
 const keys=[randomUUID(),randomUUID()];
 const results=await Promise.all([a,b].map((token,i)=>request('checkouts',{token,key:keys[i],body:selection(o)})));
 assert.deepEqual(results.map(x=>x.status).sort(),[201,409]);
 const winner=results[0].status===201?0:1,token=[a,b][winner],loser=[a,b][1-winner],id=results[winner].data.id;
 assert.equal((await request('checkouts/'+id,{token:loser})).status,404);
 const retried=await request('checkouts',{token,key:keys[winner],body:selection(o)});assert.equal(retried.status,201);assert.equal(retried.data.id,id);
 assert.equal((await request('checkouts',{token,key:keys[winner],body:selection(o,2)})).status,409);
 const captures=await Promise.all(Array.from({length:4},()=>request(`checkouts/${id}/simulate-capture`,{token,body:{}})));
 assert.ok(captures.every(x=>x.status===200&&x.data.state==='CONFIRMED'));
 assert.equal((await request('catalog/'+o.id)).data.available,0);
 assert.equal(database(`SELECT on_hand || ',' || reserved FROM offer WHERE id='${o.id}'`),'0,0');
 assert.equal(database(`SELECT count(*) FROM audit WHERE aggregate_id='${id}' AND action='ORDER_CONFIRMED'`),'1');
 assert.equal(database(`SELECT count(*) FROM outbox WHERE aggregate_id='${id}' AND topic='orders.v1'`),'1');
});
test('price drift, invalid signature and negative quantities fail closed',async()=>{
 const o=await published(),token=guest();
 assert.equal((await request('checkouts',{token,key:randomUUID(),body:{...selection(o),expectedPricePaise:1}})).status,409);
 assert.equal((await request('checkouts',{token,key:randomUUID(),body:selection(o,-1)})).status,400);
 assert.equal((await request('webhooks/razorpay',{body:{event:'payment.captured'}})).status,400);
 assert.equal((await request('catalog/'+o.id)).data.available,5);
});
test('Kafka duplicate and stale replay cannot overwrite newer inventory projection',async()=>{
 const o=await published(3),token=guest();
 const c=await request('checkouts',{token,key:randomUUID(),body:selection(o)});
 assert.equal((await request(`checkouts/${c.data.id}/simulate-capture`,{token,body:{}})).data.state,'CONFIRMED');
 const newest=JSON.parse(database(`SELECT payload FROM outbox WHERE aggregate_id='${o.id}' AND topic='catalog.v1' ORDER BY (payload->>'version')::bigint DESC LIMIT 1`));
 const older=structuredClone(newest);older.version=1;older.offer.version=1;older.offer.available=999;
 execFileSync('docker',['compose','exec','-T','kafka','/opt/kafka/bin/kafka-console-producer.sh','--bootstrap-server','kafka:9092','--topic','catalog.v1','--property','parse.key=true','--property','key.separator=|'],{input:[newest,newest,older].map(e=>o.id+'|'+JSON.stringify(e)).join('\n')+'\n',encoding:'utf8',timeout:20000});
 let projection;
 for(let i=0;i<20;i++){
  const raw=execFileSync('docker',['compose','exec','-T','elasticsearch','curl','-s',`http://localhost:9200/offers-v1/_doc/${o.id}`],{encoding:'utf8'});
  projection=JSON.parse(raw);if(projection._version===newest.version)break;await new Promise(r=>setTimeout(r,1000));
 }
 assert.equal(projection._source.available,2);assert.equal(projection._version,newest.version);
 // Wait until replayed events have been consumed, then assert old stock did not replace current state.
 await new Promise(r=>setTimeout(r,2000));
 const final=JSON.parse(execFileSync('docker',['compose','exec','-T','elasticsearch','curl','-s',`http://localhost:9200/offers-v1/_doc/${o.id}`],{encoding:'utf8'}));
 assert.equal(final._source.available,2);assert.equal(final._version,newest.version);
});
test('late capture is review, never confirmation or oversell',async()=>{
 const o=await published(1),token=guest();
 const c=await request('checkouts',{token,key:randomUUID(),body:selection(o)});assert.equal(c.status,201);
 database(`UPDATE checkout SET expires_at=now()-interval '1 minute' WHERE id='${c.data.id}'`);
 const capture=await request(`checkouts/${c.data.id}/simulate-capture`,{token,body:{}});
 assert.equal(capture.status,200);assert.equal(capture.data.state,'REVIEW');
 assert.equal(database(`SELECT on_hand || ',' || reserved FROM offer WHERE id='${o.id}'`),'1,0');
 assert.equal(database(`SELECT count(*) FROM audit WHERE aggregate_id='${c.data.id}' AND action='ORDER_CONFIRMED'`),'0');
});
test('reservation expiry releases stock and retains recoverable checkout',async()=>{
 const o=await published(1),token=guest();
 const c=await request('checkouts',{token,key:randomUUID(),body:selection(o)});
 database(`UPDATE checkout SET expires_at=now()-interval '1 minute' WHERE id='${c.data.id}'`);
 let current;
 for(let i=0;i<15;i++){current=await request('checkouts/'+c.data.id,{token});if(current.data.state==='EXPIRED')break;await new Promise(r=>setTimeout(r,1000));}
 assert.equal(current.data.state,'EXPIRED');assert.equal((await request('catalog/'+o.id)).data.available,1);
 const nextCustomer=guest();
 const next=await request('checkouts',{token:nextCustomer,key:randomUUID(),body:selection(o)});
 assert.equal(next.status,201);
 const late=await request(`checkouts/${c.data.id}/simulate-capture`,{token,body:{}});
 assert.equal(late.data.state,'REVIEW');
 assert.equal(database(`SELECT on_hand || ',' || reserved FROM offer WHERE id='${o.id}'`),'1,1');
 const valid=await request(`checkouts/${next.data.id}/simulate-capture`,{token:nextCustomer,body:{}});
 assert.equal(valid.data.state,'CONFIRMED');
 assert.equal(database(`SELECT on_hand || ',' || reserved FROM offer WHERE id='${o.id}'`),'0,0');
});
