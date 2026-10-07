# ADR-013: Observability Architecture — Structured Logging, Metrics, Tracing & Error Tracking

## Context
Operating a mission-critical private equity marketplace requires comprehensive visibility into request latencies, AI matching execution times, search performance, WebSocket connection states, background job failures, and security-relevant audit logs.

## Problem
Selecting an observability strategy that combines structured application logs, centralized error tracking, performance metrics, and distributed request tracing without tightly coupling domain modules to proprietary monitoring SDKs.

## Options Considered
1. **OpenTelemetry-Compatible Architecture + Pino Structured Logs + Sentry Error Tracking** (Selected)
2. **Ad-hoc `console.log` + Basic Server Logs**
3. **Proprietary All-in-One APM (Datadog / New Relic Agent)**

## Decision
Adopt **OpenTelemetry-Standard Instrumentation** coupled with:
- **Logging**: High-performance structured JSON logging via `pino` and `pino-http`, including correlation `x-request-id` on every HTTP request and WebSocket handshake.
- **Error Tracking**: Centralized exception capturing via Sentry SDK abstraction in NestJS global exception filters.
- **Metrics & Tracing**: OpenTelemetry traces and Prometheus-compatible metrics (`/health`, `/metrics` restricted to admin/internal).
- **Audit Logging**: Dedicated database-backed immutable `AuditLog` records for all administrative, security, and verification actions.

## Rationale
- **Zero Vendor Lock-In**: OpenTelemetry standard allows exporting traces and metrics to Datadog, Grafana Cloud, Jaeger, or CloudWatch without altering application code.
- **High-Performance JSON Logging**: Pino produces ultra-low-overhead JSON log streams ready for ingestion by Vector, FluentBit, or CloudWatch.
- **Contextual Correlation**: Every log line, error event, and audit record carries the correlation `requestId`, `userId` (when authenticated), and `organizationId`.

## Trade-offs
- Developers must use the centralized `AppLogger` service instead of native `console.log`.

## Consequences
- Logging and observability infrastructure housed in `src/infrastructure/observability/`.
- Sentry filter registered in NestJS bootstrap in `main.ts`.

## Alternatives Rejected
- *Ad-hoc Console Logs*: Unsearchable, unparseable, and lacks correlation IDs across micro-operations.
- *Proprietary APM Lock-in*: Steep recurring licensing fees and proprietary vendor SDK creep throughout application logic.

## Future Implications
Allows piping metrics to Grafana dashboards and setting automated alerts for AI token consumption and p99 search latency.
