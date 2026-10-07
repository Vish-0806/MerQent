# ADR-003: Selection of PostgreSQL 16+ as Primary Relational & Vector Database

**Status:** Accepted  
**Date:** 2026-10-07  
**Deciders:** Lead Software Architect, Database Architect  
**Classification:** Core Architectural Decision  

---

## 1. Context
MerQent models complex relational B2B structures: Private Equity organizations, multi-member teams, consultant career histories, governed PMI taxonomies (ERPs, industries, deal archetypes), multi-tiered verification records, bilateral connections, and immutable audit logs. In addition, the AI matching engine requires storing and querying 1536-dimensional vector embeddings.

## 2. Problem
Evaluate whether to persist data in PostgreSQL 16+ (with `pgvector`), MongoDB 7+, or MySQL 8+.

## 3. Options Considered
- **Option 1:** PostgreSQL 16+ with `pgvector` extension
- **Option 2:** MongoDB 7+ (Document Database)
- **Option 3:** MySQL 8+

## 4. Decision
Select **PostgreSQL 16+** with the **`pgvector`** extension, managed via **Prisma ORM** (or Kysely for type-safe query building) and raw SQL migrations.

## 5. Why Selected
1. **Relational Integrity & ACID Compliance:** Guarantees strict transactional isolation, foreign keys, and unique constraints across mission-critical states (e.g., connection status gating).
2. **Unified Relational + Vector Storage:** `pgvector` allows storing profile and project embeddings directly in the same row as the relational entity. Hybrid queries (e.g., `WHERE availability = 'IMMEDIATE' AND industry = 'MANUFACTURING' ORDER BY embedding <=> query_vector LIMIT 20`) execute in a single sub-20ms query.
3. **Advanced Data Types:** Native `JSONB` with GIN indexing accommodates flexible taxonomy metadata; `tsvector` provides robust full-text search.
4. **Append-Only Immutability:** Supports PL/pgSQL triggers and table rules to prevent mutation or deletion of security audit logs.
5. **Universal Ecosystem Support:** Native support on AWS RDS, Supabase, Neon, and standard Docker containers.

## 6. Alternatives Rejected
- **MongoDB:** Rejected because MerQent's domain is deeply relational. Modeling M:N taxonomy associations, multi-tenant firm memberships, and multi-aggregate state transitions in document trees invites data duplication, consistency anomalies, and manual referential integrity checks.
- **MySQL:** Rejected due to inferior vector search support, weaker JSON querying capabilities, and lack of extensions comparable to `pgvector` and `pg_trgm`.

## 7. Trade-offs & Consequences
- **Trade-off:** Schema migrations require disciplined management compared to schemaless document stores.
- **Consequence:** All schema changes must be version-controlled using declarative migration scripts run through CI/CD pipelines before application deployment.

## 8. Migration & Future Implications
- If vector volume grows past 1,000,000 active embeddings, read replicas or dedicated vector indexing nodes can be provisioned without re-architecting the relational schema.
