---
phase: 01-rea-domain-portal-integration
plan: 02
subsystem: database, ui
tags: [supabase, sql, html, portal, rea, domain]

# Dependency graph
requires: []
provides:
  - "8-column portal migration SQL appended to supabase-schema.sql with if not exists guards"
  - "Portal opt-in toggle + fee disclosure card in sell.html Step 6 before Go Live button"
  - "goLive() validates portal fee acknowledgement, saves portal_opted_in/portal_fee_acknowledged to Supabase, calls /api/submit-to-portals when opted in"
affects: [01-03-api-handlers, 01-04-testing]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Portal fields appended to Supabase listings insert payload alongside existing fields"
    - "Fire-and-forget fetch for /api/submit-to-portals — non-fatal, status tracked in Supabase rea_status column"
    - "Fee acknowledgement gated by opt-in checkbox — ack row hidden/shown via togglePortalFeeAck()"

key-files:
  created: []
  modified:
    - supabase-schema.sql
    - sell.html

key-decisions:
  - "Portal fee amount left as [PORTAL_FEE_PLACEHOLDER] — Ed must confirm price before replacing"
  - "Portal submission is fire-and-forget — goLive() does not await portal API response; status tracked via rea_status/domain_status in Supabase"

patterns-established:
  - "Portal opt-in card: blue-tinted (#f0f9ff) card with conditional fee-ack row revealed on opt-in toggle"
  - "SQL migrations documented in supabase-schema.sql as append-only blocks with IMPORTANT run-before-use header"

requirements-completed: [PORTAL-02]

# Metrics
duration: 2min
completed: 2026-03-22
---

# Phase 1 Plan 02: Portal Opt-in UI and DB Migration Summary

**Portal opt-in card with conditional fee acknowledgement added to sell.html Step 6, goLive() saves portal fields and triggers /api/submit-to-portals, and 8-column Supabase migration documented in supabase-schema.sql**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-22T04:45:55Z
- **Completed:** 2026-03-22T04:47:20Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- 8 portal columns appended to supabase-schema.sql as a labelled, re-runnable migration block with an explicit "run this first" warning
- Portal opt-in card inserted in sell.html Step 6 between the fee-acknowledgement label and the Go Live button — toggles a conditional fee-ack row on opt-in
- goLive() updated with portal validation, portal field writes to Supabase, and fire-and-forget /api/submit-to-portals call when seller opts in

## Task Commits

Each task was committed atomically:

1. **Task 1: Append portal migration SQL to supabase-schema.sql** - `b7c959f` (chore)
2. **Task 2: Add portal opt-in toggle + fee card to sell.html Step 6 and update goLive()** - `4d79062` (feat)

**Plan metadata:** (to follow — docs commit)

## Files Created/Modified

- `/Users/edsteward/deed/supabase-schema.sql` - Added Phase 1 portal migration block (8 ALTER TABLE statements, if not exists guards, status value comments, and run-first IMPORTANT header)
- `/Users/edsteward/deed/sell.html` - Added portal opt-in card to Step 6, togglePortalFeeAck() helper, goLive() portal validation and Supabase field writes, /api/submit-to-portals call

## Decisions Made

- Portal fee dollar amount left as `[PORTAL_FEE_PLACEHOLDER]` — Ed must decide the price before this is replaced. Plan explicitly prohibits inventing a number.
- Portal API call is fire-and-forget (`.catch(() => {})`) — goLive() does not await the portal submission result. Submission status is tracked in Supabase via `rea_status` and `domain_status` columns, not in the UI flow.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

**Migration must be run manually before the portal opt-in saves data.** Steps:
1. Open Supabase dashboard for the DEED project
2. Navigate to SQL Editor → New query
3. Copy the migration block from `supabase-schema.sql` (Phase 1: REA/Domain Portal Integration section at the bottom of the file)
4. Run the query
5. Verify 8 new columns appear on the `listings` table

Once the migration is run, the sell flow will correctly persist `portal_opted_in` and `portal_fee_acknowledged` on listing creation.

## Next Phase Readiness

- DB schema and seller-facing UI are complete — portal opt-in is live in the sell flow
- /api/submit-to-portals endpoint does not yet exist — Plan 03 must build the API handler before portal submissions can process
- [PORTAL_FEE_PLACEHOLDER] must be replaced with a real amount before the sell flow is shown to real sellers

---
*Phase: 01-rea-domain-portal-integration*
*Completed: 2026-03-22*

## Self-Check: PASSED

- supabase-schema.sql: FOUND
- sell.html: FOUND
- 01-02-SUMMARY.md: FOUND
- Commit b7c959f: FOUND
- Commit 4d79062: FOUND
