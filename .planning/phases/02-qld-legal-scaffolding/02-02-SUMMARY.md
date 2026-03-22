---
phase: 02-qld-legal-scaffolding
plan: 02
subsystem: api, ui, database
tags: [supabase, vercel-serverless, qld-property-law, form2, disclosure]

requires:
  - phase: 02-qld-legal-scaffolding
    provides: disclosure_statements Supabase table schema and TDD test file (02-01)

provides:
  - api/disclosure.js POST handler — saves QLD Form 2 disclosure to disclosure_statements, canPublish gate
  - sell.html Step 5 — 6-part guided disclosure form embedded in sell flow
  - Go Live publish gate — canPublish() check blocks goLive() until disclosure is saved

affects:
  - Phase 3 (buyer verification) — listing cannot publish without completed disclosure
  - Any future sell-flow steps — steps renumbered to 7 total

tech-stack:
  added: []
  patterns:
    - _action discriminator pattern in POST handlers (canPublish vs save in same endpoint)
    - STEP_IDS mapping for named step panels (avoids step-N id conflicts when inserting steps)
    - dsToggle() show/hide helper for conditional form sections

key-files:
  created:
    - api/disclosure.js
  modified:
    - sell.html

key-decisions:
  - "canPublish check runs client-side via Supabase anon key (RLS-protected) — no separate read endpoint needed"
  - "Step 5 panel uses id='step-disclosure' with STEP_IDS mapping so goToStep() resolves it correctly without renumbering"
  - "_action='canPublish' discriminator added to same POST endpoint — avoids a separate GET route and keeps handler minimal"
  - "disclosureCompleted flag short-circuits Supabase check if disclosure was just saved in same session"

patterns-established:
  - "Conditional reveal: dsToggle(id, bool) pattern for Yes/No radio-triggered field groups"
  - "Draft listing ID stored in sessionStorage.deedListingDraft for pre-publish disclosure linking"

requirements-completed: [LEGAL-01]

duration: 18min
completed: 2026-03-22
---

# Phase 02 Plan 02: QLD Form 2 Disclosure Summary

**QLD Property Law Act 2023 Form 2 disclosure embedded in sell flow — 6-part guided form saves to Supabase disclosure_statements, Go Live gated on completion via canPublish() check**

## Performance

- **Duration:** 18 min
- **Started:** 2026-03-22T06:00:00Z
- **Completed:** 2026-03-22T06:18:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- api/disclosure.js handler built with upsert and canPublish gate — all 5 TDD tests GREEN
- sell.html Step 5 (Legal Disclosure) inserted with all 6 QLD Form 2 parts
- Pool question has three-option radio (compliant / Form 36 non-compliant / no pool) — not a binary yes/no
- ATO Clearance Certificate section with ato.gov.au notice when seller answers No
- goLive() blocked at entry by canPublish() check — seller cannot publish without completing disclosure

## Task Commits

1. **Task 1: Create api/disclosure.js handler** — `24d965f` (feat)
2. **Task 2: Add Form 2 disclosure step to sell.html + publish gate** — `5ce5d61` (feat)

## Files Created/Modified
- `api/disclosure.js` — Vercel serverless POST handler; upserts to disclosure_statements; _action='canPublish' returns publish eligibility
- `sell.html` — New Step 5 disclosure panel (id="step-disclosure"), steps renumbered 1-7, STEP_IDS mapping, saveDisclosure(), canPublish(), goLive() gate

## Decisions Made
- The canPublish gate runs client-side using the existing Supabase anon client (RLS-protected). The plan specified no separate read endpoint — the `_action=canPublish` discriminator in the POST handler is only used if a server-side check is needed; the client-side path uses the anon key directly.
- Step 5 panel id is `step-disclosure` (not `step-5`) to match the plan's must_haves contract. A `STEP_IDS = {5: 'step-disclosure'}` lookup was added to goToStep() so the step navigation resolves correctly.
- `disclosureCompleted` flag short-circuits the async Supabase lookup if disclosure was saved in the current session, avoiding a round trip.

## Deviations from Plan

None — plan executed exactly as written. The STEP_IDS mapping is a minor implementation detail required to reconcile the `id="step-disclosure"` contract with the `step-${N}` getElementById lookup in goToStep() — this is a resolution of an implicit constraint in the plan, not a scope change.

## Issues Encountered
- The plan specified `id="step-disclosure"` but the existing `goToStep()` function uses `document.getElementById('step-${step}')`. Resolved by adding a STEP_IDS lookup map (3 lines) rather than rewriting goToStep — no behavioural change.

## User Setup Required
The `disclosure_statements` Supabase table must be created before the disclosure form can save data. SQL migration from 02-01-PLAN.md interfaces block:

```sql
create table disclosure_statements (
  id                          uuid primary key default uuid_generate_v4(),
  listing_id                  uuid references listings(id) on delete cascade,
  ...
);
create index on disclosure_statements (listing_id);
```

Run this in the Supabase SQL Editor for project `jtpykhrdjkzhcbswrhzo`.

## Next Phase Readiness
- LEGAL-01 complete — disclosure enforced in sell flow
- Phase 2 Plan 03 can proceed (next QLD legal scaffolding plan)
- Supabase SQL migration still required before real listings can save disclosure data (manual step)

## Self-Check: PASSED

---
*Phase: 02-qld-legal-scaffolding*
*Completed: 2026-03-22*
