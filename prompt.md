Act as an integrated team of:

- Principal Enterprise / Solution Architect
- Principal Product Manager — E-Commerce and Marketplaces
- Principal UI/UX and Visual Design Architect
- Staff Frontend Engineer — React, Next.js, TypeScript
- Staff Java Architect — Java 21, Spring Boot
- Staff Go Architect — High-Performance Distributed Systems
- Domain-Driven Design and Hexagonal Architecture Expert
- Distributed Systems and Event-Driven Architecture Expert
- Cloud-Native / AWS Solutions Architect
- Payments and Marketplace Finance Architect
- Search, Personalization, and Data Platform Architect
- Security and Zero-Trust Architect
- DevSecOps / Platform Engineering Lead
- Quality Engineering and SRE Lead
- Accessibility, SEO, and Web Performance Specialist

## Primary objective

**Design, implement, integrate, test, deploy, and operationalize a production-grade, Amazon-inspired, multi-vendor e-commerce marketplace with an exceptional modern customer experience and a maintainable, resilient microservices architecture.**

This is an **end-to-end software engineering execution task**, not simply a request to generate documentation, static interfaces, architecture diagrams, boilerplate, or isolated example services.

The result must be functioning software comprising:

1. Modern customer-facing e-commerce storefront
2. Seller management portal
3. Marketplace administration console
4. Java and Go backend microservices
5. API-first headless commerce architecture
6. Event-driven integrations using Kafka
7. Authoritative transactional persistence
8. Real-time inventory synchronization
9. Elasticsearch-powered product discovery where justified
10. Razorpay payment integration
11. Reliable order and fulfillment orchestration
12. Marketplace finance and reconciliation
13. Security and access controls
14. Automated testing and CI/CD
15. Infrastructure as Code and deployable infrastructure
16. Observability and operational documentation

Use publicly observable marketplace experiences for inspiration without copying Amazon's branding, protected designs, assets, or undocumented proprietary architecture.

## Non-negotiable engineering principles

- Business correctness before architectural novelty
- Security and financial integrity by design
- Beautiful, usable, accessible interfaces
- Domain-driven service boundaries
- Clean and Hexagonal Architecture
- API-first contracts
- Explicit transactional ownership
- Reliable asynchronous processing
- Backward-compatible system evolution
- Automation and observability from the beginning
- Pragmatic application of architecture patterns
- Production-oriented verification
- Cost-efficient and sustainable cloud engineering

**Do not implement every architectural pattern or visual trend indiscriminately. Evaluate each against real requirements and document the decision.**

---

# 2. SOURCE MATERIAL AND WORKING INSTRUCTIONS

Use the attached original **Master Execution Prompt — Production-Grade Amazon-Inspired E-Commerce Marketplace** as the existing functional and technical baseline.

Preserve its requirements for:

- Customer identity and account management
- Customer storefront and discovery
- Product catalog, SKUs, and seller offers
- Pricing and promotions
- Shopping cart and wishlist
- Checkout
- Razorpay payments
- Orders and inventory
- Shipping and fulfillment
- Returns and refunds
- Seller portal
- Marketplace administration
- Seller finance and settlement
- Fraud prevention
- Customer support
- Notifications
- Analytics
- AI-enabled future features
- Distributed systems correctness
- AWS Well-Architected
- CI/CD and deployment
- Automated testing
- Phased implementation
- Architecture decisions
- Operational documentation

This revised prompt extends the baseline with detailed modern UI/UX requirements and an explicit backend architectural-pattern decision framework.

Where requirements conflict, prioritize security, data integrity, financial correctness, and verified functional behavior over optional visual or architectural complexity.

## Before implementing

Inspect the repository, applicable instructions, dependencies, conventions, existing tests, and infrastructure.

If code already exists, preserve working functionality and unrelated modifications.

If beginning from an empty repository, create a maintainable, coherent engineering foundation.

Use official documentation to verify version-sensitive APIs, provider behavior, and relevant integration requirements.

When external access or credentials are missing, implement safe adapters or mocks for local testing and document the blocker.

Do not present unexecuted tests, provisioned resources, integrations, or live payment operations as completed.

---

# 3. BUSINESS MODEL AND PRODUCT SCOPE

Build a B2C multi-vendor marketplace supporting first-party products and third-party sellers.

## Initial assumptions

- Launch market: India
- Currency: INR
- Payment gateway: Razorpay
- Primary commerce channel: Responsive web
- Mobile-first design
- Physical goods
- Registered and guest checkout
- Multiple sellers
- Canonical product catalog
- Seller-specific offers
- Seller-specific inventory
- Seller and marketplace-managed fulfillment models
- English-first with localization-ready architecture
- One initial cloud region
- Future omnichannel and multi-region expansion

Treat these as defaults pending confirmation, not verified business facts.

## Functional prioritization

**P0 — Launch-critical:** Secure identity, product discovery, catalog, seller offers, cart, checkout, Razorpay sandbox payments, inventory, orders, basic fulfillment, cancellation/refunds, seller operations, administration, financial reconciliation, observability, and accessibility.

**P1 — Growth:** Advanced merchandising, shoppable lookbooks, personalization, promotions, richer UX, seller analytics, improved search, customer reviews, omnichannel extensions, and operational automation.

**P2 — Advanced:** AI shopping assistants, visual search, sophisticated personalization, AR, intelligent forecasting, advanced multi-region operations, and experimental interfaces.

Do not defer fundamental security, financial correctness, or recovery mechanisms merely because they are not visually apparent to customers.

---

# PART I — FRONTEND UI/UX DESIGN ARCHITECTURE

# 4. DESIGN VISION AND VISUAL IDENTITY

The frontend must feel like a **premium, modern, visually distinctive, trustworthy, high-performance commerce platform**.

Combine the discovery depth of a large marketplace with the clarity, visual refinement, and editorial storytelling found in modern premium digital commerce.

The design must feel intentionally designed rather than assembled from generic dashboard templates.

## Design principles

1. Visual hierarchy before visual decoration
2. Product content before unnecessary chrome
3. Trust and transparency in purchase decisions
4. High information density where customers compare products
5. Generous negative space where customers explore collections
6. Strong typography and photography
7. Consistent interactions
8. Clear pricing, seller, and delivery information
9. Mobile-first behavior
10. Accessible by default
11. Progressive disclosure of complexity
12. Performance-aware motion and imagery
13. Authentic brand identity
14. Seamless transitions between discovery and purchasing
15. Conversion improvements without deceptive design patterns

Use a coherent art direction instead of applying every design trend to every page.

## Required design deliverables

Before major frontend implementation, establish:

- Brand direction and visual positioning
- Information architecture
- Navigation hierarchy
- Customer journey maps
- Design principles
- Design tokens
- Typography scale
- Color palette and semantic colors
- Light and dark theme specifications
- Grid and layout system
- Breakpoints and responsive rules
- Spacing and density rules
- Component specifications
- Interaction states
- Motion guidelines
- Image and media guidelines
- Content and microcopy guidelines
- Accessibility requirements
- Critical page wireframes or layout specifications
- UI acceptance criteria

Do not stop at wireframes. Implement the design as working Next.js components.

---

# 5. MODERN E-COMMERCE UI/UX PATTERN LIBRARY

Evaluate and incorporate the following 14 requested patterns.

For each pattern specify:

- Customer problem solved
- Appropriate pages and contexts
- Visual design behavior
- Interaction behavior
- Accessibility requirements
- Responsive behavior
- Performance impact
- Backend dependencies
- Fallback behavior
- Release priority
- Testable acceptance criteria

## UX-01 — Bento Grid Layouts

Use asymmetrical, visually balanced grid compositions for featured collections, campaigns, featured brands, and homepage discovery.

Requirements:

- Responsive grid spanning
- Featured content hierarchy
- Product and editorial image integration
- Consistent alignment despite varying card sizes
- Accessible reading order independent of visual positioning
- Fluid image cropping and typography
- Mobile stacking rules
- CMS-configurable content where needed
- Skeleton states that match final geometry
- Layout stability during image loading

Do not use complex bento layouts for dense order management tables or product comparisons where conventional grids are clearer.

## UX-02 — Micro-Interactions

Introduce subtle feedback for:

- Hover and focus states
- Add to cart
- Wishlist toggling
- Product variant selection
- Quantity changes
- Filter application
- Cart drawer opening
- Form validation
- Checkout progression
- Saved-address selection
- Successful actions
- Error recovery

Use purposeful motion with consistent durations and easing tokens.

Support reduced-motion preferences. Avoid animations that delay checkout, obscure errors, or create unnecessary layout shifts.

## UX-03 — Negative Space

Use whitespace intentionally to:

- Separate information groups
- Improve product readability
- Strengthen call-to-action hierarchy
- Present editorial collections
- Reduce cognitive load
- Distinguish merchandising content from transactional content

Define responsive spacing tokens rather than arbitrary margins.

Preserve useful product density on smaller screens.

## UX-04 — Editorial Typography

Create a typography system with clear distinctions between:

- Campaign headlines
- Product titles
- Category headings
- Pricing
- Seller information
- Product specifications
- Helper text
- Validation messages
- Order summaries
- Administrative data tables

Use expressive display typography for storytelling and highly legible typography for transactional information.

Address font loading, fallback fonts, contrast, line length, text scaling, localization, and cumulative layout shift.

## UX-05 — Shoppable Lookbooks

Create editorial shopping experiences where customers can discover purchasable products within styled collections.

Potential capabilities:

- Campaign and collection landing pages
- Shoppable editorial photography
- Product hotspots
- Quick product previews
- Look-based product grouping
- Collection-level merchandising
- Product availability awareness
- Accessible hotspot alternatives
- Direct add-to-cart or product navigation

Product hotspots must remain usable on touch devices and through keyboard navigation.

Do not let editorial product references create independent sources of truth for inventory or prices.

Prioritize this after core product discovery works reliably.

## UX-06 — Dynamic Overlays

Create reusable overlays such as:

- Cart drawer
- Search suggestions panel
- Quick-view modal
- Product variant selector
- Mobile filter drawer
- Delivery location selector
- Compare-products drawer
- Confirmation dialogs

Requirements:

- Correct focus trapping when modal
- Focus restoration on close
- Escape-key behavior
- Appropriate ARIA roles
- Background scroll handling
- Responsive layout
- Overlay stacking rules
- Accessible error messaging

Avoid nested modal chains and excessive interruptions.

## UX-07 — Progressive Disclosure

Reveal complexity only when it is relevant.

Apply to:

- Product technical specifications
- Shipping policies
- Seller information
- Coupon entry
- Advanced search filters
- Checkout address details
- Payment choices
- Return policies
- Administrative configuration

Do not conceal mandatory charges, consent details, delivery restrictions, or other material purchase information.

## UX-08 — Biometric Express Checkout

Evaluate a streamlined express checkout supported by passkeys/WebAuthn and approved payment-provider capabilities.

Potential workflow:

1. Returning customer starts express checkout.
2. Customer identity is established or reauthenticated using a supported passkey mechanism.
3. Saved shipping preferences are loaded with authorization checks.
4. Current price, tax, shipping, and inventory are revalidated.
5. The complete order total and terms are shown.
6. Customer explicitly confirms purchase.
7. The approved Razorpay payment flow is initiated.
8. The backend verifies payment through trusted provider information.
9. The order reaches the appropriate confirmed or pending state.
10. Customer receives accurate feedback.

Important constraints:

- Passkeys authenticate the user; they do not automatically authorize a Razorpay transaction.
- Device biometrics must remain under the platform/browser authenticator's control.
- Never store raw fingerprint, face, or other biometric templates.
- Do not assume Razorpay supports a particular wallet or biometric payment flow without checking.
- Preserve normal checkout for unsupported devices and customers who decline biometric authentication.
- Respect payer authentication and payment-provider requirements.
- Never silently charge a customer because they authenticated.

Treat this as an advanced, compatibility-dependent enhancement rather than an unconditional MVP feature.

## UX-09 — Immersive Media

Support rich product experiences where they improve product understanding:

- High-resolution images
- Image zoom
- Alternate product views
- Short product videos
- Lifestyle photography
- 360-degree product views
- Optional AR previews
- Variant-linked galleries

Implement responsive media loading, image transformations, optimized formats, captions where applicable, lazy loading, and graceful fallbacks.

Protect LCP and bandwidth budgets. Do not autoplay heavy media indiscriminately.

## UX-10 — Floating Action Buttons

Use floating actions selectively for mobile contexts such as:

- Add to cart
- Contact support
- Scroll to cart summary
- View selected filters
- Contextual purchase action

Ensure:

- Buttons never obscure prices or mandatory form controls.
- The floating element respects safe-area insets.
- Keyboard and screen-reader access remain intact.
- The action is not duplicated confusingly.
- The button does not interfere with Razorpay-hosted checkout overlays.

Do not introduce floating controls merely as decoration.

## UX-11 — Skeleton Loaders

Implement content-aware loading states for:

- Product cards
- Search results
- Product details
- Seller offers
- Cart contents
- Checkout summary
- Order history
- Seller dashboards

Skeletons should approximate final component dimensions and avoid layout shifts.

Do not display endless skeletons when an operation has failed.

Provide explicit retry, empty, and error states.

## UX-12 — Contextual Search

Design a modern search experience supporting:

- Search suggestions
- Recent searches
- Trending queries
- Category-aware suggestions
- Product previews
- Typo correction
- Brand suggestions
- Search filters
- Search-within-category
- Availability-aware results
- Query refinement
- Keyboard navigation
- Screen-reader announcements
- Zero-result recovery

Use Elasticsearch or the selected equivalent search infrastructure, backed by an authoritative product catalog.

Personalized search requires appropriate privacy controls and measurable benefits.

## UX-13 — Infinite Scroll

Apply infinite scrolling selectively to long discovery feeds.

Requirements:

- Cursor-based pagination
- Stable product ordering
- URL and history-state handling
- Restoration of scroll position
- Keyboard accessibility
- Loading and termination states
- Deep linking and shareable filtered URLs
- SEO-friendly pagination alternatives
- Footer discoverability
- Accessible manual "Load more" option where appropriate

Do not use endless scrolling for checkout, order histories requiring precise navigation, administrative tables, or contexts where numbered pagination is more usable.

## UX-14 — Sticky Navigation and Dark Mode

### Sticky navigation

Support context-aware sticky elements such as:

- Main site navigation
- Search access
- Category filter bar
- Product purchase panel
- Mobile bottom navigation
- Cart summary where appropriate

Sticky elements must not obscure focused controls or consume excessive mobile viewport height.

### Dark mode

Provide a coherent light/dark semantic token system.

Evaluate:

- Explicit theme switching
- System preference detection
- User preference persistence
- Color contrast
- Product image presentation
- Surface elevation
- Focus indicators
- Overlays and dialogs
- Third-party checkout compatibility
- Hydration and theme switching behavior

Do not force dark mode into brand experiences where it reduces product clarity. Offer an accessible light theme even if dark mode is supported.

---

# 6. PAGE-BY-PAGE UI DESIGN REQUIREMENTS

Produce a screen inventory with unique screen IDs and implement responsive pages.

## 6.1 Homepage

Include:

- Announcement / utility bar where valuable
- Sticky navigation
- Prominent contextual search
- Category navigation
- Editorial hero
- Bento-grid featured collections
- Trending and featured products
- Seller and brand collections
- Campaign tiles
- Shoppable lookbook sections where prioritized
- Recently viewed products
- Personalized recommendations where supported
- Trust and delivery information
- Rich but optimized media
- Accessible footer

Ensure the homepage remains meaningful when personalization or editorial services are unavailable.

## 6.2 Product Listing Page

Include:

- Category breadcrumb
- Category title and description
- Product count where available
- Product grid
- Filters and facets
- Sorting
- Search refinement
- Responsive filter drawer
- Product cards with images, price, offers, ratings, and availability
- Wishlist actions
- Product compare actions where supported
- Pagination or controlled infinite scroll
- Clear empty and error states

Do not use stale indexed inventory as the final purchase eligibility decision.

## 6.3 Product Detail Page

Include:

- Media gallery
- Product zoom and video
- Product title
- Brand
- Variant selection
- Seller offers
- Price and discount
- Tax and shipping information
- Delivery availability and ETA
- Quantity selector
- Add to cart
- Buy now
- Wishlist
- Return policy
- Product specifications
- Reviews and ratings
- Seller information
- Related items
- Responsive sticky purchase affordances

Prioritize pricing clarity and trust over visual novelty.

## 6.4 Shopping Cart

Include:

- Cart items
- Variant and seller information
- Quantity updates
- Item removal
- Save for later
- Discount and coupon details
- Price revalidation notices
- Shipping estimate
- Order summary
- Explicit checkout action
- Empty cart state
- Guest-to-authenticated cart handling

Use clear feedback when inventory or price changes.

## 6.5 Checkout

Design a distraction-minimized checkout interface.

Include:

- Address selection
- Delivery method
- Cart review
- Price and tax breakdown
- Coupon and credit handling
- Payment method
- Razorpay checkout integration
- Pending-payment state
- Error and recovery states
- Explicit order confirmation
- Guest checkout support
- Optional express checkout capability

Do not sacrifice mandatory information or payment correctness for a one-click aesthetic.

## 6.6 Order Confirmation and Order History

Include:

- Confirmed versus pending state clarity
- Order identifier
- Items and sellers
- Payment state
- Delivery estimate
- Tracking
- Downloadable invoice where applicable
- Support access
- Cancellation eligibility
- Return and refund initiation
- Accessible transaction history

## 6.7 Seller Portal

Use a more information-dense operational design than the consumer storefront.

Include:

- Dashboard
- Product listings
- Offer management
- Inventory
- Orders
- Shipment status
- Returns
- Payout and settlement summaries
- Performance metrics
- Staff permissions
- Error and reconciliation queues

Favor clarity and keyboard efficiency over decorative animation.

## 6.8 Administration Console

Implement:

- Seller approvals
- Catalog moderation
- Customer operations
- Order investigations
- Returns and refunds
- Marketplace configuration
- Settlement exceptions
- Audit logs
- Operational dashboards
- Privileged action confirmation

All privileged workflows must be controlled and auditable.

---

# 7. DESIGN SYSTEM AND FRONTEND COMPONENT ARCHITECTURE

Use Next.js, React, TypeScript, and Tailwind CSS with a maintainable reusable component architecture.

Prefer accessible, composable primitives and avoid unnecessary UI dependencies.

Define design tokens for:

- Colors and semantic surfaces
- Typography
- Font weights
- Spacing
- Breakpoints
- Radii
- Borders
- Shadows
- Elevation
- Motion
- Focus indicators
- Layering and z-index
- Light/dark themes

Define component states including default, hover, active, focus, disabled, loading, selected, success, warning, and error.

Provide reusable primitives and commerce-specific components.

Document component props, semantics, keyboard behavior, responsive behavior, and API dependencies.

## Frontend architecture requirements

- Next.js App Router
- Server Components where appropriate
- Client Components for interactivity
- Streaming and Suspense where valuable
- SSR / SSG / caching selected per route
- Route-level error boundaries
- Schema-based input validation
- Strict TypeScript
- Typed API clients
- Secure session handling
- Minimal browser-side exposure of sensitive data
- SEO metadata and structured data
- Image optimization
- Internationalization readiness
- Performance-aware dynamic imports

## Accessibility requirements

Target WCAG 2.2 AA.

Verify:

- Keyboard navigation
- Focus order and visibility
- Contrast
- Touch target sizing
- Accessible authentication
- Form error announcements
- Dialog focus management
- Accessible autocomplete
- Reduced-motion behavior
- Text resizing and reflow
- Screen-reader support
- Sticky elements not obscuring focus
- Accessible alternatives to drag, hover, and visual hotspots

## Web performance

Define proposed performance budgets, such as Core Web Vitals good-experience thresholds, and verify them using field or controlled lab measurements as appropriate.

Evaluate:

- LCP
- INP
- CLS
- JS bundle sizes
- Image payload
- Font loading
- Hydration overhead
- Rendering waterfalls
- Third-party scripts
- Search responsiveness
- Product page performance

Use representative mobile devices and network profiles in testing.

---

# 8. FRONTEND PWA AND OMNICHANNEL EXPERIENCE

Provide a Progressive Web App strategy.

Evaluate:

- Web app manifest
- Installable experience
- Service worker
- Offline browsing where feasible
- Cached non-sensitive content
- Push notification permissions
- Background synchronization where supported
- Safe cache versioning
- Update handling
- Network resilience

Never queue payment submissions for automatic replay while offline.

Do not cache sensitive authenticated responses in a shared or publicly accessible cache.

Plan frontend evolution for:

- Web
- PWA
- Future native mobile apps
- Seller portal
- Administrative console
- In-store / POS channels
- Customer support channels

Headless commerce APIs must support multiple clients without embedding business invariants in the web frontend.

---

# PART II — BACKEND SOLUTION ARCHITECTURE

# 9. CORE ARCHITECTURAL STYLE

Build a **domain-driven, API-first, headless commerce architecture using independently deployable Java and Go microservices where justified**.

Follow:

- Domain-Driven Design
- Clean Architecture
- Hexagonal Architecture
- SOLID
- API-first design
- Cloud-native design
- Secure-by-default principles
- Explicit data ownership
- Event-driven integration
- Fault-tolerant operations

Treat bounded contexts as business boundaries and microservices as deployment boundaries. They need not have a one-to-one relationship.

Avoid distributing strongly coupled domain transactions without a compelling reason.

## Architecture layers

### Experience layer

- Next.js storefront
- Seller portal
- Administration console
- Optional future native clients
- CMS-driven content

### Edge and API layer

- CDN
- WAF
- API gateway
- Rate limiting
- Authentication integration
- Optional BFF
- GraphQL aggregation where justified

### Domain services

- Customer and identity
- Catalog
- Seller offers
- Pricing and promotions
- Search
- Cart
- Checkout and orders
- Inventory
- Payments
- Fulfillment
- Returns
- Marketplace finance
- Seller operations
- Notifications
- Analytics

### Integration layer

- Kafka
- Outbox relays
- Event consumers
- Payment provider
- Tax provider
- Shipping carriers
- POS and inventory feeds
- CMS
- Notification providers

### Data layer

- Service-owned PostgreSQL databases/schemas
- Redis
- Elasticsearch
- Object storage
- Read projections
- Financial journal/ledger
- Analytics storage as required

### Platform layer

- Container hosting
- Managed data infrastructure
- CI/CD
- Terraform
- Secret management
- Observability
- Autoscaling
- Backups
- Disaster recovery

---

# 10. JAVA VS GO MICROSERVICE SELECTION

Analyze the workload of each bounded context and select Java or Go based on complexity, latency needs, runtime characteristics, team maintainability, and integration requirements.

Use this as an initial hypothesis.

| Capability | Preferred stack | Key considerations |
|---|---|---|
| Identity and profile | Java / managed identity | Security, lifecycle, authorization |
| Catalog and product master data | Java | Complex domain validation and governance |
| Seller management and offers | Java | Commercial policy and ownership |
| Pricing and promotions | Java | Business rules, monetary correctness |
| Inventory | Java | Reservation invariants, concurrency |
| Cart | Go | Lightweight request-intensive operations |
| Search API | Go | Concurrent search and enrichment |
| Checkout and orders | Java | Workflow orchestration and state transitions |
| Payments | Java | Razorpay, idempotency, financial integrity |
| Marketplace finance | Java | Accounting, seller receivables, reconciliation |
| Fulfillment and returns | Java | Lifecycle rules |
| Notifications | Go | Concurrent asynchronous delivery |
| Search indexing | Go where useful | Event consumers and index projections |
| Carrier connectors | Go where useful | I/O-intensive integrations |
| Analytics ingestion | Go where useful | Event processing |

Consolidate services where independent deployment introduces more risk than benefit.

For each selected service document:

- Owned bounded context
- Responsibilities
- Aggregate boundaries
- Data ownership
- Language and framework
- Public and internal interfaces
- Produced and consumed events
- Expected scaling behavior
- Security requirements
- Failure modes
- Testing ownership
- Operational ownership

Do not choose Go solely because a service needs speed or Java solely because a service has business logic. Justify important assignments using realistic workload expectations.

---

# 11. API-FIRST AND HEADLESS COMMERCE

Treat backend commerce capabilities as presentation-independent APIs.

## REST API contracts

Use REST and OpenAPI by default.

Define:

- Resources and endpoints
- Request/response schemas
- Validation rules
- Authorization
- Tenant scoping
- Error semantics
- Pagination
- Idempotency
- Versioning
- Rate limits
- Compatibility rules
- Deprecation procedures

Generate typed clients from stable contracts where useful.

## GraphQL integration

Evaluate GraphQL for frontend-specific aggregation, especially complex product detail pages, personalized discovery, or multi-source composition.

Possible architecture:

Next.js → BFF / GraphQL Read API → Domain Services

Requirements if selected:

- Schema governance
- Resolver ownership
- Request authentication
- Object-level authorization
- Query depth/complexity limits
- Batching and N+1 prevention
- Bounded execution cost
- Field-level sensitive-data controls
- Observability
- Cache policy
- Persisted operations where justified

GraphQL must not become an uncontrolled mechanism for cross-service writes.

Do not expose unrestricted domain mutations for checkout, payment capture, refunds, or settlement merely to offer a single GraphQL endpoint.

## Backend-for-Frontend

Evaluate a Next.js server-side BFF or dedicated BFF service.

The BFF may handle:

- Aggregated storefront read models
- Client-friendly API composition
- Session-aware presentation
- UI-specific data transformations
- Request correlation
- Response caching where safe

The BFF must not become the authoritative owner of pricing, inventory, payments, or orders.

## API gateway

Evaluate gateway responsibilities including:

- Routing
- Authentication enforcement
- Rate limiting
- WAF integration
- Request limits
- API versioning
- Request correlation
- Metrics
- Safe origin policies

Avoid duplicating all policy logic between the API gateway, BFF, and services. Domain authorization must still be enforced by the owning service.

---

# 12. MULTI-TENANT DATABASE AND DATABASE-PER-SERVICE

Model a multi-vendor marketplace with explicit seller tenancy and data ownership.

Distinguish:

- Customer identity
- Marketplace administrator roles
- Seller organization
- Seller employee membership
- Seller-owned offers
- Seller-owned inventory
- Seller order access
- Seller receivables and payouts

## Database-per-service

Use logically isolated persistence ownership.

A service may have an independent database or appropriately isolated schema depending on deployment and cost requirements.

Never allow unauthorized direct writes across service ownership boundaries.

## Multi-tenancy

Evaluate:

- Shared database with tenant-aware rows
- Shared database with tenant schemas
- Dedicated database per tenant for exceptional isolation needs

Choose based on:

- Number of sellers
- Data sensitivity
- Operating cost
- Query behavior
- Scale
- Isolation guarantees
- Regulatory constraints
- Migration complexity

If using shared tables, enforce seller/tenant restrictions at application and persistence layers as appropriate.

Do not trust a caller-provided tenant identifier without verifying the authenticated principal's authorization.

Use PostgreSQL Row-Level Security where it adds defensible isolation, and test its interaction with pooled connections, migrations, administrative access, and background jobs.

### Required security tests

- Seller A cannot read Seller B's listings where private.
- Seller A cannot modify Seller B's inventory.
- Seller A cannot access Seller B's customer/order information.
- Seller A cannot access Seller B's settlements.
- A cross-tenant cache key cannot leak data.
- GraphQL resolvers cannot bypass tenant authorization.
- Kafka consumers preserve tenant context where relevant.

---

# 13. REAL-TIME INVENTORY SYNCHRONIZATION

Design inventory for multiple sellers, warehouses, and future omnichannel feeds.

## Authoritative model

Include:

- SKU
- Seller
- Fulfillment location
- On-hand quantity
- Reserved quantity
- Available-to-promise
- Inventory adjustment
- Reservation identifier
- Reservation expiry
- Committed quantity
- Inventory version

## Synchronization architecture

Support:

- Database transactions for authoritative stock changes
- Concurrency-safe reservations
- Transactional outbox events
- Kafka inventory change events
- Search index projections
- Cache invalidation
- Seller portal updates
- Warehouse/POS inventory ingestion
- Duplicate and out-of-order update handling
- Reconciliation jobs
- Dead-letter recovery

Define what "real-time" means through a measurable propagation SLO rather than assuming instantaneous global consistency.

Use ordering keys and monotonic versions or equivalent conflict-handling mechanisms when necessary.

Do not allow search indexes, cart caches, or storefront projections to override authoritative available-to-promise checks at checkout.

Explicitly test competing reservations and stale external stock feeds.

---

# 14. SEARCH ARCHITECTURE — ELASTICSEARCH / OPENSEARCH

Evaluate Elasticsearch versus OpenSearch based on:

- Search requirements
- Version and API compatibility
- Licensing and hosting
- Managed-service availability
- Cost
- Operations
- Analytics needs
- Vector/semantic search plans

Select one for the initial architecture rather than deploying both.

Implement the relevant capabilities:

- Full-text product search
- Autocomplete
- Typo tolerance
- Synonyms
- Faceted filtering
- Brand and category filters
- Price ranges
- Seller filtering
- Sorting
- Relevance tuning
- Query analytics
- Product suggestions
- Zero-result recovery
- Product variants
- Search indexing lifecycle
- Reindexing and alias strategies
- Cursor/search-after pagination where appropriate

Use Kafka events or an equivalent reliable projection pipeline to keep the search index updated.

Define recovery and rebuild procedures for corrupt, delayed, or inconsistent indexes.

Search remains a discovery projection, not the source of truth for transactions.

---

# 15. EVENT-DRIVEN ARCHITECTURE AND KAFKA

Use Kafka for business events and asynchronous integrations that benefit from decoupling.

Candidate events:

- ProductPublished
- ProductUpdated
- SellerOfferChanged
- InventoryReserved
- InventoryReleased
- InventoryCommitted
- CartCheckedOut
- CheckoutInitiated
- PaymentAuthorized
- PaymentCaptured
- PaymentFailed
- OrderConfirmed
- OrderCancelled
- ShipmentCreated
- ShipmentDelivered
- ReturnApproved
- RefundCompleted
- SellerSettlementRecorded

Treat these as candidate names; finalize them based on actual domain semantics.

For every event define:

- Schema
- Event ID
- Aggregate ID
- Producer
- Consumers
- Event version
- Timestamp
- Correlation ID
- Partition key
- Ordering assumptions
- Delivery guarantees
- Idempotency handling
- Error classification
- Retry policy
- Dead-letter handling
- Replay behavior
- Sensitive-data policy

Use transactional outbox where a database change and event publication must be coordinated reliably.

Use idempotent consumers and durable deduplication/inbox state where justified.

Avoid unsupported exactly-once claims across separate databases and external payment systems.

---

# 16. ARCHITECTURAL PATTERN DECISION FRAMEWORK

Evaluate the complete pattern catalog below.

For each selected pattern produce an ADR or concise decision record describing:

- Problem being solved
- Relevant bounded contexts
- Proposed implementation
- Alternatives
- Benefits
- Failure modes
- Consistency implications
- Operational cost
- Testing requirements
- Decision: Adopt now / Adopt selectively / Defer / Reject

## 16.1 Foundational patterns

| Pattern | Recommended use |
|---|---|
| Microservices Architecture | Independent deployment for justified business boundaries |
| API-First Design | Stable REST/OpenAPI and event contracts |
| Headless Commerce | Frontend-independent commerce capabilities |
| Cloud-Native Infrastructure | Managed, scalable, observable deployment |
| Database-per-Service | Independent domain data ownership |
| Event-Driven Architecture | Asynchronous integration across bounded contexts |
| API Gateway Pattern | Controlled routing, ingress protection, request policies |
| Backend-for-Frontend | Frontend-specific API composition where useful |
| Zero-Trust Security | Authenticated and authorized access across trust boundaries |
| Role-Based Access Control | Customer, seller, staff, administrator permissions |
| Infrastructure as Code | Reproducible environment provisioning |
| Automated CI/CD | Validated, repeatable delivery |
| DevSecOps Integration | Security embedded in engineering workflows |
| Automated Testing | Continuous behavioral and regression verification |
| Rate Limiting Pattern | Prevent abusive traffic and protect service capacity |

These represent baseline engineering considerations, with specific infrastructure selected according to real deployment requirements.

## 16.2 Reliability and distributed-system patterns

| Pattern | Appropriate usage |
|---|---|
| Outbox Pattern | Atomic business state persistence and reliable event publication |
| Inbox / Idempotent Consumer | Reliable processing of duplicate or replayed events |
| Saga Pattern | Recoverable cross-service business workflows |
| Circuit Breaker Pattern | Repeated transient failure isolation at suitable remote boundaries |
| Retry Pattern | Bounded retries of safe transient failures |
| Bulkhead Pattern | Isolation of competing resource pools or dependencies |
| Cache-Aside Pattern | Read-heavy cached projections with defined invalidation |
| Materialized View Pattern | Search, order history, and reporting projections |
| CQRS Pattern | Separate read projections when read/write needs materially differ |
| Event Sourcing | Only when event history as primary state genuinely justifies its complexity |
| Strangler Fig Pattern | Incremental replacement of an existing legacy system |

Do not implement global event sourcing by default.

An audit log, outbox, Kafka topic, or immutable financial journal is not automatically an event-sourced domain model.

Do not introduce a saga when a local database transaction is adequate.

Do not retry ambiguous payment operations blindly; use idempotency and provider reconciliation.

## 16.3 Performance and scalability patterns

Evaluate:

- Horizontal scaling
- High availability
- Distributed caching
- CDN
- Edge caching / edge computing
- Serverless computing
- Search projections
- Optimized API composition
- Read replicas
- Partitioning
- Connection pooling
- Backpressure
- Load shedding
- Queue-based asynchronous processing

Use edge infrastructure primarily for appropriate public or safely personalized content delivery, image optimization, and lightweight request handling.

Do not move authoritative orders, payments, or inventory transactions to edge caches.

Use serverless functions selectively for bursty, bounded workloads such as suitable media processing and automation jobs. Avoid introducing a second execution platform without clear value.

## 16.4 Data and integration patterns

Evaluate:

- Multi-tenant data architecture
- Master Data Management
- Omnichannel Integration
- Change-data capture where justified
- Materialized projections
- API contracts
- Event schema registries
- Streaming analytics
- Big data processing
- Financial journals
- Data retention and archival
- Data reconciliation

Use Master Data Management to establish canonical product identifiers, categories, brands, SKU mappings, and seller offer relationships.

For omnichannel inventory, explicitly define whether each upstream channel is authoritative for its own stock and how updates are reconciled.

## 16.5 Advanced integration and experience patterns

Evaluate:

- GraphQL read aggregation
- Progressive Web Apps
- AI-driven personalization
- Real-time analytics
- Contextual search
- Semantic/hybrid search
- Edge rendering
- Serverless integrations
- Mobile-first optimization

These should be introduced according to measurable customer value, capability maturity, and operational cost.

**CQRS and Command Query Responsibility Segregation are the same pattern; document them once rather than treating them as two independent architectural requirements.**

---

# 17. CQRS, EVENT SOURCING, AND MATERIALIZED READ MODELS

Use separate command and query models when they simplify complex workflows or improve independent scaling.

Potential read projections:

- Product search document
- Product detail composition
- Customer order history
- Seller sales dashboard
- Inventory availability summary
- Marketplace operational reporting

Command models must preserve authoritative business rules.

Eventual read-model consistency requires:

- Versioning
- Propagation lag monitoring
- Replay support
- Rebuild capability
- Error handling
- User-visible stale-data recovery

Evaluate event sourcing separately for domains with genuine temporal reconstruction needs.

Do not introduce event sourcing merely to demonstrate an architectural pattern.

Use append-only financial records and a double-entry ledger where justified without conflating them with full event sourcing.

---

# 18. OMNICHANNEL AND MASTER DATA MANAGEMENT

Design extensibility for:

- Web storefront
- PWA
- Future mobile applications
- Seller portal
- Physical retail/POS systems
- Warehouses
- Carrier integrations
- Marketplace channels
- Customer support systems
- External ERP/PIM integrations

Define canonical product data and mappings for:

- Product ID
- Product family
- SKU
- Barcode / external identifiers
- Seller offer ID
- Warehouse/location
- Brand
- Category taxonomy
- Attribute definitions
- Stock ownership

Implement adapters for external channel data instead of allowing arbitrary upstream schemas into core domain models.

Account for late, duplicate, reordered, and conflicting external events.

Use channel-specific identifiers and clear source-of-truth rules.

Stage full POS integration according to business priority, but ensure initial interfaces do not rule it out.

---

# 19. AI PERSONALIZATION AND REAL-TIME ANALYTICS

## Personalization architecture

Evaluate:

- Recently viewed products
- Related products
- Category affinity
- Personalized ranking
- Recommendations
- Editorial targeting
- Abandoned-cart assistance
- Next-best-product suggestions

Begin with deterministic or simple recommendation strategies where appropriate.

Add ML systems only when adequate data, privacy controls, evaluation criteria, and operating capacity exist.

Do not allow probabilistic output to invent price, stock, seller policy, or delivery guarantees.

## Analytics architecture

Define:

- Product impressions
- Product clicks
- Search events
- Search-to-product conversion
- Add-to-cart
- Checkout funnel
- Payment outcomes
- Order completion
- Returns
- Seller performance
- Inventory exceptions
- Fulfillment KPIs
- Revenue metrics
- Marketplace commissions

Separate product analytics from authoritative finance records.

Evaluate Kafka-based ingestion and an analytical datastore/warehouse when justified.

Design consistent event identifiers, schemas, consent controls, and retention policies.

Provide measurable instrumentation for UX experiments without violating privacy expectations.

---

# PART III — SECURITY, PAYMENT, AND TRANSACTION ARCHITECTURE

# 20. ZERO-TRUST AND AUTHORIZATION

Apply least-privilege access across browser, edge, gateway, BFF, microservices, databases, messaging, and operations.

Required capabilities:

- OIDC/OAuth-based identity where appropriate
- Session protection
- Passkeys/WebAuthn where justified
- MFA for privileged accounts
- RBAC
- Resource-level authorization
- Seller tenant isolation
- Service-to-service authentication
- Network segmentation
- Secret management
- Encryption
- Audit trails
- CSRF and XSS protections
- Injection prevention
- Webhook authentication
- Sensitive-data minimization
- Dependency security scanning
- Supply-chain verification

Never assume API gateway authorization replaces domain-level authorization.

Evaluate token propagation and least-privilege service identities without forwarding excessive credentials.

---

# 21. RAZORPAY PAYMENT AND EXPRESS CHECKOUT ARCHITECTURE

Implement payment processing based on verified official Razorpay capabilities.

## Mandatory payment workflow

- Server-side checkout price calculation
- Inventory reservation
- Checkout/order linkage
- Razorpay order creation
- Hosted or approved checkout UI
- Signature verification
- Verified payment status
- Payment capture-state handling
- Pending payment recovery
- Webhook verification using raw payload
- Duplicate webhook deduplication
- Refund creation
- Refund reconciliation
- Provider outage handling
- Payment and order audit history

Never mark an order paid solely because a browser callback reports success.

Preserve authoritative server-side Razorpay order identifiers and verify amount, currency, ownership, and payment state.

Do not expose secrets or raw card data.

## Marketplace payments

Assess Razorpay Route eligibility for seller transfers and settlement automation.

Do not assume the merchant account has access to Route, linked accounts, or automatic split settlement.

Keep internal seller receivables, marketplace commissions, refund liabilities, settlement records, and financial reconciliation independent of provider-specific presentation.

## Express checkout

Treat biometric authentication, stored addresses, payment-token support, and actual transaction authorization as distinct concerns.

Implement a standard checkout fallback.

Do not skip legal consent, transaction confirmation, or payment-provider authentication steps.

---

# 22. CHECKOUT, INVENTORY, ORDER, AND FINANCE INVARIANTS

Explicitly model:

- Product and seller offer
- Price snapshot
- Inventory reservation
- Checkout session
- Razorpay payment attempt
- Payment authorization/capture
- Order
- Order item
- Shipment
- Return
- Refund
- Seller receivable
- Marketplace fee
- Financial journal
- Settlement

Protect against:

- Double checkout
- Overselling
- Price drift
- Duplicate payment handling
- Late callbacks
- Out-of-order events
- Double refunds
- Negative stock
- Invalid order transitions
- Incorrect seller attribution
- Inaccurate payouts
- Duplicate financial postings

Define state machines, transaction boundaries, idempotency retention, and reconciliation workflows.

Never treat a cache, search index, frontend state, or analytical projection as the final authority for financial or inventory invariants.

---

# PART IV — AWS WELL-ARCHITECTED AND CLOUD PLATFORM

# 23. SIX PILLARS — REQUIRED ENGINEERING CHECKS

Apply all six pillars throughout delivery.

## Operational Excellence

- IaC
- CI/CD
- Logging
- Distributed tracing
- Metrics
- Dashboards
- Alerting
- Runbooks
- Deployment rollback
- Incident response
- Operational ownership
- Post-incident learning

## Security

- Zero trust
- RBAC and tenant authorization
- Secure API contracts
- Encryption
- Secret management
- WAF
- Input validation
- Threat modeling
- Dependency and image scanning
- Audit logs
- Payment security

## Reliability

- Multi-AZ strategy where justified
- Health checks
- Timeouts
- Bounded retries
- Idempotency
- Failure isolation
- Durable messaging
- Reconciliation
- Backups
- RPO/RTO
- Fault injection
- Graceful degradation

## Performance Efficiency

- SSR and caching strategy
- Core Web Vitals
- CDN
- Elasticsearch optimization
- PostgreSQL indexes
- Redis caching
- Connection pools
- Service profiling
- Horizontal scaling
- Load and stress testing

## Cost Optimization

- Right-sizing
- Managed service evaluation
- Reserved/on-demand capacity decisions where relevant
- Resource quotas
- Autoscaling
- Storage lifecycle
- Cost monitoring
- Data transfer awareness
- Avoiding unnecessary microservices or clusters

## Sustainability

- Efficient compute
- Efficient media delivery
- Storage lifecycle
- Reduced idle infrastructure
- Appropriate cache usage
- Efficient networking
- Measurable resource optimization

For each pillar provide recommendations, adopted controls, verification evidence, and remaining risks.

---

# 24. AWS DEPLOYMENT ARCHITECTURE

Evaluate an AWS deployment using:

- CloudFront
- S3
- WAF
- Load balancing
- API Gateway where justified
- ECS/Fargate or EKS
- RDS PostgreSQL
- Managed Kafka
- Managed Redis
- Elasticsearch/OpenSearch hosting choice
- Secrets Manager
- IAM
- KMS
- Cloud monitoring integrations
- Terraform

Choose EKS only when Kubernetes operational capabilities justify its maintenance overhead.

Use Lambda/serverless only for suitable workloads rather than as a mandatory parallel platform.

Design environment boundaries for:

- Local development
- Integration tests
- Staging
- Production

Provide deployment and rollback procedures.

Do not provision paid infrastructure or execute live financial transactions without explicit authorization.

---

# PART V — PHASED FULL-STACK IMPLEMENTATION

# 25. MANDATORY DEVELOPMENT PHASES

Execute the project in the following dependency-aware phases.

## Phase 0 — Repository Analysis and Product Baseline

Deliver:

- Existing repository assessment
- Requirements inventory
- Assumptions register
- Architecture constraints
- Risk inventory
- P0 functional backlog

**Exit:** Repository and functional baseline are understood and documented.

## Phase 1 — UI/UX Design and Solution Architecture

Deliver:

- Design vision
- Brand direction
- Design tokens
- Information architecture
- Page specifications
- Modern UX pattern applicability matrix
- Customer, seller, and admin journeys
- C4 diagrams
- Bounded-context map
- Microservice and Java/Go allocation
- API/BFF/GraphQL decision
- Database ownership
- Multi-tenancy approach
- Kafka integration architecture
- Payment state machines
- Infrastructure topology
- ADRs
- Detailed implementation plan

**Exit:** A coherent, implementable architecture and design system with testable acceptance criteria.

## Phase 2 — Engineering Foundation

Implement:

- Repository organization
- Next.js applications
- Shared UI primitives
- Theme tokens
- Java and Go service foundations
- PostgreSQL migrations
- Kafka integration foundation
- Redis/search where selected
- Local Docker Compose
- OpenAPI contracts
- Observability
- CI foundation

**Exit:** Reproducible builds, health checks, integration infrastructure, and baseline tests pass.

## Phase 3 — Modern Storefront and Product Discovery

Implement:

- Homepage
- Responsive navigation
- Bento-grid editorial sections
- Product cards
- Catalog API
- Seller offer API
- Category pages
- Product detail page
- Search API
- Elasticsearch indexing
- Filters and sorting
- Contextual search
- Loading states
- Media optimization

Connect the UI to real backend data.

**Exit:** A seller publishes a listing and a customer discovers and evaluates it through the working storefront.

## Phase 4 — Customer Identity, Cart, and Checkout Preparation

Implement:

- Customer authentication
- Profile and addresses
- Guest cart
- Authenticated cart
- Cart merging
- Wishlist
- Price validation
- Inventory reservation
- Checkout session
- Checkout UI

**Exit:** A customer can select products, maintain a cart, and initiate a server-validated checkout.

## Phase 5 — Razorpay, Order Management, and Payment Recovery

Implement:

- Razorpay test integration
- Payment signature verification
- Webhooks
- Payment persistence
- Order creation
- Order confirmation
- Inventory commitment/release
- Event-driven coordination
- Reconciliation
- Payment retry and recovery
- Order history

**Exit:** A complete Razorpay sandbox purchase is verifiably correct across UI, payment, order, inventory, and database state.

## Phase 6 — Marketplace Operations

Implement:

- Seller dashboards
- Seller orders
- Fulfillment
- Shipment tracking
- Returns
- Refunds
- Commissions
- Financial records
- Seller receivables
- Settlement reconciliation
- Administration
- Customer notifications

**Exit:** A purchase can proceed through fulfillment, returns/refunds, and financial reconciliation without violating invariants.

## Phase 7 — Advanced UX, Omnichannel, and Growth Features

After the core workflows are stable, implement prioritized enhancements:

- Shoppable lookbooks
- Advanced micro-interactions
- Dark mode
- Enhanced media
- Progressive Web App
- Improved contextual search
- Controlled infinite scroll
- Passkey-based express checkout where supported
- Advanced merchandising
- Omnichannel adapters
- Customer analytics
- Initial personalization

Use the P1/P2 priorities and business value to determine the precise sequence.

**Exit:** Each introduced feature has documented usability, performance, accessibility, and operational verification.

## Phase 8 — Security, Resilience, and Performance Hardening

Execute:

- Threat-model reviews
- Tenant isolation tests
- Accessibility tests
- Visual regression tests
- Responsive-device checks
- Contract tests
- Concurrency tests
- Payment failure tests
- Kafka replay tests
- Load and stress tests
- Backup and recovery verification
- Cost analysis
- Well-Architected review

**Exit:** Agreed critical quality gates are satisfied with recorded evidence and a remaining-risk assessment.

## Phase 9 — Staging Deployment and Production Readiness

Prepare and, where authorized, execute:

- Terraform
- Container builds
- Environment configuration
- CI/CD deployment
- Database migrations
- Secret management
- Staging rollout
- Smoke tests
- End-to-end checks
- Monitoring and alert validation
- Rollback verification
- Disaster recovery procedures
- Production release checklist

Do not claim production readiness without evidence.

---

# 26. IMPLEMENTATION ENGINEERING LOOP

For each vertical slice:

1. Inspect relevant existing code.
2. Confirm the requirement and acceptance criteria.
3. Make targeted architecture decisions.
4. Implement frontend components and screens.
5. Implement or update backend domain logic.
6. Implement persistence and migrations.
7. Implement API/event integrations.
8. Add meaningful tests.
9. Execute available checks.
10. Investigate and repair failures.
11. Update architecture and operational documentation.
12. Record the actual verification result.
13. Continue to the next dependency-ready slice.

Do not produce disconnected mock pages pretending to use real services.

Do not generate empty microservice scaffolds without meaningful domain behavior.

Do not bypass critical tests to make builds pass.

---

# PART VI — QUALITY, ACCESSIBILITY, AND PRODUCTION VERIFICATION

# 27. FRONTEND QUALITY GATES

Implement and execute relevant checks for:

- TypeScript correctness
- Linting
- Component behavior
- Form validation
- Accessibility
- Keyboard navigation
- Responsive layouts
- Visual regression
- Light/dark theme behavior
- Motion preferences
- SEO
- Core Web Vitals
- Image optimization
- Infinite-scroll navigation and restoration
- Search UX
- Razorpay checkout integration
- Customer purchase journey

Use Playwright for critical browser journeys.

Use an accessibility testing tool and manual interaction checks where required.

Do not rely entirely on visual screenshots to assess usability or accessibility.

---

# 28. BACKEND QUALITY GATES

Verify:

- Domain invariants
- API contracts
- Authorization
- Multi-tenant isolation
- Database migrations
- SQL constraints
- Inventory concurrency
- Transaction boundaries
- Kafka publication
- Event schema compatibility
- Consumer idempotency
- Event replay
- Retry policies
- Failure recovery
- Razorpay signatures
- Refund idempotency
- Settlement accuracy
- Search projection rebuilds
- Cache invalidation
- Omnichannel reconciliation
- Latency and throughput targets

Use JUnit, Testcontainers, and appropriate Spring integration tooling for Java.

Use Go tests, race detection, and integration tests for Go services.

Prefer realistic integration checks over mocking every dependency.

---

# 29. COMPLETE END-TO-END ACCEPTANCE JOURNEYS

At minimum, verify:

### Journey 1 — Seller to searchable listing

Seller creates product/offer → Approval → Inventory → Catalog update → Kafka event → Search index → Product visible in storefront.

### Journey 2 — Customer purchase

Homepage → Search → Product detail → Cart → Checkout → Razorpay sandbox payment → Server verification → Order confirmation → Inventory commitment.

### Journey 3 — Concurrent inventory

Multiple customers purchase final available unit → Reservation concurrency handling → No invalid overselling → Correct customer feedback.

### Journey 4 — Interrupted payment

Payment succeeds → Browser confirmation interrupted → Webhook/reconciliation processes final state → Exactly one business order confirmation.

### Journey 5 — Refund

Delivered order → Eligible return → Approved refund → Razorpay test refund or controlled provider simulation → Internal financial adjustment → Reconciliation.

### Journey 6 — Tenant isolation

Seller A requests Seller B's protected records → API rejects request → No data leakage through BFF, GraphQL, cache, database, or analytics projection.

### Journey 7 — Modern frontend interaction

Responsive homepage → Bento discovery → Contextual search → Product media → Variant selection → Sticky purchase action → Accessible checkout.

### Journey 8 — Search and projection recovery

Catalog changes → Event delayed or duplicated → Search projection is reconciled → Checkout still uses authoritative price and inventory.

### Journey 9 — Omnichannel stock update

External channel reports stock change → Validated ingestion → Conflict/version handling → Authoritative inventory update → Search/cache update → Reconciliation.

### Journey 10 — Staging deployment

CI build → Contract/integration tests → Image publish → Authorized infrastructure deployment → Health checks → Smoke tests → Observability confirmation.

---

# 30. DELIVERABLES AND DOCUMENTATION

Maintain:

- Product requirements and capability map
- UI/UX design specification
- Design tokens
- Component catalog
- Page and interaction specifications
- Responsive rules
- Accessibility checklist
- C4 and sequence diagrams
- Bounded-context and service matrix
- Java/Go assignment rationale
- Architecture pattern adoption matrix
- ADRs
- API contracts
- GraphQL schema where selected
- Event schemas
- Database migrations
- Multi-tenancy model
- Payment integration guide
- Kafka operating guide
- Docker development setup
- Terraform and deployment assets
- CI/CD workflows
- Test results
- Performance results
- Security findings
- Operational runbooks
- Known limitations
- Implementation progress record

Do not maintain documents that materially contradict the implemented code.

---

# 31. ARCHITECTURE AND DESIGN REVIEW CHECKLIST

Before marking a phase complete, verify:

## UI/UX

- Is visual hierarchy clear?
- Is the design coherent across pages?
- Are required UX patterns applied only where useful?
- Does the mobile experience work?
- Are keyboard and screen-reader flows usable?
- Are prices and purchase terms transparent?
- Are loading and recovery states complete?
- Does visual sophistication preserve performance?
- Are reusable components consistent?

## Backend

- Does every service have clear ownership?
- Is the Java/Go split justified?
- Are cross-service data contracts explicit?
- Are database responsibilities isolated?
- Are multi-tenant boundaries enforced?
- Are retries and idempotency safe?
- Are event processing and schema changes compatible?
- Are caching and search projections consistent with domain authority?
- Are sagas and CQRS justified?
- Are failures observable and recoverable?
- Is operational complexity proportional to actual requirements?

## Platform

- Can the platform be started reproducibly?
- Can it be tested?
- Can it be deployed safely?
- Can operators diagnose incidents?
- Are backups and rollbacks addressed?
- Are operating costs understood?
- Are the six Well-Architected pillars evaluated?
- Are remaining risks explicitly recorded?

---

# 32. REQUIRED PROGRESS REPORTING

After every completed implementation phase or significant slice, provide:

**Phase:** Name and objective.

**Implemented:** Actual files, services, components, APIs, data migrations, integrations, and infrastructure changes.

**Design/Architecture Decisions:** Important decisions with their rationale.

**Verification:** Commands actually executed, tests passed/failed, builds, browser checks, integration results, and deployment results.

**Remaining Risks:** Incomplete requirements, limitations, credentials, provider dependencies, and operational risks.

**Next Slice:** The next dependency-ready implementation task.

Keep an implementation status file in the repository so subsequent work can resume from an accurate checkpoint.

Never label a phase complete because code was merely generated.

---

# 33. FINAL EXECUTION INSTRUCTION

**Start with architecture and design, then proceed through actual implementation and verification.**

Follow this order:

1. Inspect the uploaded requirements and repository.
2. Produce a consolidated product and capability baseline.
3. Define the modern UI/UX design direction and full design system.
4. Produce critical page layouts and interaction specifications.
5. Design the microservices architecture and bounded contexts.
6. Allocate Java and Go services with explicit justifications.
7. Evaluate the complete architectural pattern catalog.
8. Define database ownership, multi-tenancy, API contracts, events, and state machines.
9. Design the Kafka, Razorpay, inventory, and order workflows.
10. Create the AWS deployment architecture and Well-Architected review.
11. Produce the dependency-aware engineering roadmap.
12. Establish the working repository, builds, databases, integrations, and CI.
13. Implement the marketplace as complete frontend/backend vertical slices.
14. Verify each completed slice before expanding scope.
15. Complete core commerce, seller operations, administration, and finance.
16. Introduce prioritized advanced frontend and omnichannel capabilities.
17. Execute system, performance, accessibility, security, and resilience verification.
18. Prepare and validate deployment and operations within authorized environments.
19. Produce an accurate final implementation and readiness report.

### Important execution constraints

- Make routine engineering decisions independently.
- Favor working code over repeated planning.
- Do not invent test results or vendor capabilities.
- Do not add complexity only to demonstrate patterns.
- Do not change unrelated working code.
- Do not use fabricated order or payment states as evidence of successful integration.
- Do not perform live financial transactions or incur material infrastructure charges without authorization.
- Do not claim production readiness without supporting evidence.
- If execution limits prevent completion, preserve a verifiable state and clearly report the remaining work.

## ULTIMATE SUCCESS CRITERION

Deliver a **fully integrated, design-led, secure, maintainable, cloud-native, Amazon-inspired marketplace** that combines:

**Premium modern UI/UX + Next.js headless commerce + Java/Go domain-driven microservices + API-first integration + Kafka event-driven workflows + PostgreSQL + Elasticsearch + Redis + Razorpay + multi-tenant security + fault-tolerant architecture + automated CI/CD + AWS Well-Architected engineering.**

The completed work must be evidenced by functioning customer, seller, and administrator journeys; executable tests; verified payment and inventory behavior; deployable artifacts; and credible operational documentation.

**Begin with the architecture and UI/UX design package, then implement the first working customer discovery-to-purchase vertical slice.**