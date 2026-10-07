# ADR-002: Selection of Node.js / NestJS for Backend Framework

**Status:** Accepted  
**Date:** 2026-10-07  
**Deciders:** Lead Software Architect, Principal Engineer  
**Classification:** Core Architectural Decision  

---

## 1. Context
MerQent requires an enterprise-grade backend to handle complex domain logic: multi-tenant authorization, multi-tiered verification, AI matching orchestration, grounded explanation synthesis, connection-gated messaging, and timezone-aware scheduling. The backend must be API-first to seamlessly serve both the web client and future mobile applications.

## 2. Problem
Evaluate whether to implement the backend using Node.js/NestJS, Python/FastAPI, Java/Spring Boot, or Go.

## 3. Options Considered
- **Option 1:** Node.js with NestJS (TypeScript)
- **Option 2:** Python with FastAPI
- **Option 3:** Java 21 with Spring Boot 3
- **Option 4:** Go with Chi / Gin

## 4. Decision
Select **Node.js (LTS 20+) with NestJS** using strict TypeScript.

## 5. Why Selected
1. **Architectural Discipline & DDD:** NestJS enforces an out-of-the-box modular architecture with Inversion of Control (IoC), Dependency Injection (DI), Modules, Controllers, Services, Guards, and Interceptors, directly reflecting our Domain-Driven Design model.
2. **End-to-End TypeScript Synergy:** Enables 100% code sharing of DTO interfaces, Zod validation schemas, and domain types across backend (`apps/api`), frontend (`apps/web`), and shared packages (`packages/shared-types`).
3. **Automated OpenAPI / Swagger:** First-class Swagger decorator support automatically compiles an accurate, interactive OpenAPI 3.0 specification from TypeScript classes.
4. **AI SDK Native Support:** Direct access to official TypeScript SDKs for OpenAI, Anthropic, and LangChain without inter-process communication overhead.
5. **Future Mobile Support:** Exposes standard, client-agnostic RESTful endpoints easily consumed by Flutter, React Native, or third-party webhooks.

## 6. Alternatives Rejected
- **FastAPI (Python):** Python is premier for model training, but MerQent consumes hosted LLM APIs. FastAPI requires maintaining duplicate type definitions between Python backend and TypeScript frontend.
- **Spring Boot 3 (Java):** High memory footprint (512MB+ baseline RAM), heavier verbosity, and slower iteration cycles than modern TypeScript.
- **Go:** Lacks declarative metadata, guards, and standardized dependency injection patterns suitable for rich enterprise B2B authorization pipelines.

## 7. Trade-offs & Consequences
- **Trade-off:** Node.js runs on a single-threaded event loop; CPU-intensive tasks (e.g., heavy cryptographic hashing) must be offloaded to worker threads or external services.
- **Consequence:** Password hashing (Argon2id) uses native libuv thread pools; background worker jobs run on Redis-backed queues (BullMQ).

## 8. Migration & Future Implications
- Clean module boundaries allow any NestJS module (e.g., `MatchingModule`) to be extracted into an independent microservice if future scale requires it.
