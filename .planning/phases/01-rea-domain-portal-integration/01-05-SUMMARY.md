---
phase: 01-rea-domain-portal-integration
plan: 05
subsystem: testing, ui
tags: [jest, browser-verify, portal-integration, sell-flow, dashboard]

# Dependency graph
requires:
  - phase: 01-01
    provides: failing test stubs for portal API handlers (PORTAL-01, PORTAL-03)
  - phase: 01-02
    provides: sell.html Step 6 portal opt-in UI and DB migration SQL
  - phase: 01-03
    provides: api/submit-to-portals.js REAXML generation and SFTP delivery
  - phase: 01-04
    provides: api/portal-status.js GET handler and dashboard portal card
provides:
  - Human-verified sell.html Step 6 portal opt-in toggle and fee disclosure card
  - Human-verified dashboard.html portal status card with pending/live/rejected badge rendering
  - Phase 1 REA/Domain Portal Integration marked complete
  - PORTAL-01, PORTAL-02, PORTAL-03 requirements confirmed complete
affects: [phase-2, phase-5]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Checkpoint pattern: automated Jest gate (49/49 tests) run before human browser verification"
    - "SFTP credential guard: submission skipped safely when REA_SFTP_HOST not set, rea_status='not_submitted'"

key-files:
  created: []
  modified: []

key-decisions:
  - "Portal listing fee left as [PORTAL_FEE_PLACEHOLDER] — Ed must confirm dollar amount before replacing"
  - "Domain portal integration deferred to Phase 1b — domain_status='not_submitted' in all Phase 1 flows"
  - "REA SFTP submission is fire-and-forget with credential guard — real submissions blocked until REA Ignite account and Vercel env vars are set"

patterns-established:
  - "Checkpoint gate pattern: Jest suite must be green before any human browser verification begins"
  - "Commercial prerequisites documented in SUMMARY as outstanding items — code complete does not mean production-ready"

requirements-completed: [PORTAL-01, PORTAL-02, PORTAL-03]

# Metrics
duration: ~5min (verification only — no code written)
completed: 2026-03-22
---

# Phase 1 Plan 05: Human Browser Verification Summary

**Phase 1 REA/Domain Portal Integration verified end-to-end: 49/49 Jest tests green, sell.html Step 6 opt-in card and dashboard.html portal status badges confirmed correct by Ed in-browser**

## Performance

- **Duration:** ~5 min (checkpoint verification — no code written in this plan)
- **Started:** 2026-03-22
- **Completed:** 2026-03-22
- **Tasks:** 2 (automated gate + human browser check)
- **Files modified:** 0 (verification only)

## Accomplishments

- All 49 Jest tests passed before human verification began — zero failures across all 7 test suites
- Ed verified sell.html Step 6 portal opt-in toggle renders correctly with fee disclosure card above the Go Live button
- Ed confirmed Go Live is blocked when portal opt-in is checked but fee acknowledgement is unchecked
- Ed confirmed dashboard.html portal status card shows correct badge labels for pending (amber), live (green with link), and rejected (red) states
- Domain badge correctly shows "Not opted in" — expected, Domain integration is Phase 1b
- Phase 1 complete: PORTAL-01, PORTAL-02, PORTAL-03 all delivered and verified

## Task Commits

This plan is verification-only — no task commits (no code was written).

**Plan metadata:** (docs commit follows)

## Files Created/Modified

None — this plan verifies work from plans 01-01 through 01-04. No files were created or modified.

## Decisions Made

- Portal listing fee remains as [PORTAL_FEE_PLACEHOLDER] in sell.html — Ed must confirm the dollar amount before this can be replaced. This is a commercial decision, not a code decision.
- Domain portal integration confirmed as Phase 1b scope — domain_status will always be not_submitted in Phase 1 flows.

## Deviations from Plan

None — plan executed exactly as written. Both checkpoints passed without requiring any fixes.

## Issues Encountered

None.

## User Setup Required

**Commercial prerequisites outstanding before Phase 1 goes live:**

1. **Portal listing fee** — Replace [PORTAL_FEE_PLACEHOLDER] in sell.html with the confirmed dollar amount
2. **Supabase DB migration** — Run the SQL in `supabase-schema.sql` in the Supabase SQL Editor to add portal columns to the listings table. Without this, portal API handlers will error in production.
3. **REA Ignite account** — Contact reaagents@rea-group.com to set up agency account with SFTP credentials (2–4 week lead time)
4. **Vercel env vars** — Once REA Ignite SFTP credentials are issued, add `REA_SFTP_HOST`, `REA_SFTP_USER`, `REA_SFTP_PASS`, `REA_AGENCY_ID` to Vercel project settings
5. **QLD corporate agent licence** — Confirm with OFT whether individual licence alone suffices or whether DEED Pty Ltd requires a corporate licence for portal submissions

The SFTP submission handler is guarded — without `REA_SFTP_HOST` set, it returns `dev_skipped` safely and no real listings are submitted. No production risk until credentials are added.

## Next Phase Readiness

- Phase 1 (REA/Domain Portal Integration) is complete from a code perspective
- Phase 2 (illion BankStatements buyer verification) can begin planning
- Phase 5 (full REA/Domain live integration) has a commercial dependency: intermediary partnership must be established before development starts — raise with REA early given 2–4 week account lead time

---
*Phase: 01-rea-domain-portal-integration*
*Completed: 2026-03-22*
