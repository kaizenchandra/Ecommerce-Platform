"use client";
import {useEffect,useRef,useState} from "react";
import {useRouter} from "next/navigation";
import {browserAPI,money,type Offer,type Checkout} from "@/lib/api";
import {ProductArt} from "./ProductArt";
export function CheckoutForm({offer,basket,identityKey}:{offer:Offer;basket?:{offer:Offer;quantity:number}[];identityKey?:string}) {
 const router=useRouter(),key=useRef<string|null>(null);
 const formRef=useRef<HTMLFormElement|null>(null);
 const [quantity,setQuantity]=useState(1),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const [viewIdentity,setViewIdentity]=useState(identityKey);
 useEffect(()=>{if(identityKey)return;void browserAPI("guest-session",{}).then(()=>browserAPI<{identityKey:string}>("session-context")).then(c=>setViewIdentity(c.identityKey)).catch(()=>setError("Your session could not be verified. Sign in again or reload before checkout."));},[identityKey]);
 async function savedAddress(){setError("");try{const profile=await browserAPI<{identityKey:string;address:{name:string;line:string;city:string;pin:string}|null}>("account");if(profile.identityKey!==viewIdentity)throw new Error("Identity changed. Reload checkout before using another account’s address.");if(!profile.address)throw new Error("Save a delivery address in your account first.");for(const [name,value] of Object.entries(profile.address)){const input=formRef.current?.elements.namedItem(name);if(input instanceof HTMLInputElement)input.value=value;}}catch(e){setError(e instanceof Error?e.message:"Sign in to use your saved address");}}
 async function submit(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();if(busy)return;setBusy(true);setError("");
  const f=new FormData(event.currentTarget);
  const address={name:f.get("name"),line:f.get("line"),city:f.get("city"),pin:f.get("pin")};
  const selection=basket?{items:basket.map(i=>({offerId:i.offer.id,quantity:i.quantity,expectedPricePaise:i.offer.pricePaise})),address}:{offerId:offer.id,quantity,expectedPricePaise:offer.pricePaise,address};
  // Persist before network submission, so interrupted requests can use the same key after reload.
  const serialized=JSON.stringify(selection),storageKey="aangan-checkout-attempt";
  try {
   const prior=JSON.parse(sessionStorage.getItem(storageKey)||"null") as {payload:string;key:string;identity?:string}|null;
   if(prior && prior.payload!==serialized){throw new Error("An earlier checkout attempt has different details. Resume its original details or clear the attempt after checking its outcome.");}
   key.current=prior?.key||key.current||crypto.randomUUID();
   // Establish durable browser ownership before any upstream reservation can commit.
   await browserAPI("guest-session",{});
   if(prior&&!prior.identity)throw new Error("This older checkout attempt needs its original order checked before retrying. Do not create another payment.");
   const identity=prior?.identity||viewIdentity;if(!identity)throw new Error("Session is not ready. Reload checkout.");
   sessionStorage.setItem(storageKey,JSON.stringify({payload:serialized,key:key.current,identity}));
   const result=await browserAPI<Checkout>(basket?"checkouts/basket":"checkouts",selection,key.current,identity);
   sessionStorage.setItem("aangan-last-checkout",result.id);sessionStorage.removeItem(storageKey);
   router.push(`/orders/${result.id}`);
  }catch(e){setError(e instanceof Error?e.message:"Checkout unavailable");setBusy(false);}
 }
 const lines=basket||[{offer,quantity}];
 const total=lines.reduce((sum,i)=>sum+i.offer.pricePaise*i.quantity,0),count=lines.reduce((sum,i)=>sum+i.quantity,0);
 return <form className="checkout-grid" onSubmit={submit} ref={formRef}>
  <section className="panel"><h2>Where should it go?</h2><p className="muted">Guest checkout · Use a test address for this demonstration.</p>
   <button className="secondary" type="button" disabled={busy} onClick={()=>void savedAddress()}>Use saved account address</button>
   <fieldset disabled={busy}><label>Full name<input name="name" required maxLength={100} autoComplete="name"/></label><label>Address<input name="line" required minLength={5} maxLength={300} autoComplete="street-address"/></label>
    <div className="form-row"><label>City<input name="city" required maxLength={100} autoComplete="address-level2"/></label><label>PIN code<input name="pin" required pattern="[1-9][0-9]{5}" inputMode="numeric" maxLength={6} autoComplete="postal-code"/></label></div>
    {!basket&&<label>Quantity<select value={quantity} onChange={e=>setQuantity(Number(e.target.value))}>{Array.from({length:Math.min(offer.available,10)},(_,i)=><option key={i+1}>{i+1}</option>)}</select></label>}
   </fieldset>
  </section>
  <aside className="panel order-summary"><h2>Your considered {basket?"choices":"choice"}</h2>
   {lines.map(i=><div className="mini-product" key={i.offer.id}><ProductArt category={i.offer.category} title={i.offer.title}/><div><h3>{i.offer.title}</h3><p>{i.offer.sellerName} · Quantity {i.quantity}</p><strong>{money(i.offer.pricePaise*i.quantity)}</strong></div></div>)}
   <dl><div><dt>Items ({count})</dt><dd>{money(total)}</dd></div><div><dt>Shipping</dt><dd>Free (local fixture)</dd></div><div><dt>Taxes</dt><dd>Included in price</dd></div><div className="total"><dt>Total</dt><dd>{money(total)}</dd></div></dl>
   <p className="fine">Every item’s stock and price are verified by the server. Your reservation lasts 15 minutes. Reserving does not take a payment.</p>
   {error&&<p className="error" role="alert">{error}</p>}<button className="button wide" disabled={busy||!viewIdentity||lines.some(i=>i.offer.available<i.quantity)}>{busy?"Checking price & availability…":"Reserve & continue to payment ↗"}</button>
  </aside>
 </form>;
}
