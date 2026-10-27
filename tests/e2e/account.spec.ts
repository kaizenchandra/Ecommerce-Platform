import {test,expect} from '../../apps/storefront/node_modules/@playwright/test';
import AxeBuilder from '../../apps/storefront/node_modules/@axe-core/playwright';
import {randomUUID} from 'node:crypto';
test('customer sign-in, profile, guest merge, saved address and owned order history',async({page,request})=>{
 const base='http://127.0.0.1:8080/api/',headers={Authorization:'Bearer local-customer-a'};
 let cart=await (await request.get(base+'cart',{headers})).json();
 for(const item of cart.items){cart=await (await request.post(base+'cart/items',{headers,data:{offerId:item.offerId,quantity:0,expectedVersion:cart.version}})).json();}
 const r=await request.post(base+'seller/offers',{headers:{Authorization:'Bearer local-seller-a'},data:{title:'Account browser '+randomUUID(),category:'Ceramics',description:'Account flow fixture',pricePaise:20000,stock:3}});expect(r.status()).toBe(201);const offer=await r.json();
 await request.post(base+`admin/offers/${offer.id}/publish`,{headers:{Authorization:'Bearer local-admin'},data:{}});
 await page.goto('/products/'+offer.id);await page.getByRole('button',{name:'Add to saved bag'}).click();await expect(page).toHaveURL(/\/cart$/);
 await page.goto('/account');await page.getByLabel('Local customer credential').fill('local-customer-a');await page.getByRole('button',{name:'Sign in to account'}).click();
 await page.getByLabel('Display name').fill('Browser Account');await page.getByLabel('Recipient name').fill('Account Recipient');await page.getByLabel('Delivery address').fill('123 Account Lane');await page.getByLabel('Delivery city').fill('Pune');await page.getByLabel('Delivery PIN').fill('411001');await page.getByRole('button',{name:'Save account details'}).click();await expect(page.getByRole('status')).toContainText('saved');
 await page.reload();await expect(page.getByLabel('Recipient name')).toHaveValue('Account Recipient');
 await page.getByRole('button',{name:'Merge guest bag'}).click();await expect(page.getByRole('status')).toContainText('merged once');
 await page.getByRole('button',{name:'Merge guest bag'}).click();await expect(page.getByRole('status')).toContainText('merged once');
 expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
 await page.getByRole('link',{name:'Review account bag'}).click();await expect(page.getByLabel('Quantity for '+offer.title)).toHaveValue('1');await page.getByRole('link',{name:'Review bag & delivery'}).click();
 await page.getByRole('button',{name:'Use saved account address'}).click();await expect(page.getByLabel('Full name')).toHaveValue('Account Recipient');await page.getByRole('button',{name:'Reserve & continue to payment'}).click();await expect(page).toHaveURL(/\/orders\//);
 const id=page.url().split('/').at(-1)!;await page.getByRole('button',{name:'Simulate verified capture'}).click();await expect(page.getByText('CONFIRMED',{exact:true})).toBeVisible();
 await page.goto('/account');await expect(page.getByRole('link').filter({hasText:offer.title})).toContainText('CONFIRMED');
 const other=await request.get(base+'checkouts/'+id,{headers:{Authorization:'Bearer local-customer-b'}});expect(other.status()).toBe(404);
 await page.getByRole('button',{name:'Sign out',exact:true}).click();await expect(page.getByLabel('Local customer credential')).toBeVisible();
});
