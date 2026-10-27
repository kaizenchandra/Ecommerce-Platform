import Link from "next/link";
import {money,type Offer} from "@/lib/api";
import {ProductArt} from "./ProductArt";
export function ProductCard({offer}:{offer:Offer}) {
  return <article className="product-card"><Link href={`/products/${offer.id}`}><ProductArt category={offer.category} title={offer.title}/><div className="card-copy"><p className="eyebrow">{offer.category}</p><h3>{offer.title}</h3><p className="muted">By {offer.sellerName}</p><div className="price-row"><strong>{money(offer.pricePaise)}</strong><span>{offer.available>0?"View details ↗":"Sold out"}</span></div></div></Link></article>;
}
