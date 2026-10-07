# MerQent — End-to-End (E2E) Test Scenario Specifications

## 1. Golden Path User Journeys (Playwright Automation Targets)

### Scenario E2E-01: PE Firm Onboarding to Consultant Match
1. PE user visits `/register`, enters institutional email (`partner@summit-equity.com`), selects `PE_FIRM` role.
2. System sends email verification token; user verifies.
3. User completes Firm Profile: "Summit Equity Partners", AUM: $1.2B, Sector Focus: Healthcare & B2B SaaS.
4. User creates new PMI Project:
   - Title: "Project Apex — MedTech Platform Carve-out"
   - ERP: SAP S/4HANA
   - Deal Type: Corporate Carve-out
   - Budget Band: $2,500/day
5. User initiates AI matching job.
6. Verify match results display top candidates with overall score, confidence badge, and verified evidence points.

### Scenario E2E-02: Connection Handshake & WebSockets Messaging
1. PE user adds candidate to Project Shortlist and sends Connection Request with customized introduction.
2. Consultant receives notification email and in-app alert.
3. Consultant logs in, navigates to `/connections`, reviews PE firm profile, and clicks "Accept Connection".
4. Realtime WebSockets channel unlocks for both parties.
5. PE user sends message: "Let's schedule a 30-min scoping call."
6. Assert Consultant receives message via Socket.IO in real-time without page refresh.
7. Consultant reads message; assert PE user receives read receipt indicator.

### Scenario E2E-03: Scheduling Discovery Interview
1. In conversation view, PE user clicks "Propose Meeting".
2. Selects available time slot from consultant's calendar availability.
3. Consultant confirms meeting.
4. System generates and sends `.ics` calendar invitation via email and creates meeting record.
