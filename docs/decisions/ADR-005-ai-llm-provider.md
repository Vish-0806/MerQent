# ADR-005: AI / LLM Provider Strategy & Dual-Adapter Architecture

**Status:** Accepted  
**Date:** 2026-10-07  
**Deciders:** Lead Software Architect, AI System Architect  
**Classification:** Core Architectural Decision  

---

## 1. Context
MerQent's AI matching engine requires:
1. High-dimensional vector embeddings for project briefs and consultant profiles.
2. An advanced Large Language Model (LLM) to synthesize grounded, explainable match justifications (`MatchExplanation`) referencing verified profile claims (`MatchEvidence`).
3. Guaranteed JSON output conforming strictly to domain schemas.
4. Absolute data privacy (Zero Data Retention) so confidential PE deal information is never used for model training.

## 2. Problem
Evaluate whether to standardize on OpenAI, Anthropic, Google Vertex AI, or a self-hosted open-source model (Llama 3.1).

## 3. Options Considered
- **Option 1:** OpenAI API (GPT-4o, GPT-4o-mini, `text-embedding-3-small`)
- **Option 2:** Anthropic API (Claude 3.5 Sonnet, Claude 3.5 Haiku)
- **Option 3:** Google Cloud Vertex AI (Gemini 1.5 Pro / Flash)
- **Option 4:** Self-hosted Llama 3.1 70B via vLLM on dedicated GPU cloud

## 4. Decision
Implement an **AI Provider Abstraction Adapter** (`IAIService`) with:
- **Primary Embedding Model:** OpenAI `text-embedding-3-small` (1536 dimensions).
- **Primary Match Explanation Model:** OpenAI `gpt-4o-mini` with **Strict Structured Outputs** (`response_format: { type: "json_schema" }`).
- **Secondary / Qualitative Reasoning Adapter:** Anthropic **Claude 3.5 Sonnet** (via tool use / structured JSON output) as a hot-swappable fallback for complex deal synthesis.
- **Contractual Mandate:** Commercial enterprise API accounts with Zero Data Retention (ZDR) agreements.

## 5. Why Selected
1. **Guaranteed Schema Adherence:** OpenAI's Strict Mode mathematically guarantees 100% compliance with JSON schemas, eliminating JSON parse failures in the matching pipeline.
2. **Standardized 1536d Embeddings:** `text-embedding-3-small` offers state-of-the-art MTEB retrieval performance at nominal cost ($0.02 per 1M tokens) with optimal dimensionality for `pgvector` HNSW index caching.
3. **Latency & Economics:** `gpt-4o-mini` produces grounded explanations in < 1.2s at fractional cost ($0.15 / 1M input tokens), enabling high-throughput candidate evaluation.
4. **Provider Decoupling:** The abstraction adapter guarantees that MerQent can switch between OpenAI, Anthropic, and open-source models via environment configuration without code refactoring.

## 6. Alternatives Rejected
- **Self-Hosted Open Source (Llama 3.1 70B):** Rejected due to massive upfront capital expenditure (multi-A100 GPU reservations), operational fragility, and complex fine-tuning requirements for early-stage development.
- **Single-Vendor Lock-In:** Relying solely on one vendor without an adapter was rejected to protect against model deprecations, API outages, or commercial policy shifts.

## 7. Trade-offs & Consequences
- **Trade-off:** Reliance on external cloud AI APIs requires handling rate limits, network timeouts, and API key management.
- **Consequence:** All AI invocations are wrapped in exponential backoff retry interceptors, client-side circuit breakers, and Redis-cached embedding lookups.

## 8. Migration & Future Implications
- Clean adapter interface (`IAIService`) ensures zero leakage of vendor SDKs into core domain services.
