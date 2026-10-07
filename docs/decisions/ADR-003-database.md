# ADR-003: Primary Database — PostgreSQL

## Context
MerQent requires a unified system of record for highly structured enterprise relationships: Private Equity organizations, platform portfolios, consultant credentials, verified deal histories, project requirements, candidate shortlists, meetings, and audit logs. Furthermore, candidate discovery requires rich vector search and text search.

## Problem
Selecting a primary persistence engine that guarantees ACID transaction integrity, robust relational data modeling, strong constraints, and unified support for both structured queries and semantic vector embeddings without requiring unnecessary database sprawl.

## Options Considered
1. **PostgreSQL 16+ (with `pgvector` and `pg_trgm`)** (Selected)
2. **PostgreSQL + MongoDB (Polyglot Persistence)**
3. **MySQL 8.0**
4. **PostgreSQL + Dedicated Vector DB (Pinecone / Qdrant / Weaviate)**

## Decision
Adopt **PostgreSQL 16+** with the **`pgvector`** and **`pg_trgm`** extensions as the unified primary persistence and indexing engine.

## Rationale
- **Relational Integrity & ACID**: Strict foreign keys, unique constraints, and ACID transactions protect sensitive M&A project allocations and verification statuses.
- **Unified Vector & Semantic Search**: `pgvector` supports 1536-dimensional HNSW vector indexing directly inside the primary database, eliminating distributed dual-write synchronization hazards between a relational store and an external vector database.
- **Rich Indexing & Filtering**: B-Tree, GIN, and GiST indexes power combined structured taxonomy filtering (ERP, industry, deal type) and semantic similarity scoring in a single query.
- **Operational Simplicity**: Single operational database to back up, monitor, replicate, and secure.

## Trade-offs
- Dedicated vector databases can offer specialized quantization algorithms at scale (>10M vectors), but MerQent's domain deals with tens of thousands of specialized PMI consultants, making PostgreSQL with `pgvector` far more than sufficient.

## Consequences
- Primary schema defined in `prisma/schema.prisma`.
- Extensions initialized in `infrastructure/database/init.sql`.

## Alternatives Rejected
- *Dedicated Vector Database (Pinecone / Qdrant)*: Premature optimization that introduces eventual consistency bugs, additional network hops, and higher infrastructure costs.
- *MongoDB*: Inadequate relational constraints and foreign key guarantees for complex multi-entity PE deal governance.

## Future Implications
If consultant profile vectors ever exceed millions of embeddings, read replicas or dedicated vector engines can be introduced without disrupting domain models.
