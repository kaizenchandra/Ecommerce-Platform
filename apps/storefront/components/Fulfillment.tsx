"use client";
import {useCallback,useEffect,useState} from "react";
import {browserAPI} from "@/lib/api";
type Shipment={checkoutId:string;sellerId:string;state:string;carrier:string;trackingReference:string;version:number};
type SellerOrder={checkoutId:string;address:{name:string;line:string;city:string;pin:string};items:{offerId:string;title:string;quantity:number}[];shipment:Shipment};
const label=(state:string)=>state.replaceAll("_"," ");
export function SellerFulfillment(){
 const [orders,setOrders]=useState<SellerOrder[]>([]),[error,setError]=useState(""),[busy,setBusy]=useState(false),[loaded,setLoaded]=useState(false),[notice,setNotice]=useState("");
 const load=useCallback(async()=>{try{setOrders(await browserAPI<SellerOrder[]>("seller/orders"));setError("");setLoaded(true);}catch(e){setError(e instanceof Error?e.message:"Orders unavailable");}},[]);
 useEffect(()=>{void load();},[load]);
 async function update(e:React.FormEvent<HTMLFormElement>,order:SellerOrder){
  e.preventDefault();const data=new FormData(e.currentTarget),s=order.shipment;setBusy(true);setError("");
  const state=s.state==="AWAITING_FULFILLMENT"?"PACKED":s.state==="PACKED"?"SHIPPED":"DELIVERED";
  try{await browserAPI(`seller/orders/${order.checkoutId}/fulfillment`,{state,carrier:state==="SHIPPED"?data.get("carrier"):s.carrier,trackingReference:state==="SHIPPED"?data.get("tracking"):s.trackingReference,expectedVersion:s.version,expectedSellerId:s.sellerId});await load();setNotice("Fulfillment updated to "+label(state)+".");}catch(e){setError(e instanceof Error?e.message:"Update failed");}finally{setBusy(false);}
 }
 return <section className="panel"><h2>Fulfillment workspace</h2><p role="status" aria-label="Fulfillment updates">{notice}</p><p className="fine">Latest 50 confirmed purchases. Updates are seller-reported; no carrier booking or delivery verification is performed.</p><button className="secondary" disabled={busy} onClick={()=>void load()}>Refresh fulfillment</button>{!loaded&&!error&&<p>Loading orders…</p>}{loaded&&orders.length===0&&<p>No confirmed orders to fulfill.</p>}{error&&<p className="error" role="alert">{error}</p>}<ul className="listing-list">{orders.map(o=><li key={o.checkoutId}><form onSubmit={e=>void update(e,o)} aria-label={`Fulfill ${o.checkoutId}`}><h3>Purchase {o.checkoutId}</h3><ul>{o.items.map(i=><li key={i.offerId}>{i.quantity} × {i.title}</li>)}</ul><p>{o.address.name} · {o.address.line} · {o.address.city} {o.address.pin}</p><p>{label(o.shipment.state)}</p>{o.shipment.trackingReference&&<p>{o.shipment.carrier}: {o.shipment.trackingReference}</p>}{o.shipment.state==="PACKED"&&<><label>Carrier<input name="carrier" required maxLength={80}/></label><label>Tracking reference<input name="tracking" required maxLength={120}/></label></>}{o.shipment.state!=="DELIVERED"&&<button className="button" disabled={busy}>{o.shipment.state==="AWAITING_FULFILLMENT"?"Mark packed":o.shipment.state==="PACKED"?"Record shipment":"Report delivered"}</button>}</form></li>)}</ul></section>;
}
export function CustomerShipments({id}:{id:string}){
 const [items,setItems]=useState<Shipment[]>([]),[error,setError]=useState(""),[loaded,setLoaded]=useState(false);
 const load=useCallback(async()=>{try{setItems(await browserAPI<Shipment[]>(`checkouts/${id}/shipments`));setLoaded(true);setError("");}catch(e){setError(e instanceof Error?e.message:"Tracking unavailable");}},[id]);
 useEffect(()=>{void load();},[load]);
 return <section><h2>Shipment updates</h2><p className="fine">Seller-reported status. Carrier verification and delivery estimates are not available.</p>{!loaded&&!error&&<p>Loading shipment updates…</p>}{error&&<p role="alert" className="error">{error}</p>}<ul>{items.map(s=><li key={s.sellerId}>Seller {s.sellerId}: {label(s.state)}{s.trackingReference&&<> · {s.carrier} · {s.trackingReference}</>}</li>)}</ul><button className="secondary" onClick={()=>void load()}>Refresh tracking</button></section>;
}
