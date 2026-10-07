# ADR-010: Observability & Monitoring Strategy — Pino, Sentry & OpenTelemetry

**Status:** Accepted  
**Date:** 2026-10-07  
**Deciders:** Lead Software Architect, DevOps Architect  
**Classification:** Core Architectural Decision  

---

## 1. Context
MerQent requires a unified, non-intrusive observability stack providing structured logging, distributed tracing, application error tracking, and performance metrics across the NestJS API and Next.js frontend. The platform must safeguard against accidental logging of sensitive PE deal data or credentials.

## 2. Problem
Evaluate whether to adopt an expensive all-in-one SaaS platform (Datadog), self-host an ELK stack, or adopt open standards using Pino, Sentry, and OpenTelemetry.

## 3. Options Considered
- **Option 1:** Pino (Structured JSON Logging) + Sentry (Error & Performance Tracing) + OpenTelemetry (Prometheus Metrics)
- **Option 2:** Datadog Full-Stack APM & Log Management
- **Option 3:** Self-hosted ELK Stack (Elasticsearch, Logstash, Kibana)

## 4. Decision
Select **Option 1: Pino + Sentry + OpenTelemetry**:
- **Structured Logging:** **Pino** configured in NestJS to output newline-delimited JSON with correlation IDs (`traceId`, `spanId`, `userId`, `firmId`). Automatic redaction rules for sensitive keys (`password`, `token`, `secret`, `authorization`, `creditCard`).
- **Error Tracking & Performance:** **Sentry** SDK integrated into both NestJS API and Next.js frontend, capturing unhandled exceptions, slow database queries, and frontend user session anomalies.
- **Metrics & Tracing:** **OpenTelemetry** instrumentation exporting standard RED metrics (Rate, Errors, Duration) to Prometheus / Grafana.

## 5. Why Selected
1. **Pino Performance:** Lowest CPU and memory overhead among Node.js loggers, with asynchronous writing and built-in PII redaction.
2. **Sentry Developer Experience:** Instant alert triage with stack traces, breadcrumbs, and release tagging for rapid debugging.
3. **Vendor Neutrality:** OpenTelemetry ensures MerQent can export telemetry to any future backend (Datadog, AWS CloudWatch, Grafana Cloud, or New Relic) without modifying code.
4. **Zero Heavy Cluster Management:** Avoids the heavy operational cost and storage footprint of maintaining an in-house ELK cluster.

## 6. Alternatives Rejected
- **Datadog:** Prohibitively expensive ($15+ per host + log indexing fees) for early-stage development.
- **ELK Stack:** Requires multiple dedicated servers and regular JVM / Elasticsearch index maintenance.

## 7. Trade-offs & Consequences
- **Trade-off:** Requires configuring Sentry project keys and setting up Prometheus metric scraping.
- **Consequence:** Logging libraries must be wrapped in a centralized logger module (`LoggerService`) to guarantee PII scrubbing across all services.

## 8. Migration & Future Implications
- Because OpenTelemetry standards are followed, any enterprise client demanding dedicated APM routing can be accommodated via OTel collector configuration.
