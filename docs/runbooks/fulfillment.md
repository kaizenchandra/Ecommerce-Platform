# Fulfillment development and operations

Migration V7 adds seller fulfillment state. Start the local Compose stack; it applies Flyway migrations before serving requests. Only verified captured `CONFIRMED` purchases appear in the seller's latest-50 fulfillment workspace. Pending, expired and late-capture review purchases cannot be packed or shipped.

Sign into the seller workspace, find the purchase, mark packed, enter carrier and tracking reference, record shipment, then report delivery. Customer order details show each seller's independent progress. These are manually reported statuses. No carrier label is purchased, goods dispatched, delivery verified or payout triggered. All fixture journeys remain simulated.

After an interrupted request, retry the same desired state, details and expected version. Exact replay returns the current shipment without a second event. A 409 requires refreshing and reviewing the state; never automatically change the requested seller or overwrite tracking. Once shipped, tracking cannot be changed through this slice. Correction and exception workflows are not implemented; do not edit database rows ad hoc.

`FulfillmentChanged` v1 is published through the existing transactional outbox to `commerce.fulfillment.v1`, partitioned by checkout ID. Per-seller versions and event IDs support future replay-safe consumers. No consumer or notification delivery is claimed. Monitor pending outbox count/oldest age via protected metrics. Never send customer address or tracking reference into analytics/event payloads. Kafka delivery failures retain pending rows; do not delete them to clear alerts.

Run `node --test tests/fulfillment.test.mjs`, `node tests/contracts.mjs` and, from the storefront, `npm run test:e2e -- fulfillment.spec.ts`. Tests require isolated local fixtures and validate payment gating, seller isolation, races, replay, audit, stock preservation and accessible desktop/mobile tracking. Add the full existing regression suites before release.

Remaining: queue pagination, partial shipment quantities, warehouse allocation, carrier adapters/webhook verification, cancellation races, return eligibility, refunds, finance adjustments, notifications, production seller identity/MFA and address retention. V7 is additive, but an older app would hide fulfillment records; prefer roll-forward and preserve audit/outbox data. Backup/restore and rollback drills are unverified.
