# Aangan experience specification

## Direction and system
A warm, editorial marketplace for considered everyday goods. Ivory surfaces, ink typography, forest-green actions and saffron accents; no Amazon marks or copied assets. Campaign serif headings contrast with system sans-serif transactional text (no blocking font downloads). Local illustrations label the fixture catalog honestly.

Tokens: canvas #f7f5ef; surface #ffffff; ink #202b25; muted #56635c; action #245440; accent #ecbe75; border #d9ded4; error #a32929. Dark system preference: canvas #17211c, surface #233129, ink #f5f5ed, muted #c1cbbf. Focus: 3px outline with 3px offset. Spacing 4/8/12/16/24/32/48/64px; radius 8/16/24px; controls ≥44px; max content 1280px. Mobile first; two product columns from 560px, three from 900px. At 320px all controls reflow. Editorial type clamp 36–80px; body 16px/1.6. Tabular numbers for money. Reduced motion disables nonessential transitions.

## IA and journeys
Global: brand → discovery, search, seller workspace, administration. Customer: search → product/offer → quantity/cart review → checkout with explicit current total → pending/confirmed status. Seller: identity → submit canonical product and offer → moderation status. Admin: identity → pending listings → publish. Future authenticated navigation: wishlist, orders, account, support. Never show nonfunctional links as if implemented.

| Screen | Layout and behavior | Failure and acceptance |
|---|---|---|
| C01 Home/search | Sticky header; editorial hero; asymmetric collection cards; searchable product grid | Accessible search label; URL query; empty/retry; no fake ratings |
| C02 Product | Breadcrumb; large illustration; seller, price, stock; quantity; purchase action | Unknown product 404; sold out disables purchase; policy disclosure |
| C03 Cart/checkout | Single-item review in initial slice; address form; tax-inclusive unit/total; free shipping fixture; explicit reserve action | Quantity validation; stale price conflict; interruption retains checkout ID |
| C04 Order | Order/checkout ID, amount, pending/confirmed/expired/review status | No optimistic paid state; reload reads backend; customer ownership |
| S01 Seller | Compact form + seller-scoped offer list, moderation and stock | Authentication required; errors announced; no editable seller ID |
| A01 Admin | Moderation queue with explicit publish action | Admin role required; failures leave queue intact |
| Future | Cart merge, account, history, fulfillment, return/refund, finance, support | P0 backlog; not placeholders claiming working behavior |

## Requested pattern applicability
| ID | Problem/context and behavior | Accessibility/responsive/performance | Dependency/fallback/priority/test |
|---|---|---|---|
| UX01 Bento | Editorial category discovery | DOM reading order, stack mobile, fixed geometry | Real category links; plain grid fallback; P0; no CLS |
| UX02 Micro-interactions | Action feedback, form state | 150ms color changes, reduced motion, live error | API pending state; text fallback; P0; prevent double submit |
| UX03 Negative space | Group product vs transaction information | Spacing tokens, compact mobile | None; P0; reflow at 400% |
| UX04 Editorial type | Campaign vs price hierarchy | System fonts, fluid titles, readable money | None; P0; no clipped text |
| UX05 Lookbook | Shop styled collections | Keyboard list equivalent, touch targets | Authoritative offer IDs; product list fallback; P1; unavailable handling |
| UX06 Overlays | Mobile filters and cart access | Native dialog, focus return, Escape, no nesting | Cart/search APIs; full-page fallback; P1; keyboard journey |
| UX07 Disclosure | Specs/policy detail | Native details/summary, never hide total | Product facts; expanded fallback; P0; keyboard works |
| UX08 Passkeys | Returning identity convenience | Browser authenticator; normal login fallback | OIDC/WebAuthn, explicit payment confirmation; P2; no automatic charge |
| UX09 Media | Product understanding | Aspect ratio, alt text, lazy offscreen, no autoplay | Licensed media; local illustration fallback; P0/P1; LCP budget |
| UX10 Floating actions | Mobile purchase access | Safe-area, do not obscure focus/provider | Product/cart; inline fallback; P1; overlay collision test |
| UX11 Skeleton | Loading comprehension | Geometry matching, aria-busy, terminal error | Time-bounded requests; retry; P0; no endless loading |
| UX12 Search | Find products | Native search form first; keyboard autocomplete later | Go/Elasticsearch; authoritative degraded fallback; P0/P1; zero-result recovery |
| UX13 Infinite scroll | Long discovery lists | Explicit load-more and URL/cursor, footer reachable | Stable search-after; numbered fallback; P1; back navigation |
| UX14 Sticky/dark | Navigation and preference | Small sticky header; semantic system theme; visible focus | CSS fallback; P0 system/P1 persisted toggle; contrast check |

## Components and verification
ProductCard accepts public offer data, links to product detail, names image and price. Money accepts paise and formats INR only. CheckoutForm is a labelled form; submit announces pending/error; backend owns validity. Operational forms use explicit local role credentials until OIDC arrives. Native controls supply keyboard semantics; avoid custom dropdowns and dialogs in the first slice.

Automated browser gates: seller create → admin publish → search → product → checkout → controlled capture → confirmation; narrow mobile viewport; axe on representative screens. Manual release gates: screen reader, 200/400% zoom, focus not hidden by sticky header, dark contrast, reduced motion, hosted Razorpay overlay. Proposed budgets: public JS <200KB gzip initial, product image <200KB, LCP ≤2.5s/INP ≤200ms/CLS ≤0.1 at mobile p75. These are targets, not measured claims.
