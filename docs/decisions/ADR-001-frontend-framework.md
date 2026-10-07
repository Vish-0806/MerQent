# ADR-001: Selection of Next.js (App Router / React) for Frontend Application

**Status:** Accepted  
**Date:** 2026-10-07  
**Deciders:** Lead Software Architect, Principal Engineer  
**Classification:** Core Architectural Decision  

---

## 1. Context
MerQent requires a modern, responsive web application for Private Equity firm users, PMI consultants, and platform administrators. The frontend must deliver high visual polish, sub-second initial page loads, SEO-optimized public landing pages and anonymized consultant preview cards, alongside a secure, complex, authenticated dashboard experience (matching, chat, shortlists, scheduling).

## 2. Problem
Choosing between a Client-Side Single Page Application (SPA via Vite/React), a Hybrid Server-Rendered framework (Next.js App Router), or alternative ecosystems (Remix, Vue/Nuxt) impacts developer velocity, bundle sizes, performance, and SEO capabilities.

## 3. Options Considered
- **Option 1:** Single Page Application (Vite + React)
- **Option 2:** Next.js 14+ with App Router (React Server Components + React 18/19)
- **Option 3:** Remix / React Router v7
- **Option 4:** Nuxt 3 (Vue.js)

## 4. Decision
Select **Next.js 14+ (App Router)** with **TypeScript**, styled using **Tailwind CSS** and headless UI primitives (**Radix UI / shadcn/ui**).

## 5. Why Selected
1. **Hybrid Rendering:** React Server Components (RSC) allow fetching read-only data on the server with zero client bundle overhead, while client components provide dynamic, interactive state for chat and scheduling.
2. **SEO & Performance:** High performance for public landing pages, industry directory pages, and SEO metadata essential for organic PE/consultant discovery.
3. **Shared TypeScript Ecosystem:** Enables sharing validation schemas (Zod) and TypeScript DTO interfaces directly with the NestJS backend within a Turborepo monorepo.
4. **Rich Component Ecosystem:** Exceptional tooling with Radix UI, Tailwind, and Lucide icons, enabling enterprise-grade aesthetics with minimal boilerplate.

## 6. Alternatives Rejected
- **Vite React SPA:** Rejected due to poor initial load times for data-heavy views and complete inability to do server-side rendering for public consultant previews and marketing pages.
- **Remix:** Rejected due to a smaller component and community ecosystem compared to Next.js.
- **Nuxt / Vue:** Rejected to preserve a unified React/TypeScript ecosystem across web and future mobile development.

## 7. Trade-offs & Consequences
- **Trade-off:** Server-side mental model requires distinguishing between Server and Client Components (`"use client"`).
- **Consequence:** Requires Node.js hosting runtime (Vercel, AWS ECS, or Docker container) rather than static CDN object hosting.

## 8. Migration & Future Implications
- Code is built on standard React primitives; migration to Remix or standalone React is straightforward if required.
- API interactions use an abstracted API client layer, completely decoupled from Next.js server actions.
