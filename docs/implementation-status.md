# Implementation status — 2026-10-27

## Current checkpoint
Initial architecture/design package and a locally integrated purchase slice, now extended with durable multi-item carts, atomic multi-seller checkout, OIDC/session integration, private wishlist, local payment recovery, immutable per-seller capture accounting and seller fulfillment. **This is not a production-ready marketplace.** Real Razorpay Test Mode transactions, real provider/MFA verification, full marketplace operations and AWS deployment remain unverified/unimplemented as detailed below.

Repository started with only the two supplied requirements files. Existing requirements were preserved. `git status --short` could not run because macOS Command Line Tools points to a missing `xcrun`; no `.git` directory was present. No commits were created. Host Java was unavailable; Docker's Java 21/Maven toolchain built and tested commerce successfully.

## Phase assessment
| Phase | State | Evidence / outstanding work |
|---|---|---|
| 0 Discovery | Initial baseline established | Repository inventory, requirements, assumptions, P0 backlog and risks recorded |
| 1 Architecture/design | First-slice baseline implemented | Service ownership, pattern ADR, AWS target, tokens, screen inventory, 14-pattern applicability, purchase sequence; broader design review still needed |
| 2 Foundation | Working local subset | Next.js/Java/Go images, PostgreSQL migration, durable Kafka volume, Elasticsearch, CI definition; full telemetry, scans, production identity/IaC pending |
| 3 Discovery | First-slice journey verified | Seller submission → admin publication → outbox → Kafka → Go → Elasticsearch → storefront; full facets, pagination, media and catalog governance pending |
| 4 Checkout prep | Customer identity integration locally verified | Durable cart, basket reservation, profile/default address/history/merge; OIDC adapter, encrypted durable sessions, safe identity-bound writes and wishlist. Real IdP/MFA verification and guest recovery remain gates |
| 5 Payment/order | Controlled recovery integration verified | Bounded existing-order polling, leased attempts, administrator evidence verification/linking, interrupted capture recovery and late-capture review tested locally; actual Razorpay sandbox remains unverified |
| 6 Marketplace operations | Partial implementation | Seller-scoped fulfillment/tracking, capture journal and gross seller summaries implemented; cancellation, returns/refunds, complete finance, carrier verification and notifications remain |
| 7–9 | Not complete | Growth features, release hardening, Terraform and authorized cloud deployment remain |

## Latest verified slice — OIDC, session recovery, identity switching and wishlist

Customer authorization-code/PKCE OIDC adapter, exact assurance/audience enforcement, encrypted PostgreSQL sessions, coordinated refresh, restart durability, explicit expiry/relogin and server-side logout are implemented. The API independently verifies the access-token subject matches the session at login and renewal, including refresh responses without ID tokens. Stale-tab mutations and checkout retries retain their original identity; mismatches fail closed. Wishlists are private, durable, replay-safe and capped at 100 offers. See [ADR 0005](adr/0005-oidc-sessions-and-identity-bound-writes.md) and [identity runbook](runbooks/oidc-and-session-recovery.md).

Verification on 2026-10-27: Docker commerce/Next.js builds passed; `node --test tests/wishlist.test.mjs tests/account.test.mjs tests/cart.test.mjs tests/reconciliation.test.mjs tests/system.test.mjs` **21 passed, 0 failed (7.06s)**; updated `node tests/contracts.mjs` passed; `npm run typecheck` passed; `OIDC_TESTS=true npm run test:e2e` **22 passed, 0 failed (1.6m)** on desktop/mobile. Includes callback replay, invalid assurance/audience/signature, one refresh across six requests, storefront restart, expiry/relogin/logout, refresh subject substitution and wishlist/stale-tab behavior. Real MFA is not tested: the isolated OIDC fixture produces simulated claims only. No external identity provider, paid infrastructure or real payment transaction was configured. Remote CI has not run.

Editor currently reports Java null-analysis diagnostics in existing services and wishlist; Docker Maven compilation succeeds. Do not interpret this as a clean editor-diagnostics result. macOS `git status` remains blocked by missing Command Line Tools. Starting OrbStack restored the stopped local Docker environment.

## Latest verified extension — seller fulfillment

V7, seller-scoped fulfillment APIs, versioned transitions, outbox/audit and seller/customer tracking screens are implemented and locally verified. One shipment per seller per purchase, whole seller quantity only. Capture gating, independent seller portions, immutable shipped tracking, concurrent replay, unchanged inventory, customer ownership and actual Kafka outbox publication are tested. See [ADR 0006](adr/0006-seller-fulfillment.md) and [fulfillment runbook](runbooks/fulfillment.md). Carrier booking, independent delivery evidence, cancellation/returns/refunds and settlement remain absent. Phase 6 is not complete.

Final verification on 2026-10-27:
- `docker compose -f compose.yaml -f compose.oidc.yaml up -d --build commerce storefront`: Java Maven verify, Next.js production build and V7 migration succeeded. Subsequent storefront rebuilds passed after accessibility and secure-cookie corrections.
- `node --test tests/system.test.mjs tests/reconciliation.test.mjs tests/cart.test.mjs tests/account.test.mjs tests/wishlist.test.mjs tests/fulfillment.test.mjs`: **22 passed, 0 failed (7.31s)**.
- Enhanced `node --test tests/fulfillment.test.mjs`: **1 passed, 0 failed (1.58s)**, additionally verifies all three events acknowledged by Kafka and no address/customer/tracking fields in their payloads.
- `node tests/contracts.mjs`: REST, catalog and fulfillment event schemas passed, including invalid-state/version/private-field rejection.
- `npm run typecheck`: passed. Final Docker production build also passed after accessible-status changes.
- `OIDC_TESTS=true npm run test:e2e`: **24 passed, 0 failed**, desktop/mobile; includes identity/session/wishlist, fulfillment/tracking, prior purchase/recovery/merge and accessibility checks.
- Focused editor diagnostics for fulfillment service/component: no errors. Existing Java null-analysis diagnostics elsewhere remain recorded above. Hosted CI, real IdP/MFA, real Razorpay and AWS execution remain unverified.

Failures repaired: test syntax typo; utility-bar content missing an accessibility landmark; older broad status selectors became ambiguous after fulfillment was added. Added distinct listing/fulfillment announcement labels and one fulfillment live region rather than one per order. No authorization, financial invariant or test assertion was bypassed. Production `__Host-` cookie deletion now retains Secure/path attributes; real HTTPS-provider deployment verification is still required.

## Previous slice — local accounts, saved address and guest-cart merge

Implemented [account service](../services/commerce/src/main/java/in/aangan/commerce/AccountService.java), role-protected account APIs, V5 profile/merge migration, local customer identity fixtures, dedicated HttpOnly BFF customer cookie, [account screen](../apps/storefront/components/Account.tsx), checkout saved-address loading and owned order history. Guest merge verifies signed proof, locks both carts, rejects overflow atomically, records a unique account claim and prevents replay/cross-account reuse. Guest checkout/payment ownership is deliberately unchanged. See [ADR 0004](adr/0004-account-ownership-and-guest-merge.md) and [account runbook](runbooks/customer-accounts.md).

Actual verification: commerce Maven verify/build and Next.js production builds passed; V5 applied locally; `node --test tests/account.test.mjs tests/cart.test.mjs tests/reconciliation.test.mjs tests/system.test.mjs` reported **20 passed, 0 failed in 15.09s**. `node tests/contracts.mjs` and `npm run typecheck` passed. Final `npm run test:e2e` reported **14 passed, 0 failed in 59.9s**, including desktop/mobile account/profile/merge/saved-address/order-history/logout and accessibility. Editor diagnostics reported no errors. Remote CI has not run.

The first browser run exposed an async form-reference bug at customer sign-in (12 existing tests passed, two new account tests failed). Fixed by extracting form data before awaiting session creation. No authorization/test assertion was weakened.

This is **not production identity**. LOCAL_MODE customer fixtures are disabled outside local mode; no OIDC provider/MFA/account recovery was integrated. One address and latest-50 history only. Consumed guest carts reject further writes; use the claiming account to continue shopping. Logout retains guest identity for original guest-order access. Fresh-guest reset, cross-tab identity-switch recovery, guest-order adoption, retention/deletion policy, production sessions and wishlist remain Phase 4 work. No external identity service, Razorpay transaction or paid resource was provisioned.

## Previous slice — durable cart and multi-item checkout

Implemented [cart application service](../services/commerce/src/main/java/in/aangan/commerce/CartService.java), [cart/checkout API](../services/commerce/src/main/java/in/aangan/commerce/CartController.java), [V3 cart/item migration](../services/commerce/src/main/resources/db/migration/V3__cart_and_checkout_items.sql), V4 snapshot protection, [saved-bag UI](../apps/storefront/components/Cart.tsx), multi-item checkout review and itemized payment status. OpenAPI, BFF ownership routing and CI suites were extended. [ADR 0003](adr/0003-durable-cart-and-multi-item-checkout.md) and the [cart runbook](runbooks/cart-and-basket.md) record ownership, retry and rollback decisions.

Decisions: persist carts in the existing commerce service; use versioned absolute quantities; cap at 20 distinct offers/10 each; lock offers in canonical order and reserve the entire basket atomically; snapshot each item and seller; keep the old single-offer API; allocate capture transfers per seller with sums equal to the verified capture. The provider still receives one order for the full amount. Saved carts remain after purchase and the UI explicitly explains this. No account-based cart recovery or merge is claimed.

Verification: local commerce and storefront production builds passed; V3/V4 applied to the existing local database; `node tests/contracts.mjs` passed; `npm run test:e2e` reported **12 passed in 44.9s**, covering desktop/mobile saved-bag reload, quantity changes, two-seller checkout, interrupted add-to-bag and checkout responses, itemized confirmation, accessibility and existing journeys. `node --test tests/cart.test.mjs tests/system.test.mjs tests/reconciliation.test.mjs` reported **16 passed, 0 failed in 8.09s** after the JSON error-handler repair. `npm run typecheck` passed. Editor diagnostics reported no errors. No cloud/provider transaction was executed; remote CI was not run.

Strict numeric validation initially exposed a framework error-dispatch issue: fractional quantities were rejected but returned 401. Added an explicit malformed-JSON 400 response without changing authorization. Snapshot mutation is rejected by a database trigger; that intentional rejection appears in test output.

Remaining phase-4 gaps: production identity, account addresses/history, guest-to-account merge, cross-device cart recovery and wishlist. Other release blockers include real Razorpay sandbox evidence, fulfillment/refunds, complete finance, remote observability and deployment. Do not roll back to pre-multi-item application code after creating basket checkouts; its single-line stock behavior is incompatible. Roll-forward/restore procedures are documented but not drilled.

## Previous slice — payment recovery, capture journal and operational signals

Implemented [recovery application service](../services/commerce/src/main/java/in/aangan/commerce/ReconciliationService.java), provider inspection adapter, [V2 migration](../services/commerce/src/main/resources/db/migration/V2__reconciliation_and_capture_journal.sql), administrator recovery API/UI, tenant-scoped seller capture API/UI, updated OpenAPI/BFF allowlists, and [protected aggregate metrics](../services/commerce/src/main/java/in/aangan/commerce/CommerceMetrics.java). The [ADR](adr/0002-payment-recovery-and-capture-journal.md) and [runbook](runbooks/payment-recovery.md) explain failure handling and limits.

Decisions: read existing provider orders instead of recreating ambiguous payment attempts; verify receipt/amount/currency before operator linking; cap automatic retries at 12 with durable 60-second leases; preserve explicit manual investigation; keep stock commitment and append-only balanced capture transfer in one database transaction. Gross capture entries do not imply completed settlement. Capture evidence fixtures are durable and explicitly simulated. Diagnostic metrics expose no customer/tenant/payment labels and require administrator authorization.

Latest executed verification:

| Command | Actual result |
|---|---|
| `docker compose up -d --build commerce storefront`, then commerce rebuild after metrics | Java Maven `verify` (six JUnit test methods) and Next.js production build passed; V2 migration applied and services started |
| `node --test tests/system.test.mjs tests/reconciliation.test.mjs` | **11 passed, 0 failed**, 12.31s; includes protected metrics, independent capture recovery, duplicate journal protection, seller isolation, immutable journal rejection, mismatched linking/evidence, retry exhaustion/manual repair, late capture, prior stock races and Kafka replay |
| `npm run test:e2e` | **10 passed, 0 failed**, 41.3s; desktop/mobile administrator verification/history and recovery-screen axe checks added to existing purchase/accessibility journeys |
| `npm run typecheck` | Passed |
| `node tests/contracts.mjs` | Updated OpenAPI and event schema validation passed |
| Editor diagnostics | No errors found |

An initial test run had 9/10 passing: the journal correctly rejected mutation, but the assertion expected the word “immutable” instead of the actual “append-only” message. Corrected the assertion, then the focused and final combined suites passed. No product guard was weakened. CI now includes the recovery tests; remote CI has not been executed.

Not verified: actual Razorpay network behavior/credentials, timeout fault injection, process-kill lease recovery, multi-instance/load behavior, cloud deployment, remote metrics collection or alert delivery. Queue/history and seller entries are bounded lists without production pagination. Full refund/commission/settlement accounting remains absent.

## Implemented
- [Storefront](../apps/storefront/app/): responsive editorial home, collection links/search, public products, durable saved bag, multi-item checkout and single-item buy-now, itemized payment status, seller submissions and admin moderation/recovery. System dark theme, reduced motion, native forms, loading/error/empty states, local SVG product illustrations.
- [Commerce](../services/commerce/src/main/java/in/aangan/commerce/): Java 21 / Spring Boot 3.5.16; role and customer ownership enforcement; PostgreSQL row locks; immutable paise price snapshots; customer-scoped idempotency including address collision checking; reservation expiry; provider ports; Test Mode-only Razorpay adapter; raw-body HMAC and callback checks; captured-payment verification; late-capture REVIEW; outbox and audit.
- [Discovery](../services/discovery/): Go public search, Elasticsearch full-text/fuzzy query, bounded authoritative fallback, Kafka consumer with partition discovery, external-version replay protection, context/time budgets and process counters.
- [Compose](../compose.yaml): loopback-only application ports, PostgreSQL/Kafka/Elasticsearch named volumes, non-root app images. [CI](../.github/workflows/verify.yml) defines build/integration/browser checks but has not run on GitHub.
- [Contracts](../contracts/): OpenAPI 3.1 and catalog event schema. [Architecture](architecture/baseline.md), [design](architecture/design.md), [ADR](adr/0001-boundaries-and-patterns.md), [sequence](architecture/purchase-sequence.md), [runbook](runbooks/local-and-payments.md), [fixture publisher](../tests/seed.mjs).

## Executed verification
| Command / check | Observed result |
|---|---|
| `docker compose build commerce` / subsequent Compose builds | Java compilation and Maven `verify` succeeded; three JUnit methods cover integer totals, capture matching, and exact-byte HMAC including known vector |
| `go test -race ./...` and `go vet ./...` in discovery | Passed; three Go tests cover external version conflicts, invalid/private snapshots, and query-preserving fallback |
| `npm run build` in storefront (host and Docker) | Next.js production build and TypeScript passed |
| `npm run typecheck` | Passed with generated App Router types |
| `node tests/contracts.mjs` | OpenAPI validated; event schema accepts valid snapshot and rejects unknown version, fractional paise and private draft |
| `node --test tests/system.test.mjs` | **6 passed, 0 failed**, 14.70s on final backend run: tenant/moderation/projection, last-unit race/idempotency/duplicate capture, invalid price/quantity/signature, real Kafka duplicate/stale replay, late capture, expiry/reallocation race |
| `node tests/seed.mjs` | Six illustrative catalog products created/published through APIs |
| `npm run test:e2e` | **8 passed, 0 failed**, 20.0s on final run: desktop/mobile seller → moderation → indexed discovery → checkout → lost-response retry returning the same checkout → simulated capture → persisted confirmation; homepage/checkout/confirmation axe checks; responsive layout, keyboard search, cross-origin denial, dark theme and reduced motion |
| `npm audit --omit=dev --json` | Zero known production npm vulnerabilities reported; not a full platform security audit |
| Editor diagnostics | No errors reported |
| Local browser | Application opened at `http://127.0.0.1:3000`; desktop screenshot inspected |

Failures repaired during verification: security error dispatch converting 403 to 401; internal-container origin comparison rejecting legitimate BFF requests; Kafka joining before topic creation without watching partitions; broker log directory not matching volume. Existing Kafka records were preserved into the mounted volume, ownership restored, and the consumer replayed successfully. Browser tests now explicitly wait for streamed product content. Guest identity is established before reservation submission so a lost first response cannot change the customer's idempotency scope.

## Material limitations / release blockers
1. No Razorpay credentials were supplied. Adapter code is present; actual provider order creation, hosted sandbox purchase, authenticated webhook delivery, capture settings and refund behavior remain unverified. No live transactions occurred.
2. Customer OIDC integration, encrypted durable sessions, expiry/relogin, coordinated refresh, identity-switch write protection and wishlist are locally verified with a protocol fixture, not a real provider or MFA challenge. Production seller/admin identity, provider logout/revocation and recovery policy, TLS/secret deployment, multi-instance load, retention/deletion and expired/consumed guest recovery remain outstanding. Guest sessions expire after seven days; guest orders are not adopted by account login.
3. Checkout remains the immutable confirmed-order record. Seller fulfillment now supports one shipment per seller, packing/shipping/delivery reports and customer tracking. Carrier verification, partial shipment, cancellation, returns, refund ceilings, full financial ledger/adjustments, commissions and settlements remain absent. Capture-only balanced transfers and gross seller summaries are not net payout balances.
4. Provider UNKNOWN/CREATING and late-capture REVIEW now have bounded provider polling and administrator verification/linking/history. Refund repair remains absent; ambiguous creates require operator-supplied matching evidence. Real provider integration, pagination, capacity and crash/timeout drills remain gates. Do not deploy with real customers.
5. Search is capped at 100; facets/cursor pagination, index aliases/full rebuild tooling, explicit mappings and automated DLQ handling remain. Poison events block visibly instead of being lost. No Redis workload is implemented.
6. PostgreSQL is authoritative and Kafka is locally durable; no multi-AZ, backup restore drill, chaos/load test, tracing/SLO alert validation, JVM/Go/container vulnerability scan, or production capacity evidence exists.
7. Automated accessibility checks cover selected routes; manual screen-reader/zoom/device checks and measured Core Web Vitals are outstanding. Artwork and tax/shipping values are labelled local fixtures; no fulfillment promises.
8. Terraform, paid AWS infrastructure, external deployment and hosted CI execution were not performed. The AWS topology is a proposal, not provisioned infrastructure.
9. Integration/browser fixture records remain in the local database for inspection. Repeated tests add uniquely named products; use category search to inspect the curated fixtures. Test data isolation/cleanup should precede sustained CI environments.

## Next dependency-ready slice
Continue Phase 6 with cancellation and return/refund orchestration: coordinate eligibility with the checkout/fulfillment lock, reserve refund amounts durably, reject over-refunds/duplicate postings, reconcile ambiguous provider outcomes, and reverse seller liabilities with immutable journal entries. Verify real Razorpay Test Mode when private credentials and an authorized reachable webhook endpoint are available. Configure and verify a real customer IdP/MFA plus privileged identities. Then complete commission/settlement accounting, notifications, selected growth features, resilience/load/accessibility/restore evidence, telemetry, Terraform and authorized staging deployment. Retain concurrency/replay/ownership regressions throughout; no later phase is complete merely because assets exist.
