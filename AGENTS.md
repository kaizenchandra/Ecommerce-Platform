# AGENTS.md — E-Commerce Marketplace Engineering Instructions

> Scope: repository-wide instructions for Codex and other coding agents. Apply more-specific `AGENTS.md` files to their respective subtrees if they exist. This file is an implementation guide, not a claim that any component is already built or deployed.

## 1. Mission and operating rules

Build and evolve a **design-led, Amazon-inspired (not Amazon-branded), Indian B2C multi-vendor e-commerce marketplace**: customer storefront, seller portal, administrator console, backend commerce services, reliable payments, fulfillment, and marketplace finance.

- **Deliver working vertical slices**: UI + API + business logic + persistence/events + automated checks. Documentation and scaffolding alone do not finish a feature.
- **Architecture first, then implementation**: inspect the repository, establish the design/service boundaries and phased backlog, then code and verify incrementally. Do not endlessly plan.
- **Preserve existing work**: inspect `git status`, applicable instructions, dependency versions, tests, conventions, and existing architecture before editing; avoid unrelated changes and destructive commands.
- **Prefer decisions with evidence**: choose pragmatic defaults for routine details. Ask targeted questions only for decisions that materially change correctness, security, compliance, financial liability, compatibility, or cloud expenditure.
- **Source of truth**: current code and checked-in contracts describe actual behavior; approved requirements/ADRs describe intended behavior. Resolve conflicts explicitly. Never silently present planned features as implemented.
- **Priority order**: security/financial correctness → domain and data integrity → functional correctness → reliability → maintainability → performance → cost/sustainability → optional polish.
- **Do not** assume proprietary Amazon internals, duplicate protected branding, or introduce architectures and libraries merely to demonstrate fashionable patterns.

### Initial product assumptions (validate when consequential)

- India-first; INR; physical goods; English-first, i18n-ready; responsive web and future PWA/mobile channels.
- First-party retail plus third-party sellers; canonical products/SKUs; seller-specific offers, prices, inventory, and fulfillment.
- Registered and guest customers; seller and admin roles; Razorpay **Test Mode** for implementation and integration verification.
- Launch in a single region; consider multi-region, complex omnichannel/POS, AI personalization, and subscriptions after the core lifecycle is proven.

## 2. Technology baseline and architectural boundaries

| Area | Default | Required decision discipline |
|---|---|---|
| Storefront / portals | Next.js App Router, React, strict TypeScript, Tailwind CSS | Reuse existing compatible versions, components, and conventions. |
| Domain-intensive services | Java 21, Spring Boot, Spring Security | Choose for meaningful domain rules, aggregate consistency, payments/orders/finance. |
| I/O-oriented services | Go, idiomatic packages, `context.Context` | Choose for justified throughput/concurrent I/O; benchmark rather than assume faster. |
| Transactions | PostgreSQL, versioned migrations | Service owns its writes, schema, invariants, and transaction boundary. |
| Integration | Apache Kafka | Async integration only where justified; ensure durability and replay safety. |
| Cache | Redis | Ephemeral/cached state with TTL, invalidation, key scoping, and fallback. |
| Search | Elasticsearch **or** OpenSearch | Choose one based on capability, hosting, cost, license, compatibility. |
| Payments | Razorpay | Provider adapter; server-side authority and verified provider outcomes. |
| Cloud | AWS; Terraform; Docker | Compare ECS/Fargate vs EKS; use Kubernetes only with clear benefits. |
| Telemetry | OpenTelemetry + metrics/logs/traces | Trace critical flows, expose actionable SLIs and operational alerts. |

### Microservices, DDD, and Clean/Hexagonal Architecture

- Analyze **bounded contexts before deployable services**. Microservices are the intended target; do not equate one aggregate/table with one service. Co-locate tightly coupled work when distributed transactions add more risk than value. At least one meaningful Java service and one meaningful Go service should interoperate where implementing the cross-language platform is in scope.
- Each service owns its domain, business rules, data mutations, API/events, migrations, tests, and operational signals. **No cross-service database writes or direct SQL joins**. Use explicit APIs and domain/integration events.
- Model aggregates, invariants, entities, value objects, commands, queries, state transitions, and authoritative sources. Distinguish Product/SKU/SellerOffer, quoted/accepted price, stock/reservation, checkout/order, payment/capture/settlement, order/shipment, refund/financial adjustment.
- Dependency direction: domain → no framework dependency; application/use cases depend on domain and ports; HTTP/DB/Kafka/Razorpay adapters implement ports. Keep transport/persistence/provider DTOs out of the core domain.
- For Java, use Spring Boot with modular domain/application/adapters/configuration; transactions at justified use-case boundaries, not blindly at controllers. For Go, prefer small consumer-owned interfaces, explicit error wrapping, context propagation, clear ownership, and concurrency safety.
- Apply SOLID, DRY, KISS, YAGNI, and separation of concerns **pragmatically**; avoid generic repositories, empty interfaces, shared mutable domain packages, hidden reflection, and extra service boundaries without benefit.

### Candidate service ownership (reassess; not fixed deployment count)

- **Java / Spring Boot**: customer/identity integration, product catalog/master data, seller/offers, pricing/promotions, inventory, checkout/orders, payment, marketplace finance, fulfillment/returns, administrative policies.
- **Go**: cart, search/API composition, notifications, search projections, carrier connectors, analytics ingestion where these justify independent scaling and ownership.
- Record language rationale, owned data, APIs, produced/consumed events, consistency, scaling, failure modes, and tests in an ADR/service matrix. Prefer a smaller initial set of coherent deployables over many empty shells.

## 3. API-first, headless commerce, multi-tenancy

- **REST + OpenAPI by default**; specify schemas, error responses, validation, authorization, idempotency, pagination, filtering, versioning, timeouts, and compatibility. Generate typed clients when it improves integration.
- Headless commerce logic belongs in domain services, not browser components or a BFF. Use a thin Next.js BFF for presentation-specific composition if valuable. **GraphQL is optional**, preferably bounded read aggregation with query-cost limits, N+1 prevention, authorization, and observability; never expose unrestricted payment/refund mutations.
- Gateways may route, authenticate ingress, throttle, and collect telemetry; domain services must independently enforce resource/tenant authorization.
- Model sellers as tenants. Authenticate seller staff membership/roles; derive tenant scope from trusted identity and server-side authorization, never just a request-supplied `sellerId`. Test seller A cannot access seller B's private offers, inventory, orders, or payouts via HTTP, GraphQL/BFF, caches, queues, or storage.
- Decide shared rows vs schemas vs dedicated tenant databases explicitly. If using PostgreSQL RLS, verify it with connection pooling, background jobs, migrations, and privileged access. Scope Redis keys and search projections so tenant data cannot leak.
- Canonical product/master data is separate from seller commercial offers and external POS/ERP/channel identifiers; reconcile incoming external feeds rather than treating every update as authoritative.

## 4. Distributed commerce correctness — mandatory

- PostgreSQL (or the domain's explicitly documented durable store) is authoritative for orders, payments, ledger entries, offers, and inventory. **Never trust UI state, Redis, Kafka, or the search index as the final transaction authority.**
- Use suitable decimal/minor-unit representations for money; explicit INR rounding, tax, coupon allocation, commission, refunds, and immutable order-price snapshots. Never use binary floats for accounting.
- Inventory must distinguish on-hand, reserved, available, committed, expired, and released quantities. Implement atomic, concurrency-safe reservations, expiry/compensation, and reconciliation; test simultaneous purchases of the final unit.
- Checkout must define ownership and state transitions for quote validation, reservation, provider order creation, payment attempts, order confirmation, stock commitment, compensation, and fulfillment. Avoid a presumed cross-service ACID transaction; use an orchestrated saga/recoverable process only where needed.
- Write operations that can be retried require stable idempotency scope, collision semantics, retention policy, and deduplication. Use timeouts, **bounded** retries with backoff/jitter for safe transient errors; classify unknown provider outcomes and reconcile rather than blindly retrying.
- Handle duplicates/out-of-order events, stale reads, service outages, partial seller fulfillment, cancellation vs shipment races, partial returns, duplicate refunds, and correction/reconciliation jobs. Build operationally repairable states rather than hidden manual DB edits.
- Outbox publication when a committed database change must reliably emit an integration event; consumers must be replay-safe, idempotent, version-aware, and use appropriate ordering/partition keys, retries, DLQ, and monitoring. Do not claim cross-system exactly-once processing without proof.
- Preserve a trustworthy financial journal/ledger and seller receivables; distinguish customer captures, platform fees, seller liabilities, provider transfers, refunds, and settlements. Reconcile records with provider reports.

### Razorpay: non-negotiable boundaries

- Create Razorpay orders **on the server** from server-validated pricing, currency, checkout ownership, and current inventory eligibility. Never expose API secrets to the browser.
- Verify checkout callback signatures server-side using the **server-stored** Razorpay order ID; validate relevant IDs/amount/currency/ownership. Verify webhooks against the **raw request body**, secret, and documented signature algorithm, with constant-time comparison when appropriate.
- Persist attempts, provider IDs, verified states, webhook deduplication, and reconciliation outcomes. A browser redirect/callback **does not prove payment capture** or justify fulfillment. Support `PENDING`/unknown states and provider reconciliation.
- Prevent duplicate capture, fulfillment, and refund; validate amount ceilings and handle partial refunds and late webhooks. Keep Razorpay-specific SDK/types in an outbound adapter.
- **Razorpay Route** seller splits/transfers depend on enabled account capabilities and current official docs; do not assume access. Provide internal settlement records and a clearly labeled non-live adapter if unavailable.
- Use only Test Mode/sandbox or isolated mocks until explicitly authorized. Never initiate live charges, payouts, or refunds without authorization.
- Passkeys/WebAuthn are **authentication**, not payment authorization; never capture/store raw biometric data or silently charge a user after login. Provide conventional checkout fallback.

## 5. Modern storefront design and UX requirements

Build a **premium, distinctive, mobile-first, accessible commerce UI**. Use product-led visual hierarchy, trustworthy price/delivery information, effective negative space, responsive density, expressive editorial typography for campaigns, and legible transactional typography. No dark patterns or hidden charges.

### Required design coverage (apply where useful; phase appropriately)

- **Bento grids** for responsive homepage/collection storytelling; preserve semantic reading order and layout stability.
- **Micro-interactions** for wishlist, add-to-cart, quantity, filters, and validation; subtle motion and `prefers-reduced-motion` support.
- **Negative space and editorial typography** with consistent spacing/type/color tokens and optimized font loading.
- **Shoppable lookbooks** and accessible product hotspots/alternative lists once discovery is functional; authoritative offers still come from backend.
- **Dynamic overlays** such as cart drawer, search suggestions, quick view, and mobile filters with proper focus trapping/restoration, keyboard escape, and scroll management.
- **Progressive disclosure** for specs/filters/shipping details, never hiding the final charge or material policy terms.
- **Passkey/biometric express checkout** as P1/P2, only if supported; normal checkout and explicit transaction confirmation remain.
- **Immersive media**: optimized product photography, zoom, video, variant galleries; add 360°/AR only when justified and with fallbacks.
- **Floating actions** only if contextual and non-obscuring; respect safe-area insets and hosted checkout overlays.
- **Skeleton loaders** matching final geometry plus real error/empty/timeout/retry states; avoid indefinite skeletons.
- **Contextual search**: suggestions, categories, typo tolerance, keyboard navigation, zero-result recovery, safe personalization.
- **Infinite scroll** selectively for discovery using stable cursor pagination, deep links, scroll restoration, footer access, accessible load-more alternatives; use explicit pagination in operations.
- **Sticky navigation** and mobile purchase actions without covering focus or controls.
- **Dark mode** through semantic design tokens, accessible contrast, persisted/system preference, and hydration-safe rendering.

### Required screens and component behavior

- **Customer**: homepage, search/category listing, product detail/variants/seller offers, cart, addresses, checkout, Razorpay pending/success/failure, order details/tracking, cancel/return/refund, account/support.
- **Seller**: onboarding, catalog/listings, offers/pricing, stock, orders, fulfillment/returns, commission/settlement views, permissions, dashboard.
- **Admin**: seller approvals, catalog moderation, order/refund operations, risk/finance exceptions, audit, configuration.
- Build reusable accessible inputs, cards, search, navigation, filters, dialogs/drawers, product gallery, price/offer/availability, cart summary, step forms, and status feedback. Every screen must handle loading, empty, validation failure, server failure, success, and interrupted/retry states.
- Use App Router rendering/caching/Server and Client Components deliberately; typed API boundaries; secure sessions; SEO metadata and canonical public routes; image optimization and lazy loading. Ensure no leakage of server secrets to client bundles.
- Target **WCAG 2.2 AA** and measurable Core Web Vitals. Test keyboard, screen readers, focus, 200%/400% zoom/reflow, contrast, touch targets, reduced motion, mobile devices, and payment UX. PWA/offline must never automatically replay payment submissions or cache sensitive authenticated responses publicly.

## 6. Pattern adoption policy — evaluate, do not cargo-cult

| Standard baseline / usually needed | Conditional — require documented rationale |
|---|---|
| API-first contracts, headless separation, explicit microservice ownership, zero-trust controls, RBAC/resource authorization, CI/CD, IaC, automated tests | GraphQL, dedicated BFF service, service mesh, serverless, edge compute, full omnichannel/POS integration |
| Domain-owned databases, Kafka contracts where async, outbox/inbox where delivery must be reliable | CQRS beyond simple projections, **event sourcing**, cross-service saga, Strangler Fig migration (only with a legacy system) |
| Timeout/retry budgets, idempotency, rate limiting, backpressure, observability, cache invalidation | Circuit breaker/bulkhead when failures and resource isolation justify, cache-aside/read replicas/materialized views when measured |
| Responsive/mobile-first UI, CDN/image optimization, semantic design tokens, accessibility | AI personalization, real-time big-data pipelines, AR/lookbooks/advanced immersive media, biometric express checkout |
| Realistic capacity planning, fault handling, backup/recovery, cost tracking | Multi-region active-active, EKS instead of simpler hosting, per-tenant DBs, advanced horizontal partitioning |

- **CQRS = Command Query Responsibility Segregation** (one pattern). Keep command state authoritative; materialized views/search may be eventually consistent and rebuildable.
- Event sourcing is **not** equivalent to Kafka, a financial audit journal, or an outbox; only adopt when reconstructing state from an event log is justified.
- The Strangler Fig pattern applies to incremental modernization of an existing system, not a new implementation.
- Compare architectural options with operational complexity, consistency, testing, recovery, cloud cost, and reversibility. Capture important decisions in `docs/adr/` when that directory exists or is created.

## 7. Cloud, DevSecOps, and the six AWS Well-Architected pillars

Apply these as measurable review criteria, not marketing claims:

1. **Operational Excellence** — reproducible dev setup, IaC, CI/CD, runbooks, tracing, dashboards, alerts, deploy/rollback procedures.
2. **Security** — least privilege, credential isolation, identity and tenant checks, OWASP risks, dependency/image scans, SBOM, payment tokenization and PCI scope minimization.
3. **Reliability** — SLI/SLOs, health checks, bounded retries, recovery, backups with restore tests, RPO/RTO targets, eventual-consistency monitoring.
4. **Performance Efficiency** — mobile Core Web Vitals, profiling, SQL/search indexes, resource budgets, connection limits, load tests, autoscaling where justified.
5. **Cost Optimization** — ECS/Fargate vs EKS analysis, managed-service trade-offs, resource right-sizing, staging shutdowns, budgets, storage lifecycle and data-transfer costs.
6. **Sustainability** — efficient assets, compute usage, retention, caching, batching, reduced unnecessary network calls and idle capacity; no unsupported environmental impact claims.

- Local development: prefer Docker Compose and reproducible seed data; no actual payment credentials in fixtures.
- Deployment: Terraform + approved container hosting with safe migrations, secret references, health/readiness probes, rollout/rollback, service dashboards, alerting, and smoke tests. AWS resources and live integrations require explicit authorization.
- Do not automatically run destructive infrastructure commands, touch production DNS, create chargeable resources, or initiate financial transactions.

## 8. Implementation roadmap and phase gates

Deliver the following sequence, refining task boundaries based on inspected code. Finish **testable vertical slices** instead of creating all services at once.

| Phase | Objective | Minimum evidence to pass |
|---|---|---|
| **0 — Discovery** | Inspect repo, instructions, code, constraints, business assumptions, backlog | Accurate inventory and current state; no invented existing artifacts. |
| **1 — Architecture + Design** | Personas/P0 scope, design tokens/pages, C4/context boundaries, Java/Go matrix, API/events, payment/inventory state machines, ADRs, plan | Internally consistent design and prioritized dependency plan. |
| **2 — Foundation** | Reproducible Next.js/Java/Go builds, PostgreSQL migrations, Kafka dev runtime, optional search/cache, local observability, CI | Startup/health checks and baseline builds/tests executed. |
| **3 — Discovery** | Seller creates/approves listing → catalog/offer/inventory → Kafka search projection → functional storefront | Listing available through real UI/API; search/index tests. |
| **4 — Cart + Checkout Prep** | Identity, guest/auth cart, merge, server quote, address, inventory reservation, checkout session | End-to-end prepayment flow; auth, pricing, race tests. |
| **5 — Payments + Orders** | Razorpay Test Mode, callback/webhook verification, durable attempts, recovery, order confirmation, inventory commitment | Real sandbox or clearly labeled controlled integration; duplicates/unknown states verified. |
| **6 — Marketplace Ops** | Seller fulfillment, tracking, cancellation, returns/refunds, commissions/settlements, admin, notifications | Lifecycle and finance invariants tested. |
| **7 — UX + Growth** | Selected lookbooks, PWA, dark mode, enhanced discovery/media, passkeys, omnichannel/analytics | Accessible, responsive, performant, business-justified enhancements. |
| **8 — Hardening** | Security, tenant isolation, concurrency, replay, load, DR, accessibility, cost | Test artifacts, metrics, known-risk review, quality gates. |
| **9 — Staging/Release** | IaC, CI deploy, secrets, migrations, staging smoke tests, runbooks, release review | Only claim deployed/ready with actual authorized evidence. |

Initial critical milestone: **seller publishes product → customer discovers product → adds to cart → server validates price/stock → Razorpay test checkout → backend verifies payment → exactly one order confirmation and correct inventory**. Make this working before P2 enhancements.

## 9. Definition of Done and verification protocol

For each meaningful change:

1. **Inspect** related files, applicable nested instructions, existing contracts/tests, and `git status`.
2. **Specify** observable acceptance criteria and invariants; update minimal docs/ADR for significant changes.
3. **Implement** a focused vertical slice; avoid altering unrelated behavior.
4. **Test** behavior and meaningful failure cases. Use appropriate commands available in the repo; examples (run only when configured):
   - Next.js/TypeScript: project package manager's `lint`, `typecheck`, `test`, `build`; Playwright for critical UI journeys.
   - Java: repository Gradle/Maven test + integration tasks; JUnit and Testcontainers for PostgreSQL/Kafka where appropriate.
   - Go: `go test ./...`, `go test -race ./...`, `go vet ./...` for relevant Go modules.
   - Contracts: OpenAPI and event schema validation/compatibility checks.
   - Local/system: migrations, container startup/health, sandbox provider integration, smoke tests; authorization, concurrency, retries, and reconciliation.
5. **Verify** results by observing actual command output. Fix root causes; never suppress failing tests or weaken access controls to get green status.
6. **Record** exactly what ran and did not run, remaining risk, and next dependency-ready task.

### Mandatory regression scenarios when relevant

- Seller A accessing seller B data (including caches/BFF/search).
- Last-unit parallel reservations; expired reservation and payment race.
- Price/discount changes before checkout and correct quoted order snapshots.
- Double-click checkout, repeated request with same/different idempotency payload.
- Razorpay invalid signature, duplicate/out-of-order webhook, ambiguous timeout, capture arriving after browser interruption.
- Partial cancellation/refund, duplicate refund, settlement/accounting mismatch.
- Kafka replay, schema evolution, consumer failure/DLQ, search projection lag/rebuild.
- Mobile viewport, keyboard and screen-reader behavior, focus in overlays, dark mode, loading/error/pending UX.
- Backup restore/migrations and deployment smoke checks before claiming release readiness.

No passing tests = no verified completion claim. If external credentials, infrastructure, tooling, or a reliable integration fixture is unavailable, report that gap explicitly.

## 10. Progress, repository artifacts, and reporting

- Prefer existing repository conventions. When starting from scratch, propose only useful directories, e.g. `apps/`, `services/`, `contracts/`, `infra/`, `deploy/`, `tests/e2e/`, `docs/architecture/`, `docs/adr/`, `docs/runbooks/`.
- Keep a lightweight `docs/implementation-status.md` (or the repository's established tracker) recording phase, completed acceptance criteria, exact verification evidence, known issues, blockers, and next step. **Never premark a phase complete**.
- Keep contracts, service ownership, UI design tokens, API/event specs, migration instructions, payment setup, deployment procedures, and runbooks consistent with actual implemented code.
- At the end of a slice, report concisely: **changed**, **why/decisions**, **checks run and results**, **unverified items**, **risks/blockers**, **next task**.
- If a task exceeds a session's capacity, leave an intelligible, reproducible checkpoint rather than suggesting code exists that was not written.

## 11. Explicit prohibitions

- Do not implement a static Amazon clone with fake commerce success states and call it a working marketplace.
- Do not introduce microservices, GraphQL, event sourcing, AI, edge/serverless infrastructure, or Kubernetes for demonstration alone.
- Do not share production secrets or sensitive customer/payment data in code, fixtures, logs, or telemetry.
- Do not bypass seller isolation, authorization, price checks, inventory constraints, payment verification, or refund/ledger limits.
- Do not assume browser WebAuthn/passkeys authorize payment or that Razorpay Route is automatically available.
- Do not claim guaranteed latency/availability, compliance, completed deployments, or production readiness without evidence.
- Do not perform irreversible/destructive operations, live charges/refunds/payouts, or material cloud provisioning without explicit approval.

**When unsure:** favor the smallest secure, testable change preserving domain correctness and a clear extension path. Then verify it end to end.
