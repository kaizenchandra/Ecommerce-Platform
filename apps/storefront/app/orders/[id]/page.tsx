import {OrderStatus} from "@/components/OrderStatus";
export default async function Page({params}:{params:Promise<{id:string}>}){return <main id="main" className="page-shell"><OrderStatus id={(await params).id}/></main>;}
