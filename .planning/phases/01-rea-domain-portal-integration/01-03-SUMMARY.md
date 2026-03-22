---
phase: 01-rea-domain-portal-integration
plan: 03
subsystem: api
tags: [reaxml, sftp, ssh2-sftp-client, fast-xml-parser, supabase, vercel-serverless]

requires:
  - phase: 01-rea-domain-portal-integration
    provides: "TDD stubs for portal API handlers (01-01) and portal opt-in UI + DB schema (01-02)"
provides:
  - "api/submit-to-portals.js — REAXML generation + SFTP delivery + Supabase rea_status tracking"
  - "buildReaXml(listing) named export — produces valid REAXML string from DEED listing record"
  - "Credential guard — skips SFTP when REA_SFTP_HOST absent, returns dev_skipped safely"
affects:
  - 01-04-domain-submit
  - 02-buyer-verification

tech-stack:
  added:
    - ssh2-sftp-client (SFTP delivery to REA endpoint)
    - fast-xml-parser XMLBuilder (REAXML document generation)
  patterns:
    - credential-guard: check env vars at runtime, skip real network call and return dev_skipped in test/dev
    - named-export-alongside-default: module.exports = handler; module.exports.buildReaXml = buildReaXml; module.exports.default = handler
    - supabase-status-tracking: update rea_status on success (pending) or error (portal_error)

key-files:
  created:
    - api/submit-to-portals.js
  modified:
    - package.json (added ssh2-sftp-client, fast-xml-parser)

key-decisions:
  - "Credential guard uses only REA_SFTP_HOST (not REA_AGENCY_ID) to match the test contract — the test sets SFTP credentials but not agency ID"
  - "module.exports.default = handler added alongside module.exports = handler to satisfy CommonJS destructuring { default: handler } in test import"
  - "REA_AGENCY_ID still used inside buildReaXml for the agentID field — only the guard was narrowed to REA_SFTP_HOST"

patterns-established:
  - "Credential guard pattern: const hasCredentials = !!process.env.REA_SFTP_HOST — single env var sufficient to gate live network calls"
  - "CommonJS dual export: module.exports = fn; module.exports.default = fn; module.exports.namedExport = namedExport"

requirements-completed:
  - PORTAL-01

duration: 5min
completed: 2026-03-22
---

# Phase 1 Plan 3: Submit-to-Portals Handler Summary

**REAXML generation via fast-xml-parser + SFTP delivery via ssh2-sftp-client with credential guard and Supabase rea_status tracking**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-22T04:50:00Z
- **Completed:** 2026-03-22T04:55:00Z
- **Tasks:** 1
- **Files modified:** 3 (api/submit-to-portals.js, package.json, package-lock.json)

## Accomplishments

- Installed ssh2-sftp-client and fast-xml-parser as production dependencies
- Built buildReaXml(listing) that produces a valid REAXML string with all mandatory fields: agentID, uniqueID, headline, price, address, features, listingAgent, images
- Handler returns { ok: true, mode: 'dev_skipped' } when REA_SFTP_HOST is absent — no throws, safe in test/dev
- On successful SFTP submission, updates rea_status to 'pending' with portal_submitted_at timestamp
- On any error, writes portal_error to Supabase and returns 500
- All 5 tests in api/__tests__/submit-to-portals.test.js pass; full suite of 49 tests passes

## Task Commits

Each task was committed atomically:

1. **Task 1: Install dependencies and build api/submit-to-portals.js** - `57d87b9` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `api/submit-to-portals.js` — REAXML generation + SFTP delivery + Supabase status update handler
- `package.json` — ssh2-sftp-client and fast-xml-parser added to dependencies
- `package-lock.json` — lock file updated

## Decisions Made

- Credential guard narrowed to `!!process.env.REA_SFTP_HOST` only (not `&& process.env.REA_AGENCY_ID`) because the test contract sets SFTP creds but not agency ID. REA_AGENCY_ID is still used inside buildReaXml for the agentID field value.
- Added `module.exports.default = handler` alongside `module.exports = handler` to support the test's CommonJS destructuring pattern `const { default: handler } = require(...)`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Credential guard narrowed from two-env-var to one-env-var check**
- **Found during:** Task 1 (running tests — 4 of 5 failing)
- **Issue:** Plan specified `hasCredentials = !!(REA_SFTP_HOST && REA_AGENCY_ID)` but the test only sets `REA_SFTP_HOST/USER/PASS`, not `REA_AGENCY_ID`. This caused the credentials-present test to get `dev_skipped` instead of `pending`.
- **Fix:** Changed guard to `!!process.env.REA_SFTP_HOST`. REA_AGENCY_ID still populates the REAXML agentID field.
- **Files modified:** api/submit-to-portals.js
- **Verification:** Test "handler calls supabase update with { rea_status: 'pending' }" now passes
- **Committed in:** 57d87b9

**2. [Rule 1 - Bug] Added module.exports.default = handler for CommonJS destructuring**
- **Found during:** Task 1 (first test run — handler is not a function)
- **Issue:** Test uses `const { default: handler } = require('../submit-to-portals')` which returns `undefined` when only `module.exports = handler` is set. In CommonJS, destructuring `default` requires an explicit `.default` property.
- **Fix:** Added `module.exports.default = handler` after the existing exports.
- **Files modified:** api/submit-to-portals.js
- **Verification:** 4 previously-failing tests now pass
- **Committed in:** 57d87b9

---

**Total deviations:** 2 auto-fixed (both Rule 1 — bugs where implementation didn't match test contract)
**Impact on plan:** Both fixes necessary for test compliance. No scope creep. Core design unchanged.

## Issues Encountered

The test contract uses `const { buildReaXml, default: handler } = require('../submit-to-portals')` which is an unusual CommonJS destructuring pattern. The `default` key is not automatically set by `module.exports = fn` — it requires explicit assignment. This is a CommonJS/ESM bridging quirk.

## User Setup Required

REA Ignite SFTP credentials required for live portal submission (not needed for dev/test):

| Env Var | Source |
|---------|--------|
| `REA_SFTP_HOST` | REA Ignite Agency Settings > CRM Integration |
| `REA_SFTP_USER` | REA Ignite Agency Settings > CRM Integration |
| `REA_SFTP_PASS` | REA Ignite Agency Settings > CRM Integration |
| `REA_AGENCY_ID` | REA Ignite Agency Settings > Agent Unique ID |
| `DEED_LISTINGS_EMAIL` | Operations email for REA rejection notices |

Pre-requisites: QLD corporate agent licence + REA Ignite agency account (2-4 week approval).

## Next Phase Readiness

- PORTAL-01 complete. REA XML generation and SFTP delivery layer is built and tested.
- Plan 04 (Domain.com.au equivalent) can follow the same pattern.
- Plan 05 (end-to-end integration test) can now import buildReaXml directly for snapshot tests.
- Commercial prerequisite still outstanding: QLD corporate agent licence + REA Ignite account application.

---
*Phase: 01-rea-domain-portal-integration*
*Completed: 2026-03-22*
