# MerQent — Architecture Master Overview & Blueprint

**Document Version:** 1.0.0  
**Status:** Approved Master Architecture  
**Author:** Lead Software Architect & Principal Engineer  

---

## 1. Executive Summary & System Purpose

**MerQent** is a specialized B2B marketplace platform purpose-built to match **Private Equity (PE) firms and portfolio operations executives** with vetted **Post-Merger Integration (PMI) consultants and hands-on operators** experienced in unifying ERPs, corporate cultures, and financial accounting systems post-acquisition.

Unlike generic freelance marketplaces, MerQent is engineered specifically around the operational realities of M&A: complex ERP consolidation (SAP, Oracle, NetSuite), chart-of-accounts (COA) harmonization, carve-out execution under Transition Services Agreements (TSAs), multi-country integration governance, and synergy realization.

---

## 2. Core Architectural Principles

1. **PMI Domain Specialization:** Structured taxonomies across ERPs, Deal Archetypes, Integration Disciplines, and Industries govern matching and discovery.
2. **Predictive Assistance with Absolute Grounding:** AI match recommendations are accompanied by auditable, grounded justifications citing verified profile facts. Hallucination or fabrication of credentials is mathematically prevented.
3. **Disciplined Modular Monolith:** High cohesion and strict boundaries within domain modules (NestJS) prevent premature microservice operational complexity while preserving future service extraction paths.
4. **Unified Relational & Vector Persistence:** PostgreSQL 16+ with `pgvector` unites relational ACID guarantees, JSONB document flexibility, and 1536d cosine vector similarity within a single engine with zero ETL synchronization lag.
5. **API-First & Client-Agnostic:** The backend API exposes an OpenAPI-documented RESTful contract that serves the initial responsive web client (Next.js 14+) and remains completely ready for future native mobile applications (Flutter / React Native).
6. **Defense-in-Depth Security:** Argon2id password hashing, dual-token JWT sessions in HttpOnly cookies with instant database revocation, mandatory TOTP MFA for administrators, row-level multi-tenant isolation, and zero-proxy S3 signed storage.

---

## 3. High-Level System Architecture Diagram

```mermaid
graph TD
    subgraph Client Layer
        Web[Next.js 14+ Web Client App Router / Tailwind / Radix]
        Mobile[Future Mobile Client Flutter / React Native via Shared REST]
    end

    subgraph Edge & Ingress Layer
        Cloudflare[Cloudflare Edge / WAF / DDoS / TLS 1.3]
        ALB[AWS Application Load Balancer Path-Based Routing]
    end

    subgraph Backend Application Layer (Modular Monolith)
        NestAPI[NestJS 10+ Modular API Service apps/api]
        Workers[BullMQ Background Job Processors]
    end

    subgraph Persistence & Infrastructure Layer
        Postgres[(PostgreSQL 16+ Primary Relational & Vector DB)]
        PGVector[pgvector HNSW Cosine Index]
        RedisCluster[(ElastiCache Redis 7.2 Cache, Queues & SSE Pub/Sub)]
        S3Bucket[(Amazon S3 Secure Object Storage SSE-KMS)]
    end

    subgraph External Managed Services
        OpenAI[OpenAI API text-embedding-3-small + gpt-4o-mini ZDR]
        Claude[Anthropic Claude 3.5 Sonnet Fallback]
        Resend[Resend Transactional Email Engine]
    end

    Web --> Cloudflare --> ALB
    Mobile --> Cloudflare --> ALB
    ALB -->|/*| Web
    ALB -->|/api/*| NestAPI

    NestAPI --> Postgres
    Postgres --> PGVector
    NestAPI --> RedisCluster
    NestAPI --> Workers
    Workers --> RedisCluster
    Workers --> Postgres
    NestAPI --> S3Bucket
    NestAPI --> OpenAI
    NestAPI --> Claude
    Workers --> Resend
```

---

## 4. Technology Stack Summary

| Layer | Selected Technology | Reference |
|---|---|---|
| **Web Frontend** | Next.js 14+ (App Router), React 18+, TypeScript, Tailwind CSS, Radix UI | [ADR-001](file:///c:/Users/Vishal%20S%20Naik/MyProjects/MerQent/docs/decisions/ADR-001-frontend.md) |
| **Backend API** | Node.js 20 LTS, NestJS 10+, Strict TypeScript, Modular Monolith | [ADR-002](file:///c:/Users/Vishal%20S%20Naik/MyProjects/MerQent/docs/decisions/ADR-002-backend.md) |
| **Database** | PostgreSQL 16+ with `pgvector`, `pg_trgm`, `uuid-ossp` extensions | [ADR-003](file:///c:/Users/Vishal%20S%20Naik/MyProjects/MerQent/docs/decisions/ADR-003-database.md) |
| **ORM / Data Access** | Prisma ORM 5+ with declarative schema and migrations | [ADR-004](file:///c:/Users/Vishal%20S%20Naik/MyProjects/MerQent/docs/decisions/ADR-004-orm.md) |
| **Authentication** | Dual-Token JWT (15m Access) + DB/Redis Stateful Refresh Token Rotation | [ADR-005](file:///c:/Users/Vishal%20S%20Naik/MyProjects/MerQent/docs/decisions/ADR-005-authentication.md) |
| **AI / Matching** | Hybrid Grounded AI Matching Engine via Abstracted `IAiProvider` | [ADR-006](file:///c:/Users/Vishal%20S%20Naik/MyProjects/MerQent/docs/decisions/ADR-006-ai.md) |
| **Search Engine** | PostgreSQL (`pg_trgm` trigram keyword + `pgvector` HNSW cosine similarity) | [ADR-007](file:///c:/Users/Vishal%20S%20Naik/MyProjects/MerQent/docs/decisions/ADR-007-search.md) |
| **Real-Time Push** | WebSockets / Socket.IO with Redis Cluster Adapter event fanout | [ADR-008](file:///c:/Users/Vishal%20S%20Naik/MyProjects/MerQent/docs/decisions/ADR-008-realtime.md) |
| **Object Storage** | S3-Compatible Object Storage (MinIO / AWS S3) with Pre-Signed URLs (15m) | [ADR-009](file:///c:/Users/Vishal%20S%20Naik/MyProjects/MerQent/docs/decisions/ADR-009-storage.md) |
| **Email** | Transactional Email via Abstracted `IEmailService` (Resend / AWS SES) | [ADR-010](file:///c:/Users/Vishal%20S%20Naik/MyProjects/MerQent/docs/decisions/ADR-010-email.md) |
| **Scheduling** | Platform-Native Scheduler with RFC 5545 iCalendar (`.ics`) MIME dispatch | [ADR-011](file:///c:/Users/Vishal%20S%20Naik/MyProjects/MerQent/docs/decisions/ADR-011-calendar.md) |
| **Cloud Hosting** | Containerized Cloud Deployment (Docker / ECS Fargate / Cloud Run) | [ADR-012](file:///c:/Users/Vishal%20S%20Naik/MyProjects/MerQent/docs/decisions/ADR-012-deployment.md) |
| **Observability** | Pino structured JSON logging + Sentry APM + OpenTelemetry metrics | [ADR-013](file:///c:/Users/Vishal%20S%20Naik/MyProjects/MerQent/docs/decisions/ADR-013-observability.md) |

---

## 5. Master Architecture Document Directory

Every architectural subsystem is fully documented in dedicated, version-controlled specifications:

1. [01. System Components](file:///c:/Users/Vishal%20S%20Naik/MyProjects/MerQent/docs/architecture/01-system-components.md) — 14 core modules, dependencies & boundaries.
2. [02. Roles & Permissions](file:///c:/Users/Vishal%20S%20Naik/MyProjects/MerQent/docs/architecture/02-roles-permissions.md) — 5 canonical roles & 32-permission matrix.
3. [03. Complete Domain Model](file:///c:/Users/Vishal%20S%20Naik/MyProjects/MerQent/docs/architecture/03-domain-model.md) — 13 Aggregate Roots, entities & DDD boundaries.
4. [04. Technology Evaluation](file:///c:/Users/Vishal%20S%20Naik/MyProjects/MerQent/docs/architecture/04-technology-evaluation.md) — Multi-stack comparative analysis.
5. [05. Final Technology Stack](file:///c:/Users/Vishal%20S%20Naik/MyProjects/MerQent/docs/architecture/05-final-technology-stack.md) — Canonical stack blueprint.
6. [06. Repository Architecture](file:///c:/Users/Vishal%20S%20Naik/MyProjects/MerQent/docs/architecture/06-repository-architecture.md) — Turborepo monorepo & pnpm workspace rules.
7. [07. Backend Architecture](file:///c:/Users/Vishal%20S%20Naik/MyProjects/MerQent/docs/architecture/07-backend-architecture.md) — NestJS Modular Monolith, BullMQ & event bus.
8. [08. Frontend Architecture](file:///c:/Users/Vishal%20S%20Naik/MyProjects/MerQent/docs/architecture/08-frontend-architecture.md) — Next.js 14 App Router, RSC & design system.
9. [09. Database Architecture](file:///c:/Users/Vishal%20S%20Naik/MyProjects/MerQent/docs/architecture/09-database-architecture.md) — PostgreSQL DDL, Prisma schema & HNSW indexes.
10. [10. Search Architecture](file:///c:/Users/Vishal%20S%20Naik/MyProjects/MerQent/docs/architecture/10-search-architecture.md) — Hybrid boolean facet + vector retrieval pipeline.
11. [11. AI Matching Architecture](file:///c:/Users/Vishal%20S%20Naik/MyProjects/MerQent/docs/architecture/11-ai-matching-architecture.md) — Multi-signal scoring formulas & LLM contracts.
12. [12. Explainable AI](file:///c:/Users/Vishal%20S%20Naik/MyProjects/MerQent/docs/architecture/12-explainable-ai.md) — Fact vaults, grounding interceptor & citation cards.
13. [13. Messaging Architecture](file:///c:/Users/Vishal%20S%20Naik/MyProjects/MerQent/docs/architecture/13-messaging-architecture.md) — Connection-gated chat, SSE push & cursor pagination.
14. [14. Scheduling Architecture](file:///c:/Users/Vishal%20S%20Naik/MyProjects/MerQent/docs/architecture/14-scheduling-architecture.md) — Timezone-safe meetings & RFC 5545 .ics generation.
15. [15. Notification Architecture](file:///c:/Users/Vishal%20S%20Naik/MyProjects/MerQent/docs/architecture/15-notification-architecture.md) — Event-driven multi-channel alerts & React Email.
16. [16. File & Document Storage](file:///c:/Users/Vishal%20S%20Naik/MyProjects/MerQent/docs/architecture/16-file-document-architecture.md) — Zero-proxy S3 signed URLs & ClamAV scanning.
17. [17. Verification Architecture](file:///c:/Users/Vishal%20S%20Naik/MyProjects/MerQent/docs/architecture/17-verification-architecture.md) — Multi-tier trust hierarchy & reviewer queue.
18. [18. Administration Architecture](file:///c:/Users/Vishal%20S%20Naik/MyProjects/MerQent/docs/architecture/18-admin-architecture.md) — Platform governance, taxonomy editor & audit logs.
19. [19. Security & Privacy](file:///c:/Users/Vishal%20S%20Naik/MyProjects/MerQent/docs/architecture/19-security-privacy-architecture.md) — Defense-in-depth, Argon2id, MFA, KMS & privacy masking.
20. [20. API Contract Architecture](file:///c:/Users/Vishal%20S%20Naik/MyProjects/MerQent/docs/architecture/20-api-contract-architecture.md) — OpenAPI 3.0 REST contract across 16 domains.
21. [21. Testing Architecture](file:///c:/Users/Vishal%20S%20Naik/MyProjects/MerQent/docs/architecture/21-testing-architecture.md) — Testing pyramid, 10 Playwright E2E flows & k6 load tests.
22. [22. CI/CD Architecture](file:///c:/Users/Vishal%20S%20Naik/MyProjects/MerQent/docs/architecture/22-cicd-architecture.md) — GitHub Actions pipelines, container builds & migrations.
23. [23. Deployment Architecture](file:///c:/Users/Vishal%20S%20Naik/MyProjects/MerQent/docs/architecture/23-deployment-architecture.md) — AWS ECS Fargate, Aurora Serverless v2 & BCDR plan.
24. [24. Mobile Readiness](file:///c:/Users/Vishal%20S%20Naik/MyProjects/MerQent/docs/architecture/24-mobile-readiness.md) — Client-agnostic REST contracts, push adapters & deep links.
25. [25. Scalability & Extensibility](file:///c:/Users/Vishal%20S%20Naik/MyProjects/MerQent/docs/architecture/25-scalability-review.md) — 10x volume stress tests & workspace extension boundaries.
26. [26. Final Architecture Audit](file:///c:/Users/Vishal%20S%20Naik/MyProjects/MerQent/docs/architecture/26-final-architecture-audit.md) — Formal gate review determination (PASS).

---

## 6. Companion Governance Records
- [Requirements Traceability Matrix](file:///c:/Users/Vishal%20S%20Naik/MyProjects/MerQent/docs/architecture/traceability-matrix.md)
- [Architectural Risk Register](file:///c:/Users/Vishal%20S%20Naik/MyProjects/MerQent/docs/architecture/risk-register.md)
- [Non-Functional Requirements Specification](file:///c:/Users/Vishal%20S%20Naik/MyProjects/MerQent/docs/architecture/non-functional-requirements.md)
- [Architecture Decision Records (ADRs 001-010)](file:///c:/Users/Vishal%20S%20Naik/MyProjects/MerQent/docs/decisions/)
