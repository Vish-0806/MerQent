# ADR-005: Authentication & Authorization — JWT + Refresh Token Architecture

## Context
MerQent serves institutional Private Equity sponsors, C-level executive consultants, and platform administrators. The platform handles highly confidential M&A transaction targets and integration playbooks. Security, multi-tenant isolation, session revocation, and mobile readiness are paramount.

## Problem
Designing an authentication and session management architecture that provides stateless API verification, instant revocation for compromised accounts, cross-client compatibility (Next.js web and Flutter mobile), and strict Role-Based Access Control (RBAC).

## Options Considered
1. **JWT (Short-Lived Access Token) + Stateful Refresh Token Rotation (Redis / DB)** (Selected)
2. **Stateful Server-Side Cookie Sessions only**
3. **Third-Party Auth Provider (Auth0 / Clerk / Supabase Auth)**

## Decision
Adopt a **Dual-Token Architecture**: Short-lived cryptographic JSON Web Tokens (JWT, 15-minute expiry) paired with stateful Refresh Tokens (7-day expiry) stored with family rotation and revocation tracking in PostgreSQL / Redis.

## Rationale
- **Cross-Client Compatibility**: Seamlessly supports both the Next.js web client (`httpOnly`, `Secure`, `SameSite=Strict` cookies or Authorization headers) and the future Flutter mobile client (secure storage Authorization bearer headers).
- **Stateless Verification**: High-throughput API gateway and services verify access tokens cryptographically without hitting the database on every micro-request.
- **Revocation & Anti-Replay**: Every refresh token belongs to a cryptographic token family; reuse detection triggers immediate revocation of the entire family.
- **Role-Based Access Control (RBAC)**: Claims embed user ID, role (`PE_FIRM`, `CONSULTANT`, `ADMIN`), organization membership, and verification tier, enforced via NestJS `JwtAuthGuard` and `RolesGuard`.

## Trade-offs
- Requires secure storage management on clients and rotation bookkeeping on the backend.
- Token revocation for access tokens has an up to 15-minute propagation delay unless paired with a distributed Redis denylist.

## Consequences
- Passwords hashed using `argon2id`.
- Auth endpoints organized under `/api/v1/auth` (`register`, `login`, `refresh`, `logout`, `password-reset`).
- Strict IDOR guards prevent users from accessing cross-tenant entities.

## Alternatives Rejected
- *Pure Stateful Cookie Sessions*: Breaks native mobile app consumption and requires centralized session lookups on every single API route.
- *Third-Party SaaS Auth (Clerk/Auth0)*: Vendor lock-in, recurring per-MAU costs, and loss of sovereign control over enterprise PE user credentials and audit logs.

## Future Implications
Enables future enterprise SAML/SSO integrations (e.g. Okta, Azure AD) for PE firms without restructuring the core user session model.
