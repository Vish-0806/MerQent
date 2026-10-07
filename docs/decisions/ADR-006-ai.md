# ADR-006: AI Matching Engine Architecture — Hybrid Grounded Architecture

## Context
Matching PE post-merger integration projects with executive consultants is the core value proposition of MerQent. PMI projects have strict requirements (e.g., SAP S/4HANA carve-out, healthcare compliance, cross-border consolidation, $50M+ EBITDA scope). Hallucinated skills or fabricated credentials by an AI would destroy institutional trust.

## Problem
Designing an AI matching system that achieves high recall and precision, produces explainable match score breakdowns, enforces strict factual grounding in verified database records, and prevents vendor lock-in to any single LLM provider.

## Options Considered
1. **Hybrid Deterministic + Semantic Retrieval Pipeline with LLM-based Explainability** (Selected)
2. **Pure Vector Semantic Search (Single-Shot RAG)**
3. **Pure Rule-Based Taxonomy Filtering**
4. **Autonomous AI Agent Re-ranking**

## Decision
Adopt a **Two-Stage Grounded Hybrid Pipeline**:
1. **Stage 1: Deterministic Hard Filtering & Fast Vector Retrieval**: Filter on hard constraints (availability, day rate band, geography, baseline taxonomy), then score semantic similarity between normalized project requirements and consultant profile vectors via `pgvector`.
2. **Stage 2: Deterministic Multi-Factor Scoring & Explainable LLM Synthesis**: Calculate multi-factor match score (40% ERP/Systems, 25% Deal Type & Carve-out, 20% Industry, 15% Verified Evidence). An LLM is invoked only to synthesize human-readable evidence summaries grounded strictly in matching database fields.

## Core Grounding Invariants
- AI must **NEVER** invent consultant experience, deal count, certifications, or employers.
- Data categories remain strictly separated: `USER_REPORTED`, `VERIFIED_EVIDENCE`, `SYSTEM_CALCULATED`, and `AI_INFERRED_RELEVANCE`.
- All LLM calls interface through an `AiProvider` adapter interface (`OpenAiAdapter`, `AnthropicAdapter`, `LocalLlmAdapter`).

## Trade-offs
- Two-stage pipeline requires structured taxonomy normalization upfront rather than relying solely on raw uncurated text.
- Slightly higher pipeline engineering complexity than pure vector search, but guarantees factual fidelity.

## Consequences
- Implemented in `src/modules/matching/` and `src/infrastructure/ai/`.
- Recommendations include confidence intervals (`HIGH`, `MEDIUM`, `LOW`) and actionable evidence points.

## Alternatives Rejected
- *Pure Vector Search*: Prone to false positives (e.g., matching a candidate who "wants to learn SAP" with a project requiring 10 years of SAP S/4HANA lead experience).
- *Pure Rule-Based*: Misses nuanced contextual synergies described in professional narratives.

## Future Implications
Allows swapping out OpenAI `text-embedding-3-small` / `gpt-4o` for private enterprise models or fine-tuned open-source models with zero domain logic changes.
