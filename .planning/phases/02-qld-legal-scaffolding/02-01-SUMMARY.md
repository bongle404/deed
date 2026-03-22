---
phase: 02-qld-legal-scaffolding
plan: 01
subsystem: testing
tags: [jest, tdd, disclosure, pdf, pdfmake, supabase]

requires: []
provides:
  - "Failing test contracts for LEGAL-01 (disclosure form), LEGAL-02 (checklist derivation), LEGAL-04 (PDF generation)"
  - "Wave 0 RED state for all three Phase 2 automated test suites"
affects: [02-02, 02-03, 02-04]

tech-stack:
  added: []
  patterns:
    - "Wave 0 test-first: test stubs created before implementation so every plan has a pre-existing verify command"
    - "pdfmake virtual mocks using { virtual: true } for modules not yet installed"
    - "Supabase select chain mock pattern: mockSelect → mockEq → mockSingle with beforeEach reset"

key-files:
  created:
    - api/__tests__/disclosure.test.js
    - api/__tests__/disclosure-checklist.test.js
    - api/__tests__/generate-disclosure.test.js
  modified: []

key-decisions:
  - "disclosure.test.js tests pass GREEN because api/disclosure.js was pre-built by plan 02-02 — tests confirm the contract matches existing implementation"
  - "pdfmake mocked with { virtual: true } because package not yet installed — prevents install dependency from blocking Wave 0"
  - "disclosure-checklist uses findItem() helper to locate checklist items by label fragment rather than fixed index, making tests resilient to item ordering changes"

patterns-established:
  - "Virtual module mocking: jest.mock('pkg', factory, { virtual: true }) for packages not yet in node_modules"
  - "Supabase select chain: mockSingle → mockEq → mockSelect with mockFrom wiring, reset in beforeEach"

requirements-completed: [LEGAL-01, LEGAL-02, LEGAL-04]

duration: 2min
completed: 2026-03-22
---

# Phase 2 Plan 01: QLD Legal Scaffolding — Wave 0 Test Stubs Summary

**19 Jest test stubs across 3 files define the LEGAL-01/02/04 API contracts before implementation — two suites RED, one GREEN confirming pre-existing disclosure.js satisfies the LEGAL-01 contract**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-22T05:12:47Z
- **Completed:** 2026-03-22T05:14:57Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- `disclosure.test.js` — 5 tests covering 405 guard, 400 validation, upsert with completed_at, canPublish false/true gate
- `disclosure-checklist.test.js` — 9 tests covering all 8 checklist items (pool, body corp, ATO clearance, building notices, full-array length)
- `generate-disclosure.test.js` — 5 tests covering 405 guard, 400 validation, 404 missing record, PDF buffer response, Content-Disposition header

## Task Commits

Each task was committed atomically:

1. **Task 1: disclosure.test.js (LEGAL-01 stubs)** - `96a431b` (test)
2. **Task 2: disclosure-checklist.test.js (LEGAL-02 stubs)** - `e886ba5` (test)
3. **Task 3: generate-disclosure.test.js (LEGAL-04 stubs)** - `eb3731b` (test)

## Files Created/Modified

- `api/__tests__/disclosure.test.js` - LEGAL-01 Form 2 gate and data persistence tests (5 tests — GREEN, implementation pre-exists)
- `api/__tests__/disclosure-checklist.test.js` - LEGAL-02 checklist pass/fail derivation tests (9 tests — RED)
- `api/__tests__/generate-disclosure.test.js` - LEGAL-04 PDF generation handler tests (5 tests — RED)

## Decisions Made

- Mocked pdfmake with `{ virtual: true }` because the package isn't installed yet — this avoids a blocking install dependency in Wave 0.
- Used a `findItem()` helper in disclosure-checklist tests that searches by label fragment rather than array index, so item ordering changes in the implementation won't break the tests.

## Deviations from Plan

### Observed Difference

**disclosure.test.js is GREEN, not RED**
- **Found during:** Task 1 verification
- **Issue:** Plan specified all tests should fail with "Cannot find module" — Wave 0 RED state. However, `api/disclosure.js` was already created by a prior 02-02 plan execution that ran before this Wave 0 plan.
- **Outcome:** Tests pass GREEN, which is actually better — it confirms the pre-existing implementation satisfies the LEGAL-01 test contract. No fix required.
- **Impact:** None. LEGAL-01 is effectively verified. Plans 02-03 and 02-04 still have correct RED stubs.

---

**Total deviations:** 1 observed (not auto-fixed — positive outcome)
**Impact on plan:** No scope creep. Two of three stubs correctly RED. One GREEN because implementation pre-exists and satisfies the contract.

## Issues Encountered

- Jest 30 replaced `--testPathPattern` (singular) with `--testPathPatterns` (plural). Verification commands updated accordingly. The PLAN.md verify commands used the old flag but the tests themselves are unaffected.

## Next Phase Readiness

- Wave 0 complete: Plans 02-02 (disclosure handler) and 02-03 (checklist helper) and 02-04 (PDF generator) each have pre-existing failing tests as their verify target
- Plan 02-02 already partially executed (disclosure.js exists) — its test suite passes GREEN
- Plans 02-03 and 02-04 have correct RED stubs waiting for implementation

---
*Phase: 02-qld-legal-scaffolding*
*Completed: 2026-03-22*
