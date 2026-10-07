# ADR-007: Authentication Strategy — JWT in HTTP-Only Cookies with DB Refresh Tokens

**Status:** Accepted  
**Date:** 2026-10-07  
**Deciders:** Lead Software Architect, Security Architect  
**Classification:** Core Architectural Decision  

---

## 1. Context
MerQent requires a secure, stateless, yet revocable authentication mechanism. The architecture must serve both web browsers (Next.js) and future mobile clients (Flutter / React Native), resist Cross-Site Scripting (XSS) and Cross-Site Request Forgery (CSRF), and support immediate global session revocation upon account suspension or password resets.

## 2. Problem
Evaluate whether to use server-side session cookies (e.g., Express-session + Redis), Bearer JWTs in localStorage, or dual-token JWTs in HTTP-Only SameSite cookies with database-backed refresh tokens.

## 3. Options Considered
- **Option 1:** Bearer JWT stored in browser `localStorage`
- **Option 2:** Stateful sessions stored in Redis with session ID cookies
- **Option 3:** Dual-Token Architecture: Short-lived Access JWT in HTTP-Only Secure cookie + Database-persisted Refresh Token

## 4. Decision
Implement **Option 3: Dual-Token Architecture**:
- **Access Token:** Short-lived JWT (15-minute TTL), cryptographically signed via RS256/EdDSA, containing basic claims (`sub`, `email`, `role`, `firmId`, `consultantProfileId`).
- **Web Transport:** Stored in an `HttpOnly`, `Secure`, `SameSite=Strict` cookie to prevent XSS exfiltration.
- **Mobile Transport:** Supported via standard `Authorization: Bearer <token>` HTTP header for non-browser clients.
- **Refresh Token:** Cryptographically random, high-entropy token stored in the database (`RefreshToken` table) with device fingerprinting and a 7-day rolling TTL.
- **Revocation:** Refresh tokens can be revoked immediately in the database by user ID, device ID, or globally upon password change or admin action.

## 5. Why Selected
1. **XSS Immunity for Web:** Because JavaScript cannot access `HttpOnly` cookies, malicious third-party scripts cannot exfiltrate access tokens.
2. **Instant Revocability:** Solves the classic flaw of stateless JWTs by requiring database validation during token refresh.
3. **Mobile Client Parity:** The backend authentication middleware accepts tokens from either HTTP-only cookies or the `Authorization: Bearer` header, ensuring zero friction for mobile clients.
4. **Stateless High-Throughput Verification:** Fast cryptographic verification on 99% of requests without querying Redis or the database for every single API call.

## 6. Alternatives Rejected
- **`localStorage` JWT:** Rejected due to extreme vulnerability to XSS attacks.
- **Stateful Redis Sessions:** Rejected due to hard coupling to Redis availability for every single request and increased friction for native mobile offline caching.

## 7. Trade-offs & Consequences
- **Trade-off:** CSRF protection must be enforced for cookie-based state-changing requests (`POST`, `PUT`, `DELETE`).
- **Consequence:** Backend enforces custom anti-CSRF headers (`X-CSRF-Token` / `SameSite=Strict`) on mutating routes.

## 8. Migration & Future Implications
- Clean abstraction enables integrating SAML / OpenID Connect Enterprise Single Sign-On (SSO) for institutional PE firms in Phase 3 without altering the core token validation pipeline.
