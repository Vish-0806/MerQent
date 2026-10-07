# ADR-012: Deployment Architecture — Containerized Cloud & Hybrid Strategy

## Context
MerQent requires a scalable, reproducible deployment strategy that supports multi-stage environments (`development`, `staging`, `production`), automated CI/CD validation, zero-downtime rollouts, and multi-cloud portability (e.g. AWS ECS / Render / Fly.io / GCP Cloud Run).

## Problem
Selecting a deployment topology that minimizes operational complexity in early phases while providing production-ready security, environment isolation, automated migrations, and zero cloud vendor lock-in.

## Options Considered
1. **Containerized Monorepo Deployments (Docker / OCI Images on Managed Cloud)** (Selected)
2. **Kubernetes (EKS / GKE)**
3. **Serverless Functions (AWS Lambda / Vercel Serverless for API)**
4. **Virtual Machines (EC2 / Bare Metal)**

## Decision
Adopt **Containerized OCI Services (Docker)** deployed across managed container runtimes:
- **Web Frontend (`apps/web`)**: Next.js deployed as a standalone Node.js container or optimized Vercel edge deployment.
- **Backend API (`apps/api`)**: Multi-stage Docker container deployed to managed container platforms (e.g., AWS ECS Fargate, GCP Cloud Run, or Render/Railway for staging).
- **PostgreSQL Database**: Managed PostgreSQL (AWS RDS / Supabase / Neon) with automated daily snapshots and point-in-time recovery (PITR).
- **Redis Cache & Workers**: Managed Redis for BullMQ queues and Socket.IO adapter.

## Rationale
- **Portability**: Standard Docker containers run identically locally via Docker Compose, in CI test runners, and across any major cloud platform.
- **Predictable Performance**: Persistent long-running containers provide stable connection pooling to PostgreSQL and persistent WebSocket connections without serverless cold starts.
- **Zero Kubernetes Overhead**: Avoids early-stage Kubernetes operational burden (Ingress controllers, Helm charts, node pools) while remaining easily containerized for Kubernetes when scale dictates.

## Trade-offs
- Requires managing container registry credentials and environment variable injection via secret managers.

## Consequences
- Multi-stage Dockerfiles maintained in `infrastructure/docker/`.
- CI/CD workflow defined in `.github/workflows/ci.yml`.

## Alternatives Rejected
- *Kubernetes*: Massive premature operational complexity for a B2B platform in Phase 1/2.
- *Serverless (AWS Lambda for API)*: Severe cold-start latencies, connection pooling exhaustion on PostgreSQL, and incompatibility with long-lived Socket.IO WebSocket connections.

## Future Implications
Transitioning to Kubernetes or multi-region ECS requires zero code changes due to strict 12-factor container design.
