import {test} from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
async function api(path,token,body){const r=await fetch('http://127.0.0.1:8080/api/'+path,{method:body===undefined?'GET':'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,data:await r.json().catch(()=>null)};}
test('wishlist is private, durable, idempotent and does not reserve inventory',async()=>{
 const created=await api('seller/offers','local-seller-a',{title:'Wishlist '+randomUUID(),category:'Ceramics',description:'Wishlist fixture',pricePaise:5000,stock:2});assert.equal(created.status,201);const id=created.data.id;
 await api(`admin/offers/${id}/publish`,'local-admin',{});
 assert.equal((await api('account/wishlist','')).status,401);assert.equal((await api('account/wishlist','local-seller-a')).status,403);
 const updates=await Promise.all([1,2,3].map(()=>api('account/wishlist','local-customer-a',{offerId:id,saved:true})));assert.ok(updates.every(r=>r.status===200));
 assert.equal((await api('account/wishlist','local-customer-a')).data.filter(i=>i.offerId===id).length,1);
 assert.ok(!(await api('account/wishlist','local-customer-b')).data.some(i=>i.offerId===id));
 assert.equal((await api(`catalog/${id}`,'')).data.available,2);
 await api('account/wishlist','local-customer-b',{offerId:id,saved:false});assert.ok((await api('account/wishlist','local-customer-a')).data.some(i=>i.offerId===id));
 assert.equal((await api('account/wishlist','local-customer-a',{offerId:id})).status,400);
 await api('account/wishlist','local-customer-a',{offerId:id,saved:false});assert.ok(!(await api('account/wishlist','local-customer-a')).data.some(i=>i.offerId===id));
});
