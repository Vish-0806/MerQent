# ADR-007: Search Architecture — PostgreSQL pg_trgm & pgvector

## Context
MerQent requires discovery across two distinct user modes:
1. **Faceted Structured Discovery**: PE firms filtering consultants by exact taxonomy (ERP systems, industries, deal types, day rates, security clearance, availability).
2. **Semantic Free-Text Search**: Natural language search across consultant bios, PMI project scope narratives, and past carve-out achievements.

## Problem
Selecting a search architecture that fulfills both faceted filtering and semantic ranking without introducing the operational overhead of a separate external search cluster (Elasticsearch / OpenSearch).

## Options Considered
1. **PostgreSQL native (B-Tree + GIN `pg_trgm` + HNSW `pgvector`)** (Selected)
2. **Elasticsearch / OpenSearch**
3. **Algolia / Meilisearch**

## Decision
Adopt **PostgreSQL 16 native search capabilities** combining B-Tree indices for exact filters, GIN trigram indexes (`pg_trgm`) for typo-tolerant keyword search, and HNSW indexes (`pgvector`) for cosine similarity semantic search.

## Rationale
- **Zero Synchronization Lag**: Data updates (e.g., consultant toggling availability to `UNAVAILABLE`) are reflected in search results immediately without eventual consistency delays.
- **Single Source of Truth**: Eliminates complex CDC (Change Data Capture) pipelines (Debezium/Kafka) required to keep external search clusters in sync with PostgreSQL.
- **Transactional Consistency**: Search filters seamlessly respect user permissions, active status, and soft deletes.
- **Cost & Operational Efficiency**: Dramatically reduces infrastructure complexity and maintenance costs.

## Trade-offs
- PostgreSQL GIN and HNSW indices consume database memory; requires proper indexing and RAM allocation.
- Extremely high query concurrency (thousands of QPS) may eventually require read replicas.

## Consequences
- Search logic encapsulated within `src/modules/search/` and `src/infrastructure/search/`.
- Queries utilize CTEs combining structured WHERE clauses with cosine distance ordering.

## Alternatives Rejected
- *Elasticsearch/OpenSearch*: Massive operational overhead, heavy JVM memory footprints, and dual-write sync consistency vulnerabilities for a B2B catalog size.
- *Algolia*: Expensive hosted SaaS model with privacy concerns regarding private equity deal terms.

## Future Implications
Read-replica offloading provides a clean scaling path for 10x query growth without changing application architecture.
