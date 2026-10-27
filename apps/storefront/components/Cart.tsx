"use client";
import {useEffect,useRef,useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {browserAPI,money,type Offer} from "@/lib/api";
import {CheckoutForm} from "./CheckoutForm";
export type CartData={identityKey:string;version:number;items:{offerId:string;quantity:number;offer:Offer|null}[]};
async function loadCart(){await browserAPI("guest-session",{});return browserAPI<CartData>("cart");}
export function AddToBag({offerId}:{offerId:string}){
 const router=useRouter(),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const attempt=useRef<{offerId:string;quantity:number;expectedVersion:number;identityKey:string}|null>(null);
 async function add(){setBusy(true);setError("");try{if(!attempt.current){const cart=await loadCart();const quantity=(cart.items.find(i=>i.offerId===offerId)?.quantity||0)+1;if(quantity>10)throw new Error("You already have 10 of this product in your bag.");attempt.current={offerId,quantity,expectedVersion:cart.version,identityKey:cart.identityKey};}await browserAPI("cart/items",attempt.current,undefined,attempt.current.identityKey);router.push("/cart");}catch(e){setError(e instanceof Error?e.message:"Bag unavailable");setBusy(false);}}
 return <><button className="button wide" disabled={busy} onClick={()=>void add()}>{busy?"Saving to bag…":"Add to saved bag"}</button>{error&&<p className="error" role="alert">{error}</p>}</>;
}
export function CartView({checkout=false}:{checkout?:boolean}){
 const [cart,setCart]=useState<CartData|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState("");
 async function refresh(){setBusy(true);setError("");try{setCart(await loadCart());}catch(e){setError(e instanceof Error?e.message:"Bag unavailable");}finally{setBusy(false);}}
 useEffect(()=>{void refresh();},[]);
 async function change(offerId:string,quantity:number){if(!cart)return;setBusy(true);setError("");try{setCart(await browserAPI<CartData>("cart/items",{offerId,quantity,expectedVersion:cart.version},undefined,cart.identityKey));}catch(e){setError(e instanceof Error?e.message:"Bag update failed");}finally{setBusy(false);}}
 const ready=cart&&cart.items.length>0&&cart.items.every(i=>i.offer&&i.quantity<=i.offer.available);
 const total=cart?.items.reduce((sum,i)=>sum+(i.offer?.pricePaise||0)*i.quantity,0)||0;
 return <>{error&&<p className="error" role="alert">{error}</p>}{!cart&&!error&&<p role="status">Loading your saved bag…</p>}{cart&&cart.items.length===0&&<section className="panel"><h2>Your bag has room for something thoughtful.</h2><Link href="/">Explore the collection</Link></section>}{cart&&cart.items.length>0&&(checkout&&ready?<CheckoutForm identityKey={cart.identityKey} offer={cart.items[0].offer!} basket={cart.items.map(i=>({offer:i.offer!,quantity:i.quantity}))}/>:<section className="panel"><p>Saved for this browser’s guest session. Items are not reserved until checkout. Prices shown are current.</p><ul className="listing-list">{cart.items.map(i=><li key={i.offerId}><div><h2>{i.offer?<Link href={`/products/${i.offerId}`}>{i.offer.title}</Link>:"Product unavailable"}</h2><p>{i.offer?.sellerName} · {i.offer?money(i.offer.pricePaise):"Price unavailable"}</p>{(!i.offer||i.quantity>i.offer.available)&&<p className="error">Insufficient availability. Update or remove this item.</p>}<label>Quantity for {i.offer?.title||i.offerId}<select value={i.quantity} disabled={busy} onChange={e=>void change(i.offerId,Number(e.target.value))}>{Array.from({length:10},(_,n)=><option key={n+1} value={n+1}>{n+1}</option>)}</select></label><button className="secondary" disabled={busy} onClick={()=>void change(i.offerId,0)} aria-label={`Remove ${i.offer?.title||i.offerId}`}>Remove</button></div><strong>{i.offer?money(i.offer.pricePaise*i.quantity):"—"}</strong></li>)}</ul><p className="product-price">Total: {money(total)}</p><p className="fine">Tax included · Free shipping in this local fixture. Bag contents remain saved after purchase; remove purchased items before ordering again.</p>{ready&&!busy?<Link className="button" href="/checkout?cart=1">Review bag & delivery</Link>:<p>Resolve availability before checkout.</p>}</section>)}<div className="action-row"><button className="secondary" disabled={busy} onClick={()=>void refresh()}>Refresh saved bag</button><Link href="/">Continue shopping</Link></div></>;
}
