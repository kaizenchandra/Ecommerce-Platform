# Payment recovery and capture accounting

This runbook describes implemented local behavior. Real Razorpay Test Mode calls and production identity remain unverified. Never expose local credentials or the Compose stack publicly.

## Recovery procedure

1. Open the administrator workspace and Payment recovery. Identify the checkout reference. The queue shows the newest 100 pending/review exceptions; it is not a complete paginated investigation tool.
2. Choose **Verify payment**. This fetches existing provider evidence; it never authorizes a charge, creates an order, or forces a confirmation. Inspect History for actor, time and outcome.
3. `AWAITING_CAPTURE` means no matching captured payment was found. Authorized payments are insufficient. Keep the customer status pending. Do not dispatch.
4. `ORDER_LINK_REQUIRED` means provider creation was ambiguous. Find the original order in the Test Mode provider account using the checkout UUID receipt. Enter its order ID and choose **Verify and link order**. The server independently checks receipt, amount, currency and existing linkage. A mismatched order is rejected. Linking does not confirm the checkout; run verification after linking.
5. `EVIDENCE_MISMATCH` requires investigation of provider order/payment identity, immutable checkout amount and currency. Never edit checkout values to make evidence fit. `PROVIDER_UNAVAILABLE` means the read failed; `APPLICATION_FAILURE` means capture application failed. Check sanitized service logs and dependency health before retrying.
6. `CAPTURE_VERIFIED` means capture processing ran; inspect the checkout state. A timely reservation becomes `CONFIRMED`. Expired/released reservations become `REVIEW`, recording a customer refund liability without consuming stock. **No refund is issued by this slice.** Handle through the future verified refund workflow; do not dispatch or report a completed refund.

Automatic recovery polls five eligible existing orders per pass, with a 60-second durable lease per attempt. Backoff starts at five seconds, doubles with a one-hour cap and small jitter, and stops after 12 attempts. Manual administrator verification remains available and audited. A crash leaves an expiring lease; the next eligible attempt records the abandoned attempt as `LEASE_EXPIRED`. Creation with no known provider ID is never automatically retried. The current sequential worker and bounded queue need capacity/pagination work before production volume.

Webhook/callback verification and polling all use the same transactional capture transition. One accepted capture writes one confirmation or late-capture review, plus one capture journal transfer per seller. Duplicate delivery cannot create another transfer for the same checkout/seller. The journal is append-only and stores equal debit/credit legs in one row; seller transfers sum to the verified payment total. Normal capture credits seller **gross** payable; late capture credits customer refund liability. This does not calculate commission, fees, tax, net payout, refund adjustments or settlement. Existing prior captures were backfilled with `MIGRATION_V2` origin, not represented as new provider verifications.

## Diagnostic metrics and proposed alerts

Only administrator credentials can read `/actuator/metrics` and its named metrics. Public health remains separate. No metrics route is proxied through the storefront. Counters reset on process restart; durable attempt history is the audit source. Gauges are sampled every ten seconds and must be evaluated alongside sample freshness. Customer, tenant and payment IDs are not metric labels.

| Metric | Investigation threshold (proposed; alert routing not deployed) |
|---|---|
| `commerce.payment.review` | Any new review: finance/operator investigation |
| `commerce.payment.unknown` | Unresolved beyond five minutes: inspect creation evidence |
| `commerce.payment.retries.exhausted` | Any nonzero: manual reconciliation queue |
| `commerce.reconciliation.attempts`, `commerce.reconciliation.duration` | Failure outcome increases or sustained slow provider reads |
| `commerce.outbox.pending`, `commerce.outbox.oldest.seconds` | Oldest unpublished event over 60 seconds: Kafka/outbox investigation |
| `commerce.reservation.overdue` | Nonzero for over 30 seconds: expiry worker/database investigation |
| `commerce.metrics.sample.epoch.seconds` | Older than 30 seconds: scheduler/database/sampling failure |

These are diagnostic signals, not a complete observability platform. Remote collection, tracing, durable dashboards, alert delivery tests, latency SLOs and load-derived thresholds remain release work. Sampling currently scans checkout aggregates; measure its cost and introduce appropriate indexed/materialized operational counts at scale.

## Local verification

Run `node --test tests/system.test.mjs tests/reconciliation.test.mjs` against isolated Compose only. Tests directly manipulate local fixture rows to model ambiguous creation, mismatched provider evidence, expiry and retry exhaustion. `simulate-provider-capture` persists simulated provider evidence without confirming commerce; automatic reconciliation must discover it. It is available only for the owning customer in mock mode and is not exposed by the BFF. The fixtures never represent actual Razorpay payment evidence.

Official provider references used for the adapter: [fetch order](https://razorpay.com/docs/api/orders/fetch-with-id/) and [fetch payments for an order](https://razorpay.com/docs/api/payments/fetch-payments-orders/). Metrics use [Spring Boot 3.5 Actuator](https://docs.spring.io/spring-boot/3.5/how-to/actuator.html). Production access controls and monitoring credentials must be established before remote use.
