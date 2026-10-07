# ADR-006: Selection of Amazon S3-Compatible Object Storage with Signed URLs

**Status:** Accepted  
**Date:** 2026-10-07  
**Deciders:** Lead Software Architect, Security Architect  
**Classification:** Core Architectural Decision  

---

## 1. Context
MerQent handles sensitive files: consultant resumes, verification evidence (redacted contracts, CPA/PMP certifications), PE project briefs, and conversation attachments. Files must be stored securely, encrypted at rest, protected against public traversal, and transferred directly between client and storage to avoid proxying heavy byte streams through backend application servers.

## 2. Problem
Select an object storage architecture that enforces strict access control, virus scanning, and compliance with enterprise security expectations.

## 3. Options Considered
- **Option 1:** Amazon S3 (or MinIO for local development) with Pre-Signed URLs and AWS KMS encryption
- **Option 2:** Google Cloud Storage (GCS)
- **Option 3:** Cloudflare R2
- **Option 4:** Local / Database BLOB storage

## 4. Decision
Select **Amazon S3** (using **MinIO** for local development and test environments) using an **S3-Compatible Storage Adapter** with:
- Pre-signed PUT URLs for direct client uploads with strict MIME and content-length constraints.
- Pre-signed GET URLs with short TTL (maximum 15 minutes) issued only after domain authorization.
- Server-side encryption via AES-256 / AWS KMS (SSE-KMS).
- Asynchronous virus/malware verification hook (ClamAV / GuardDuty).

## 5. Why Selected
1. **Zero-Proxy Architecture:** Eliminates CPU, memory, and bandwidth saturation on backend API instances by allowing browsers to upload and download directly to S3 via signed URLs.
2. **Fine-Grained Authorization:** The backend remains the sole authority generating signed URLs, verifying tenant ownership before granting access.
3. **Local Dev Parity:** MinIO runs effortlessly in Docker Compose, providing 100% S3 API compatibility for offline local testing and CI pipelines.
4. **Institutional Trust:** AWS S3 and KMS key management are standard prerequisites for institutional PE compliance reviews.

## 6. Alternatives Rejected
- **Database BLOBs:** Severely degrades database buffer pool performance, bloats backups, and limits scalability.
- **Direct Backend Proxying:** Storing files through the backend API consumes excessive server RAM and creates denial-of-service vulnerabilities.

## 7. Trade-offs & Consequences
- **Trade-off:** Two-step upload flow (Client requests signed URL → Client uploads to S3 → Client confirms upload to API).
- **Consequence:** Frontend client must implement upload progress bars and confirmation handshakes.

## 8. Migration & Future Implications
- Code interfaces interact via `@aws-sdk/client-s3` through an abstract `IStorageService`, enabling zero-code-change switching between AWS S3, Cloudflare R2, Google Cloud Storage, or MinIO.
