# ADR-002: Backend Architecture — NestJS + TypeScript

## Context
MerQent requires a robust, modular, testable, and maintainable enterprise backend capable of handling 17 discrete business domains, strict role-based access control (RBAC), hybrid AI retrieval pipelines, WebSockets for realtime collaboration, and background processing.

## Problem
Selecting a backend runtime and framework that enforces strict architectural boundaries, dependency injection, high maintainability, enterprise patterns, and seamless scalability without degenerating into ad-hoc spaghetti code.

## Options Considered
1. **NestJS + TypeScript (Node.js)** (Selected)
2. **Express.js / Fastify bare + TypeScript**
3. **Go / Gin / Echo**
4. **Python / FastAPI**

## Decision
Adopt **NestJS 10+ with TypeScript** on Node.js as the core backend framework.

## Rationale
- **Modular Enterprise Architecture**: Provides native modules, dependency injection, lifecycle hooks, and clean domain boundaries matching MerQent's domain structure.
- **Built-in First-Class Abstractions**: Native support for Guards (RBAC), Interceptors (logging, telemetry), Pipes (validation), Filters (exception handling), and Gateways (WebSockets / Socket.IO).
- **TypeScript End-to-End**: Full type synergy with `@merqent/shared-types` and Prisma ORM.
- **Microservices Ready**: Can easily transition from a modular monolith to distributed microservices if transaction volumes ever demand it.

## Trade-offs
- Slight framework opinionation and decorator overhead compared to minimal Express or Fastify.
- Steeper initial learning curve for engineers unfamiliar with Angular/NestJS dependency injection.

## Consequences
- The API application is housed in `apps/api/src/`.
- Clear module boundaries: `src/modules/{domain}` and shared infrastructure in `src/infrastructure/{concern}`.
- OpenAPI/Swagger documentation generated automatically via `@nestjs/swagger`.

## Alternatives Rejected
- *Bare Express/Fastify*: Lacks built-in modular structure, DI, and standardized architecture; high risk of architectural decay over time.
- *Go / Python*: Introduces polyglot maintenance overhead across frontend, packages, and backend when TypeScript satisfies all performance criteria.

## Future Implications
Enables modular extraction of compute-heavy modules (e.g. AI matching, search indexing) into standalone services without rewriting domain boundaries.
