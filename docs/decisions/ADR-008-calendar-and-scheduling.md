# ADR-008: Calendar & Scheduling Strategy — Native Scheduler with RFC 5545 iCalendar Dispatch

**Status:** Accepted  
**Date:** 2026-10-07  
**Deciders:** Lead Software Architect, Principal Engineer  
**Classification:** Core Architectural Decision  

---

## 1. Context
MerQent facilitates introductory and scoping discussions between PE operating partners and PMI consultants across different global time zones. Scheduling must coordinate proposed meeting times, handle mutual confirmations, support cancellations/reschedules, and ensure calendar synchronization without creating external OAuth compliance dependencies during Phase 1-2.

## 2. Problem
Determine whether to build a platform-native scheduler dispatching standard `.ics` invites, implement full bidirectional Google/Outlook OAuth synchronization, or embed a third-party SaaS scheduling tool (e.g., Cal.com / Nylas).

## 3. Options Considered
- **Option 1:** Platform-Native Scheduler with RFC 5545 iCalendar (`.ics`) generation and email dispatch
- **Option 2:** Full bidirectional Google Calendar & Microsoft Graph OAuth synchronization
- **Option 3:** Third-party embedded SaaS (Cal.com / Nylas)

## 4. Decision
Implement **Option 1: Platform-Native Scheduler with RFC 5545 iCalendar (`.ics`)**:
- Users propose slots, negotiate times, and confirm meetings directly within MerQent's connection-gated interface.
- All timestamps are stored in UTC with explicit IANA timezone metadata (e.g., `America/New_York`).
- Upon meeting confirmation or rescheduling, the platform automatically generates an RFC 5545 compliant `.ics` payload, sets the standard MIME type `text/calendar; method=REQUEST`, and dispatches it via transactional email to all participants.
- Provide direct "Add to Calendar" (.ics download and Google/Outlook web links) in the web UI.
- Architecture leaves modular hooks in `ISchedulingService` for full OAuth sync in Phase 3.

## 5. Why Selected
1. **Zero External OAuth Dependency:** Bypasses Google Security Assessment and Microsoft Publisher Verification requirements, which can take months to clear.
2. **Universal Compatibility:** Standard RFC 5545 `.ics` email invites automatically render native "Accept / Decline" buttons inside Google Calendar, Microsoft Outlook, and Apple Calendar.
3. **Data Privacy & Security:** PE executives are highly protective of their corporate calendars; requiring full OAuth access to read/write external executive calendars would deter early PE adoption.
4. **Reliability:** Immune to external calendar API rate limits, revoked OAuth tokens, or third-party synchronization glitches.

## 6. Alternatives Rejected
- **Full OAuth Sync:** Rejected for Phase 1-2 due to compliance friction, security risk, and token management overhead.
- **Embedded SaaS (Cal.com / Nylas):** Rejected due to external user licensing costs, vendor lock-in, and UX fragmentation.

## 7. Trade-offs & Consequences
- **Trade-off:** Does not automatically block busy times on the user's external calendar prior to meeting proposal.
- **Consequence:** Consultant sets availability windows in MerQent; meeting conflicts are resolved asynchronously via the proposal/acceptance flow.

## 8. Migration & Future Implications
- In Phase 3, an optional "Sync with Google / Outlook" feature can be added as an opt-in integration via the `ICalendarSyncAdapter` interface without modifying the core `Meeting` entity.
