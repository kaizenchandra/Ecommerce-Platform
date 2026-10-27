import {test,expect} from '../../apps/storefront/node_modules/@playwright/test';
import {randomUUID} from 'node:crypto';
test('stale-tab customer writes are rejected and wishlist persists for its owner',async({page,context})=>{
 const request=context.request;
 const origin={Origin:'http://127.0.0.1:3000'};
 await request.post('/api/guest-session',{headers:origin,data:{}});
 const guest=(await (await request.get('/api/session-context')).json()).identityKey;
 await request.post('/api/account-session',{headers:origin,data:{token:'local-customer-a'}});
 const account=(await (await request.get('/api/session-context')).json()).identityKey;expect(account).not.toBe(guest);
 const offer=await (await request.post('http://127.0.0.1:8080/api/seller/offers',{headers:{Authorization:'Bearer local-seller-a'},data:{title:'Identity wishlist '+randomUUID(),category:'Ceramics',description:'Fixture',pricePaise:9000,stock:2}})).json();
 await request.post(`http://127.0.0.1:8080/api/admin/offers/${offer.id}/publish`,{headers:{Authorization:'Bearer local-admin'},data:{}});
 const rejected=await request.post('/api/checkouts',{headers:{...origin,'X-Identity-Key':guest,'Idempotency-Key':randomUUID()},data:{offerId:offer.id,quantity:1,expectedPricePaise:9000,address:{name:'Fixture',line:'123 Test Lane',city:'Pune',pin:'411001'}}});expect(rejected.status()).toBe(409);
 await page.goto('/products/'+offer.id);await page.getByRole('button',{name:'Save to wishlist'}).click();await expect(page.getByText('Saved to your wishlist.',{exact:true})).toBeVisible();
 await page.goto('/wishlist');await expect(page.getByRole('link').filter({hasText:offer.title})).toBeVisible();await page.reload();await expect(page.getByRole('link').filter({hasText:offer.title})).toBeVisible();
 await request.post('/api/account-session',{headers:origin,data:{token:'local-customer-b'}});
 await page.getByRole('button',{name:'Remove saved '+offer.title,exact:true}).click();await expect(page.getByRole('alert').filter({hasText:'identity changed'})).toBeVisible();
 await page.reload();await expect(page.getByRole('link').filter({hasText:offer.title})).toHaveCount(0);
});
