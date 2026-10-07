# ADR-004: Selection of Hybrid PostgreSQL (`tsvector` + `pgvector` HNSW) for Search

**Status:** Accepted  
**Date:** 2026-10-07  
**Deciders:** Lead Software Architect, AI System Architect  
**Classification:** Core Architectural Decision  

---

## 1. Context
MerQent requires two complementary discovery paradigms:
1. **Structured Faceted Search:** Boolean filtering on exact taxonomy attributes (e.g., ERP = "SAP S/4HANA", Deal Type = "Carve-Out", Industry = "Manufacturing", Availability = "Immediately Available").
2. **Semantic Discovery:** Vector similarity search identifying conceptual alignment between project scopes and consultant professional backgrounds.

## 2. Problem
Evaluate whether to implement search natively in PostgreSQL (Full-Text Search + `pgvector`), deploy a dedicated Elasticsearch/OpenSearch cluster, or use an external vector SaaS (Pinecone/Qdrant).

## 3. Options Considered
- **Option 1:** Hybrid PostgreSQL (`tsvector` + `pgvector` with HNSW index)
- **Option 2:** Dedicated Elasticsearch / OpenSearch cluster
- **Option 3:** PostgreSQL + External Vector Database (Pinecone / Qdrant)

## 4. Decision
Select **Hybrid PostgreSQL 16+** using:
- `tsvector` with GIN indexes and `pg_trgm` for keyword and fuzzy text matching.
- `pgvector` with **HNSW (Hierarchical Navigable Small World)** indexing using Cosine distance (`vector_cosine_ops`) for semantic similarity.
- Abstract search operations behind a modular `SearchRepository` interface.

## 5. Why Selected
1. **Zero Dual-Write Synchronization Lag:** Profile updates, availability changes, and verification badges are indexed instantaneously in the same database transaction, eliminating complex Change Data Capture (CDC) pipelines or eventual consistency delays.
2. **True Hybrid Filtering in Single Query:** Combines boolean relational filters (`WHERE status = 'PUBLISHED' AND availability = 'IMMEDIATE'`) with vector distance ranking in one index-backed SQL query.
3. **Operational Simplicity:** Eliminates the operational overhead, memory consumption, JVM patching, and infrastructure cost of a separate 3-node OpenSearch cluster.
4. **Sub-30ms Latency:** With HNSW indexing in PostgreSQL 16+, vector queries over 100,000 consultant vectors execute in < 15ms.

## 6. Alternatives Rejected
- **Elasticsearch / OpenSearch:** Rejected as premature over-engineering for Phase 1-2. Managing Elasticsearch clusters, index mappings, re-indexing workers, and dual-write synchronizers adds massive operational overhead with zero tangible benefit at MerQent's initial catalog scale.
- **Pinecone / Qdrant SaaS:** Rejected because sending sensitive profile embeddings across third-party networks introduces compliance friction with PE institutional security, and requires multi-phase network round-trips to join vector IDs back with PostgreSQL relational records.

## 7. Trade-offs & Consequences
- **Trade-off:** PostgreSQL CPU utilization increases during vector index generation.
- **Consequence:** HNSW indexes must be built with tuned `m` and `ef_construction` parameters; heavy search traffic can be offloaded to read replicas if query volume spikes.

## 8. Migration & Future Implications
- The `SearchRepository` domain interface ensures that if MerQent's catalog scales beyond 500,000 active consultants, the implementation can be switched to OpenSearch without altering domain services.
