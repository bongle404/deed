---
phase: 02-qld-legal-scaffolding
plan: 04
subsystem: ui
tags: [qld-property-law, disclosure, checklist, supabase, html, javascript]

# Dependency graph
requires:
  - phase: 02-qld-legal-scaffolding
    provides: disclosure_statements table schema (from 02-02), sell.html Form 2 disclosure step

provides:
  - deriveChecklist() pure function — 8-item QLD certificate checklist from disclosure_statements row
  - disclosure-checklist-card in listing.html — public buyer-facing certificate status panel
  - disclosure-status-card in dashboard.html — seller-facing disclosure status with PDF download link

affects:
  - 02-05 (generate-disclosure API — PDF download button wires to this route)
  - Any future listing display work

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Inline deriveChecklist() in browser HTML (no require/import — pure browser JS)"
    - "disclosure_statements Supabase query on listing/dashboard load — card hidden until data exists"
    - "PDF download wired to /api/generate-disclosure — graceful 404 until 02-05 ships"

key-files:
  created:
    - helpers/disclosure-checklist.js
  modified:
    - listing.html
    - dashboard.html

key-decisions:
  - "helpers/disclosure-checklist.js placed at project root helpers/ (not api/helpers/) — test contract uses ../../helpers relative path from api/__tests__/"
  - "module.exports = deriveChecklist with named export alias — test uses const deriveChecklist = require(...) (direct function), not destructuring"
  - "deriveChecklist inlined in both HTML files as browser JS — cannot use Node require() in browser context"
  - "disclosure card hidden by default (style=display:none) and shown only when Supabase returns a disclosure row — no UI shown for listings without disclosure data"
  - "PDF download button present but wires to 02-05 route not yet deployed — returns 404 until that plan ships; button must exist for LEGAL-04 verification"

patterns-established:
  - "Checklist status icons: pass=unicode checkmark green, fail=unicode x red, warning=unicode warning amber, info=circled-i blue"
  - "Self-reported disclaimer appended to every checklist render"

requirements-completed: [LEGAL-02]

# Metrics
duration: 12min
completed: 2026-03-22
---

# Phase 02 Plan 04: Disclosure Certificate Checklist Summary

**8-item QLD property certificate checklist with pass/fail/warning status, rendered from disclosure_statements on both public listing page and seller dashboard**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-03-22T05:30:00Z
- **Completed:** 2026-03-22T05:42:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- `helpers/disclosure-checklist.js` pure function with 9 passing tests — pool/body-corp/title/rates/notices/ATO statuses all correct
- Public listing page shows `disclosure-checklist-card` loaded from Supabase when disclosure data exists
- Seller dashboard shows `disclosure-status-card` with same checklist plus PDF download link wired to future 02-05 API route
- Form 36 pool pathway correctly returns `warning` (not fail)
- ATO clearance warning includes 15% withholding text per LEGAL-02 spec

## Task Commits

Each task was committed atomically:

1. **Task 1: Create helpers/disclosure-checklist.js** - `4659996` (feat — TDD GREEN)
2. **Task 2: Add checklist cards to listing.html and dashboard.html** - `79c40ea` (feat)

## Files Created/Modified

- `helpers/disclosure-checklist.js` — Pure `deriveChecklist(disclosure)` function, 8-item return, CommonJS module
- `listing.html` — Added CSS, `disclosure-checklist-card` HTML, inline `deriveChecklist` + `renderChecklist` + `loadDisclosureChecklist()`
- `dashboard.html` — Added CSS, `disclosure-status-card` HTML with PDF link, inline `deriveChecklist` + `renderChecklist` + `loadDisclosureStatus()` + `downloadDisclosure()`

## Decisions Made

- `helpers/disclosure-checklist.js` at root `helpers/` not `api/helpers/` — the Wave 0 test contract uses `require('../../helpers/disclosure-checklist')` from `api/__tests__/`, which resolves to project-root `helpers/`, not `api/helpers/`. Test contract takes precedence.
- `module.exports = deriveChecklist` (direct function export) with named alias — the test does `const deriveChecklist = require(...)` (not destructuring), so the module must export the function directly.
- `deriveChecklist` inlined in both HTML files — browser JS cannot use Node `require()`, so the logic is duplicated inline. The `helpers/disclosure-checklist.js` remains the server-side/test-contract source of truth.
- Disclosure cards hidden by default — only shown when a `disclosure_statements` row exists for the listing. No empty state UI needed.
- PDF download button returns 404 until plan 02-05 ships — that is acceptable and documented in the plan.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Moved file from api/helpers/ to helpers/**
- **Found during:** Task 1 (running tests)
- **Issue:** Plan spec said `api/helpers/disclosure-checklist.js` but the test contract requires `../../helpers/disclosure-checklist` (from `api/__tests__/`), resolving to root-level `helpers/` directory, not `api/helpers/`
- **Fix:** Created file at `helpers/disclosure-checklist.js` (moved after initial creation at wrong path)
- **Files modified:** helpers/disclosure-checklist.js (final location)
- **Verification:** All 9 tests GREEN after move
- **Committed in:** 4659996

**2. [Rule 3 - Blocking] Changed module.exports to direct function export**
- **Found during:** Task 1 (tests returning "deriveChecklist is not a function")
- **Issue:** Plan spec showed `module.exports = { deriveChecklist }` but test does `const deriveChecklist = require(...)` — named export destructuring not matching
- **Fix:** Changed to `module.exports = deriveChecklist; module.exports.deriveChecklist = deriveChecklist` (supports both usage patterns)
- **Files modified:** helpers/disclosure-checklist.js
- **Verification:** All 9 tests GREEN
- **Committed in:** 4659996

---

**Total deviations:** 2 auto-fixed (both Rule 3 — blocking path/export mismatches between plan spec and test contract)
**Impact on plan:** Both fixes required to satisfy test contract. No scope creep. The test contract is the binding spec.

## Issues Encountered

- Jest v30 changed `--testPathPattern` to `--testPathPatterns` (note the plural) — used correct flag throughout.

## Next Phase Readiness

- LEGAL-02 complete — certificate checklist renders on both pages
- Plan 02-05 (generate-disclosure PDF API) can now be built — the PDF download button is wired and waiting
- No blockers

---
*Phase: 02-qld-legal-scaffolding*
*Completed: 2026-03-22*
