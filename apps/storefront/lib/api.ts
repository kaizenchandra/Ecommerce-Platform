export type Offer = {id:string;productId:string;title:string;category:string;description:string;sellerId:string;sellerName:string;pricePaise:number;available:number;status:string;version:number};
export type Checkout = {id:string;title:string;quantity:number;unitPaise:number;totalPaise:number;state:"PENDING"|"CONFIRMED"|"EXPIRED"|"REVIEW";providerOrderId:string|null;providerState:string;expiresAt:string;paymentMode:string;items:{offerId:string;sellerId:string;title:string;quantity:number;unitPaise:number}[]};
export const money = (paise:number) => new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:2}).format(paise/100);
export async function publicAPI<T>(path:string, discovery=false):Promise<T> {
  const base=discovery ? process.env.DISCOVERY_URL || "http://localhost:8081" : process.env.COMMERCE_URL || "http://localhost:8080";
  const res=await fetch(base+path,{cache:"no-store",signal:AbortSignal.timeout(6000)});
  if(!res.ok) throw new Error("The marketplace is temporarily unavailable. Please try again.");
  return res.json();
}
export async function browserAPI<T>(path:string,body?:unknown,key?:string,identity?:string):Promise<T> {
  const res=await fetch("/api/"+path,{method:body===undefined?"GET":"POST",headers:{"Content-Type":"application/json",...(key?{"Idempotency-Key":key}:{}),...(identity?{"X-Identity-Key":identity}:{})},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
  const data=await res.json().catch(()=>({error:"Service unavailable. Please try again."}));
  if(!res.ok)throw new Error(data.error||`Request failed (${res.status}).`);
  return data;
}
