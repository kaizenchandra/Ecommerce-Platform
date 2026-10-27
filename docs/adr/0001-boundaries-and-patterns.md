# ADR 0001: transactional commerce plus independent discovery
Status: accepted for initial implementation; production infrastructure proposed.

Keep commerce invariants in a Java 21/Spring Boot deployment and PostgreSQL transaction. Go independently serves public discovery and consumes full public catalog snapshots. Next.js is a thin experience layer. Separate payments/inventory deployment would require a recoverable distributed protocol without present scaling evidence. Splitting later requires explicit ports/contracts, not shared SQL writes.

| Pattern | Decision | Reason / cost / verification |
|---|---|---|
| Microservices, headless, API-first, database ownership | Adopt selectively | Two coherent deployables; contract tests; no cross-DB joins |
| RBAC, resource authorization, zero trust | Adopt | Every private query scoped; local identity not production-ready |
| CI/CD, IaC, automated testing, DevSecOps | Adopt incrementally | CI first; infrastructure gated on accounts/budget; scans required |
| Gateway, rate limiting | Adopt at deployment | ALB/WAF request controls plus domain auth; load-test quotas |
| Next.js BFF | Adopt | Cookie isolation and origin check; no commerce authority |
| Outbox, idempotent consumer | Adopt | Durable publication and external version checks; replay tests |
| Materialized views / CQRS | Adopt for search only | Rebuildable public projection; monitor lag; no separate command DB |
| Saga | Defer | Local DB transaction currently sufficient; provider unknown states persisted |
| Retries, timeouts, backpressure | Adopt selectively | Bounded reads; no automatic payment creation retry; worker failures visible |
| Circuit breaker, bulkhead | Defer | First measure failure/resource saturation; bounded pools now |
| Cache-aside, Redis, read replicas | Defer | No measured hotspot; stock stays authoritative |
| Event sourcing | Reject now | Outbox/audit is not canonical event-sourced state |
| Strangler Fig | Not applicable | No legacy application |
| Horizontal scaling, pooling, HA | Selective | Stateless APIs, DB locks; multi-AZ production needs cost approval |
| CDN / edge caching | Selective | Public assets only; private no-store |
| Serverless, edge transactions | Defer / reject for writes | No added platform without workload evidence |
| Partitioning, load shedding | Defer / selective | Bounded results and payloads now; measurements before sharding |
| Tenant rows, canonical master data | Adopt | Seller offers distinct from canonical SKU/product; isolation tests |
| CDC / schema registry | Defer | App outbox with versioned JSON contracts first |
| Financial journal, reconciliation | Adopt next P0 slices | Immutable balanced postings; not analytics-derived money |
| Retention / archival | Design before release | Order/idempotency retention must meet approved legal policy |
| Omnichannel | Defer | Versioned source adapters after warehouse authority policy |
| GraphQL | Defer | REST sufficient; no payment mutations through arbitrary graph |
| PWA | Defer | Never offline-replay checkout or cache private responses |
| AI / hybrid search / big data / realtime analytics | Defer | No data, consent or proven benefit yet |
| Elasticsearch | Adopt locally | Requested full-text engine; external version projection; procurement/license review before AWS |
| EKS / service mesh / multi-region | Defer | ECS simpler; avoid operational overhead without evidence |

Failure costs: Kafka/Elasticsearch outage delays search; Go can read approved catalog from Java as degraded mode. PostgreSQL outage fails checkout closed. Provider timeout leaves pending work for reconciliation. Never imply global exactly-once delivery. Target catalog propagation p95 <5 seconds locally, to be measured; checkout always validates current data.
