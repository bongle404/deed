---
phase: 01-rea-domain-portal-integration
plan: 01
subsystem: testing
tags: [jest, tdd, reaxml, sftp, supabase, portal-status]

# Dependency graph
requires: []
provides:
  - "Jest test stubs for submit-to-portals API (5 tests, module-not-found RED)"
  - "Jest test stubs for portal-status API (4 tests, module-not-found RED)"
affects:
  - 01-rea-domain-portal-integration
  - 01-03
  - 01-04

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "jest.mock virtual: true for dependencies not yet installed (ssh2-sftp-client)"
    - "Named export pattern for buildReaXml alongside default handler export"

key-files:
  created:
    - api/__tests__/submit-to-portals.test.js
    - api/__tests__/portal-status.test.js
  modified: []

key-decisions:
  - "Used jest.mock with virtual: true for ssh2-sftp-client so tests fail on missing implementation (not missing dependency)"
  - "buildReaXml exported as named export from submit-to-portals.js to enable unit-level XML structure testing"

patterns-established:
  - "Virtual mock pattern: jest.mock('uninstalled-pkg', factory, { virtual: true }) avoids package resolution errors in TDD stubs"

requirements-completed:
  - PORTAL-01
  - PORTAL-03

# Metrics
duration: 2min
completed: 2026-03-22
---

# Phase 1 Plan 01: TDD Stubs for Portal API Handlers Summary

**9 failing Jest test cases establishing pass criteria for REAXML generation (PORTAL-01) and portal-status API handler (PORTAL-03) before any implementation exists**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-22T04:45:50Z
- **Completed:** 2026-03-22T04:47:49Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Created `api/__tests__/submit-to-portals.test.js` with 5 tests covering: REAXML mandatory field presence, dev_skipped mode when no SFTP credentials, rea_status pending DB update, 400 on missing listing_id, 404 on no matching row
- Created `api/__tests__/portal-status.test.js` with 4 tests covering: 200 with all four status fields, 400 on missing query param, 404 on no Supabase row, 405 on non-GET method
- Both files fail with "Cannot find module" (correct RED TDD state); all 5 pre-existing test suites remain green (40 passing tests)

## Task Commits

Each task was committed atomically:

1. **Task 1: Write failing tests for submit-to-portals (PORTAL-01)** - `25e2d63` (test)
2. **Task 2: Write failing tests for portal-status API handler (PORTAL-03)** - `f776e99` (test)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `api/__tests__/submit-to-portals.test.js` - 5 TDD stubs for PORTAL-01 behaviours; requires named export `buildReaXml` from implementation
- `api/__tests__/portal-status.test.js` - 4 TDD stubs for PORTAL-03 GET handler; uses query.listing_id pattern

## Decisions Made
- Used `jest.mock('ssh2-sftp-client', factory, { virtual: true })` so Jest does not attempt to resolve the uninstalled package during the RED phase. Without this flag the test suite fails on a dependency resolution error rather than the expected module-not-found for the implementation itself.
- Specified `buildReaXml` as a named export requirement in the test (via destructuring `const { buildReaXml, default: handler } = require('../submit-to-portals')`). Plan 03 must honour this export shape.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added `virtual: true` to ssh2-sftp-client mock**
- **Found during:** Task 1 (submit-to-portals test RED verification)
- **Issue:** `jest.mock('ssh2-sftp-client', factory)` attempted real module resolution; failed with "Cannot find module 'ssh2-sftp-client'" instead of the expected "Cannot find module '../submit-to-portals'"
- **Fix:** Added `{ virtual: true }` as third argument so Jest skips resolution of the mock target
- **Files modified:** api/__tests__/submit-to-portals.test.js
- **Verification:** Test suite now fails with correct module-not-found for '../submit-to-portals'
- **Committed in:** 25e2d63

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary to achieve correct RED state as specified. No scope creep.

## Issues Encountered
None beyond the virtual mock fix documented above.

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- Test stubs are in place; Plan 02 can proceed immediately (DB migration + UI column additions for portal status fields)
- Plan 03 (submit-to-portals implementation) must export `buildReaXml` as a named export and install `ssh2-sftp-client` as a dependency
- Plan 04 (portal-status implementation) must implement a GET handler reading four columns from Supabase

---
*Phase: 01-rea-domain-portal-integration*
*Completed: 2026-03-22*
