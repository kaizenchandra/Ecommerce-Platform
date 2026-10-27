# ADR 0003 — Durable guest cart and atomic multi-item checkout

Status: adopted and locally verified, 2026-10-26. Actual provider sandbox and production identity remain outstanding. See [verification checkpoint](../implementation-status.md).

Keep cart persistence in the existing commerce deployable for this slice. An additional Go cart service would distribute identity and checkout coordination without a measured scaling need; Go discovery remains independently deployed. Cart is not stock or price authority.

Own carts by the authenticated customer subject. Use a monotonically increasing cart version and absolute quantity updates to reject stale-tab edits. Limit carts/checkouts to 20 distinct offers, each with quantity 1–10. Zero removes an item. No reservation occurs when adding to cart. Guest capability expiry and lack of account/merge support remain explicit limitations.

Accept a sorted, deduplicated set of offer/quantity/expected-price selections plus address for checkout. Acquire offer row locks in deterministic ID order; reserve every item or roll back the entire transaction. Snapshot each line and seller in a dedicated checkout-item table. Retain legacy summary columns for the old single-offer API, but all stock and journal transitions use line snapshots. A customer-scoped idempotency key binds the complete canonical selection and address, independent of mutable cart state.

Create one provider order for the exact total. Commit/release all reserved lines together. Capture accounting splits equal debit/credit transfers by seller, constrained uniquely by checkout/seller and provider-payment/seller. Summed journal amounts must equal the verified capture. Late captures release all outstanding reservations and post refund liability. No distributed saga is required for these local invariants.

Cart contents remain saved after checkout so an interrupted response never silently removes customer selections; the UI explains this. A later cart-consumption workflow should use a cart version and explicit checkout linkage. Multi-seller fulfillment, fees, refunds and net settlement remain subsequent work.

Acceptance: reload preserves cart; customer isolation; stale-tab update rejection; multiple sellers one checkout; all-or-none reservation and expiry; reversed item ordering does not change idempotency; duplicate item rejection; price drift fails closed; concurrent last-unit attempts; capture sums and seller attribution; late capture does not consume reallocated stock; browser purchase with two products.
