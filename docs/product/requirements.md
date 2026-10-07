# MerQent — System Requirements Specification

**Document Version:** 1.0.0  
**Status:** Canonical Baseline  
**Classification:** Functional & System Requirements  

---

## 1. Functional Requirements (FR)

### 1.1 Identity & Access Management (IAM)
- **FR-IAM-01 [PRODUCT REQUIREMENT]:** The platform must support self-service registration and authentication for PE Firm Users and Consultants/Operators.
- **FR-IAM-02 [PRODUCT REQUIREMENT]:** The platform must enforce Role-Based Access Control (RBAC) distinguishing between PE Firm Users, Consultants/Operators, and Administrators.
- **FR-IAM-03 [TECHNICAL RECOMMENDATION]:** All sessions must use secure, cryptographically signed, expiring JSON Web Tokens (JWT) stored in HTTP-only, SameSite Secure cookies, paired with database-backed refresh tokens capable of global revocation.
- **FR-IAM-04 [TECHNICAL RECOMMENDATION]:** Password authentication must enforce minimum complexity (12+ characters, mixed case, numbers, symbols) hashed with Argon2id or bcrypt (cost factor >= 12).
- **FR-IAM-05 [TECHNICAL RECOMMENDATION]:** Multi-Factor Authentication (TOTP via Authenticator Apps) must be architected into the authentication flow and required for all administrative roles.

### 1.2 Organization & Firm Management
- **FR-ORG-01 [PRODUCT REQUIREMENT]:** PE firms must have dedicated organizational profiles containing firm name, headquarters, AUM tier, portfolio focus sectors, and authorized team members.
- **FR-ORG-02 [PRODUCT REQUIREMENT]:** Multiple PE users must be able to belong to a single PE Firm organization with workspace-level project visibility.
- **FR-ORG-03 [TECHNICAL RECOMMENDATION]:** Firm profiles must support an internal role hierarchy (e.g., Firm Admin, Firm Member) to regulate project creation and billing/admin access.

### 1.3 Consultant & Operator Profiles
- **FR-CON-01 [PRODUCT REQUIREMENT]:** Consultants must create structured profiles containing professional summary, years of experience, primary roles (Consultant vs. Hands-on Operator), and current availability status.
- **FR-CON-02 [PRODUCT REQUIREMENT]:** Profiles must capture granular PMI experience across structured taxonomies:
  - Enterprise ERPs (SAP S/4HANA, ECC, Oracle Fusion, NetSuite, Dynamics 365, etc.)
  - Accounting & Financial systems (Hyperion, OneStream, BlackLine, COA alignment)
  - Industries (Manufacturing, Healthcare, SaaS, Consumer Retail, Financial Services)
  - Deal Archetypes (Carve-out, Add-on, Platform Integration, Turnaround)
  - Integration Disciplines (IT/Infrastructure, HR/Culture, Supply Chain, Commercial)
- **FR-CON-03 [PRODUCT REQUIREMENT]:** Consultants must be able to list specific past integration engagements, detailing their role, systems unified, deal context (anonymized where NDA requires), and duration.
- **FR-CON-04 [PRODUCT REQUIREMENT]:** Consultants must be able to submit professional certifications (e.g., PMP, SAP Certified Integration Associate, CPA) and professional references for verification.

### 1.4 PMI Project Lifecycle
- **FR-PRJ-01 [PRODUCT REQUIREMENT]:** PE firm users must be able to create, update, archive, and close PMI project records.
- **FR-PRJ-02 [PRODUCT REQUIREMENT]:** Projects must capture structured requirements:
  - Target Portfolio Company Industry & Geography
  - Deal Type (Carve-out, Tuck-in, etc.)
  - Systems to be unified (Source ERP/Accounting → Target ERP/Accounting)
  - Specific PMI workstreams (COA harmonization, TSA wind-down, supply chain unification)
  - Engagement Timeline, Target Start Date, and Estimated Duration
  - Operator Profile Preference (Strategic Consultant vs. Hands-on Technical Operator)
- **FR-PRJ-03 [PRODUCT REQUIREMENT]:** Projects must support visibility states: `Draft`, `Active` (discoverable / matchable), `Paused`, `Fulfilled`, `Archived`.
- **FR-PRJ-04 [TECHNICAL RECOMMENDATION]:** Project descriptions must support confidential masking (allowing PE sponsors to hide portco deal names from public view prior to connection acceptance).

### 1.5 Discovery, Search & Filtering
- **FR-SCH-01 [PRODUCT REQUIREMENT]:** The platform must provide faceted search allowing PE users to filter consultants by ERP expertise, accounting systems, industries, deal types, geography, availability, and verification status.
- **FR-SCH-02 [PRODUCT REQUIREMENT]:** The platform must support full-text keyword search across consultant bios, past engagement summaries, and skill tags.
- **FR-SCH-03 [TECHNICAL RECOMMENDATION]:** The search engine must combine exact boolean keyword filtering with semantic vector search for nuanced query understanding (hybrid search).

### 1.6 AI-Assisted Matching & Grounded Explanations
- **FR-MTCH-01 [PRODUCT REQUIREMENT]:** The system must generate ranked match recommendations between an active PMI project and the consultant pool.
- **FR-MTCH-02 [PRODUCT REQUIREMENT]:** Recommendations must be accompanied by an explainable breakdown specifying why a consultant is recommended (e.g., "Matched: 8+ years SAP S/4HANA manufacturing carve-out experience").
- **FR-MTCH-03 [PRODUCT REQUIREMENT]:** Grounding & Zero Fabrication: Explanations must strictly reference verified or self-attested facts in the consultant profile. The AI must never generate ungrounded credentials, deal values, or fictitious references.
- **FR-MTCH-04 [PRODUCT REQUIREMENT]:** The system must compute a confidence score (0-100%) and distinctly flag low-confidence matches for review.

### 1.7 Candidate Shortlisting & Comparison
- **FR-SHL-01 [PRODUCT REQUIREMENT]:** PE users must be able to save consultants to a project-specific shortlist.
- **FR-SHL-02 [PRODUCT REQUIREMENT]:** PE users must be able to view side-by-side comparative matrices of shortlisted candidates across key criteria (ERP compatibility, deal experience, availability, verification tier).

### 1.8 Connection Requests & Relationship States
- **FR-CON-01 [PRODUCT REQUIREMENT]:** PE users must be able to dispatch connection requests to consultants with an associated project brief.
- **FR-CON-02 [PRODUCT REQUIREMENT]:** Connection requests must progress through explicit states: `Pending`, `Accepted`, `Declined`, `Canceled`, `Expired`.
- **FR-CON-03 [PRODUCT REQUIREMENT]:** Private messaging and direct scheduling are locked until a connection request is in the `Accepted` state.

### 1.9 Secure In-Platform Messaging
- **FR-MSG-01 [PRODUCT REQUIREMENT]:** Once connected, parties must be able to exchange private text messages within dedicated project conversation channels.
- **FR-MSG-02 [PRODUCT REQUIREMENT]:** Messaging must support secure document attachments (e.g., scoping decks, NDAs, project briefs).
- **FR-MSG-03 [PRODUCT REQUIREMENT]:** The messaging system must support message read receipts, participant timestamps, and chronological message ordering.

### 1.10 Scheduling & Calendar Coordination
- **FR-SCHED-01 [PRODUCT REQUIREMENT]:** Connected parties must be able to propose, accept, reschedule, and cancel introductory meetings directly through the platform.
- **FR-SCHED-02 [PRODUCT REQUIREMENT]:** The scheduling module must support explicit timezone translation and display local times accurately for all participants.
- **FR-SCHED-03 [TECHNICAL RECOMMENDATION]:** The system must provide a platform-native scheduler as a baseline, with optional calendar synchronization via industry standard iCalendar (.ics) and API integrations.

### 1.11 Multi-Channel Notifications
- **FR-NTF-01 [PRODUCT REQUIREMENT]:** The system must provide real-time in-app notifications and transactional email notifications for key events (new match, connection request, message received, meeting scheduled).
- **FR-NTF-02 [PRODUCT REQUIREMENT]:** Users must be able to configure notification delivery preferences per event category.

### 1.12 File & Document Management
- **FR-DOC-01 [PRODUCT REQUIREMENT]:** The platform must support secure upload, storage, and retrieval of consultant resumes, verification evidence documents, project briefs, and conversation attachments.
- **FR-DOC-02 [TECHNICAL RECOMMENDATION]:** File access must be governed via short-lived signed URLs (TTL <= 15 minutes) generated only after authorization checks. Direct public bucket access is prohibited.
- **FR-DOC-03 [TECHNICAL RECOMMENDATION]:** Files must undergo strict MIME-type validation, size limits (max 25MB), and antivirus/malware scanning pipelines.

### 1.13 Trust & Verification Engine
- **FR-VER-01 [PRODUCT REQUIREMENT]:** The platform must implement a multi-tiered verification framework:
  - Tier 0: Unverified (Registration only)
  - Tier 1: Identity & Corporate Email Verified
  - Tier 2: Credential & Work History Verified (Evidence reviewed by Admin)
  - Tier 3: Peer & Reference Verified (Confirmatory feedback collected)
- **FR-VER-02 [PRODUCT REQUIREMENT]:** Administrators must have dedicated review interfaces to inspect submitted verification evidence, approve/reject requests, and log audit notes.

### 1.14 Administrative Control Plane
- **FR-ADM-01 [PRODUCT REQUIREMENT]:** Administrators must have full oversight of users, firms, consultant profiles, verification workflows, and taxonomies.
- **FR-ADM-02 [PRODUCT REQUIREMENT]:** Administrators must have access to audit logs capturing security events, administrative status changes, and data access records.
- **FR-ADM-03 [PRODUCT REQUIREMENT]:** Administrators must be able to review low-confidence AI matches to ensure algorithm quality.

---

## 2. Cross-Cutting Non-Functional Requirements Summary

- **NFR-SEC [PRODUCT REQUIREMENT]:** Strict RBAC and resource ownership isolation; encryption in transit (TLS 1.3) and at rest (AES-256); OWASP Top 10 mitigation.
- **NFR-PERF [TECHNICAL RECOMMENDATION]:** API p95 response time < 250ms for OLTP endpoints; search query latency < 500ms; AI recommendation pipeline < 3s.
- **NFR-AVAIL [TECHNICAL RECOMMENDATION]:** Target 99.9% uptime during operational business hours with automated health probes and disaster recovery.
- **NFR-AUDIT [PRODUCT REQUIREMENT]:** Immutable audit logging for all authentication events, administrative overrides, verification state changes, and NDA/project access.
