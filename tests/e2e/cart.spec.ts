import {test,expect} from '../../apps/storefront/node_modules/@playwright/test';
import AxeBuilder from '../../apps/storefront/node_modules/@axe-core/playwright';
import {randomUUID} from 'node:crypto';
test('saved multi-seller bag survives reload and completes one controlled purchase',async({page,request})=>{
 const offers=[];
 for(const seller of ['local-seller-a','local-seller-b']){
  const response=await request.post('http://127.0.0.1:8080/api/seller/offers',{headers:{Authorization:'Bearer '+seller},data:{title:'Saved bag '+randomUUID(),category:'Ceramics',description:'Browser bag fixture',pricePaise:12000,stock:5}});
  expect(response.status()).toBe(201);const offer=await response.json();offers.push(offer);
  expect((await request.post(`http://127.0.0.1:8080/api/admin/offers/${offer.id}/publish`,{headers:{Authorization:'Bearer local-admin'},data:{}})).status()).toBe(200);
  await page.goto('/products/'+offer.id);
  if(offers.length===1){
   await page.route('**/api/cart/items',async route=>{expect((await route.fetch()).status()).toBe(200);await route.abort('failed');},{times:1});
   await page.getByRole('button',{name:'Add to saved bag'}).click();await expect(page.getByRole('alert')).toBeVisible();
  }
  await page.getByRole('button',{name:'Add to saved bag'}).click();await expect(page).toHaveURL(/\/cart$/);
  await expect(page.getByRole('heading',{name:offer.title,exact:true})).toBeVisible();
  await expect(page.getByLabel('Quantity for '+offer.title)).toHaveValue('1');
 }
 await page.reload();
 for(const offer of offers)await expect(page.getByRole('heading',{name:offer.title,exact:true})).toBeVisible();
 await page.getByLabel('Quantity for '+offers[0].title).selectOption('2');
 await expect(page.getByRole('link',{name:'Review bag & delivery'})).toBeVisible();
 await page.reload();await expect(page.getByLabel('Quantity for '+offers[0].title)).toHaveValue('2');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
 await page.getByRole('link',{name:'Review bag & delivery'}).click();
 await page.getByLabel('Full name').fill('Basket Customer');await page.getByLabel('Address',{exact:true}).fill('123 Fixture Lane');await page.getByLabel('City',{exact:true}).fill('Pune');await page.getByLabel('PIN code').fill('411001');
 await expect(page.getByText('Items (3)',{exact:true})).toBeVisible();
 let checkoutId='';
 await page.route('**/api/checkouts/basket',async route=>{const response=await route.fetch();expect(response.status()).toBe(201);checkoutId=(await response.json()).id;await route.abort('failed');},{times:1});
 await page.getByRole('button',{name:'Reserve & continue to payment'}).click();await expect(page.getByRole('alert')).toBeVisible();
 await page.getByRole('button',{name:'Reserve & continue to payment'}).click();await expect(page).toHaveURL(new RegExp('/orders/'+checkoutId+'$'));
 await page.getByRole('button',{name:'Simulate verified capture'}).click();await expect(page.getByText('CONFIRMED',{exact:true})).toBeVisible();
 await page.reload();await expect(page.getByText('CONFIRMED',{exact:true})).toBeVisible();
 for(const offer of offers)await expect(page.getByRole('listitem').filter({hasText:offer.title})).toBeVisible();
 expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
});
