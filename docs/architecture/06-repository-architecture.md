# MerQent — Concrete Repository Architecture

**Document Version:** 1.0.0  
**Status:** Approved Architecture  
**Phase:** 1.6 — Concrete Repository Architecture  
**Author:** Lead Software Architect & Principal Engineer  

---

## 1. Monorepo Organization & Philosophy

MerQent is organized as an enterprise-grade TypeScript monorepo orchestrated by **Turborepo** and managed with **pnpm workspaces**. This architecture guarantees:
- **Strict Boundary Enforcement:** Apps cannot import internal files from other apps; all cross-boundary sharing flows strictly through versioned workspace packages (`@merqent/*`).
- **Unified End-to-End Typing:** Shared validation schemas (Zod) and TypeScript types eliminate impedance mismatch between frontend and backend.
- **Fast, Cached CI Pipelines:** Turborepo hashes inputs, source files, and dependencies to execute builds, lints, and unit tests with remote caching capabilities.

---

## 2. Definitive Repository Directory Tree

```text
MerQent/
├── .github/
│   └── workflows/
│       ├── ci.yml                    # Pull Request CI pipeline (Lint, Typecheck, Test, Audit)
│       └── cd.yml                    # Staging & Production deployment pipeline
├── apps/
│   ├── web/                          # Next.js 14+ Frontend Application
│   │   ├── public/                   # Static public assets (favicons, brand assets)
│   │   ├── src/
│   │   │   ├── app/                  # Next.js App Router (pages, layouts, route handlers)
│   │   │   ├── components/           # UI components (Radix primitives, layout, feature blocks)
│   │   │   ├── hooks/                # Custom React hooks (auth, SSE events, queries)
│   │   │   ├── lib/                  # Utilities, API client configuration, formatters
│   │   │   └── styles/               # Global CSS, Tailwind configuration
│   │   ├── tests/                    # Frontend unit & component tests
│   │   ├── next.config.mjs           # Next.js build configuration
│   │   ├── package.json              # App-specific dependencies
│   │   ├── postcss.config.mjs        # PostCSS configuration
│   │   ├── tailwind.config.ts        # Tailwind design system tokens
│   │   └── tsconfig.json             # App TypeScript configuration
│   │
│   └── api/                          # NestJS Backend API Service
│       ├── src/
│       │   ├── common/               # Cross-cutting guards, interceptors, filters, decorators
│       │   ├── config/               # Environment validation & configuration service
│       │   ├── database/             # Prisma schema, migrations, seeders, repository base
│       │   ├── modules/              # Domain modules (DDD aggregates)
│       │   │   ├── iam/              # Identity, Auth, Sessions, RBAC guards
│       │   │   ├── firms/            # PE Firm profiles & memberships
│       │   │   ├── consultants/      # Consultant profiles, experience, skills
│       │   │   ├── taxonomy/         # Controlled PMI taxonomies (ERPs, Deal types)
│       │   │   ├── projects/         # PMI projects & requirements
│       │   │   ├── search/           # Faceted & vector hybrid search
│       │   │   ├── matching/         # AI matching engine & explainable rationale
│       │   │   ├── shortlists/       # PE shortlists & comparative evaluation
│       │   │   ├── connections/      # Connection handshakes & gating
│       │   │   ├── messaging/        # Conversations, messages, attachments
│       │   │   ├── scheduling/       # Availability, meetings, .ics generator
│       │   │   ├── notifications/    # In-app alerts & transactional email
│       │   │   ├── files/            # Signed S3 URLs & file metadata
│       │   │   ├── verification/     # Verification requests, evidence & review
│       │   │   └── admin/            # Platform oversight, audit logs, moderation
│       │   ├── app.module.ts         # Root NestJS module wiring
│       │   └── main.ts               # Application entrypoint & OpenAPI bootstrap
│       ├── tests/                    # Integration & e2e API tests
│       ├── nest-cli.json             # NestJS CLI configuration
│       ├── package.json              # Backend dependencies
│       └── tsconfig.json             # Backend TypeScript configuration
│
├── packages/
│   ├── shared-types/                 # Shared TypeScript interfaces, DTOs & domain Enums
│   │   ├── src/
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── shared-validation/            # Zod validation schemas shared between Web and API
│   │   ├── src/
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── shared-config/                # Shared ESLint, Prettier, and TypeScript base configs
│   │   ├── eslint/
│   │   ├── typescript/
│   │   └── package.json
│   │
│   └── ui/                           # Shared design tokens & headless component wrappers
│       ├── src/
│       ├── package.json
│       └── tsconfig.json
│
├── infrastructure/
│   ├── docker/
│   │   ├── docker-compose.yml        # Local development infrastructure (Postgres, Redis, MinIO)
│   │   ├── Dockerfile.api            # Multi-stage production container for NestJS API
│   │   └── Dockerfile.web            # Multi-stage production container for Next.js Web
│   ├── database/
│   │   ├── init.sql                  # PostgreSQL extensions initialization (`pgvector`, `pg_trgm`)
│   │   └── seeds/                    # Governed PMI taxonomy seed data
│   └── environments/
│       ├── .env.development.example
│       ├── .env.staging.example
│       └── .env.production.example
│
├── docs/                             # Canonical architecture, product & decision documents
│   ├── product/
│   ├── architecture/
│   ├── decisions/
│   ├── phase-reports/
│   ├── api/
│   ├── database/
│   ├── ai/
│   ├── security/
│   ├── testing/
│   └── deployment/
│
├── scripts/
│   ├── setup-dev.sh / .ps1           # Developer onboarding bootstrap script
│   └── validate-architecture.sh      # Automated lint and boundary validation
│
├── tests/
│   ├── e2e/                          # Cross-application end-to-end integration tests (Playwright)
│   └── security/                     # Automated security boundary & permission tests
│
├── .editorconfig                     # Editor formatting consistency
├── .env.example                      # Root environment variable template
├── .gitignore                        # Git exclusion rules
├── package.json                      # Root workspace scripts & devDependencies
├── pnpm-lock.yaml                    # Deterministic lockfile
├── pnpm-workspace.yaml               # pnpm workspace definition
├── README.md                         # Project documentation entrypoint
├── tsconfig.base.json                # Root TypeScript compiler options
└── turbo.json                        # Turborepo task pipeline configuration
```

---

## 3. Dependency Rules & Import Boundaries

To prevent architectural erosion, MerQent enforces strict boundaries:

1. **Horizontal Isolation:** Code in `apps/web` **CANNOT** import from `apps/api`, and vice versa. Any shared code must reside in `packages/*`.
2. **Downward Dependency Direction:** 
   ```text
   apps/web   ───► packages/shared-types, packages/shared-validation, packages/ui
   apps/api   ───► packages/shared-types, packages/shared-validation
   packages/* ───► May NOT import from any app
   ```
3. **Module Encapsulation in Backend:**
   - Modules in `apps/api/src/modules/*` must expose their public API strictly through a designated `[module-name].service.ts` or `index.ts`.
   - Direct cross-module imports into internal repositories or private providers are prohibited by ESLint boundary rules.

---

## 4. Naming & Coding Conventions

- **Files & Folders:** `kebab-case` for all files and directories (e.g., `consultant-profile.service.ts`, `project-card.tsx`).
- **Classes & Interfaces:** `PascalCase` (e.g., `ConsultantProfileService`, `ProjectRequirementDto`).
- **Enums:** `SCREAMING_SNAKE_CASE` keys and values (e.g., `VerificationTier.TIER_2_CREDENTIAL`).
- **Database Tables & Columns:** `snake_case` in SQL / Prisma mappings (e.g., `consultant_profiles`, `years_pmi_experience`).
- **API Endpoints:** Plural nouns in `kebab-case` with standard RESTful conventions (e.g., `GET /api/v1/consultant-profiles/:id`).

---

## 5. Configuration & Environment Management

Environment variables are managed centrally with zero committed secrets:
- Every application validates its environment variables on startup using `zod`. If any required environment variable is missing or malformed, the process fails fast with an explicit error.
- All template variables are documented in `.env.example`.
