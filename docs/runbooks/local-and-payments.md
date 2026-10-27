# Local operations and payment setup

## Start / stop / diagnose
Use the root README commands. Health endpoints: Java `/actuator/health`; Go `:8081/health` (liveness and process counters, not full readiness). `docker compose ps` lists containers; `docker compose logs --tail=100 commerce discovery` shows bounded logs. Do not publish logs containing credentials or customer information. Outbox failures retain rows and log their event ID; the relay retries on its next scheduled pass.

Local data is retained in named volumes. Never delete volumes as a recovery shortcut. Production backup/restore, HA, alerting and rollback are not verified. Migration V1 is forward-only initial schema; future modifications require new migrations.

## Search recovery
Go consumes `catalog.v1` in group `discovery-v1`, commits only after Elasticsearch accepts the snapshot or rejects an older version. Unknown schema and poison payloads block progress visibly. This initial behavior avoids silent data loss; monitored DLQ tooling and a bounded recovery workflow are still required. Inspect `projectionFailures` and logs, repair the incompatible producer/consumer, then restart the consumer. The catalog API remains authoritative and Go falls back on Elasticsearch transport failure. A stale but reachable index can still show stale stock; checkout always validates PostgreSQL.

To rebuild an index in a dedicated local environment: stop discovery, retain the topic and its retention window, create a fresh index generation with equivalent mapping, reset a dedicated consumer group to earliest, replay, validate document counts and versions, switch the read alias atomically. **Alias/rebuild automation is not implemented in this slice**; the current index is `offers-v1`. Do not delete a production index or reset production offsets using this guide. A durable catalog snapshot export is required for recovery beyond Kafka retention.

## Razorpay Test Mode only
Official documentation inspected on 2026-10-25:
- https://razorpay.com/docs/payments/server-integration/nodejs/integration-steps/ — server-created orders, signature `HMAC-SHA256(server_order_id + "|" + payment_id, key_secret)`, verify capture through APIs/webhooks.
- https://docs.spring.io/spring-boot/3.5/system-requirements.html — Java 21 supported by Spring Boot 3.5.
- https://nextjs.org/docs/app/api-reference/file-conventions/route — Request/Response route handlers.

Set environment variables using ignored `.env` or a secret manager: `PAYMENT_MODE=razorpay-test`, `RAZORPAY_KEY=rzp_test_...`, `RAZORPAY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`. Never paste secrets into source, browser code, command output, or tests. Recreate commerce with the new configuration. The key ID is publishable; secrets stay server-side. The adapter refuses non-test key IDs. Configure provider capture settings for the test account and verify capabilities against current provider docs before exercising payments.

The browser loads Razorpay's hosted checkout only on an explicit click. Callback verification uses the stored order ID, then fetches the payment via authenticated server API. A valid signature alone leaves a non-captured payment pending. Raw webhook bytes are HMAC verified, and the authenticated payment fetch must match the recorded amount, currency and provider order. Only `payment.captured` is currently handled. Webhook configuration needs an authorized reachable test endpoint; local loopback alone cannot receive Razorpay webhooks.

Creation persists the reservation before contacting Razorpay. Timeouts and uncertain outcomes become `provider_state=UNKNOWN`; do not retry creation blindly. A process crash while creating can leave `CREATING`. An operational reconciliation use case that links provider receipt/order evidence is still required; no hidden manual DB edits are prescribed. Known captured payments arriving after reservation expiry move to `REVIEW`; no stock commitment or confirmed order is produced. A refund/reconciliation workflow must be implemented before release.

No actual Razorpay sandbox payment, webhook delivery or refund is claimed without credentials and observed evidence. Route transfers, live charges, refunds and payouts are outside authorization. The mock capture endpoint exists only in mock mode; this mode cannot start unless `LOCAL_MODE=true`.

## Security and release gates
Local seller/admin credentials have no production lifecycle. Replace with OIDC and MFA, add customer account recovery and signed-session rotation, protect internal services with service identities/network controls, enforce body/rate limits at ingress and domain boundaries, configure CSP compatible with the hosted provider, validate dependency/container vulnerabilities and license obligations. Validate tax, shipping, seller KYC, privacy retention and refund policy with the business before actual commerce. Prepare Terraform only after account, region and budget constraints are established. No cloud resources have been created.
