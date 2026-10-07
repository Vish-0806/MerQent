# ADR-001: Frontend Architecture — Next.js + TypeScript

## Context
MerQent is a specialized B2B marketplace connecting private equity firms with post-merger integration (PMI) consultants. The web application requires responsive search, complex consultant comparison matrices, structured profiles, and high-trust portal interfaces for PE sponsors, independent operators, and platform administrators.

## Problem
Selecting a web framework that provides production-grade performance, SEO capabilities for public landing and taxonomy pages, robust type safety, rapid iteration, and seamless server/client boundary management while remaining strictly decoupled from the backend REST/WebSocket API.

## Options Considered
1. **Next.js (App Router) + TypeScript** (Selected)
2. **Vite + React SPA + TypeScript**
3. **Remix / React Router v7**

## Decision
Adopt **Next.js 14+ (App Router) with TypeScript** as the primary web application architecture.

## Rationale
- **Hybrid Rendering Model**: Delivers Server-Side Rendering (SSR) and Static Site Generation (SSG) for public taxonomy and marketing routes, while enabling client-side interactivity for authenticated dashboards.
- **Strict Decoupling**: Communicates with the NestJS API purely over HTTP REST and WebSockets; no server actions or direct database access inside Next.js components.
- **Type Safety**: End-to-end type sharing with `@merqent/shared-types` and `@merqent/validation`.
- **Ecosystem Maturity**: Native support for Radix UI, Tailwind CSS, Lucide icons, and modern React patterns.

## Trade-offs
- Slightly higher hosting and build complexity than a pure static SPA.
- Must strictly discipline developers to prevent backend business logic leaks into Next.js route handlers.

## Consequences
- Frontend resides in `apps/web` with route groups: `(public)`, `(auth)`, `(firm)`, `(consultant)`, `(admin)`.
- Client communicates with `@merqent/api` via standard fetch clients and Socket.IO client.

## Alternatives Rejected
- *Pure SPA (Vite)*: Inferior SEO for public discovery of PMI expertise and heavier initial client bundle loads for enterprise users.
- *Remix*: Smaller enterprise ecosystem and talent pool compared to Next.js in B2B environments.

## Future Implications
Prepares the platform for mobile parity with Flutter by ensuring all business logic lives exclusively on the NestJS backend.
