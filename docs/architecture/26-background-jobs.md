# MerQent — Background Jobs & Asynchronous Processing Architecture

**Document Version:** 1.0.0  
**Status:** Approved Master Architecture  
**Phase:** 1 — Master Architecture Correction  
**Author:** Lead Software Architect & Principal Engineer  

---

## 1. Executive Summary & Job Architecture Blueprint

To ensure low latency for user-facing HTTP requests (p95 < 200ms), long-running, resource-intensive, or external I/O-bound operations are processed asynchronously via **BullMQ** backed by **Redis 7+**.

```mermaid
graph TD
    subgraph HTTP Request Flow
        Client[Client Request] --> Controller[NestJS Controller]
        Controller --> Service[Domain Service]
        Service --> DB[(PostgreSQL)]
        Service --> Producer[BullMQ Job Producer]
    end

    subgraph Job Queues (Redis)
        Producer --> Q1[queue:ai-matching]
        Producer --> Q2[queue:notifications]
        Producer --> Q3[queue:file-processing]
        Producer --> Q4[queue:analytics]
    end

    subgraph Background Workers
        Q1 --> W1[AI Matching Worker]
        Q2 --> W2[Email / Push Worker]
        Q3 --> W3[Antivirus / OCR Worker]
        Q4 --> W4[Daily Metrics Worker]
    end

    W1 --> DB
    W2 --> ExternalEmail[Resend / AWS SES]
    W3 --> S3[(Object Storage)]
    W4 --> DB
```

---

## 2. Queue Inventory & Workload Distribution

| Queue Name | Typical Payload | Worker Responsibility | Concurrency / Rate Limit |
| :--- | :--- | :--- | :---: |
| `ai-matching` | `{ projectId: string, triggeredBy: string }` | Normalizes project requirements, queries `pgvector`, calculates multi-factor score, invokes LLM explanation, writes matches to DB. | 5 concurrent jobs |
| `notifications` | `{ recipientId: string, template: string, data: object }` | Renders email template, dispatches via Resend/SES, writes in-app notification record, triggers Socket.IO event. | 25 concurrent jobs |
| `file-processing` | `{ fileId: string, s3Key: string, mimeType: string }` | Runs ClamAV malware scan, verifies magic bytes, extracts text for resume indexing. | 10 concurrent jobs |
| `calendar-reminders`| `{ meetingId: string, reminderMinutes: number }` | Dispatches reminder notifications 24 hours and 1 hour prior to confirmed interview slots. | 10 concurrent jobs |
| `analytics-aggregation`| `{ date: string }` | Nightly aggregation of platform KPIs, active search volume, match conversion rates. | 1 job (cron scheduled) |

---

## 3. Reliability, Retries & Dead-Letter Queues (DLQ)

- **Exponential Backoff**: Transient failures (e.g. rate limits from OpenAI or temporary SMTP hiccups) retry up to 5 times using exponential backoff with jitter ($1\text{s}, 2\text{s}, 4\text{s}, 8\text{s}, 16\text{s}$).
- **Dead-Letter Handling**: Jobs that exhaust all retry attempts are routed to a failed dead-letter stream, triggering an automated alert in Sentry for operational triage.
- **Idempotency**: All job processors implement idempotency keys based on `{jobType}:{entityId}:{timestamp_window}` to prevent duplicate processing if jobs are retried.
