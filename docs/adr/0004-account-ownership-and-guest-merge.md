# ADR 0004 — Account ownership and atomic guest-cart claim

Status: local implementation; production identity deferred, not considered complete.

Customer identity must not be inferred from an arbitrary request customer ID. Add a distinct registered-customer role and derive all profile, address and history queries from the authenticated subject. Local fixtures exercise the role only when LOCAL_MODE is enabled. No password database, token issuance scheme or unverified OIDC claim parser is introduced. Production OIDC/MFA, session revocation and account recovery remain release gates.

Persist one default delivery address and a display name with optimistic version checks. These are customer-provided delivery data, not verified identity attributes. Checkout copies the chosen address; editing the account cannot alter existing checkout snapshots. Account history is bounded to the latest 50 owned checkouts. Pagination and multiple saved addresses remain later work.

Merge guest cart only after explicit customer action and verification of unexpired signed guest capability. Lock source and destination carts in stable subject order, sum quantities, validate all limits, and commit destination changes, source consumption, durable unique claim and audit together. Reject overflow rather than silently dropping goods. Same-account replay returns current cart without adding again; a different account cannot claim the same source. Subsequent writes to the consumed guest cart fail closed.

A merge does not transfer guest checkouts, payment ownership or idempotency scope. The UI warns to finish guest payments before signing in and blocks switching when an unresolved checkout-attempt payload exists in session storage. Logout retains the guest cookie for existing guest order access. A consumed guest bag cannot be reused; use the claiming account for subsequent shopping. A future explicit guest-session reset must explain the loss of guest-order access. Production identity integration must specify safe guest-order adoption and recovery before release.

Browser account credentials use a dedicated HttpOnly, SameSite cookie and explicit origin-checked writes. BFF validates local customer credentials against the backend before establishing the cookie. Guest merge proof comes only from the server-read guest cookie; caller-supplied proof headers are not forwarded. This is an isolated development flow, not a production login solution.
