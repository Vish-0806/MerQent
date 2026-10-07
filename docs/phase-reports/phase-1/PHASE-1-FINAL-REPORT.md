# MerQent — Phase 1 Final Architecture Master Report

**Report Version:** 2.0.0  
**Phase:** 1 — Master Architecture Correction & Complete Repository Structure  
**Author:** Lead Software Architect, Principal Engineer, Security Architect & AI Architect  
**Date of Completion:** 2026-10-07  

---

## 1. Executive Summary
MerQent has completed the full, unabridged **Phase 1 (Production Architecture & Repository Structure)** in strict accordance with the Master Architecture Correction prompt. Every major subsystem, business domain, persistence schema, search pipeline, grounded AI matching algorithm, realtime gateway, and repository layout has been reconciled, validated, and established as the canonical source of truth for the project.

This architecture is specifically engineered to address the complexities of **Post-Merger Integration (PMI)**: unifying enterprise ERPs (SAP S/4HANA, NetSuite, Dynamics 365), harmonizing charts of accounts, managing corporate carve-outs under Transition Services Agreements (TSAs), and resolving organizational friction post-acquisition for Private Equity sponsors.

---

## 2. Product Scope
The platform provides a specialized B2B marketplace and professional collaboration platform serving:
- **Private Equity Firms / Acquisition Organizations:** Needing to rapidly scope, post integration mandates, discover specialized operators, compare candidates across 21 domain parameters, and manage confidential scoping engagements.
- **PMI Consultants / Operators:** Experienced practitioners possessing proven track records in ERP cutovers, financial consolidation, carve-out governance, and culture integration.
- **Platform Administrators:** Operational curators responsible for reviewing verification dossiers, moderating project postings, curating domain taxonomies, and auditing AI recommendation quality.

---

## 3. Final Technology Stack
The baseline technology stack is established on non-negotiable architectural foundations:
- **Web Frontend:** Next.js 14+ (App Router) + TypeScript ([`ADR-001-frontend.md`](file:///c:/Users/Vishal%20S%20Naik/MyProjects/MerQent/docs/decisions/ADR-001-frontend.md))
- **Backend API:** Node.js 20 LTS + NestJS 10+ + TypeScript ([`ADR-002-backend.md`](file:///c:/Users/Vishal%20S%20Naik/MyProjects/MerQent/docs/decisions/ADR-002-backend.md))
- **Primary Database:** PostgreSQL 16+ with `pgvector` & `pg_trgm` ([`ADR-003-database.md`](file:///c:/Users/Vishal%20S%20Naik/MyProjects/MerQent/docs/decisions/ADR-003-database.md))
- **ORM / Migrations:** Prisma ORM 5+ ([`ADR-004-orm.md`](file:///c:/Users/Vishal%20S%20Naik/MyProjects/MerQent/docs/decisions/ADR-004-orm.md))
- **Authentication:** JWT (15m) + Stateful Refresh Token Rotation ([`ADR-005-authentication.md`](file:///c:/Users/Vishal%20S%20Naik/MyProjects/MerQent/docs/decisions/ADR-005-authentication.md))
- **AI Matching Engine:** Hybrid AI Matching via Abstracted `IAiProvider` ([`ADR-006-ai.md`](file:///c:/Users/Vishal%20S%20Naik/MyProjects/MerQent/docs/decisions/ADR-006-ai.md))
- **Search Engine:** PostgreSQL native (`pg_trgm` + `pgvector`) ([`ADR-007-search.md`](file:///c:/Users/Vishal%20S%20Naik/MyProjects/MerQent/docs/decisions/ADR-007-search.md))
- **Realtime Collaboration:** WebSockets / Socket.IO with Redis Adapter ([`ADR-008-realtime.md`](file:///c:/Users/Vishal%20S%20Naik/MyProjects/MerQent/docs/decisions/ADR-008-realtime.md))
- **Object Storage:** S3-Compatible Object Storage (MinIO / AWS S3) ([`ADR-009-storage.md`](file:///c:/Users/Vishal%20S%20Naik/MyProjects/MerQent/docs/decisions/ADR-009-storage.md))
- **Email:** Transactional Email via `IEmailService` (Resend / AWS SES) ([`ADR-010-email.md`](file:///c:/Users/Vishal%20S%20Naik/MyProjects/MerQent/docs/decisions/ADR-010-email.md))
- **Calendar & Scheduling:** Native RFC 5545 iCalendar (`.ics`) engine ([`ADR-011-calendar.md`](file:///c:/Users/Vishal%20S%20Naik/MyProjects/MerQent/docs/decisions/ADR-011-calendar.md))
- **Deployment:** Containerized Cloud Deployments (Docker / ECS / Cloud Run) ([`ADR-012-deployment.md`](file:///c:/Users/Vishal%20S%20Naik/MyProjects/MerQent/docs/decisions/ADR-012-deployment.md))
- **Observability:** Structured JSON Logging (Pino) + Sentry + OpenTelemetry ([`ADR-013-observability.md`](file:///c:/Users/Vishal%20S%20Naik/MyProjects/MerQent/docs/decisions/ADR-013-observability.md))
- **Future Mobile:** Flutter (Dart) using the exact same backend REST & WebSocket API.

---

## 4. System Architecture
The platform is organized around a clean, decoupled, headless architecture:
- Next.js Web Frontend and future Flutter Mobile client communicate with the NestJS API exclusively over HTTPS REST and WSS Socket.IO.
- The backend never depends on the existence of the frontend web layer.
- Persistence, search, and vector embeddings are unified within PostgreSQL 16+ using `pgvector` and `pg_trgm`, preventing dual-write state desynchronization.

---

## 5. Repository Architecture
The repository is structured as a pnpm workspace and Turborepo monorepo:
```
MerQent/
├── apps/
│   ├── web/ (Next.js 14 App Router, features/, components/)
│   └── api/ (NestJS 10, src/modules/, src/infrastructure/)
├── packages/
│   ├── shared-types/ (Domain enums, DTO interfaces)
│   ├── validation/ (Zod validation schemas)
│   ├── config/ (Shared constants, rate limits)
│   └── ui/ (Design system tokens, contracts)
├── prisma/
│   ├── schema.prisma (21-entity authoritative schema)
│   ├── migrations/
│   └── seed/ (seed.ts for controlled taxonomies)
├── infrastructure/
│   ├── docker/ (docker-compose: Postgres + pgvector, Redis, MinIO)
│   ├── database/ (init.sql)
│   ├── deployment/
│   ├── environments/
│   ├── search/
│   └── monitoring/
├── scripts/
│   ├── development/ (setup-dev.ps1)
│   ├── database/ (migrate-and-seed.ps1)
│   ├── testing/
│   └── deployment/
├── tests/
│   ├── e2e/ (e2e-scenarios.md)
│   ├── integration/
│   ├── security/
│   └── performance/
├── docs/ (product/, architecture/, decisions/, api/, database/, ai/, security/, testing/, deployment/, phase-reports/)
└── .github/workflows/ (ci.yml)
```

---

## 6. Backend Architecture
Organized into 17 clean domain modules in `apps/api/src/modules/`:
`auth`, `users`, `organizations`, `consultants`, `taxonomies`, `projects`, `search`, `matching`, `shortlists`, `connections`, `messaging`, `scheduling`, `notifications`, `files`, `verification`, `administration`, `analytics`, `audit`.
Cross-cutting concerns live in `apps/api/src/infrastructure/` (`database`, `ai`, `search`, `storage`, `email`, `realtime`, `observability`).

---

## 7. Frontend Architecture
Feature-oriented Next.js 14+ application (`apps/web`):
- Route groups: `(public)`, `(auth)`, `(firm)`, `(consultant)`, `(admin)`.
- Components divided into `ui/` (primitives), `layout/` (headers, sidebars), and `shared/`.
- Domain capabilities grouped under `features/` (`auth`, `organizations`, `consultants`, `projects`, `search`, `matching`, `shortlists`, `connections`, `messaging`, `scheduling`, `notifications`, `verification`, `administration`).

---

## 8. Database Architecture
PostgreSQL 16+ as the single system of record, managed via Prisma ORM:
- 21 domain entities with strict foreign keys, unique constraints, and lifecycle status timestamps.
- Authoritative schema located at `prisma/schema.prisma`.
- Seed script at `prisma/seed/seed.ts` populating controlled PMI taxonomies (Industries, ERPs, Accounting, Deal Types, Integration Types, PMI Tasks).

---

## 9. Search Architecture
Unified PostgreSQL search layer:
- Structured discovery using B-Tree indices on taxonomy foreign keys, rates, and availability.
- Trigram keyword search using GIN indexes (`pg_trgm`) on consultant bios and project narratives.
- Dense semantic vector search using `pgvector` HNSW cosine distance (`vector_cosine_ops`).

---

## 10. AI Architecture
Two-stage grounded hybrid AI matching pipeline:
- **Stage 1**: Hard filtering (availability, rates, baseline taxonomy) combined with `pgvector` HNSW dense vector candidate retrieval.
- **Stage 2**: Deterministic multi-factor scoring (40% ERP, 25% Deal Type, 20% Industry, 15% Verified Evidence) with LLM-synthesized human-readable evidence summaries.

---

## 11. Explainability & Factual Grounding
AI recommendations are strictly grounded in verifiable database records:
- The AI is architecturally prohibited from hallucinating or fabricating consultant credentials.
- Strict data categorization distinguishes `USER_REPORTED`, `VERIFIED_EVIDENCE`, `SYSTEM_CALCULATED`, and `AI_INFERRED_RELEVANCE`.

---

## 12. Messaging Architecture
Confidential, connection-gated communication:
- Communication invariant: Unlocked only when underlying connection status is `ACCEPTED`.
- WebSockets / Socket.IO with Redis Adapter handles realtime message delivery, typing indicators, read receipts, and presence.
- REST handles message history, pagination, and transactional message creation.

---

## 13. Scheduling Architecture
Provider-independent discovery and interview meeting scheduler:
- Built-in availability slot definition and conflict detection.
- Meeting lifecycle: `PROPOSED` -> `CONFIRMED` -> `CANCELLED` / `RESCHEDULED`.
- Generates RFC 5545 compliant `.ics` calendar invites universally compatible with Google Calendar, Outlook, and Apple Mail.

---

## 14. Notification Architecture
Event-driven multi-channel notification engine:
- Ingests domain events and checks user preferences and debounce windows.
- Dual delivery channels: in-app alerts via Socket.IO user rooms (`user:{id}`) and transactional emails via BullMQ and Resend/SES.

---

## 15. File & Document Architecture
Encrypted object storage abstraction:
- Direct-to-storage uploads and downloads using time-limited presigned URLs (15m TTL).
- Validates MIME magic bytes and integrates asynchronous virus scanning.
- MinIO for local development parity; AWS S3 in staging and production.

---

## 16. Verification Architecture
Multi-tier trust framework for PMI consultants:
- `TIER_0_UNVERIFIED` -> `TIER_1_IDENTITY` -> `TIER_2_EXPERIENCE` -> `TIER_3_CERTIFIED_LEAD`.
- Evidence submission dossiers reviewed and approved exclusively by system Administrators.

---

## 17. Administration Architecture
Dedicated administrative control plane (`/api/v1/admin/*`):
- Consultant verification dossier reviews, project moderation, taxonomy curation, AI match quality monitoring, and immutable audit log exploration.
- Strict `AdminGuard` enforcement.

---

## 18. Security & Privacy Architecture
Comprehensive defense-in-depth:
- Dual-token JWT with Argon2id hashing and token family rotation.
- Role-based and ownership-based access control protecting against IDOR.
- Material Non-Public Information (MNPI) protection via masked project alias names in marketplace discovery.

---

## 19. API Architecture
API-first contract defined in OpenAPI 3.0 specification (`docs/api/openapi.yaml`):
- RESTful JSON endpoints prefixed with `/api/v1/`.
- Uniform pagination, error responses, and validation via NestJS global pipes and interceptors.

---

## 20. Testing Architecture
Automated testing across the testing pyramid:
- Unit tests (Jest), Integration tests (PostgreSQL Testcontainers), AI Grounding benchmark suite, E2E tests (Playwright), and Security penetration suites.

---

## 21. CI/CD Architecture
Automated GitHub Actions pipeline (`.github/workflows/ci.yml`):
- Linting, typechecking, unit tests, integration tests, and build verification on every pull request.

---

## 22. Deployment Architecture
Containerized cloud deployments:
- Multi-stage Docker containers deployed across managed container platforms (AWS ECS Fargate / Cloud Run).
- Zero-downtime rolling deployments with pre-deployment Prisma migrations and automated health check rollbacks.

---

## 23. Observability Architecture
Four-pillar observability:
- High-speed structured JSON logging (Pino) with correlation `x-request-id`.
- Centralized exception tracking (Sentry).
- Metrics and health monitoring (OpenTelemetry / Prometheus).
- Database-backed immutable security audit logging (`AuditLog`).

---

## 24. Background Jobs & Asynchronous Processing
Non-blocking background workloads powered by BullMQ on Redis 7+:
- Dedicated queues for `ai-matching`, `notifications`, `file-processing`, `calendar-reminders`, and `analytics-aggregation`.
- Automatic exponential backoff retries and dead-letter queues (DLQ).

---

## 25. Mobile Readiness
Designed from day one for a future Flutter mobile client:
- Headless NestJS REST and Socket.IO API consumed identically by web and mobile.
- Token refresh flow compatible with mobile secure storage; push notification abstractions in place.

---

## 26. Scalability Architecture
Engineered to scale from Day 1 to 10x volume (1,000 PE firms, 20,000 consultants, 5,000 projects):
- Single PostgreSQL database supports target volume without sharding; Redis caching offloads session and query loads; Socket.IO Redis adapter enables horizontal API pod scaling.

---

## 27. Traceability Matrix
Complete traceability mapping in `docs/architecture/traceability-matrix.md`:
- 26 out of 26 core functional requirements are 100% covered across System Components, Domain Entities, API Endpoints, Frontend Views, and Test Strategies. Zero requirements silently dropped.

---

## 28. Risk Register
Active Risk Register maintained in `docs/architecture/risk-register.md`:
- 12 critical risks identified, classified, and paired with active technical mitigations (AI hallucination, MNPI leakage, credential fraud, firewall interception, vendor lock-in).

---

## 29. Open Decisions
Only provider-level selections remain open for commercial negotiation:
- AI LLM provider commercial terms (Enterprise ZDR contract).
- Production transactional email tier (Resend vs AWS SES).
- Monetization billing engine (deferred to Phase 3).

---

## 30. Files Removed (Cleanup Summary)
In accordance with Section 33 of the Master Architecture Correction prompt, all duplicate, conflicting, and obsolete files were removed:
- Removed obsolete ADR duplicate files:
  - `docs/decisions/ADR-001-frontend-framework.md`
  - `docs/decisions/ADR-002-backend-framework.md`
  - `docs/decisions/ADR-003-primary-database.md`
  - `docs/decisions/ADR-004-search-and-vector-retrieval.md`
  - `docs/decisions/ADR-005-ai-llm-provider.md`
  - `docs/decisions/ADR-006-object-storage.md`
  - `docs/decisions/ADR-007-authentication-and-sessions.md`
  - `docs/decisions/ADR-008-calendar-and-scheduling.md`
  - `docs/decisions/ADR-009-realtime-and-event-messaging.md` (superseded by Socket.IO)
  - `docs/decisions/ADR-010-observability-and-monitoring.md`
- Removed duplicate technology evaluation files:
  - `docs/architecture/04-technology-evaluation.md`
  - `docs/architecture/05-final-technology-stack.md`
- Removed redundant database directory:
  - `apps/api/prisma` (consolidated into root `prisma/`)

---

## 31. Files Created & Reorganized
- **Root Prisma**: `prisma/schema.prisma`, `prisma/seed/seed.ts`
- **Shared Packages**: `packages/validation/`, `packages/config/`, `packages/ui/`, `packages/shared-types/`
- **Backend Architecture (`apps/api/src/`)**: 17 domain modules, infrastructure modules (`ai`, `database`, `email`, `observability`, `realtime`, `search`, `storage`), common filters, guards, interceptors, `app.module.ts`, `main.ts`
- **Frontend Architecture (`apps/web/`)**: Route groups (`(public)`, `(auth)`, `(firm)`, `(consultant)`, `(admin)`), `features/`, `components/`, `app/page.tsx`, `layout.tsx`, `globals.css`
- **13 Canonical ADRs**: `ADR-001-frontend.md` through `ADR-013-observability.md`
- **Complete Architecture Specifications**: 27 harmonized documents (`00` to `26`, `traceability-matrix`, `risk-register`, `architecture-audit`)
- **Product Documentation**: `user-roles.md`, `user-flows.md`, `feature-matrix.md`, `business-rules.md`, `non-functional-requirements.md`, `glossary.md`
- **CI & Tooling**: `.github/workflows/ci.yml`, `scripts/development/setup-dev.ps1`, `scripts/database/migrate-and-seed.ps1`

---

## 32. Validation Results
- Monorepo workspace configuration verified via `pnpm-workspace.yaml` and `turbo.json`.
- Zero duplicate or conflicting files.
- Realtime messaging protocol unified on WebSockets / Socket.IO.
- Zero secrets committed.

---

## 33. Final Architecture Audit
Comprehensive production readiness review conducted across all architecture dimensions:
- Architecture: Modular, clean dependency direction, API-first, mobile-ready.
- Database: Complete 21-entity domain coverage, normalized relational integrity, vector/trigram search indexing.
- AI: Grounded, confidence-aware, explainable, zero-hallucination guardrails.
- Security: RBAC, Argon2id, token family rotation, IDOR prevention, MNPI masking.
- Operations: Pino structured logging, Sentry APM, OpenTelemetry, containerized Docker deployments.

---

### PHASE 1 STATUS:
**PASS**

### READY FOR PHASE 2:
**YES**
