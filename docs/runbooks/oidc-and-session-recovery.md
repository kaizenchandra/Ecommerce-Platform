# Customer OIDC and session recovery

## Local protocol verification

Run `docker compose -f compose.yaml -f compose.oidc.yaml up -d --build`, then `node tests/wait-ready.mjs`. In `apps/storefront`, run `OIDC_TESTS=true npm run test:e2e`. The loopback-only provider is an intentionally permissive protocol fixture: it verifies PKCE and produces signed claims but performs **no real authentication or MFA**. Never deploy it or its public credentials. Restarting it invalidates fixture refresh tokens; sign in again.

## Real-provider configuration (not yet verified)

Configure an OIDC confidential web client with exact HTTPS callback `APP_URL/auth/callback`, authorization code, S256 PKCE and refresh-token rotation. Storefront requires `OIDC_ISSUER`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`, `OIDC_AUDIENCE`, `OIDC_REQUIRED_ACR`, `APP_URL`, `AUTH_DATABASE_URL`, and a private `AUTH_ENCRYPTION_KEY` containing 32 random bytes encoded as 64 hex characters. Commerce needs the same issuer/audience/ACR and `OIDC_JWKS_URI`. Use RS256-signed API access tokens. Configure the actual MFA policy and claim mapping so both ID and access tokens contain the required assurance. An ID token alone is not an API token.

Outside local development set `LOCAL_MODE=false`; HTTPS is required, cookies use `__Host-` names, Secure, HttpOnly, SameSite=Lax and path `/`. Do not enable `OIDC_ALLOW_HTTP` or `OIDC_INTERNAL_ORIGIN`; those are local fixture transport settings. The local Compose file hardcodes development settings and is not a production deployment manifest. Use secret injection, private networking, certificate-verified database TLS and separate least-privilege runtime/migration credentials.

Initialize the separate auth database using [001_sessions.sql](../../infra/auth-store/001_sessions.sql). Commerce must not write this database. Back up encrypted session data only under approved retention/access controls. Tokens, cookies, callback query strings and flow payloads must never appear in logs. Expired rows are cleaned at login; scheduled retention and production monitoring remain work.

## Recovery and safe switching

Registered sessions survive storefront restarts. Renewal holds a row lock and rotates durable credentials once; ambiguous failures revoke the local session and require login. A session is limited to eight hours absolute and thirty minutes idle. Return to the same provider account to recover its cart, wishlist and owned checkout records. Expiry returns 401 without guest fallback. Logout deletes the server-side session before clearing the browser cookie; a database outage reports failure for retry.

The BFF exposes `GET /api/auth-config` and `GET /api/session-context`; establish guest identity with same-origin `POST /api/guest-session` first. Session context returns `identityKey` and `registered`. Cart/account responses also include `identityKey`; wishlist arrays are wrapped as `{items, identityKey}`. Send `X-Identity-Key` on cart, account and checkout creation writes. A mismatch returns 409; refresh the displayed data and ask the customer to review it. Never silently replay a pending payment under a new identity. Checkout attempts retain their original identity and idempotency key in session storage.

Local logout does not revoke upstream provider SSO or all issued access tokens. Provider logout/revocation, back-channel logout, account suspension propagation, production seller/admin MFA, rate limits and real password/account recovery procedures remain release work. Do not rotate guest identity silently: existing guest orders are still bound to their original capability. Guest-order adoption and expired/consumed guest recovery are not implemented.

## Release evidence required

Verify the chosen provider's real MFA challenge, enrollment/recovery, access-token audience/ACR mapping, signing-key rotation, refresh rotation, multi-instance behavior, logout/revocation policy, privacy retention and auth-store restore. Run the existing backend and browser regressions. No real provider, secret deployment or cloud infrastructure was configured by this slice.

References: [openid-client authorization code flow](https://github.com/panva/openid-client/blob/main/docs/functions/authorizationCodeGrant.md), [Spring Security JWT validation](https://docs.spring.io/spring-security/reference/6.5/servlet/oauth2/resource-server/jwt.html).
