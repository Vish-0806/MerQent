# MerQent — Open Product & Architecture Questions

**Document Version:** 1.0.0  
**Status:** Tracking Log  
**Classification:** Decision & Risk Management  

---

## 1. Overview

This document explicitly tracks all unresolved product, commercial, and technical questions facing the MerQent platform. In adherence to the core engineering principle **"Evidence Over Assumptions"**, items here are marked with their current status, impacts, options, and trigger conditions for resolution.

---

## 2. Open Decision Log

| ID | Topic | Current Classification | Options Under Consideration | Architectural Impact | Decision Dependency |
|---|---|---|---|---|---|
| **OQ-01** | Platform Business & Monetization Model | `OPEN DECISION` | 1. Subscription-only for PE firms (SaaS)<br>2. Placement / success commission fee on engagements<br>3. Hybrid (Platform access tier + success fee)<br>4. Freemium | High impact on future invoicing, escrow, and financial audit modules. Currently architected as decoupled from payment processing in Phase 1. | Project Owner / Business Strategy |
| **OQ-02** | Definition & Segregation of "Operator" vs. "Consultant" | `OPEN DECISION` | 1. Explicit profile type enum (`OPERATOR`, `CONSULTANT`, `HYBRID`)<br>2. Single unified profile with weighted tag attributes for advisory vs. hands-on execution | Moderate impact on search filtering facets and match scoring weights. Architecture supports multi-role attribute tagging. | Product Committee |
| **OQ-03** | Verification Depth & Liability Boundaries | `OPEN DECISION` | 1. Lightweight: Email + self-attestation + LinkedIn verification<br>2. Moderate: Document review (redacted contracts, certifications, diplomas)<br>3. Heavyweight: Full third-party background checks + live reference calls | Directly dictates administrative workload, SLA for profile publication, and verification queue UX. Multi-tier verification pipeline is architected to support progressive enforcement. | Legal & Compliance Advisor |
| **OQ-04** | Calendar Integration Depth | `OPEN DECISION` | 1. Internal platform scheduler with .ics file dispatch<br>2. Full bidirectional Google Calendar & Microsoft Outlook OAuth sync<br>3. Third-party embedded scheduler (e.g., Cal.com self-hosted / Nylas) | Impacts OAuth token vaulting, webhook listeners, calendar event reconciliation, and external API rate limits. | Phase 1.4 & 1.14 Scheduling Architecture |
| **OQ-05** | Production Cloud Provider | `OPEN DECISION` | 1. Amazon Web Services (AWS)<br>2. Microsoft Azure<br>3. Google Cloud Platform (GCP)<br>4. Modern PaaS (e.g., Render/Neon/Supabase) | Dictates IaC tooling (Terraform vs. CDK), secret storage, container runtime (ECS vs. App Runner vs. Kubernetes). | Phase 1.4 & 1.23 Deployment Architecture |
| **OQ-06** | AI LLM Provider & Model Tier | `OPEN DECISION` | 1. OpenAI (GPT-4o, GPT-4o-mini)<br>2. Anthropic (Claude 3.5 Sonnet, Haiku)<br>3. Google Vertex AI (Gemini 1.5 Pro / Flash)<br>4. Self-hosted Open Source (Llama 3.1) via vLLM | Impacts structured output guarantees, latency, token costs, data privacy (zero data retention agreements), and SDK dependencies. | Phase 1.4, 1.11, & 1.12 AI Architecture |
| **OQ-07** | Search Engine Implementation | `OPEN DECISION` | 1. Native PostgreSQL (Full-Text Search + pgvector)<br>2. Dedicated Elasticsearch / OpenSearch cluster<br>3. Hybrid PostgreSQL + Qdrant / Pinecone | Impacts infrastructure footprint, operational maintenance, real-time index synchronization, and operational costs. | Phase 1.4 & 1.10 Search Architecture |
| **OQ-08** | Regulatory & Compliance Standards | `OPEN DECISION` | 1. Standard B2B GDPR & SOC 2 Type II readiness<br>2. Strict SEC / FINRA compliance for MNPI (Material Non-Public Information) handling | Dictates project anonymity controls, encryption key management (BYOK), and data retention policies. | Legal Counsel / Institutional PE Customers |
| **OQ-09** | Mobile Client Timeline & Framework | `OPEN DECISION` | 1. Phase 1-2 Web-only; Phase 3+ Flutter mobile app<br>2. Responsive Progressive Web App (PWA) initially, native app deferred | Requires API-first design with absolute client independence (RESTful JSON + JWT auth), ensuring zero web-specific lock-in. | Product Roadmap / Mobile Readiness |

---

## 3. Governance Process

- No assumption is converted into a settled requirement without review and documentation in an Architecture Decision Record (ADR).
- Technical recommendations will be implemented using modular abstractions (e.g., Repository and Adapter patterns) so that open decisions do not block engineering progression.
