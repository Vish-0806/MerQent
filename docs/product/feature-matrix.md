# MerQent — Feature Matrix & Domain Scope

## 1. Domain Capability Breakdown

| Domain Module | Feature Scope | Target User | Priority | Implementation Status |
| :--- | :--- | :--- | :---: | :---: |
| **Identity & Access** | Dual-token JWT auth, Argon2id hashing, RBAC, session revocation | All | P0 | Architecture Complete |
| **Organizations** | PE Firm profile, portfolio management, member invites | PE Firms | P0 | Architecture Complete |
| **Consultants** | Structured profile, ERP matrices, deal history, availability, rates | Consultants | P0 | Architecture Complete |
| **PMI Taxonomies** | Controlled ERPs, Accounting, Deal Types, Integration Types, Tasks | All / Admins | P0 | Architecture Complete |
| **Projects** | Project posting, confidentiality aliases, timeline, budget, scope | PE Firms | P0 | Architecture Complete |
| **Search Engine** | Faceted filtering, trigram text search, vector semantic search | PE Firms | P0 | Architecture Complete |
| **AI Matching** | Two-stage hybrid scoring, explainable evidence generation | PE Firms | P0 | Architecture Complete |
| **Shortlisting** | Project-linked candidate folders, side-by-side comparison matrix | PE Firms | P1 | Architecture Complete |
| **Connections** | 5-state lifecycle (Pending, Accepted, Rejected, Withdrawn, Blocked) | PE / Consultants | P0 | Architecture Complete |
| **Messaging** | REST persistence + Socket.IO realtime delivery, read receipts | PE / Consultants | P0 | Architecture Complete |
| **Scheduling** | Provider-agnostic availability, meeting proposals, .ics generation | PE / Consultants | P1 | Architecture Complete |
| **Notifications** | In-app notification center, transactional email alerts | All | P1 | Architecture Complete |
| **Files & Documents** | MinIO/S3 object storage, presigned upload/download, virus scans | All | P1 | Architecture Complete |
| **Verification** | 4-tier verification, evidence upload, admin review workflow | Consultants / Admin | P0 | Architecture Complete |
| **Administration** | User moderation, taxonomy curation, AI quality audit, audit logs | Admins | P1 | Architecture Complete |
| **Analytics** | Firm funnel metrics, consultant engagement, match accuracy KPIs | All / Admins | P2 | Architecture Complete |
| **Audit & Security** | Immutable database audit logs, tamper-evident security logs | Admins | P0 | Architecture Complete |

---

## 2. Release Phasing
- **Phase 1 (Current)**: Master Architecture, Repository Structure, Data Contracts, Scaffolding, ADRs, Traceability.
- **Phase 2**: Core Implementation (Auth, Users, Organizations, Profiles, Taxonomies, Projects).
- **Phase 3**: Discovery & Intelligence (Search, Vector Pipeline, Grounded Hybrid AI Matching, Shortlists).
- **Phase 4**: Collaboration & Realtime (Connections, WebSockets / Socket.IO Messaging, Scheduling, Files, Notifications).
- **Phase 5**: Enterprise Trust, Verification & Operations (Verification review, Admin, Audit, E2E Testing, CI/CD, Production Readiness).
