import {SaveToWishlist} from "@/components/Wishlist";
import Link from "next/link";
import {notFound} from "next/navigation";
import {publicAPI,money,type Offer} from "@/lib/api";
import {ProductArt} from "@/components/ProductArt";
import {AddToBag} from "@/components/Cart";
export const dynamic="force-dynamic";
export default async function Product({params}:{params:Promise<{id:string}>}) {
 const {id}=await params;
 if(!/^[a-f0-9-]{36}$/.test(id))notFound();
 const o=await publicAPI<Offer>(`/api/catalog/${id}`);
 return <main id="main" className="page-shell"><p className="breadcrumb"><Link href="/">Discover</Link> / {o.category}</p><div className="product-detail"><ProductArt category={o.category} title={o.title}/><div><p className="eyebrow">{o.category} · {o.sellerName}</p><h1>{o.title}</h1><p>{o.description}</p><p className="product-price">{money(o.pricePaise)}</p><p className="muted">Inclusive of tax · Free shipping in this local fixture</p><p className="availability">{o.available>0?`${o.available} available · Rechecked at checkout`:"Currently sold out"}</p>{o.available>0&&<AddToBag offerId={o.id}/>}{o.available>0&&<Link className="button wide" href={`/checkout?offer=${o.id}`}>Buy now & review <span aria-hidden="true">↗</span></Link>}<SaveToWishlist offerId={o.id}/><p className="fine">Save multiple products to your bag, or review this item now. No live payments.</p><details><summary>About this piece</summary><p>{o.description}</p><p>Illustrative catalog artwork. Product photography and variant specifications are pending.</p></details><details><summary>Delivery & returns</summary><p>This local demonstration does not dispatch goods. Delivery serviceability, applicable tax and seller return terms must be configured before launch.</p></details><details><summary>Your seller</summary><p>{o.sellerName}. This listing was approved by the local marketplace administrator.</p></details></div></div></main>;
}
