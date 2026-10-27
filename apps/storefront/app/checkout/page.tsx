import {publicAPI,type Offer} from "@/lib/api";
import {CheckoutForm} from "@/components/CheckoutForm";
import Link from "next/link";
import {CartView} from "@/components/Cart";
export const dynamic="force-dynamic";
export default async function Page({searchParams}:{searchParams:Promise<{offer?:string;cart?:string}>}) {
 const params=await searchParams;
 if(params.cart==="1")return <main id="main" className="page-shell"><p className="eyebrow">YOUR BAG / DELIVERY / PAYMENT</p><h1>One delivery address.<br/><em>Every considered choice.</em></h1><CartView checkout/></main>;
 const id=params.offer;
 if(!id || !/^[a-f0-9-]{36}$/.test(id))return <main id="main" className="page-shell"><h1>Your bag is waiting.</h1><Link href="/">Discover the collection</Link></main>;
 const offer=await publicAPI<Offer>(`/api/catalog/${id}`);
 return <main id="main" className="page-shell"><p className="eyebrow">YOUR BAG / DELIVERY / PAYMENT</p><h1>A few details.<br/><em>Then it’s yours to enjoy.</em></h1><CheckoutForm offer={offer}/></main>;
}
