# MerQent — Non-Functional Requirements (NFR) Specification

**Document Version:** 1.0.0  
**Status:** Approved Architecture  
**Phase:** 1 — Master Non-Functional Requirements  
**Author:** Lead Software Architect & Principal Engineer  

---

## 1. Overview & Quality Mandate

This specification formalizes the qualitative and quantitative non-functional criteria governing the MerQent platform. In adherence to the engineering principle **"Evidence Over Assumptions"**, metrics are calibrated to real-world B2B enterprise standards; where long-term production telemetry is required to set binding contractual SLAs, items are explicitly tracked as `OPEN DECISION`.

---

## 2. Core Non-Functional Requirements

### 2.1 Performance & Latency
- **NFR-PERF-01 [TECHNICAL RECOMMENDATION]:** OLTP API read endpoints (`/users/me`, `/projects/:id`, `/conversations/:id/messages`) must achieve a **p95 latency < 200 ms** under nominal concurrent load (500 virtual users).
- **NFR-PERF-02 [TECHNICAL RECOMMENDATION]:** OLTP API mutation endpoints (`POST /projects`, `POST /connections`, `POST /messages`) must achieve a **p95 latency < 350 ms**.
- **NFR-PERF-03 [TECHNICAL RECOMMENDATION]:** Hybrid faceted and semantic search queries (`GET /search/consultants`) must return paginated candidate results with a **p95 latency < 500 ms**.
- **NFR-PERF-04 [TECHNICAL RECOMMENDATION]:** The AI matching pipeline (candidate pool retrieval, composite scoring, and LLM explanation synthesis for top 10 candidates) must complete within **< 3.0 seconds**.
- **NFR-PERF-05 [PRODUCT REQUIREMENT]:** Web application frontend must achieve Google Core Web Vitals targets: Largest Contentful Paint (LCP) < 2.0s, Cumulative Layout Shift (CLS) < 0.1, and First Input Delay (FID) / INP < 100ms.

### 2.2 Availability & Resilience
- **NFR-AVAIL-01 [TECHNICAL RECOMMENDATION]:** Platform operational target of **99.9% uptime** (excluding planned maintenance windows scheduled during off-peak hours).
- **NFR-AVAIL-02 [PRODUCT REQUIREMENT]:** Critical services (API and Web) must run with a minimum of 2 redundant instances across multiple AWS Availability Zones.
- **NFR-AVAIL-03 [OPEN DECISION]:** Formal institutional Service Level Agreement (SLA) with contractual financial penalties is deferred until commercial enterprise tiers are finalized.

### 2.3 Scalability & Capacity
- **NFR-SCALE-01 [TECHNICAL RECOMMENDATION]:** Architecture must support **10x baseline volume** (1,000 PE firms, 20,000 active consultants, 5,000 active projects, 250,000 daily messages) without structural redesign.
- **NFR-SCALE-02 [TECHNICAL RECOMMENDATION]:** AWS ECS Fargate tasks and Amazon Aurora Serverless v2 must scale compute horizontally and vertically based on CPU utilization (> 70%) and queue backlogs.
- **NFR-SCALE-03 [TECHNICAL RECOMMENDATION]:** In-memory `pgvector` HNSW index must support up to 100,000 consultant vectors with query response times < 30ms before requiring sharded search clusters.

### 2.4 Security & Threat Mitigation
- **NFR-SEC-01 [PRODUCT REQUIREMENT]:** All external HTTP traffic must enforce TLS 1.3 encryption; insecure HTTP traffic must be rejected.
- **NFR-SEC-02 [PRODUCT REQUIREMENT]:** Passwords must be hashed using Argon2id ($m=64\text{MB}, t=3, p=4$). Plaintext passwords must never appear in memory dumps, logs, or backups.
- **NFR-SEC-03 [PRODUCT REQUIREMENT]:** Multi-Factor Authentication (TOTP via RFC 6238) is mandatory for all administrative and trust review accounts.
- **NFR-SEC-04 [PRODUCT REQUIREMENT]:** S3 object storage must completely prohibit public access; all file transactions execute via pre-signed URLs with maximum TTL of 15 minutes.
- **NFR-SEC-05 [PRODUCT REQUIREMENT]:** Protection against OWASP Top 10 vulnerabilities (SQLi, XSS, CSRF, SSRF, Broken Object Level Authorization) must be validated via automated CI security suites.

### 2.5 Privacy, Confidentiality & Compliance
- **NFR-PRIV-01 [PRODUCT REQUIREMENT]:** Confidential PE project deal names must support masked aliases in all marketplace discovery queries to prevent leaks of Material Non-Public Information (MNPI).
- **NFR-PRIV-02 [PRODUCT REQUIREMENT]:** Data Minimization: Consultant personal phone numbers and unredacted verification contracts are never exposed to PE clients.
- **NFR-PRIV-03 [PRODUCT REQUIREMENT]:** Commercial enterprise agreements with AI providers must legally enforce Zero Data Retention (ZDR).
- **NFR-PRIV-04 [TECHNICAL RECOMMENDATION]:** The system architecture must be designed to satisfy SOC 2 Type II Trust Services Criteria (Security, Availability, Confidentiality).

### 2.6 Reliability & Data Integrity
- **NFR-REL-01 [PRODUCT REQUIREMENT]:** Multi-aggregate mutations (e.g., Connection Acceptance $\to$ Conversation Creation) must execute within database ACID transactions.
- **NFR-REL-02 [PRODUCT REQUIREMENT]:** System audit logs (`audit_logs`) must be tamper-evident and append-only, enforced via database engine triggers.
- **NFR-REL-03 [TECHNICAL RECOMMENDATION]:** Asynchronous background jobs must enforce idempotency keys and exponential backoff retry policies.

### 2.7 Observability & Telemetry
- **NFR-OBS-01 [TECHNICAL RECOMMENDATION]:** All backend application logs must output structured newline-delimited JSON (via Pino) containing correlation IDs (`traceId`, `userId`, `firmId`).
- **NFR-OBS-02 [PRODUCT REQUIREMENT]:** Automatic redaction of sensitive attributes (`password`, `token`, `secret`, `authorization`, `creditCard`) across all log streams.
- **NFR-OBS-03 [TECHNICAL RECOMMENDATION]:** Real-time error reporting and performance tracing via Sentry SDK with error alert triggers.

### 2.8 Accessibility (a11y)
- **NFR-A11Y-01 [PRODUCT REQUIREMENT]:** Web application user interface must comply with **WCAG 2.1 Level AA** standards.
- **NFR-A11Y-02 [PRODUCT REQUIREMENT]:** All interactive dialogs, menus, and forms must be fully navigable via keyboard and announce state changes to screen readers via ARIA attributes.
- **NFR-A11Y-03 [PRODUCT REQUIREMENT]:** Color contrast ratios for text and interactive controls must meet or exceed 4.5:1.

### 2.9 Testability & Maintainability
- **NFR-TEST-01 [TECHNICAL RECOMMENDATION]:** Minimum **85% unit test code coverage** across domain logic and Zod validation schemas.
- **NFR-TEST-02 [TECHNICAL RECOMMENDATION]:** Minimum **80% integration test coverage** across API controllers and database repositories using Testcontainers.
- **NFR-TEST-03 [PRODUCT REQUIREMENT]:** Continuous Integration (CI) pipeline execution time must remain < 10 minutes per PR build.

### 2.10 Recoverability & BCDR
- **NFR-REC-01 [TECHNICAL RECOMMENDATION]:** Recovery Point Objective (RPO) **< 15 minutes** via automated Aurora continuous transaction log (WAL) archiving.
- **NFR-REC-02 [TECHNICAL RECOMMENDATION]:** Recovery Time Objective (RTO) **< 2 hours** to restore full service from automated cross-region snapshots and Terraform IaC definitions.
