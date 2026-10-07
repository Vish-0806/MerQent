# MerQent — API Contract & Endpoint Overview

## 1. API Architecture Principles
The MerQent API (`apps/api`) exposes a standardized RESTful API and WebSockets gateway designed with an **API-First** mindset:
- **Base URI**: `/api/v1`
- **Specification**: Complete OpenAPI 3.0 specification maintained in [`openapi.yaml`](file:///c:/Users/Vishal%20S%20Naik/MyProjects/MerQent/docs/api/openapi.yaml).
- **Format**: All payloads use JSON (`application/json`) with camelCase properties.
- **Authentication**: JWT Bearer token passed in `Authorization: Bearer <token>`.
- **Statelessness**: REST endpoints are fully stateless; sessions are verified cryptographically.
- **Pagination**: Consistent keys (`page`, `pageSize`, `totalCount`, `totalPages`, `hasNextPage`).

---

## 2. API Domain Mapping

| Domain Prefix | Primary Operations | Transport | Access Control |
| :--- | :--- | :---: | :---: |
| `/api/v1/auth` | Register, login, refresh, logout, password-reset | REST | Public / Bearer |
| `/api/v1/users` | Current user profile (`/me`), preferences, settings | REST | Authenticated |
| `/api/v1/organizations` | PE firm profile, portfolio companies, member invites | REST | `PE_FIRM` |
| `/api/v1/consultants` | Profile, ERP matrices, deal history, availability | REST | `CONSULTANT` / Public (redacted) |
| `/api/v1/taxonomies` | Controlled taxonomies (ERPs, industries, deal types) | REST | Public / Read-Only |
| `/api/v1/projects` | Post project, scope, requirements, update status | REST | `PE_FIRM` |
| `/api/v1/search` | Faceted & semantic candidate discovery | REST | `PE_FIRM` |
| `/api/v1/matches` | View candidate matches, scores, explainability | REST | `PE_FIRM` |
| `/api/v1/shortlists` | Manage shortlists, compare candidates side-by-side | REST | `PE_FIRM` |
| `/api/v1/connections` | Initiate, accept, decline, withdraw connection | REST | `PE_FIRM` / `CONSULTANT` |
| `/api/v1/conversations` | Conversation channels, message history, read status | REST | Connected Parties |
| `/api/v1/messages` | WebSockets event streaming (`message:new`, typing) | Socket.IO | Connected Parties |
| `/api/v1/meetings` | Propose meeting, confirm, cancel, download `.ics` | REST | Connected Parties |
| `/api/v1/notifications` | List notifications, mark read, user preferences | REST + Socket.IO | Authenticated |
| `/api/v1/files` | Presign upload URL, verify file, presign download URL | REST | Authenticated |
| `/api/v1/verification` | Submit verification dossier, view verification status | REST | `CONSULTANT` |
| `/api/v1/admin` | Approve/reject verification, user moderation, audit | REST | `ADMIN` |
| `/api/v1/analytics` | Firm funnels, consultant metrics, matching KPIs | REST | Authenticated / Admin |

---

## 3. Realtime WebSockets Gateway
- **Endpoint**: `/realtime/messages` and `/realtime/notifications`
- **Handshake**: Authenticated via JWT passed in `handshake.auth.token`.
- **Rooms**: `conversation:{id}` and `user:{userId}`.
