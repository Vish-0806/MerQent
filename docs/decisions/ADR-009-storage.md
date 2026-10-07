# ADR-009: File & Document Storage — S3-Compatible Object Storage

## Context
MerQent processes sensitive confidential documents, including consultant resumes, certifications, transition service agreements (TSAs), project scope briefs, verification evidence, and message attachments.

## Problem
Selecting a storage architecture that avoids storing multi-megabyte binary blobs in the relational database while ensuring strict access control, virus scanning, signed temporal access URLs, and cloud portability.

## Options Considered
1. **S3-Compatible Object Storage (AWS S3 in production / MinIO in local dev)** (Selected)
2. **PostgreSQL Large Objects (BLOBs)**
3. **Local Filesystem Storage**
4. **Google Cloud Storage / Azure Blob Storage**

## Decision
Adopt an **S3-Compatible Object Storage Architecture** accessed via the AWS SDK v3, with MinIO for local development and AWS S3 (or any S3-compliant provider) for staging/production.

## Rationale
- **Decoupled Binary Storage**: PostgreSQL maintains file metadata, SHA-256 hashes, MIME types, and ownership, while raw binaries live in durable, encrypted object storage buckets.
- **Signed Temporal URLs**: Direct-to-client uploads and downloads use time-limited presigned URLs (15-minute expiry). Client reads never expose public bucket URLs; access is strictly mediated by NestJS authorization checks.
- **Local Dev Parity**: MinIO container runs in Docker Compose (`infrastructure/docker/docker-compose.yml`), matching production S3 API behavior with zero mock drift.
- **Security & Integrity**: Files are validated for MIME type magic bytes, scanned, and isolated in private buckets with server-side encryption (AES-256 / KMS).

## Trade-offs
- Presigned upload flows require a two-step handshake (`POST /api/v1/files/presign` -> Client Upload -> `POST /api/v1/files/:id/confirm`).

## Consequences
- File storage service abstracted behind `IStorageService` in `src/infrastructure/storage/`.
- Domain operations managed by `src/modules/files/`.

## Alternatives Rejected
- *PostgreSQL BLOBs*: Degrades database backup performance, bloats transaction logs, and exhausts DB connection memory.
- *Local Filesystem*: Breaks horizontal auto-scaling and ephemeral container deployments.

## Future Implications
Allows seamless integration of asynchronous antivirus scanners (ClamAV) and automated document OCR pipelines in background worker queues.
