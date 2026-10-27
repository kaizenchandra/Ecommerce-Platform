"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {browserAPI,money,type Offer} from "@/lib/api";
type Saved={identityKey:string;items:{offerId:string;offer:Offer|null}[]};
export function SaveToWishlist({offerId}:{offerId:string}){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState("");
 async function save(){setBusy(true);try{const current=await browserAPI<Saved>("account/wishlist");await browserAPI("account/wishlist",{offerId,saved:true},undefined,current.identityKey);setMessage("Saved to your wishlist.");}catch{setMessage("Sign in to your account or retry to save this product.");}finally{setBusy(false);}}
 return <><button className="secondary" disabled={busy} onClick={()=>void save()}>Save to wishlist</button><p aria-live="polite">{message}</p></>;
}
export function Wishlist(){
 const [data,setData]=useState<Saved|null>(null),[error,setError]=useState(""),[busy,setBusy]=useState(false);
 async function load(){setError("");try{setData(await browserAPI<Saved>("account/wishlist"));}catch{setError("Sign in to view your wishlist, or retry if the service is unavailable.");}}
 useEffect(()=>{void load();},[]);
 async function remove(id:string){if(!data)return;setBusy(true);setError("");try{setData(await browserAPI<Saved>("account/wishlist",{offerId:id,saved:false},undefined,data.identityKey));}catch(e){setError(e instanceof Error?e.message:"Removal failed");}finally{setBusy(false);}}
 return <section className="panel">{error&&<p className="error" role="alert">{error}</p>}{!data&&!error&&<p role="status">Loading wishlist…</p>}{data&&data.items.length===0&&<p>Your wishlist is ready for something thoughtful.</p>}<ul className="listing-list">{data?.items.map(i=><li key={i.offerId}><div>{i.offer?<Link href={`/products/${i.offerId}`}>{i.offer.title} · {money(i.offer.pricePaise)}</Link>:<p>Product unavailable</p>}<p>Price and availability are rechecked at checkout.</p><button className="secondary" disabled={busy} onClick={()=>void remove(i.offerId)} aria-label={`Remove saved ${i.offer?.title||i.offerId}`}>Remove</button></div></li>)}</ul><div className="action-row"><button className="secondary" onClick={()=>void load()} disabled={busy}>Refresh wishlist</button><Link href="/account">Account & sign-in</Link></div></section>;
}
