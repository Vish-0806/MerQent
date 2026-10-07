# ADR-010: Email Architecture — Transactional Email Provider

## Context
MerQent requires transactional notifications for critical events: email verification, password reset, new high-confidence candidate matches, interview meeting proposals, connection requests, and admin verification status updates.

## Problem
Selecting a dependable transactional email architecture that provides high deliverability, domain authentication (SPF/DKIM/DMARC), queue-based background dispatching, and vendor abstraction to prevent tight coupling.

## Options Considered
1. **Resend / AWS SES with Nodemailer abstraction** (Selected)
2. **SendGrid**
3. **Postmark**
4. **Direct SMTP Server**

## Decision
Adopt an **Email Service Abstraction (`IEmailService`)** with a primary provider adapter for **Resend** (developer velocity, modern API, React-based templates) and **AWS SES** (enterprise cost efficiency), dispatched asynchronously via **BullMQ / Redis**.

## Rationale
- **Asynchronous Execution**: HTTP request threads never wait on external SMTP/API responses. Events push an email job to Redis queue for non-blocking processing.
- **Provider Portability**: The domain logic calls `emailService.sendVerificationEmail(...)` without knowledge of the underlying vendor.
- **Delivery Tracking**: Supports webhook ingestion for delivery, bounce, and spam complaint monitoring.
- **Local Dev Mock**: Development environment logs email contents to console or local mailhog without making external outbound calls.

## Trade-offs
- Requires Redis background worker infrastructure to guarantee at-least-once delivery and retries.

## Consequences
- Email provider interface defined in `src/infrastructure/email/`.
- Handled asynchronously via notification event listeners.

## Alternatives Rejected
- *SendGrid*: Inconsistent deliverability reputations and cumbersome developer onboarding compared to Resend.
- *Direct Self-Hosted SMTP*: Severe spam filtering risks, lack of IP warmup, and high operational maintenance.

## Future Implications
Enables enterprise PE firms to configure custom SPF/DKIM white-label sender domains if required.
