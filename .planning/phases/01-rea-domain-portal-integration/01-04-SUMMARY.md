---
phase: 01-rea-domain-portal-integration
plan: 04
subsystem: api, ui
tags: [supabase, vercel, serverless, portal-status, dashboard]

# Dependency graph
requires:
  - phase: 01-01
    provides: portal-status test stubs (TDD RED state for PORTAL-03)
  - phase: 01-02
    provides: portal_opted_in, rea_status, domain_status DB columns on listings table
provides:
  - GET /api/portal-status returning portal_opted_in, rea_status, domain_status, rea_listing_url, domain_listing_url
  - dashboard.html portal distribution card with badge rendering for REA and Domain statuses
affects: [01-03, 01-05, phase-2]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Vercel serverless handler: module.exports = async (req, res) using @supabase/supabase-js createClient"
    - "Portal card hidden by default (display:none), revealed only when portal_opted_in=true"
    - "statusMap object for badge label/colour lookup, keyed by rea_status string values"

key-files:
  created:
    - api/portal-status.js
  modified:
    - dashboard.html

key-decisions:
  - "405 handler returns .json() not .end() — test mock does not implement res.end(), using .json({error}) keeps the mock chain intact and is equally correct for a JSON API"

patterns-established:
  - "Portal status card pattern: fetch /api/portal-status after listing load, call renderPortalStatus(), card stays hidden on error (non-fatal)"
  - "statusMap lookup with fallback to not_submitted prevents undefined badge renders"

requirements-completed: [PORTAL-03]

# Metrics
duration: 7min
completed: 2026-03-22
---

# Phase 1 Plan 04: Portal Status API and Dashboard Card Summary

**GET /api/portal-status handler + seller dashboard portal distribution card with badge labels for REA and Domain statuses, completing PORTAL-03**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-22T04:49:51Z
- **Completed:** 2026-03-22T04:57:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- api/portal-status.js serverless handler queries Supabase listings table and returns portal status fields
- All 4 TDD tests in api/__tests__/portal-status.test.js turned GREEN (were RED since Plan 01)
- dashboard.html portal-status-card div inserted after stats-row with rea-badge, domain-badge, and rea-listing-link
- renderPortalStatus() maps all 5 status values (not_submitted/pending/live/rejected/withdrawn) to labels and colours
- loadPortalStatus() called after initDashboard listing load — non-fatal, card stays hidden on error

## Task Commits

Each task was committed atomically:

1. **Task 1: Build api/portal-status.js GET handler** - `cccff1c` (feat)
2. **Task 2: Add portal status card to dashboard.html** - `f2f10b7` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `api/portal-status.js` — GET handler: 405 non-GET, 400 missing listing_id, 404 no row, 200 with portal status fields
- `dashboard.html` — portal-status-card HTML block + renderPortalStatus() + loadPortalStatus() in script section

## Decisions Made

- 405 handler uses `.json({ error: 'method not allowed' })` instead of `.end()` — the Jest mock for `res` in the test contract does not implement `.end()`, and the chain `res.status(405).end()` threw `TypeError: res.status(...).end is not a function`. Using `.json()` satisfies the test assertion (`expect(res.status).toHaveBeenCalledWith(405)`) and is equally correct for a JSON API.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed 405 handler to use .json() instead of .end()**
- **Found during:** Task 1 (TDD GREEN — running portal-status.test.js)
- **Issue:** Plan specified `res.status(405).end()` but the test mock's `makeRes()` only chains `.status()` and `.json()` — calling `.end()` threw `TypeError: res.status(...).end is not a function`
- **Fix:** Changed `.end()` to `.json({ error: 'method not allowed' })` — satisfies the test and is valid JSON API behaviour
- **Files modified:** api/portal-status.js
- **Verification:** All 4 tests pass, including the 405 test
- **Committed in:** cccff1c (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — bug in plan spec vs test mock contract)
**Impact on plan:** Single-line fix required for test compatibility. No scope creep.

## Issues Encountered

None beyond the auto-fixed `.end()` vs `.json()` discrepancy above.

## User Setup Required

None — no external service configuration required for this plan.

## Next Phase Readiness

- PORTAL-03 complete: seller dashboard now shows portal distribution status card
- Plan 01-05 (SFTP dispatch + submit-to-portals.js implementation) can proceed
- Portal card in dashboard.html will show live status once REA/Domain submission flow (01-03/01-05) writes rea_status updates back to Supabase

---
*Phase: 01-rea-domain-portal-integration*
*Completed: 2026-03-22*
