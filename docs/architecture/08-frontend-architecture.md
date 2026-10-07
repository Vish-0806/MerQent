# MerQent — Frontend Web Application Architecture

**Document Version:** 1.0.0  
**Status:** Approved Architecture  
**Phase:** 1.8 — Frontend Architecture  
**Author:** Lead Software Architect & Principal Engineer  

---

## 1. Frontend Architectural Philosophy

The MerQent web frontend is built on **Next.js 14+ (App Router)** with **TypeScript**, **Tailwind CSS**, and headless primitives from **Radix UI** (via shadcn/ui). The architecture delivers a high-trust, premium B2B user experience adhering to strict core principles:
1. **Server-First by Default:** React Server Components (RSC) handle data fetching, permission checks, and static SEO rendering on the server, eliminating client waterfall requests and keeping JavaScript bundle sizes lean.
2. **Explicit Client Boundaries:** The `"use client"` directive is reserved strictly for interactive leaves: form inputs, live messaging threads, interactive scheduling pickers, and real-time SSE notification listeners.
3. **Resilient UX States:** Every route defines dedicated `loading.tsx` (skeleton loaders), `error.tsx` (fault-tolerant recovery boundaries), and contextual empty states.
4. **Accessibility & Design Excellence:** WCAG 2.1 AA compliant, curated HSL color tokens, dark mode readiness, fluid typography, and micro-interactions.

---

## 2. Next.js App Router Structure & Route Map

```text
apps/web/src/app/
├── (public)/                         # Marketing, Public Discovery & Legal
│   ├── layout.tsx                    # Public header & footer
│   ├── page.tsx                      # Landing page (hero, value prop, differentiators)
│   ├── about/page.tsx                # About MerQent & PMI philosophy
│   ├── pmi-directory/                # Public/anonymized directory of ERP & industry experts
│   │   ├── page.tsx                  # Browse by ERP, deal type, industry
│   │   └── [slug]/page.tsx           # Taxonomy-specific landing page (SEO optimized)
│   ├── privacy/page.tsx              # Privacy policy & data governance
│   └── terms/page.tsx                # Terms of service
│
├── (auth)/                           # Unauthenticated Authentication Flows
│   ├── layout.tsx                    # Centered, focused auth container
│   ├── login/page.tsx                # Email/Password + TOTP MFA challenge
│   ├── register/page.tsx             # Role selection (PE Firm vs. Consultant)
│   ├── register/firm/page.tsx        # PE Firm onboarding form
│   ├── register/consultant/page.tsx  # Consultant onboarding form
│   ├── verify-email/page.tsx         # Email confirmation token handler
│   └── forgot-password/page.tsx      # Password reset flow
│
├── (dashboard)/                      # Authenticated Application Shell (Role-Gated)
│   ├── layout.tsx                    # Shell layout: Top navigation, Sidebar, SSE Stream Listener
│   │
│   ├── firm/                         # PE Firm Workspace (Role: PE_FIRM_ADMIN / PE_FIRM_MEMBER)
│   │   ├── page.tsx                  # Firm overview (active projects, pending requests, matches)
│   │   ├── projects/
│   │   │   ├── page.tsx              # Active projects list
│   │   │   ├── new/page.tsx          # Multi-step project creation wizard
│   │   │   └── [projectId]/
│   │   │       ├── page.tsx          # Project details & requirements breakdown
│   │   │       ├── edit/page.tsx     # Project editor
│   │   │       ├── matches/page.tsx  # AI match recommendations & explainability cards
│   │   │       └── shortlist/page.tsx# Project shortlist & comparison matrix
│   │   ├── discovery/page.tsx        # Faceted consultant search & semantic discovery
│   │   └── team/page.tsx             # Team members & firm settings
│   │
│   ├── consultant/                   # Consultant Workspace (Role: CONSULTANT_OPERATOR)
│   │   ├── page.tsx                  # Consultant dashboard (profile status, opportunities)
│   │   ├── profile/
│   │   │   ├── page.tsx              # Live profile preview
│   │   │   └── edit/page.tsx         # Profile editor (bio, ERPs, case studies, availability)
│   │   ├── verification/page.tsx     # Verification center (badge status, submit evidence)
│   │   └── opportunities/page.tsx    # Recommended active PMI engagements
│   │
│   ├── connections/                  # Shared Bilateral Engagements
│   │   ├── page.tsx                  # All connections (Pending, Accepted, History)
│   │   └── [connectionId]/page.tsx   # Connection workspace (Project overview, context)
│   │
│   ├── messaging/                    # Secure Direct Messaging
│   │   ├── layout.tsx                # Split pane: Conversation list + Message thread
│   │   ├── page.tsx                  # Empty state ("Select a conversation")
│   │   └── [conversationId]/page.tsx # Active chat thread, attachments, read receipts
│   │
│   ├── scheduling/                   # Meeting Coordination
│   │   ├── page.tsx                  # Scheduled meetings calendar / list view
│   │   └── [meetingId]/page.tsx      # Meeting details, agenda, .ics download
│   │
│   ├── settings/                     # User Profile & Security Settings
│   │   ├── page.tsx                  # Account settings, notification preferences
│   │   └── security/page.tsx         # Password change, MFA TOTP configuration
│   │
│   └── admin/                        # Administrative Control Plane (Role: PLATFORM_ADMIN / VERIF_REVIEWER)
│       ├── layout.tsx                # Dedicated admin navigation & audit banner
│       ├── page.tsx                  # Admin metrics & high-level system status
│       ├── verification-queue/page.tsx # Reviewer queue for consultant evidence documents
│       ├── users/page.tsx            # User & firm moderation
│       ├── taxonomy/page.tsx         # Governed taxonomy editor (ERPs, Deal Types, Industries)
│       ├── ai-audit/page.tsx         # Low-confidence match audit & calibration
│       └── audit-logs/page.tsx       # Immutable system audit trail
│
├── api/                              # Next.js Route Handlers (Edge / Proxy utilities)
│   └── auth/callback/route.ts        # OAuth / magic link session receiver
└── not-found.tsx                     # 404 handler
```

---

## 3. Component Hierarchy & Feature Boundaries

Components in `apps/web/src/components` are divided into three clean tiers:

```mermaid
graph TD
    subgraph Tier 1: UI Primitives (packages/ui & components/ui)
        Button[Button]
        Badge[Badge]
        Dialog[Modal / Dialog]
        Input[Input / Form Controls]
        Card[Card Container]
        Tabs[Tabs & Navigation]
    end

    subgraph Tier 2: Layout & Application Shell (components/layout)
        AppShell[AppShell Layout]
        TopNav[Top Navigation Bar]
        Sidebar[Collapsible Sidebar]
        SSEListener[SSE Global Event Stream Listener]
        UserMenu[User Avatar & Role Menu]
    end

    subgraph Tier 3: Domain Feature Modules (components/features)
        MatchCard[MatchRecommendationCard]
        ExplainDialog[ExplainableRationaleDialog]
        ComparisonMatrix[CandidateComparisonTable]
        ChatThread[ConversationMessageThread]
        SchedulerWidget[MeetingProposalScheduler]
        VerifBadge[VerificationBadgeDisplay]
        EvidenceViewer[VerificationEvidenceViewer]
    end

    AppShell --> TopNav
    AppShell --> Sidebar
    AppShell --> SSEListener
    TopNav --> UserMenu

    MatchCard --> ExplainDialog
    MatchCard --> Badge
    MatchCard --> Button
    ComparisonMatrix --> Badge
    ChatThread --> Input
    ChatThread --> Button
    SchedulerWidget --> Dialog
```

---

## 4. State Management Strategy

To prevent state pollution, MerQent enforces a strict separation between **Server State** and **Client UI State**:

### 4.1 Server State (Data Fetching & Cache)
- **Read-Heavy Views (Projects, Profiles, Taxonomies):** Fetched directly in React Server Components (RSC) via standard `fetch()` with Next.js tag-based cache revalidation (`revalidateTag`).
- **Dynamic Client Views (Messaging, Notifications, Live Search):** Managed using **TanStack Query (React Query v5)** for optimistic UI updates, background polling, and cache invalidation upon receiving SSE events.

### 4.2 Client UI State (Ephemeral State)
- Local UI state (e.g., active modal, filter drawer open/closed, message input draft) is kept in standard React `useState` or `useReducer`.
- Cross-cutting ephemeral state (e.g., global unread message count, active SSE connection status) is stored in a lightweight **Zustand** store (`useAppStore`).

---

## 5. API Client Integration & End-to-End Typing

The frontend interacts with the NestJS API via an abstracted API client layer (`apps/web/src/lib/api-client.ts`):
- All request and response types are imported directly from `@merqent/shared-types`.
- All form inputs validate against `@merqent/shared-validation` Zod schemas using `react-hook-form` with `@hookform/resolvers/zod`.
- The API client automatically handles credentials (`credentials: 'include'`) for secure cookie transmission, intercepts `401 Unauthorized` responses to execute token refresh handshakes, and translates RFC 7807 error responses into user-friendly toast notifications.

---

## 6. UX Resilience & Responsive Standards

1. **Skeleton Loaders:** Every primary route provides a tailored `loading.tsx` mimicking the layout geometry (e.g., `MatchCardSkeleton`, `ProjectListSkeleton`) to eliminate layout shift (CLS < 0.1).
2. **Empty States:** Clear, actionable empty states with contextual guidance (e.g., "No candidates shortlisted yet. Discover qualified SAP consultants for your project.").
3. **Responsive Breakpoints:** 
   - Mobile (`< 768px`): Drawer-based navigation, single-column card stacks, optimized touch targets (>= 44px).
   - Tablet / Desktop (`>= 1024px`): Split-pane messaging, multi-column comparison tables, sticky filter sidebar.
4. **Accessibility:** Semantic HTML5 elements (`<main>`, `<nav>`, `<article>`, `<aside>`), fully navigable via keyboard, ARIA attributes on interactive Radix dialogs, and high-contrast color ratios exceeding 4.5:1.
