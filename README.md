# Aangan marketplace

An India-first marketplace implementation in progress. Next.js storefront and local seller/admin workflows, Java 21 commerce with PostgreSQL, Go discovery with Kafka → Elasticsearch. The first slice uses **controlled local payment simulation by default**. It does not charge money, dispatch goods, or establish production readiness.

See [implementation status](docs/implementation-status.md), [architecture baseline](docs/architecture/baseline.md), [design specification](docs/architecture/design.md), [pattern decisions](docs/adr/0001-boundaries-and-patterns.md), and [API contract](contracts/commerce.openapi.yaml).

## Run locally

Requirements: Docker Compose, Node 22+ (for fixtures/tests), approximately 5GB available Docker memory. Host Java is unnecessary; Java tests/build run in the image build. All exposed ports bind to loopback. Compose credentials are intentionally public local fixtures; do not expose this stack externally.

```sh
docker compose up -d --build
node tests/wait-ready.mjs
node tests/seed.mjs
```

Open http://127.0.0.1:3000. Seller workspace: `local-seller-a` (second tenant: `local-seller-b`); administrator: `local-admin`. These local credentials are accepted only with `LOCAL_MODE=true`. Customer guest sessions are HMAC-signed HttpOnly cookies. Create a listing, publish it from admin, search for it, choose a product, review a test address and quantity, reserve, then explicitly simulate capture. Order state survives refresh. No fake payment redirect is treated as confirmation.

The seed command publishes six clearly labelled illustrative products through the authenticated APIs and can be rerun without creating duplicate seed titles. Integration tests create their own uniquely named records in the local database. Persistence lives in named Docker volumes. `docker compose down` stops services without deleting data.

## Verify

```sh
node --test tests/system.test.mjs tests/reconciliation.test.mjs tests/cart.test.mjs tests/account.test.mjs tests/wishlist.test.mjs tests/fulfillment.test.mjs
node tests/contracts.mjs
cd services/discovery
go test -race ./...
go vet ./...
cd ../../apps/storefront
npm ci
npm run typecheck
npm run build
npx playwright install chromium
npm run test:e2e
```

Commerce Docker build runs Maven `verify`, including JUnit. System tests require the local Compose project and Docker CLI; they exercise actual PostgreSQL/Kafka/Elasticsearch and use SQL for controlled expiry/provider/retry fixtures and invariant assertions. Do not point them at a shared or production environment.

## Scope boundary

The [account development flow](docs/runbooks/customer-accounts.md) adds local customer fixtures (`local-customer-a`, `local-customer-b`), a versioned profile/default address, account order history and explicitly authorized, replay-safe guest-cart merging. These are test identities, not production OIDC/MFA. Finish guest payments before signing in. Account tests use isolated fixed customers and clear their local fixture carts.

Implemented slice includes durable guest/account bags and atomic multi-item/multi-seller checkout, customer profiles/default addresses/history and guest-cart merging, customer OIDC integration, encrypted durable sessions, safe identity-bound writes and private wishlists, bounded payment recovery, administrator verification/linking, immutable per-seller capture transfers and tenant-scoped gross capture summaries. See the [identity configuration and recovery guide](docs/runbooks/oidc-and-session-recovery.md), [bag/checkout guide](docs/runbooks/cart-and-basket.md) and [payment recovery runbook](docs/runbooks/payment-recovery.md). Real identity-provider/MFA verification, privileged identity, cancellation/returns/refunds, full finance/settlements, tax invoices, shipping integrations, comprehensive telemetry, Terraform, and AWS deployment remain outstanding. Search returns at most 100 results; full facets and pagination are not yet implemented. Redis is deliberately deferred until a measured cache need exists.

For isolated OIDC protocol tests, start `docker compose -f compose.yaml -f compose.oidc.yaml up -d --build` and run `OIDC_TESTS=true npm run test:e2e` from the storefront directory. This fixture simulates assurance claims; it does not authenticate real users or verify real MFA.

The [fulfillment workspace](docs/runbooks/fulfillment.md) now supports seller-scoped packing, shipment references and delivery reports for confirmed purchases, with customer-visible tracking and atomic audit/outbox events. Carrier booking/verification, partial shipments, cancellation, returns and refunds remain unimplemented. No goods are dispatched by local simulations.

See [local operations and payment setup](docs/runbooks/local-and-payments.md) and the [purchase sequence](docs/architecture/purchase-sequence.md) before enabling Razorpay Test Mode. No live mode is permitted by the adapter. Contract validation requires the storefront dev dependencies installed by `npm ci`.
