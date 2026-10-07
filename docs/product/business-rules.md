# MerQent — Core Business Rules & Invariants

## 1. Identity & Organization Rules
- **BR-AUTH-01**: A user belongs to exactly one primary role (`PE_FIRM`, `CONSULTANT`, `ADMIN`).
- **BR-AUTH-02**: A `PE_FIRM` user must belong to an `Organization`. Membership roles are `OWNER`, `ADMIN`, or `MEMBER`.
- **BR-AUTH-03**: A `CONSULTANT` user is an independent professional entity and does not have multi-user organization membership in initial phases.

## 2. Project Posting & Confidentiality Rules
- **BR-PROJ-01**: Only authenticated members of an active PE Firm organization can post PMI projects.
- **BR-PROJ-02**: Projects have visibility levels: `PUBLIC` (discoverable by all consultants), `RESTRICTED` (discoverable only by verified consultants Tier 1+), and `CONFIDENTIAL` (direct invitation only).
- **BR-PROJ-03**: To prevent leaks of Material Non-Public Information (MNPI), public project summaries must support masked entity aliases (e.g., "Project Falcon — $200M MedTech Platform") rather than revealing target company names.

## 3. Candidate Matching & AI Invariants
- **BR-MATCH-01 (Strict Grounding)**: AI match explanations must ONLY reference verified database attributes (e.g. past deals, specific ERP versions, industry years). Fabricating credentials or hallucinating deal sizes is strictly forbidden.
- **BR-MATCH-02 (Data Categorization)**: Match cards must visually distinguish `VERIFIED EVIDENCE` from `SELF-REPORTED CLAIMS`.
- **BR-MATCH-03 (Scoring Formula)**:
  $$\text{Score} = (0.40 \times S_{\text{ERP}}) + (0.25 \times S_{\text{Deal}}) + (0.20 \times S_{\text{Industry}}) + (0.15 \times S_{\text{Verified}})$$

## 4. Connection & Collaboration Gating Rules
- **BR-CONN-01**: Communication gating: Neither party can send direct messages or propose calendar meetings until a connection request transition to `ACCEPTED`.
- **BR-CONN-02**: Only PE firms can initiate connection requests; consultants can accept, decline, or ignore.
- **BR-CONN-03**: Connection states are strictly linear:
  $$\text{PENDING} \longrightarrow \{\text{ACCEPTED}, \text{REJECTED}, \text{WITHDRAWN}\} \longrightarrow \text{BLOCKED (if abusive)}$$

## 5. Verification & Trust Rules
- **BR-VERIF-01**: Consultants self-reporting credentials remain at `TIER_0_UNVERIFIED` until documentary evidence is submitted and reviewed.
- **BR-VERIF-02**: Only system `ADMIN` users can approve or reject verification requests.
- **BR-VERIF-03**: Rejection must include structured feedback; consultants can re-submit after addressing missing documentation.
