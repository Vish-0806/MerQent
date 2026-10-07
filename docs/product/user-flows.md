# MerQent — User Flows Specification

## 1. PE Firm Core Workflow

```mermaid
sequenceDiagram
    autonumber
    actor PE as PE Operating Partner
    participant Web as Next.js Web
    participant API as NestJS API
    participant AI as AI Matching Engine
    participant DB as PostgreSQL
    actor C as PMI Consultant

    PE->>Web: Create PMI Project (Scope, ERP, Deal Type)
    Web->>API: POST /api/v1/projects
    API->>DB: Persist Project
    API->>AI: Trigger Asynchronous Matching Job
    AI->>DB: Query Candidates (pgvector + Taxonomy Filter)
    AI->>AI: Calculate Multi-factor Score & Generate Explanation
    AI->>DB: Store Match Records
    API-->>Web: Notify Matches Ready (Socket.IO / Push)
    PE->>Web: View Shortlist & Compare Candidates
    PE->>Web: Send Connection Request
    Web->>API: POST /api/v1/connections
    API->>C: Notify Connection Request (Email + In-App)
    C->>Web: Accept Connection
    Web->>API: PATCH /api/v1/connections/:id/accept
    Note over PE, C: Realtime Messaging & Meeting Scheduling Unlocked
    PE->>C: Propose Discovery Meeting
    C->>PE: Confirm Meeting (.ics Calendar Invite Generated)
```

---

## 2. Consultant Onboarding & Verification Flow

```mermaid
sequenceDiagram
    autonumber
    actor C as Consultant
    participant Web as Next.js Web
    participant API as NestJS API
    participant Storage as S3 Object Storage
    actor Admin as MerQent Admin

    C->>Web: Register & Complete Profile (ERPs, Deal History)
    Web->>API: POST /api/v1/consultants/profile
    C->>Web: Request Verification (Upload Past Project Invoices / References)
    Web->>API: POST /api/v1/files/presign
    API-->>Web: Presigned S3 Upload URL
    Web->>Storage: Direct Binary Upload
    Web->>API: POST /api/v1/verification/requests
    API->>Admin: Alert Admin of New Dossier
    Admin->>Web: Review Dossier Evidence
    Admin->>API: PATCH /api/v1/admin/verification/:id (Approve -> Tier 2/3)
    API-->>C: Verification Approved Badge Emitted
```

---

## 3. Realtime Messaging & Interaction Flow
1. **Pre-requisite**: Connection request between PE Firm and Consultant must be in `ACCEPTED` state.
2. **Conversation Handshake**:
   - Web client connects to Socket.IO gateway (`/realtime/messages`) providing JWT in `auth.token`.
   - Gateway verifies token and joins client into room `conversation:{conversationId}`.
3. **Message Transmission**:
   - Sender posts message via REST `POST /api/v1/conversations/:id/messages` (for atomic persistence, file validation, and DB transaction).
   - Backend persists message and emits Socket.IO event `message:new` to room `conversation:{id}` and `notification:new` to recipient's `user:{recipientId}` room.
   - Recipient acknowledges message; Socket.IO emits `message:read` back to sender.
