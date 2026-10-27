"use client";
import {useCallback,useEffect,useState} from "react";
import Link from "next/link";
import {browserAPI,money,type Checkout} from "@/lib/api";
import {CustomerShipments} from "./Fulfillment";
type RazorpayConstructor=new(options:Record<string,unknown>)=>{open:()=>void};
declare global {interface Window {Razorpay?:RazorpayConstructor}}
export function OrderStatus({id}:{id:string}) {
 const [order,setOrder]=useState<Checkout|null>(null),[error,setError]=useState(""),[busy,setBusy]=useState(false);
 const refresh=useCallback(async()=>{try{setOrder(await browserAPI<Checkout>(`checkouts/${id}`));setError("");}catch(e){setError(e instanceof Error?e.message:"Unavailable");}},[id]);
 useEffect(()=>{void refresh();},[refresh]);
 useEffect(()=>{if(order?.state!=="PENDING")return;const timer=setInterval(()=>void refresh(),5000);return()=>clearInterval(timer);},[order?.state,refresh]);
 async function pay(){
  if(!order || busy)return;setBusy(true);setError("");
  try {
   if(order.paymentMode==="mock") {setOrder(await browserAPI<Checkout>(`checkouts/${id}/simulate-capture`,{}));setBusy(false);return;}
   const config=await browserAPI<{key:string}>(`checkouts/${id}/payment-config`);
   if(!window.Razorpay)await new Promise<void>((resolve,reject)=>{const script=document.createElement("script");script.src="https://checkout.razorpay.com/v1/checkout.js";script.onload=()=>resolve();script.onerror=()=>reject(new Error("Payment window could not load. Try again."));document.head.appendChild(script);});
   if(!window.Razorpay)throw new Error("Payment window unavailable");
   new window.Razorpay({key:config.key,order_id:order.providerOrderId,amount:order.totalPaise,currency:"INR",name:"Aangan · Test Mode",modal:{ondismiss:()=>setBusy(false)},handler:async(response:{razorpay_payment_id:string;razorpay_signature:string})=>{
    try{setOrder(await browserAPI<Checkout>(`checkouts/${id}/callback`,{paymentId:response.razorpay_payment_id,signature:response.razorpay_signature}));}catch(e){setError(e instanceof Error?e.message:"Verification pending");}finally{setBusy(false);}
   }}).open();
  }catch(e){setError(e instanceof Error?e.message:"Payment unavailable");setBusy(false);}
 }
 return <section className="status-panel panel"><p className="eyebrow">YOUR PURCHASE</p><h1>{order?.state==="CONFIRMED"?"A thoughtful choice.":order?.state==="EXPIRED"?"Reservation expired.":order?.state==="REVIEW"?"Payment needs review.":"One more step."}</h1><div aria-live="polite">{!order&&!error&&<p>Loading your checkout…</p>}{order&&<><span className="status-badge">{order.state}</span><h2>{order.title}</h2><p>{order.items.reduce((sum,i)=>sum+i.quantity,0)} item(s) · {money(order.totalPaise)}</p><ul>{order.items.map(i=><li key={i.offerId}>{i.title} · {i.quantity} × {money(i.unitPaise)} · Seller {i.sellerId}</li>)}</ul><p className="fine">Reference: {order.id}</p>{order.paymentMode==="mock"&&<p className="notice">Controlled local payment simulation. No money is charged and no goods are dispatched.</p>}{order.state==="CONFIRMED"?<p>{order.paymentMode==="mock"?"The simulated capture is recorded. Stock has been committed once.":"The backend verified a captured Razorpay test payment."}</p>:order.state==="REVIEW"?<p>A capture arrived after the reservation ended. The order is not confirmed; an operator must reconcile the payment.</p>:order.state==="EXPIRED"?<p>The stock reservation was released. Review availability before starting again.</p>:<><p>Payment is pending. A browser callback alone does not confirm an order.</p><p className="fine">Reservation ends: {new Date(order.expiresAt).toLocaleString("en-IN")}</p>{order.providerState==="READY"?<button className="button" onClick={pay} disabled={busy}>{busy?"Verifying…":order.paymentMode==="mock"?"Simulate verified capture":"Pay with Razorpay · Test Mode"}</button>:<p className="notice">Provider outcome is {order.providerState.toLowerCase()}. Do not create another payment. Reconciliation is required.</p>}</>}</>}{error&&<p role="alert" className="error">{error}</p>}</div>{order?.state==="CONFIRMED"&&<CustomerShipments id={id}/>}<div className="action-row"><button className="secondary" onClick={()=>void refresh()}>Refresh status</button><Link href="/">Continue discovering ↗</Link></div></section>;
}
