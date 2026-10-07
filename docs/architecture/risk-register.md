# MerQent — Architectural Risk Register

**Document Version:** 1.0.0  
**Status:** Approved Architecture  
**Phase:** 1 — Master Architectural Risk Assessment  
**Author:** Lead Software Architect & Principal Engineer  

---

## 1. Risk Assessment Framework

Risks are categorized across Technical, Security, AI Integrity, Operational, and Compliance dimensions. Severity is calculated as:
$$\text{Severity} = \text{Probability} \times \text{Impact}$$

---

## 2. Active Risk Register

| Risk ID | Risk Description | Probability | Impact | Severity | Mitigation Strategy | Component Owner | Future Action Trigger |
|---|---|:---:|:---:|:---:|---|---|---|
| **RSK-01** | **AI Hallucination in Recommendations:** LLM manufactures fictitious deal sizes, employer references, or ERP credentials. | Medium | Critical | **HIGH** | Strict system prompts, JSON Schema mode, Ground Truth Fact Vaults, and automated `GroundingInterceptor` stripping claims without valid `sourceEntityId`. | `MatchingEngineModule` | Monthly golden benchmark regression test. |
| **RSK-02** | **Sensitive PE Deal / MNPI Leakage:** Unannounced portco acquisition target names exposed to unauthorized users or web crawlers. | Low | Critical | **HIGH** | Mandatory project confidentiality masking (`confidentialNameMasked`) in discovery; true target names visible only within PE firm and post-connection. | `ProjectsModule` / `SecurityPolicy` | Mandatory security audit on project endpoints. |
| **RSK-03** | **Fabricated Consultant Credentials:** Consultant submits fraudulent CPA or SAP certifications to win engagements. | Medium | High | **HIGH** | Multi-tier progressive verification; human review required for Tier 2/3; credential registry verification; annual re-verification. | `VerificationModule` | Periodic sampling audit of approved Tier 2/3 badges. |
| **RSK-04** | **AI API Cost & Rate Limit Spikes:** Mass project creation or search traffic exhausts OpenAI token budgets or triggers rate limits. | Medium | Medium | **MEDIUM** | Rate-limited BullMQ queues; Redis embedding caching; top-10 candidate explanation capping; cost ceiling of < $0.002 per match run. | `MatchingEngineModule` | CloudWatch budget alerts at 50% and 80% monthly threshold. |
| **RSK-05** | **Real-Time Firewall Interception:** Corporate PE banking firewalls terminate persistent WebSocket connections. | High | Medium | **MEDIUM** | Standardized on Socket.IO which provides automated seamless HTTP long-polling fallback over standard TLS (port 443) when WebSockets are blocked by restrictive corporate proxies. | `MessagingModule` | Network penetration testing against enterprise proxies. |
| **RSK-06** | **Search Ranking Bias or Inaccuracy:** High-quality operators buried by naive keyword ranking. | Medium | High | **MEDIUM** | Hybrid Reciprocal Rank Fusion (RRF) combining boolean taxonomy filters, trigram keyword ranking, and `pgvector` HNSW semantic cosine distance. | `SearchModule` | Search relevance user feedback telemetry. |
| **RSK-07** | **Malware / Virus Upload via Attachments:** Malicious PDF or Office document uploaded to S3 compromise reviewer or PE machines. | Low | High | **MEDIUM** | Zero-proxy signed uploads; strict MIME-type whitelisting; ClamAV asynchronous scanning pipeline; quarantine until verified clean. | `FilesModule` | EICAR test file automated CI verification. |
| **RSK-08** | **Scheduling Slot Collision / Desynchronization:** Counterparties confirm overlapping meetings across divergent timezones. | Low | Medium | **LOW** | Universal UTC storage; database overlap exclusion query; atomic interactive transaction on meeting confirmation. | `SchedulingModule` | Timezone edge-case integration tests. |
| **RSK-09** | **Vendor Lock-In (AI / Cloud):** Over-dependence on a single LLM or cloud vendor limits future flexibility. | Medium | Medium | **MEDIUM** | Abstracted `IAIService` and `IStorageService` adapters; support for OpenAI and Anthropic; Docker containerized deployment. | `Infrastructure` | Periodic test evaluation of alternative open models. |
| **RSK-10** | **Mobile App Backward Incompatibility:** Future Flutter mobile client requires breaking changes to web-coupled APIs. | Low | High | **LOW** | Strict API-First architecture; dual Bearer/Cookie authentication; OpenAPI 3.0 contract; timestamp cursor pagination. | `API Architecture` | API linting enforcing client-agnostic standards. |
| **RSK-11** | **Vector Memory Saturation at Scale:** `pgvector` HNSW indexes consume excessive RAM as consultant catalog expands. | Low | Medium | **LOW** | Memory tuning (`m=16, ef_construction=64`); 20,000 vectors require only ~180MB RAM; abstract `SearchRepository` permits OpenSearch offloading. | `DatabaseArchitecture` | Metric alert when vector index size exceeds 2GB. |
| **RSK-12** | **Administrative Insider Threat / Impersonation:** Administrator accesses private PE deal scoping messages without authorization. | Low | Critical | **MEDIUM** | Strict Separation of Duties; mandatory TOTP MFA; message reading blocked by default; break-glass immutable audit logging. | `AdminModule` / `AuditLog` | Weekly automated audit log anomaly reports. |

---

## 3. Risk Monitoring & Governance
The Risk Register is reviewed bi-weekly during engineering sprints. Any risk transitioning to High or Critical triggers an immediate architectural review and issue remediation spike.
