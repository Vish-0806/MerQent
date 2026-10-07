# MerQent — System Component Architecture

**Document Version:** 1.0.0  
**Status:** Approved Architecture  
**Phase:** 1.1 — Requirements → System Components  
**Author:** Lead Software Architect & Principal Engineer  

---

## 1. Architectural Philosophy & Component Boundaries

The MerQent platform is designed as a **Modular Monolith** with clear domain boundaries, strict dependency rules, and asynchronous event decoupling where appropriate. Each system component corresponds to an autonomous domain service with explicit inputs, outputs, invariants, data ownership, and interface contracts. This ensures high cohesion within modules, low coupling across domains, and a smooth future extraction path into microservices if transaction volume demands it.

```mermaid
graph TD
    subgraph Client Layer
        Web[Web Client - Responsive Next.js]
        Mobile[Future Mobile Client]
    end

    subgraph API Gateway / Edge
        Gateway[API Gateway / Auth Middleware / Rate Limiter]
    end

    subgraph Core Domain Components
        IAM[Identity & Access Component]
        OrgComp[Organization & Firm Component]
        ProfComp[Consultant Profile & Taxonomy Component]
        PrjComp[Project Management Component]
        SearchComp[Search & Discovery Component]
        MatchComp[AI Matching Engine]
        ShortlistComp[Shortlist & Comparison Component]
        ConnComp[Connection Manager]
        MsgComp[Messaging Component]
        SchedComp[Scheduling & Calendar Component]
        NotifComp[Notification Engine]
        FileComp[Document & File Storage Component]
        VerifComp[Verification Engine]
        AdminComp[Admin & Audit Control Plane]
    end

    subgraph Event & Storage Infrastructure
        DB[(Relational DB / Vector DB)]
        Storage[(Object Storage S3/GCS)]
        EventBus[In-Memory / Redis Event Bus]
    end

    Web --> Gateway
    Mobile --> Gateway
    Gateway --> IAM
    Gateway --> OrgComp
    Gateway --> ProfComp
    Gateway --> PrjComp
    Gateway --> SearchComp
    Gateway --> MatchComp
    Gateway --> ShortlistComp
    Gateway --> ConnComp
    Gateway --> MsgComp
    Gateway --> SchedComp
    Gateway --> NotifComp
    Gateway --> FileComp
    Gateway --> VerifComp
    Gateway --> AdminComp

    MatchComp --> ProfComp
    MatchComp --> PrjComp
    ConnComp --> NotifComp
    MsgComp --> ConnComp
    MsgComp --> FileComp
    VerifComp --> FileComp
    VerifComp --> NotifComp
    AdminComp --> IAM
    AdminComp --> VerifComp
    AdminComp --> ProfComp

    Core Domain Components --> DB
    FileComp --> Storage
    Core Domain Components --> EventBus
```

---

## 2. Complete System Component Registry

Below is the definitive component decomposition mapping business capabilities to software modules.

---

### 2.1 Identity & Access Management (IAM Component)
- **Requirement Reference:** FR-IAM-01 to FR-IAM-05
- **Business Capability:** User authentication, authorization, session management, RBAC enforcement, credential security.
- **System Component:** `IdentityAccessService`
- **Responsibility:** Issue/verify JWTs, validate refresh tokens, hash credentials, enforce MFA challenges, verify password reset tokens, evaluate role-based and ownership policies.
- **Dependencies:** Database (User, Credential, RefreshToken tables), Cryptographic library (Argon2id, Jose/jsonwebtoken), Email Service (for verification/reset).
- **Inputs:** Login credentials, registration payloads, refresh tokens, TOTP tokens.
- **Outputs:** Authenticated user claims, access tokens, refresh tokens, auth error codes.
- **Ownership:** Owns `User`, `AccountCredential`, `SessionToken`, `Role`, `UserRole` tables.
- **Boundaries:** Does not manage profile domain logic (firms or consultants). Only handles authentication identity and authorization claims.
- **Classification:** `PRODUCT REQUIREMENT`

---

### 2.2 Organization & Firm Management (Firm Component)
- **Requirement Reference:** FR-ORG-01 to FR-ORG-03
- **Business Capability:** PE firm entity modeling, portfolio operational team management, institutional profile maintenance.
- **System Component:** `FirmManagementService`
- **Responsibility:** Create/maintain firm records, manage firm membership (invitations, role assignments within firm), enforce organizational tenancy.
- **Dependencies:** IAM Component (to link users to firm entities).
- **Inputs:** Firm registration parameters, membership invitation requests, organization profile updates.
- **Outputs:** Firm details, organizational membership roster, authorization context.
- **Ownership:** Owns `Firm`, `FirmMember`, `FirmInvitation` entities.
- **Boundaries:** Does not own individual consultant records or specific project execution data (projects reference firm as parent).
- **Classification:** `PRODUCT REQUIREMENT`

---

### 2.3 Consultant Profile & Taxonomy Component
- **Requirement Reference:** FR-CON-01 to FR-CON-04
- **Business Capability:** Professional credentialing, PMI specialization cataloging, past integration history, availability management.
- **System Component:** `ConsultantProfileService`
- **Responsibility:** Manage consultant profile lifecycle, link structured PMI taxonomy tags (ERPs, COA systems, deal types, industries), record detailed past project case studies, track availability status.
- **Dependencies:** IAM Component (user linkage), Taxonomy Registry, File Component (resumes, certifications).
- **Inputs:** Profile updates, experience records, taxonomy tag associations, availability updates.
- **Outputs:** Structured consultant profile DTO, public/anonymized profile views, search indexing events.
- **Ownership:** Owns `ConsultantProfile`, `ConsultantExperience`, `ConsultantSkill`, `Taxonomy*` tables.
- **Boundaries:** Does not determine match scores or perform verification decisions (only stores the resulting verification status).
- **Classification:** `PRODUCT REQUIREMENT`

---

### 2.4 PMI Project Management Component
- **Requirement Reference:** FR-PRJ-01 to FR-PRJ-04
- **Business Capability:** M&A deal integration scoping, portfolio company requirement definition, project lifecycle governance.
- **System Component:** `ProjectManagementService`
- **Responsibility:** Create, update, transition, and archive PMI projects; capture structured requirements (ERP source/target, deal archetype, timeline, budget, operator seniority); manage confidentiality masking.
- **Dependencies:** Firm Component, IAM Component, Taxonomy Registry.
- **Inputs:** Project creation/update payloads, status transition commands.
- **Outputs:** Project specification DTOs, project lifecycle events (`ProjectPublished`, `ProjectClosed`).
- **Ownership:** Owns `Project`, `ProjectRequirement`, `ProjectTaxonomyAssociation` entities.
- **Boundaries:** Does not store shortlisted candidates or manage connections directly.
- **Classification:** `PRODUCT REQUIREMENT`

---

### 2.5 Search & Discovery Component
- **Requirement Reference:** FR-SCH-01 to FR-SCH-03
- **Business Capability:** High-precision, faceted consultant discovery; keyword and semantic search.
- **System Component:** `SearchDiscoveryService`
- **Responsibility:** Ingest consultant profile documents into search indexes; execute multi-dimensional structured queries (ERP + Industry + Deal Type + Availability); execute semantic text search over candidate bios.
- **Dependencies:** Database (read replicas or search index), Consultant Profile Component (event updates).
- **Inputs:** Search query criteria, facet filters, pagination, sort keys.
- **Outputs:** Paginated consultant candidate summaries, facet counts, hit highlights.
- **Ownership:** Owns search query abstractions and index schemas. Read-only consumer of profile data.
- **Boundaries:** Returns matching candidates based on explicit query parameters; does not perform multi-variable project fit scoring (handled by Matching Component).
- **Classification:** `PRODUCT REQUIREMENT`

---

### 2.6 AI Matching Engine & Grounded Explainer
- **Requirement Reference:** FR-MTCH-01 to FR-MTCH-04
- **Business Capability:** Automated project-to-consultant relevance scoring, grounded rationale generation, anti-hallucination validation.
- **System Component:** `MatchingEngineService` & `ExplanationGeneratorService`
- **Responsibility:**
  1. Retrieve candidate pool via structured filtering and semantic similarity.
  2. Compute composite match score based on deterministic rules and semantic embedding similarity.
  3. Synthesize grounded match explanations referencing actual consultant profile attributes.
  4. Validate explanation assertions against profile ground truth (anti-hallucination filter).
  5. Assign match confidence rating; flag low-confidence outputs.
- **Dependencies:** Project Management Component, Consultant Profile Component, LLM/Embedding API Provider, Vector Store.
- **Inputs:** Project ID, matching parameters, weight configurations.
- **Outputs:** Ranked candidate list, match scores (0-100), structured explainability cards (`MatchExplanation`), confidence tags.
- **Ownership:** Owns `ProjectMatch`, `MatchExplanation`, `MatchEvidence` entities.
- **Boundaries:** Read-only access to Project and Consultant data. Cannot alter consultant profiles or project specs.
- **Classification:** `PRODUCT REQUIREMENT`

---

### 2.7 Shortlist & Candidate Comparison Component
- **Requirement Reference:** FR-SHL-01 to FR-SHL-02
- **Business Capability:** Evaluation workspace for PE teams to compare candidate capabilities side-by-side.
- **System Component:** `ShortlistService`
- **Responsibility:** Manage project-specific candidate shortlists, capture private notes/ratings from PE reviewers, compute feature comparison matrices.
- **Dependencies:** Project Component, Consultant Profile Component, Firm Component.
- **Inputs:** Shortlist candidate additions/removals, private evaluation notes, comparison requests.
- **Outputs:** Shortlist collection, structured side-by-side comparison DTO.
- **Ownership:** Owns `Shortlist`, `ShortlistItem`, `ShortlistNote` entities.
- **Boundaries:** Isolated to PE firm review space; consultants have zero visibility into PE shortlists or private notes.
- **Classification:** `PRODUCT REQUIREMENT`

---

### 2.8 Connection Management Component
- **Requirement Reference:** FR-CON-01 to FR-CON-03
- **Business Capability:** Controlled engagement handshake, bilateral agreement to connect, communication gating.
- **System Component:** `ConnectionService`
- **Responsibility:** Create connection requests from PE firm to consultant (tied to a specific project); manage state transitions (`PENDING`, `ACCEPTED`, `DECLINED`, `CANCELED`); enforce access gating for messaging and scheduling.
- **Dependencies:** Project Component, Consultant Profile Component, Notification Engine.
- **Inputs:** Connection request dispatch, accept/decline action commands.
- **Outputs:** Connection state DTO, connection status events (`ConnectionAccepted`, `ConnectionDeclined`).
- **Ownership:** Owns `ConnectionRequest`, `Connection` entities.
- **Boundaries:** Serves as the security gate for downstream collaboration (Messaging, Scheduling).
- **Classification:** `PRODUCT REQUIREMENT`

---

### 2.9 Secure Messaging Component
- **Requirement Reference:** FR-MSG-01 to FR-MSG-03
- **Business Capability:** Encrypted, private 1-on-1 and team communication post-connection.
- **System Component:** `MessagingService`
- **Responsibility:** Create conversation channels upon connection acceptance; persist and serialize messages; track read receipts; manage message attachments; deliver real-time message events.
- **Dependencies:** Connection Component (authorization check), File Storage Component (attachments), Notification Engine (offline alerts).
- **Inputs:** Send message payload, read receipt updates, attachment uploads.
- **Outputs:** Paginated message threads, conversation metadata, unread counts, WebSocket/SSE events.
- **Ownership:** Owns `Conversation`, `ConversationParticipant`, `Message`, `MessageAttachment` entities.
- **Boundaries:** strictly rejects any message transmission if the parent connection is not in `ACCEPTED` state.
- **Classification:** `PRODUCT REQUIREMENT`

---

### 2.10 Scheduling & Coordination Component
- **Requirement Reference:** FR-SCHED-01 to FR-SCHED-03
- **Business Capability:** Meeting proposal, slot negotiation, timezone reconciliation, calendar invitation dispatch.
- **System Component:** `SchedulingService`
- **Responsibility:** Record available slots; handle meeting invitations between connected parties; validate conflict-free times; dispatch standard iCalendar (.ics) files; trigger reminders.
- **Dependencies:** Connection Component, Notification Engine.
- **Inputs:** Meeting proposal payloads (start/end UTC, agenda, duration), accept/reschedule/cancel commands.
- **Outputs:** Meeting status DTO, .ics file payloads, meeting lifecycle events (`MeetingConfirmed`, `MeetingCanceled`).
- **Ownership:** Owns `Meeting`, `MeetingParticipant`, `MeetingSlot` entities.
- **Boundaries:** Coordinates meeting times and dispatch; external calendar OAuth sync is decoupled via adapters.
- **Classification:** `PRODUCT REQUIREMENT`

---

### 2.11 Notification Engine
- **Requirement Reference:** FR-NTF-01 to FR-NTF-02
- **Business Capability:** Multi-channel alerting (in-app alerts, transactional emails) with preference controls.
- **System Component:** `NotificationService`
- **Responsibility:** Ingest domain events (`NewMatch`, `ConnectionRequested`, `MessageReceived`, `MeetingProposed`); evaluate user delivery preferences; persist in-app notification records; dispatch transactional emails via email adapter; handle delivery retries.
- **Dependencies:** Event Bus / Message Broker, Email Provider Adapter (e.g., Resend / AWS SES).
- **Inputs:** Domain events, user preference configuration payloads, mark-as-read commands.
- **Outputs:** In-app notification feeds, rendered email messages, delivery status logs.
- **Ownership:** Owns `Notification`, `NotificationPreference` entities.
- **Boundaries:** Pure consumer of domain events; does not alter business states in other domains.
- **Classification:** `PRODUCT REQUIREMENT`

---

### 2.12 File & Document Storage Component
- **Requirement Reference:** FR-DOC-01 to FR-DOC-03
- **Business Capability:** Secure storage, virus scanning, and authorized distribution of resumes, briefs, evidence, and attachments.
- **System Component:** `DocumentStorageService`
- **Responsibility:** Generate pre-signed upload URLs with strict MIME-type and size constraints; track file metadata; perform virus/malware verification; issue short-lived signed download URLs after checking domain authorization.
- **Dependencies:** Cloud Object Storage (S3 / GCS), Antivirus scanner / validation pipeline.
- **Inputs:** Pre-signed upload URL requests, download authorization queries, file deletion requests.
- **Outputs:** Pre-signed S3/GCS URLs, file metadata DTOs, scan verification statuses.
- **Ownership:** Owns `FileRecord`, `FileAccessLog` entities.
- **Boundaries:** Does not interpret business semantics of file contents (e.g., does not evaluate if a resume is valid; only handles secure byte storage and access control).
- **Classification:** `PRODUCT REQUIREMENT`

---

### 2.13 Trust & Verification Engine
- **Requirement Reference:** FR-VER-01 to FR-VER-02
- **Business Capability:** Vetting pipeline for consultant credentials, identity proofing, reference checks, and badge tiering.
- **System Component:** `VerificationService`
- **Responsibility:** Ingest verification requests and supporting evidence; manage reviewer queue for administrative staff; record verification decisions (approve, reject, request additional info); compute verified badge tier; manage verification expiry.
- **Dependencies:** Consultant Profile Component, File Storage Component, Admin Component, Notification Engine.
- **Inputs:** Verification submission payloads, administrative review decisions.
- **Outputs:** Verification status records, consultant badge tier updates, reviewer audit trail.
- **Ownership:** Owns `VerificationRequest`, `VerificationEvidence`, `VerificationReviewNote`, `VerificationBadge` entities.
- **Boundaries:** Enforces trust workflow; does not modify profile text directly.
- **Classification:** `PRODUCT REQUIREMENT`

---

### 2.14 Administration & Audit Control Plane
- **Requirement Reference:** FR-ADM-01 to FR-ADM-03
- **Business Capability:** System governance, taxonomy curation, user moderation, AI match audit, security compliance tracking.
- **System Component:** `AdminControlPlaneService`
- **Responsibility:** Provide privileged interfaces for system operators; manage taxonomy entities; inspect low-confidence AI matches; moderate suspended users/firms; produce tamper-evident audit logs of sensitive operations.
- **Dependencies:** All Core Components (via internal service interfaces or read models).
- **Inputs:** Admin review actions, taxonomy CRUD commands, audit search queries.
- **Outputs:** Admin metrics, audit reports, taxonomy configuration updates.
- **Ownership:** Owns `AuditLog`, `SystemConfig`, `AdminReviewItem` entities.
- **Boundaries:** Operates strictly under `ROLE_ADMIN`; isolated from standard B2B user workflows.
- **Classification:** `PRODUCT REQUIREMENT`

---

### 2.15 Future Collaboration & Workspace Component (Phase 3+ Boundary)
- **Requirement Reference:** Future Roadmap (Section 9 Product Definition)
- **Business Capability:** Shared project workspace, PMI integration checklists, milestone tracking, deal room repositories.
- **System Component:** `ProjectWorkspaceService` (Architectural Placeholder)
- **Responsibility:** Provide post-hire execution spaces for PE sponsors and hired operators.
- **Dependencies:** Project Management, Messaging, Document Storage, Connection Component.
- **Classification:** `TECHNICAL RECOMMENDATION` / `FUTURE EXTENSION` (Clean architectural boundary preserved; zero blocking of Phase 1 or 2).

---

## 3. Component Inter-Dependency Matrix

The table below defines allowed direct service dependencies to prevent circular references:

| Component | Allowed Direct Dependencies | Prohibited Direct Dependencies |
|---|---|---|
| **IAM** | Database, Email Provider | Firm, Project, Consultant, Messaging |
| **Firm** | IAM, Database | Messaging, Scheduling, Matching |
| **Consultant** | IAM, Database, Taxonomy, File | Matching, Shortlist, Connection |
| **Project** | IAM, Firm, Database, Taxonomy | Matching, Consultant Profile, Messaging |
| **Search** | Consultant Profile (Read-only), Project (Read-only) | Messaging, Scheduling, Verification |
| **AI Matching** | Project, Consultant Profile, Taxonomy, LLM Client | Messaging, Scheduling, Firm Direct |
| **Shortlist** | Project, Consultant Profile, Database | Messaging, Scheduling |
| **Connection** | Project, Consultant Profile, Notification | Messaging internals, AI Engine |
| **Messaging** | Connection, File, Notification, Database | Matching, Taxonomy, Verification |
| **Scheduling** | Connection, Notification, Database | Matching, Search, File |
| **Notification** | Event Bus, Email Adapter, Database | Business domain internals |
| **File Storage** | Object Storage Client, Database | Domain business logic |
| **Verification** | Consultant Profile, File, Notification, Database | Messaging, Scheduling, Shortlist |
| **Admin Plane** | All Components (via interfaces), Database | None (Supervisory boundary) |

---

## 4. Architectural Invariants
1. **No Circular Invocations:** Component dependencies flow strictly downwards or decouple via the asynchronous event bus.
2. **Access Gating Invariant:** Neither `MessagingService` nor `SchedulingService` may instantiate an active interaction unless `ConnectionService.isAccepted(firmId, consultantId, projectId)` returns `true`.
3. **Data Isolation Invariant:** Multi-tenant PE data (projects, shortlists, private notes) is strictly isolated by `FirmId` and never exposed across firm boundaries.
