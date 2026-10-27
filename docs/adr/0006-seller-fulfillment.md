# ADR 0006 — Seller-scoped fulfillment

Adopt a local transactional fulfillment module in commerce. Checkout, immutable items and capture state already share authoritative PostgreSQL ownership; splitting shipping transitions into a new service would add consistency and authorization risk before a carrier integration exists.

Initial aggregate is `(checkout_id, seller_id)`, one shipment containing all that seller's purchased items. States: `AWAITING_FULFILLMENT → PACKED → SHIPPED → DELIVERED`. Only `CONFIRMED` orders are eligible. These states describe seller reports, not external carrier evidence or actual dispatch by this application. Partial shipments, cancellation, returns and refund orchestration remain separate upcoming work.

Every mutation derives seller identity from the principal, checks seller ownership and locks the parent checkout. Expected version rejects conflicting updates; exact state/details replay is a no-op. `expectedSellerId` must equal the principal to prevent a stale workspace modifying another seller's portion after an identity switch. It never grants access. Future cancellation/refund eligibility must lock this same checkout before inspecting fulfillment to prevent shipment races.

The transaction persists shipment state, audit entry and `commerce.fulfillment.v1` outbox event together. Kafka key is checkout ID; logical event aggregate is checkout ID plus seller ID, with monotonically increasing per-seller version. Delivery is at least once. No notification consumer is implemented yet; future consumers must deduplicate event IDs and reject stale aggregate versions. Existing outbox retries leave failures pending and visible. Events contain no address, carrier reference or customer identity. Customer tracking reads authoritative state.

Operational cost is one table/index, bounded reads and the existing outbox. Latest-50 seller queue requires pagination before sustained production use. Seller address access is limited to confirmed purchases containing their items; retention/deletion and privileged access review remain release gates. No new paid provider or infrastructure is introduced.

Tests cover capture gating, cross-seller/customer denial, immutable tracking after shipment, invalid transition rejection, concurrent identical retries, independent seller portions, unchanged stock, event/audit counts and desktop/mobile tracking. See [runbook](../runbooks/fulfillment.md).
