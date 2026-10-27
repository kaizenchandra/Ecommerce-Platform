// Local-only, repeatable fixture creation through the same seller/admin APIs used by the UI.
const base=process.env.COMMERCE_URL||'http://127.0.0.1:8080';
const seller=process.env.SELLER_TOKEN||'local-seller-a',admin=process.env.ADMIN_TOKEN||'local-admin';
const fixtures=[
 ['The everyday stoneware mug','Ceramics','A gently rounded stoneware mug for slower mornings. Illustrative local catalog fixture.',129900,25],
 ['The Sunday stripe cushion','Textiles','Warm terracotta stripes bring a softer rhythm to your favourite corner. Illustrative local fixture.',189900,18],
 ['The golden hour table lamp','Lighting','A warm, sculptural accent for the spaces you return to. Illustrative local fixture.',349900,12],
 ['The quiet morning cup','Ceramics','A simple ceramic companion for your daily rituals. Illustrative local fixture.',89900,30],
 ['The woven comfort cushion','Textiles','Soft textures and earthy tones, thoughtfully brought together. Illustrative local fixture.',159900,20],
 ['The reading nook lamp','Lighting','Considered light for a well-loved corner. Illustrative local fixture.',429900,10]
];
async function req(path,token,body){const r=await fetch(base+'/api/'+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});if(!r.ok)throw new Error(`${path}: ${r.status} ${await r.text()}`);return r.json();}
const existing=await req('seller/offers',seller);
for(const [title,category,description,pricePaise,stock] of fixtures){const o=existing.find(x=>x.title===title)||await req('seller/offers',seller,{title,category,description,pricePaise,stock});await req(`admin/offers/${o.id}/publish`,admin,{});console.log('Published fixture:',title);}
