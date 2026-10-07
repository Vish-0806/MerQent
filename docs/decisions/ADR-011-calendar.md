# ADR-011: Calendar & Scheduling — Provider-Independent Scheduling Engine

## Context
Consultant interviews, scoping calls, and discovery meetings between PE sponsors and PMI consultants represent pivotal conversion moments. Scheduling requires availability windows, timezone conversion, conflict detection, meeting proposal lifecycles, and calendar invites.

## Problem
Designing a scheduling system that operates autonomously without forcing either party to grant full OAuth access to corporate Google Workspace or Microsoft 365 environments, while allowing optional calendar integrations in the future.

## Options Considered
1. **Internal System-of-Record Scheduling with standard iCalendar (.ics) Invites** (Selected)
2. **Mandatory Google Calendar / Microsoft Graph OAuth Integration**
3. **Third-Party Embedded Tool (Calendly / Cal.com iframe)**

## Decision
Adopt an **Internal Native Scheduling System** backed by PostgreSQL as the source of truth, generating standard RFC 5545 **iCalendar (.ics)** attachments sent via email and in-app notifications, behind a provider-independent `ICalendarProvider` abstraction.

## Rationale
- **Zero Third-Party Enterprise Security Blockers**: Institutional PE funds often prohibit third-party apps from requesting broad read/write OAuth access to executive Microsoft Exchange / Outlook calendars.
- **Universal Compatibility**: `.ics` MIME calendar invites automatically render as interactive "Accept / Decline" events across Apple Mail, Google Calendar, and Microsoft Outlook.
- **Full Domain Control**: Meeting status (`PROPOSED`, `CONFIRMED`, `CANCELLED`, `RESCHEDULED`), meeting links, and audit history remain strictly within MerQent.
- **Extensibility**: Provider abstraction allows adding two-way sync with Google Calendar or Microsoft Graph in Phase 3 for users who explicitly opt-in.

## Trade-offs
- Two-way calendar busy-time synchronization requires manual availability slot definition by consultants unless an external sync integration is explicitly connected.

## Consequences
- Domain logic resides in `src/modules/scheduling/`.
- Meetings generate unique conference URLs (e.g., integrated video room or provider-agnostic link).

## Alternatives Rejected
- *Mandatory OAuth (Google/Microsoft)*: High rejection rate from enterprise compliance officers at private equity firms.
- *Calendly iframe*: Loss of UI branding, data leakage, and inability to link scheduling status to downstream shortlist metrics.

## Future Implications
Phase 3 can introduce voluntary Google/Outlook OAuth sync connectors via the scheduling abstraction.
