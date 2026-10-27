# ADR 0005 — OIDC sessions and identity-bound writes

Status: adopted for customer integration; real provider/MFA verification remains a release gate.

Use authorization code + PKCE S256, state and nonce through `openid-client`. Store encrypted provider tokens in a separate storefront-owned PostgreSQL database; the browser receives only a random HttpOnly session cookie. Hash cookie identifiers before storage. Sessions expire after eight hours absolute or thirty minutes idle. Serialize token renewal with a database row lock, supporting multiple storefront processes and concurrent tabs. Fail closed and require reauthentication after uncertain renewal rather than replaying a consumed refresh token.

Commerce independently validates RS256 signature, issuer, expiry, audience and configured exact `acr`. Derive customer identity from issuer + subject, never an editable email or caller-supplied customer identifier. At login and renewal the BFF checks the API's authenticated subject against the original OIDC identity, including when refresh omits an ID token. Customer JWTs never grant seller/admin roles. Production privileged identity remains outstanding.

Every identity-sensitive BFF write carries an opaque `X-Identity-Key` captured with the displayed data. Reject stale-tab writes after account changes; retain the original identity alongside checkout retry keys. Expired registered sessions never silently become guests. This is an extra consistency check, not an authentication credential. Domain ownership and origin checks remain mandatory.

Wishlist belongs to commerce, scoped by authenticated customer with a 100-offer cap and absolute desired-state writes. It neither reserves inventory nor snapshots a purchase price. Existing local account fixtures remain development-only.

Alternatives: browser token storage increases token exposure; process-local sessions break restart/multi-instance recovery; silently retrying checkout after account switches changes idempotency scope. These were rejected. Operational costs include a separate auth database, encryption-key lifecycle and provider configuration. Key rotation currently invalidates stored payloads unless an explicit migration is added; plan a sign-out window and rotate only with a runbook.

Verification covers protocol fixtures, invalid assurance/audience/signatures, replay, concurrent renewal, restart durability, expiry, logout, changed refresh subjects and wishlist ownership. A fixture `acr` is not proof that a real user completed MFA. See the [identity runbook](../runbooks/oidc-and-session-recovery.md).
