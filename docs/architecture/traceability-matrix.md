# MerQent — Requirements Traceability Matrix

**Document Version:** 1.0.0  
**Status:** Approved Architecture  
**Phase:** 1 — Master Architectural Traceability  
**Author:** Lead Software Architect & Principal Engineer  

---

## 1. Traceability Overview

This matrix maps every confirmed product requirement from Phase 0 through its realization across System Components (Phase 1.1), Domain Entities (Phase 1.3), API Contracts (Phase 1.20), Frontend Views (Phase 1.8), and Testing Strategies (Phase 1.21).

### Status Legend:
- `COVERED`: Fully designed and architected in Phase 1 specifications.
- `OPEN DECISION`: Architectural hooks defined, commercial/policy decision tracked in `docs/product/open-questions.md`.
- `FUTURE REQUIREMENT`: Explicitly designed as a Phase 3+ extension.

---

## 2. Complete End-to-End Traceability Matrix

| Requirement ID & Summary | System Component | Primary Domain Entity | API Endpoint(s) | Frontend Capability | Verification / Test Strategy | Status |
|---|---|---|---|---|---|:---:|
| **FR-IAM-01:** Self-service registration & auth | `IdentityAccessService` | `User`, `RefreshToken` | `POST /auth/register`<br>`POST /auth/login` | `/(auth)/register`<br>`/(auth)/login` | Unit test validation schemas; E2E-01 & E2E-03 onboarding tests. | **COVERED** |
| **FR-IAM-02:** Multi-tenant RBAC | `IdentityAccessService` | `User`, `Role` | Global Auth Guards | Role-gated dashboard shell layouts | Security test: Privilege escalation & role boundary checks. | **COVERED** |
| **FR-IAM-05:** Multi-Factor Authentication | `IdentityAccessService` | `User.mfaSecret` | `POST /auth/mfa/setup`<br>`POST /auth/mfa/verify` | `/(dashboard)/settings/security` | Unit test TOTP RFC 6238 generation & verification. | **COVERED** |
| **FR-ORG-01:** PE Firm Profiles & Members | `FirmManagementService` | `Firm`, `FirmMember` | `GET/PATCH /firms/me`<br>`POST /firms/me/invitations` | `/(dashboard)/firm/team` | Integration tests with Testcontainers; E2E-03 firm onboarding. | **COVERED** |
| **FR-CON-01:** Consultant Profile & Availability | `ConsultantProfileService` | `ConsultantProfile` | `GET/PUT /consultant-profiles/me` | `/(dashboard)/consultant/profile/edit` | Zod schema unit tests; E2E-01 consultant onboarding. | **COVERED** |
| **FR-CON-02:** Granular PMI Taxonomy Tagging | `TaxonomyService` | `TaxonomyTerm`, `ConsultantTaxonomy`| `GET /taxonomies`<br>`GET /taxonomies/tree` | Taxonomy selection chips in profile editor | Integration test: M:N taxonomy associations & category filters. | **COVERED** |
| **FR-CON-03:** Past Case Studies & Engagements | `ConsultantProfileService` | `ConsultantExperience` | `POST /consultant-profiles/me/experiences` | Experience timeline in profile editor | Unit test: Start/End date invariants; E2E-01 case study submission. | **COVERED** |
| **FR-PRJ-01:** Project Creation & Scoping | `ProjectManagementService` | `Project`, `ProjectRequirement` | `POST /projects`<br>`PATCH /projects/:id` | `/(dashboard)/firm/projects/new` | Zod schema validation; E2E-04 project scoping test. | **COVERED** |
| **FR-PRJ-04:** Confidential Deal Masking | `ProjectManagementService` | `Project.confidentialNameMasked` | `GET /projects/marketplace` | Anonymized project marketplace cards | Security test: Asserts unmasked deal name hidden from unaccepted users. | **COVERED** |
| **FR-SCH-01:** Faceted Structured Discovery | `SearchDiscoveryService` | `ConsultantProfile`, `TaxonomyTerm` | `GET /search/consultants`<br>`GET /search/facets` | `/(dashboard)/firm/discovery` | Performance test: k6 faceted query benchmark (< 500ms); E2E-05. | **COVERED** |
| **FR-SCH-03:** Dense Vector Semantic Search | `SearchDiscoveryService` | `ConsultantProfile.embedding` | `GET /search/consultants?query=...` | Natural language search input | Integration test: `pgvector` HNSW cosine distance queries. | **COVERED** |
| **FR-MTCH-01:** AI Candidate Matching Engine | `MatchingEngineService` | `ProjectMatch` | `POST /matches/projects/:id/run`<br>`GET /matches/projects/:id` | `/(dashboard)/firm/projects/:id/matches` | Formula unit tests; BullMQ worker integration test; E2E-06. | **COVERED** |
| **FR-MTCH-02:** Grounded Match Explanations | `ExplanationGeneratorService` | `MatchExplanation`, `MatchEvidence` | `GET /matches/:id/explanation` | Interactive Explainable Match Card modal | AI Grounding Test Suite: Verifies 100% of claims cite `sourceEntityId`. | **COVERED** |
| **FR-MTCH-04:** Low-Confidence Review Flagging | `MatchingEngineService` | `ProjectMatch.isLowConfidence` | `GET /admin/ai/low-confidence` | `/(dashboard)/admin/ai-audit` | Unit test: Evaluates confidence formula $C < 60\%$ threshold gating. | **COVERED** |
| **FR-SHL-01:** Project Candidate Shortlisting | `ShortlistService` | `Shortlist`, `ShortlistItem` | `POST /shortlists/projects/:pId/items` | `/(dashboard)/firm/projects/:pId/shortlist`| Integration test: Shortlist isolation by `firmId`; E2E-07. | **COVERED** |
| **FR-SHL-02:** Side-by-Side Candidate Comparison| `ShortlistService` | `ShortlistItem`, `ConsultantProfile` | `GET /shortlists/projects/:pId/compare` | Multi-column candidate comparison table | Unit test: Comparison DTO normalization; E2E-07 comparison flow. | **COVERED** |
| **FR-CON-01:** Bilateral Connection Handshake | `ConnectionService` | `Connection` | `POST /connections`<br>`POST /connections/:id/accept` | `/(dashboard)/connections` | Invariant integration test: Status transitions; E2E-08 connection flow. | **COVERED** |
| **FR-MSG-01:** Secure In-Platform Messaging | `MessagingService` | `Conversation`, `Message` | `POST /conversations/:id/messages`<br>`GET /conversations/:id/messages` | `/(dashboard)/messaging/[id]` | Security test: Asserts connection `ACCEPTED` gating; E2E-09 chat test. | **COVERED** |
| **FR-MSG-02:** Secure Document Attachments | `MessagingService` | `MessageAttachment`, `FileRecord` | `POST /files/upload-url` | Chat file attachment uploader | Integration test: Signed download URL generation; E2E-09 file download. | **COVERED** |
| **FR-SCHED-01:** Meeting Proposal & Coordination | `SchedulingService` | `Meeting` | `POST /meetings/propose`<br>`POST /meetings/:id/confirm` | `/(dashboard)/scheduling` | Invariant test: Time slot conflict detection query; E2E-10 scheduling. | **COVERED** |
| **FR-SCHED-03:** Universal .ics Calendar Dispatch| `SchedulingService` | `Meeting.icsUid` | `GET /meetings/:id/ics` | "Add to Calendar" / Download .ics button | Unit test: RFC 5545 format compliance validator; E2E-10 .ics delivery. | **COVERED** |
| **FR-NTF-01:** Multi-Channel Alerts (SSE/Email) | `NotificationService` | `Notification`, `NotificationPreference`| `GET /events/stream`<br>`GET /notifications` | In-app notification toast & notification bell | Integration test: Redis Pub/Sub SSE fanout & Resend email dispatch. | **COVERED** |
| **FR-DOC-01:** Encrypted File Storage | `FileStorageService` | `FileRecord` | `POST /files/upload-url`<br>`GET /files/:id/download-url` | Resume and verification file uploaders | Security test: Signed URL TTL expiration (15m); ClamAV scanner tests. | **COVERED** |
| **FR-VER-01:** Progressive Multi-Tier Trust | `VerificationService` | `VerificationRequest`, `VerificationBadge`| `POST /verification/requests`<br>`GET /verification/status` | `/(dashboard)/consultant/verification` | Unit test: Tier requirements validation; E2E-02 verification flow. | **COVERED** |
| **FR-ADM-01:** Administrative Control Plane | `AdminControlPlaneService` | All Aggregates | `/api/v1/admin/*` | `/(dashboard)/admin/*` | RBAC test: AdminGuard & Separation of Duties enforcement. | **COVERED** |
| **FR-ADM-02:** Immutable System Audit Trail | `AdminControlPlaneService` | `AuditLog` | `GET /admin/audit-logs` | `/(dashboard)/admin/audit-logs` | Database test: PL/pgSQL trigger asserts update/delete exceptions. | **COVERED** |
| **OQ-01:** Platform Monetization & Invoicing | Architecture Placeholder | Billing Entity Stubs | `GET /billing/subscription` | `/(dashboard)/settings/billing` | Tracked in Open Questions log; modularly decoupled from Phase 1-2. | `OPEN DECISION` |
| **OQ-04:** Bidirectional Calendar OAuth Sync | `ICalendarSyncAdapter` | OAuth Token Vault | `/integrations/calendar/oauth` | Calendar integration settings | Architecture hooks designed in `ISchedulingService`; deferred to Phase 3. | `OPEN DECISION` |
| **Phase 3+:** Shared Project Workspaces | `ProjectWorkspaceService` | `Workspace`, `Milestone` | `/api/v2/workspaces/*` | Project execution deal room | Evaluated in Scalability Review; unblocked by current boundaries. | `FUTURE REQUIREMENT`|

---

## 3. Gap Analysis Summary
- **Total Functional Requirements Evaluated:** 26 core capabilities.
- **Fully Covered & Architected:** **26 / 26 (100%)**.
- **Partially Covered / Unaccounted For:** **0 (0%)**.
- **Deliberate Open Decisions:** 2 items (Monetization and External Calendar OAuth Sync), both decoupled from core MVP engineering.
