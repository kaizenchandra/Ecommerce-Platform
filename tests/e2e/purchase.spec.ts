import {test,expect} from '../../apps/storefront/node_modules/@playwright/test';
import AxeBuilder from '../../apps/storefront/node_modules/@axe-core/playwright';
import {createHmac,randomUUID} from 'node:crypto';

test('administrator verifies pending payment evidence and reads audited history',async({page,request})=>{
 const api='http://127.0.0.1:8080/api/';
 const sellerHeaders={Authorization:'Bearer local-seller-a'},adminHeaders={Authorization:'Bearer local-admin'};
 const created=await request.post(api+'seller/offers',{headers:sellerHeaders,data:{title:'Browser recovery '+randomUUID(),category:'Ceramics',description:'Local recovery fixture',pricePaise:50000,stock:2}});
 expect(created.status()).toBe(201);const offer=await created.json();
 expect((await request.post(api+`admin/offers/${offer.id}/publish`,{headers:adminHeaders,data:{}})).status()).toBe(200);
 const payload=`guest:${randomUUID()}:${Math.floor(Date.now()/1000)+3600}`;
 const token=payload+':'+createHmac('sha256',process.env.GUEST_SECRET||'local-only-guest-signing-secret-rotate-before-sharing').update(payload).digest('hex');
 const checkout=await request.post(api+'checkouts',{headers:{Authorization:'Bearer '+token,'Idempotency-Key':randomUUID()},data:{offerId:offer.id,quantity:1,expectedPricePaise:50000,address:{name:'Test',line:'123 Test Lane',city:'Pune',pin:'411001'}}});
 expect(checkout.status()).toBe(201);const {id}=await checkout.json();
 await page.goto('/admin');await page.getByLabel('Local admin credential').fill('local-admin');await page.getByRole('button',{name:'Open workspace'}).click();
 await page.getByRole('button',{name:'Verify payment '+id,exact:true}).click();
 await expect(page.getByRole('region',{name:'Payment verification history'})).toContainText('AWAITING_CAPTURE');
 const violations=(await new AxeBuilder({page}).include('[aria-labelledby="payment-queue-title"]').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations;
 expect(violations).toEqual([]);
 expect((await request.post(api+`checkouts/${id}/simulate-provider-capture`,{headers:{Authorization:'Bearer '+token},data:{}})).status()).toBe(200);
 await expect.poll(async()=>{const r=await request.get(api+`checkouts/${id}`,{headers:{Authorization:'Bearer '+token}});return (await r.json()).state;},{timeout:30000}).toBe('CONFIRMED');
 await page.getByRole('button',{name:'Refresh payment queue'}).click();
 await expect(page.getByRole('button',{name:'Verify payment '+id,exact:true})).toHaveCount(0);
});

test('seller → moderation → discovery → controlled purchase',async({page})=>{
 const title='Browser ceramic '+Date.now();
 await page.goto('/seller');
 await page.getByLabel('Local seller credential').fill(process.env.SELLER_TOKEN||'local-seller-a');
 await page.getByRole('button',{name:'Open workspace'}).click();
 await page.getByLabel('Product name').fill(title);
 await page.getByLabel('Description',{exact:true}).fill('Browser integration fixture, no goods dispatched.');
 await page.getByLabel('Price (INR paise)').fill('99900');
 await page.getByLabel('Stock',{exact:true}).fill('3');
 await page.getByRole('button',{name:'Submit for approval'}).click();
 await expect(page.getByRole('status',{name:'Listing updates'})).toContainText('submitted');
 await page.goto('/admin');
 await page.getByLabel('Local admin credential').fill(process.env.ADMIN_TOKEN||'local-admin');
 await page.getByRole('button',{name:'Open workspace'}).click();
 await page.getByRole('button',{name:'Publish '+title,exact:true}).click();
 await expect(page.getByRole('status',{name:'Listing updates'})).toContainText('published');
 await expect.poll(async()=>{
  await page.goto('/?q='+encodeURIComponent(title));
  const heading=page.getByRole('heading',{name:title,exact:true});
  // App Router can fire navigation load before the streamed catalog arrives.
  await heading.waitFor({state:'visible',timeout:2000}).catch(()=>{});
  return heading.count();
 },{timeout:30000}).toBe(1);
 await page.getByRole('heading',{name:title,exact:true}).click();
 await page.getByRole('link',{name:'Buy now & review'}).click();
 await page.getByLabel('Full name').fill('Test Customer');
 await page.getByLabel('Address',{exact:true}).fill('123 Fixture Lane');
 await page.getByLabel('City',{exact:true}).fill('Pune');
 await page.getByLabel('PIN code').fill('411001');
 expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
 let interruptedId='';
 await page.route('**/api/checkouts',async route=>{
  const response=await route.fetch();
  expect(response.status()).toBe(201);
  interruptedId=(await response.json()).id;
  await route.abort('failed');
 },{times:1});
 await page.getByRole('button',{name:'Reserve & continue to payment'}).click();
 await expect(page.getByRole('alert')).toBeVisible();
 await page.getByRole('button',{name:'Reserve & continue to payment'}).click();
 await expect(page).toHaveURL(new RegExp(`/orders/${interruptedId}$`));
 await expect(page.getByText('PENDING',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Simulate verified capture'}).click();
 await expect(page.getByText('CONFIRMED',{exact:true})).toBeVisible();
 await page.reload();
 await expect(page.getByText('CONFIRMED',{exact:true})).toBeVisible();
 expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
});
test('homepage accessibility, keyboard search and mobile reflow',async({page},testInfo)=>{
 await page.goto('/');
 await expect(page.getByRole('heading',{name:/Make room/})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
 await page.screenshot({path:testInfo.outputPath('homepage.png'),fullPage:true});
 await page.getByLabel('Search the marketplace').fill('NoMatchingProductXYZ');
 await page.getByLabel('Search the marketplace').press('Enter');
 await expect(page.getByRole('heading',{name:'A little room for discovery.'})).toBeVisible();
});
test('BFF rejects cross-origin writes',async({request})=>{
 const result=await request.post('/api/session',{headers:{Origin:'https://untrusted.example'},data:{token:'local-admin'}});
 expect(result.status()).toBe(403);
});
test('dark theme and reduced motion retain accessible contrast and layout',async({page})=>{
 await page.emulateMedia({colorScheme:'dark',reducedMotion:'reduce'});
 await page.goto('/');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
});
