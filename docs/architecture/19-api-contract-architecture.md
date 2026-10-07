# MerQent — API Contract Architecture & Specification

**Document Version:** 1.0.0  
**Status:** Approved Architecture  
**Phase:** 1.20 — API Contract Architecture  
**Author:** Lead Software Architect & Principal Engineer  

---

## 1. API Design Philosophy & Standards

MerQent is designed **API-First**. The backend API is completely decoupled from any single client application. It serves as the universal contract for:
- The primary **Next.js 14+ Web Application**.
- Future **Mobile Applications** (Flutter / React Native).
- Future enterprise integrations (PE portfolio management systems, SSO providers, and reporting webhooks).

### Core Standards:
1. **Architectural Style:** Resource-oriented **RESTful JSON** adhering to OpenAPI 3.0 specifications.
2. **URI Versioning:** Explicit path versioning (`/api/v1/*`) ensuring backwards compatibility.
3. **Resource Naming:** Plural kebab-case nouns (e.g., `/api/v1/consultant-profiles`, `/api/v1/projects`).
4. **Standard HTTP Verbs:** `GET` (safe/idempotent read), `POST` (create mutation), `PATCH` (partial update), `PUT` (idempotent replacement), `DELETE` (removal).
5. **Standard HTTP Status Codes:** `200 OK`, `201 Created`, `202 Accepted`, `204 No Content`, `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `409 Conflict`, `422 Unprocessable Entity`, `429 Too Many Requests`, `500 Internal Server Error`.
6. **Error Format:** Strict adherence to **RFC 7807 Problem Details for HTTP APIs**.
7. **Idempotency:** Mutating endpoints (`POST /connections`, `POST /meetings`) support the `Idempotency-Key` header to prevent duplicate operations.

---

## 2. Global Request & Response Conventions

### 2.1 Standard Successful Response Envelope (Collections)
```json
{
  "data": [ ... ],
  "meta": {
    "totalCount": 142,
    "page": 1,
    "limit": 20,
    "hasMore": true
  }
}
```

### 2.2 Standard Error Response Contract (RFC 7807)
```json
{
  "type": "https://merqent.com/errors/connection-not-accepted",
  "title": "Connection Not Accepted",
  "status": 403,
  "code": "CONNECTION_NOT_ACCEPTED",
  "detail": "Messaging is restricted until the connection request is accepted by the counterparty.",
  "instance": "/api/v1/conversations/3fa85f64-5717-4562-b3fc-2c963f66afa6/messages",
  "traceId": "req-9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "timestamp": "2026-10-07T19:40:00.000Z"
}
```

---

## 3. Definitive API Domain Catalog

Below is the comprehensive endpoint catalog across all 16 platform domains:

---

### 3.1 Authentication & Sessions (`/api/v1/auth`)
| Method | Path | Summary | Auth Required | Roles |
|---|---|---|:---:|---|
| `POST` | `/auth/register` | Register new user (PE Firm or Consultant) | No | Public |
| `POST` | `/auth/login` | Authenticate credentials & issue session | No | Public |
| `POST` | `/auth/refresh` | Rotate access token using refresh token | No (Cookie/Header) | Public |
| `POST` | `/auth/logout` | Revoke active session and refresh token | Yes | All |
| `POST` | `/auth/mfa/setup` | Generate TOTP secret & QR code | Yes | All |
| `POST` | `/auth/mfa/verify` | Verify TOTP code and activate MFA | Yes | All |
| `POST` | `/auth/forgot-password` | Request password reset token via email | No | Public |
| `POST` | `/auth/reset-password` | Execute password reset with token | No | Public |

---

### 3.2 User & Profile Management (`/api/v1/users`)
| Method | Path | Summary | Auth Required | Roles |
|---|---|---|:---:|---|
| `GET` | `/users/me` | Fetch currently authenticated user context | Yes | All |
| `PATCH` | `/users/me` | Update personal profile (name, avatar) | Yes | All |
| `DELETE` | `/users/me` | Request GDPR account deletion | Yes | All |

---

### 3.3 Organizations & Firms (`/api/v1/firms`)
| Method | Path | Summary | Auth Required | Roles |
|---|---|---|:---:|---|
| `GET` | `/firms/me` | Fetch caller's firm profile and team roster | Yes | `PE_FIRM_*` |
| `PATCH` | `/firms/me` | Update firm metadata (legal name, website) | Yes | `PE_FIRM_ADMIN` |
| `POST` | `/firms/me/invitations` | Invite a colleague to join firm account | Yes | `PE_FIRM_ADMIN` |
| `DELETE` | `/firms/me/members/:id`| Remove colleague from firm account | Yes | `PE_FIRM_ADMIN` |

---

### 3.4 Consultant Profiles & Case Studies (`/api/v1/consultant-profiles`)
| Method | Path | Summary | Auth Required | Roles |
|---|---|---|:---:|---|
| `GET` | `/consultant-profiles/me` | Fetch caller's full consultant profile | Yes | `CONSULTANT_OPERATOR` |
| `PUT` | `/consultant-profiles/me` | Update headline, bio, role type, availability | Yes | `CONSULTANT_OPERATOR` |
| `POST` | `/consultant-profiles/me/experiences` | Add past M&A integration case study | Yes | `CONSULTANT_OPERATOR` |
| `DELETE` | `/consultant-profiles/me/experiences/:id` | Remove an experience entry | Yes | `CONSULTANT_OPERATOR` |
| `POST` | `/consultant-profiles/me/certifications` | Add professional certification | Yes | `CONSULTANT_OPERATOR` |
| `GET` | `/consultant-profiles/:id` | Fetch public/connected consultant profile | Yes | All |

---

### 3.5 Controlled Taxonomies (`/api/v1/taxonomies`)
| Method | Path | Summary | Auth Required | Roles |
|---|---|---|:---:|---|
| `GET` | `/taxonomies` | List active terms (filterable by category) | Yes | All |
| `GET` | `/taxonomies/tree` | List hierarchical taxonomy tree (ERPs, etc.) | Yes | All |

---

### 3.6 PMI Projects (`/api/v1/projects`)
| Method | Path | Summary | Auth Required | Roles |
|---|---|---|:---:|---|
| `GET` | `/projects` | List caller's firm projects (paginated) | Yes | `PE_FIRM_*` |
| `POST` | `/projects` | Create new PMI project | Yes | `PE_FIRM_*` |
| `GET` | `/projects/:id` | Get full project details and requirements | Yes | `PE_FIRM_*` |
| `PATCH` | `/projects/:id` | Update project scope and requirements | Yes | `PE_FIRM_*` |
| `POST` | `/projects/:id/publish` | Transition project status to ACTIVE | Yes | `PE_FIRM_ADMIN` |
| `POST` | `/projects/:id/close` | Transition project status to CLOSED | Yes | `PE_FIRM_ADMIN` |
| `GET` | `/projects/marketplace` | List anonymized active projects | Yes | `CONSULTANT_OPERATOR` |

---

### 3.7 Search & Discovery (`/api/v1/search`)
| Method | Path | Summary | Auth Required | Roles |
|---|---|---|:---:|---|
| `GET` | `/search/consultants` | Faceted & semantic candidate search | Yes | `PE_FIRM_*`, Admin |
| `GET` | `/search/facets` | Fetch real-time facet aggregation counts | Yes | `PE_FIRM_*`, Admin |

---

### 3.8 AI Matching & Recommendations (`/api/v1/matches`)
| Method | Path | Summary | Auth Required | Roles |
|---|---|---|:---:|---|
| `POST` | `/matches/projects/:projectId/run` | Trigger AI matching calculation for project | Yes | `PE_FIRM_*` |
| `GET` | `/matches/projects/:projectId` | Fetch ranked candidate recommendations | Yes | `PE_FIRM_*` |
| `GET` | `/matches/:id/explanation` | Fetch grounded explainability rationale | Yes | `PE_FIRM_*` |

---

### 3.9 Shortlists & Candidate Comparison (`/api/v1/shortlists`)
| Method | Path | Summary | Auth Required | Roles |
|---|---|---|:---:|---|
| `GET` | `/shortlists/projects/:projectId` | Fetch project shortlist candidates & notes | Yes | `PE_FIRM_*` |
| `POST` | `/shortlists/projects/:projectId/items`| Add consultant to project shortlist | Yes | `PE_FIRM_*` |
| `DELETE` | `/shortlists/projects/:projectId/items/:id` | Remove candidate from shortlist | Yes | `PE_FIRM_*` |
| `GET` | `/shortlists/projects/:projectId/compare` | Get side-by-side candidate comparison matrix | Yes | `PE_FIRM_*` |

---

### 3.10 Connections & Engagement Gates (`/api/v1/connections`)
| Method | Path | Summary | Auth Required | Roles |
|---|---|---|:---:|---|
| `GET` | `/connections` | List caller's connections (Pending, Accepted) | Yes | All |
| `POST` | `/connections` | Dispatch connection request to consultant | Yes | `PE_FIRM_*` |
| `POST` | `/connections/:id/accept` | Accept connection request | Yes | `CONSULTANT_OPERATOR` |
| `POST` | `/connections/:id/decline` | Decline connection request | Yes | `CONSULTANT_OPERATOR` |
| `POST` | `/connections/:id/cancel` | Cancel pending connection request | Yes | `PE_FIRM_*` |

---

### 3.11 Secure Messaging (`/api/v1/conversations`)
| Method | Path | Summary | Auth Required | Roles |
|---|---|---|:---:|---|
| `GET` | `/conversations` | List user's active conversations | Yes | All |
| `GET` | `/conversations/:id/messages` | Fetch messages (cursor-paginated) | Yes | Participant |
| `POST` | `/conversations/:id/messages` | Send message (connection must be ACCEPTED) | Yes | Participant |
| `POST` | `/conversations/:id/read` | Mark messages as read (issues read receipt) | Yes | Participant |

---

### 3.12 Scheduling & Meetings (`/api/v1/meetings`)
| Method | Path | Summary | Auth Required | Roles |
|---|---|---|:---:|---|
| `GET` | `/meetings` | List scheduled meetings | Yes | All |
| `POST` | `/meetings/propose` | Propose meeting slot (connection must be ACCEPTED) | Yes | Connected |
| `POST` | `/meetings/:id/confirm` | Confirm meeting slot & generate .ics | Yes | Connected |
| `POST` | `/meetings/:id/cancel` | Cancel meeting & dispatch cancellation .ics | Yes | Connected |
| `GET` | `/meetings/:id/ics` | Download RFC 5545 `.ics` calendar file | Yes | Connected |

---

### 3.13 Real-Time WebSockets & Notifications (`/realtime` & `/api/v1/notifications`)
| Method / Protocol | Path | Summary | Auth Required | Roles |
|---|---|---|:---:|---|
| `WSS (Socket.IO)` | `/realtime/messages` | Bidirectional messaging stream, typing, receipts | Yes | Connected |
| `WSS (Socket.IO)` | `/realtime/notifications` | Real-time in-app notification event channel | Yes | All |
| `GET` | `/notifications` | List in-app notifications (paginated) | Yes | All |
| `PATCH` | `/notifications/:id/read` | Mark notification as read | Yes | All |
| `GET` | `/notifications/preferences` | Fetch notification delivery preferences | Yes | All |
| `PUT` | `/notifications/preferences` | Update notification preferences | Yes | All |

---

### 3.14 File & Document Storage (`/api/v1/files`)
| Method | Path | Summary | Auth Required | Roles |
|---|---|---|:---:|---|
| `POST` | `/files/upload-url` | Request pre-signed S3 upload PUT URL | Yes | All |
| `POST` | `/files/confirm-upload` | Confirm completed upload & queue malware scan | Yes | All |
| `GET` | `/files/:id/download-url` | Request authorized pre-signed S3 download GET URL | Yes | Authorized |

---

### 3.15 Trust & Verification (`/api/v1/verification`)
| Method | Path | Summary | Auth Required | Roles |
|---|---|---|:---:|---|
| `GET` | `/verification/status` | Fetch caller's active badge tier & requests | Yes | `CONSULTANT_OPERATOR` |
| `POST` | `/verification/requests` | Submit request for tier elevation with evidence | Yes | `CONSULTANT_OPERATOR` |

---

### 3.16 Administration & Governance (`/api/v1/admin`)
| Method | Path | Summary | Auth Required | Roles |
|---|---|---|:---:|---|
| `GET` | `/admin/verification-queue` | List pending consultant verification claims | Yes | `VERIF_REVIEWER`, Admin |
| `POST` | `/admin/verification-requests/:id/decide` | Approve / Reject verification request | Yes | `VERIF_REVIEWER`, Admin |
| `GET` | `/admin/taxonomies` | Manage controlled taxonomies | Yes | `PLATFORM_ADMIN` |
| `POST` | `/admin/taxonomies` | Add new taxonomy term | Yes | `PLATFORM_ADMIN` |
| `PATCH` | `/admin/users/:id/status` | Suspend or activate user account | Yes | `PLATFORM_ADMIN` |
| `GET` | `/admin/ai/low-confidence` | Inspect low-confidence match recommendations | Yes | `PLATFORM_ADMIN` |
| `GET` | `/admin/audit-logs` | Inspect tamper-evident audit trail | Yes | `PLATFORM_ADMIN` |

---

## 4. Mobile Client Compatibility Guarantee

To guarantee seamless integration for a future Flutter or React Native mobile client:
1. **Zero Cookie Lock-In:** All authenticated endpoints accept `Authorization: Bearer <token>` interchangeably with HttpOnly session cookies.
2. **Predictable Payloads:** All responses use standard JSON objects without browser-specific HTML fragments or server action wrappers.
3. **Cursor-Based Chat:** Infinite scrolling in chat and notifications uses timestamp cursors, natively supported by mobile list views (`ListView.builder`).
