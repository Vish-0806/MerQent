# ADR-004: ORM Architecture — Prisma

## Context
MerQent requires a robust, declarative, type-safe data access layer to interact with PostgreSQL from NestJS. Data models span 21 domain entities, multiple junction tables, audit logs, and complex status transitions.

## Problem
Selecting an Object-Relational Mapper (ORM) or query builder that maximizes type safety, eliminates runtime impedance mismatches, provides automated migrations, and integrates cleanly with NestJS without compromising developer velocity or query control.

## Options Considered
1. **Prisma ORM** (Selected)
2. **TypeORM**
3. **Drizzle ORM**
4. **Kysely / Raw SQL**

## Decision
Adopt **Prisma ORM** as the core data access and schema management layer.

## Rationale
- **Declarative Schema Definition**: A single, clean `prisma/schema.prisma` serves as the authoritative definition for entities, relationships, constraints, indexes, and enums.
- **End-to-End Type Safety**: Auto-generated `@prisma/client` provides compile-time safety across NestJS services, preventing invalid relational queries.
- **Robust Migration Engine**: `prisma migrate dev` and `prisma migrate deploy` provide deterministic, versioned SQL migration scripts for CI/CD and deployment environments.
- **Raw SQL Escape Hatch**: Supports `$queryRaw` with full parameterization when performing high-performance `pgvector` HNSW cosine distance operations and complex CTEs.

## Trade-offs
- Prisma client engine has slight memory footprint compared to minimal query builders like Drizzle.
- Complex bulk operations or specific PostgreSQL features (like vector distance functions) require typed raw queries `$queryRaw`.

## Consequences
- The authoritative schema is located at `prisma/schema.prisma`.
- Seed scripts reside in `prisma/seed/seed.ts`.
- `DatabaseModule` in `src/infrastructure/database` wraps `PrismaClient` as an injectable NestJS provider with lifecycle management.

## Alternatives Rejected
- *TypeORM*: Problematic active record/data mapper hybrid with longstanding TypeScript decorator issues, fragile migration tooling, and frequent breaking releases.
- *Drizzle*: Immature migration orchestration compared to Prisma's proven enterprise track record.

## Future Implications
Seamless migration pathways to Prisma Accelerate or connection pooling (PgBouncer) as traffic grows.
