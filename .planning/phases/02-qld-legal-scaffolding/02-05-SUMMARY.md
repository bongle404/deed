---
phase: 02-qld-legal-scaffolding
plan: 05
subsystem: api
tags: [pdfmake, pdf-generation, supabase, disclosure, serverless]

# Dependency graph
requires:
  - phase: 02-qld-legal-scaffolding
    provides: disclosure_statements table schema and Form 2 disclosure step (02-02)

provides:
  - POST /api/generate-disclosure Vercel serverless handler
  - Pre-filled 6-part disclosure summary PDF generated from Supabase disclosure row
  - pdfmake installed as production dependency

affects:
  - dashboard.html (downloadDisclosure button wires to this endpoint)
  - Phase 03 buyer verification (disclosure availability precondition)

# Tech tracking
tech-stack:
  added: [pdfmake ^0.3.7]
  patterns:
    - pdfmake.createPdf(docDefinition).getBuffer() wrapped in Promise for async handler
    - Supabase join query: select('*, listings(address, suburb, seller_name)')
    - module.exports async handler pattern (matching generate-contract.js)

key-files:
  created:
    - api/generate-disclosure.js
  modified:
    - package.json (pdfmake added to dependencies)
    - package-lock.json

key-decisions:
  - "Handler wraps pdfmake getBuffer() in a Promise to allow async/await compatibility with Vercel serverless"
  - "ATO 15% withholding warning rendered only when ato_clearance_obtained is false"
  - "Supabase join fetches listings(address, suburb, seller_name) in single query — no second round-trip"

patterns-established:
  - "PDF generation: pdfmake.createPdf(docDef).getBuffer() wrapped in new Promise() for async handler"
  - "Disclosure PDF structure: 6 parts matching QLD Property Law Act 2023 disclosure fields"

requirements-completed: [LEGAL-04]

# Metrics
duration: 4min
completed: 2026-03-22
---

# Phase 2 Plan 5: Generate Disclosure PDF Summary

**pdfmake-based serverless handler that generates a 6-part QLD disclosure summary PDF from a Supabase disclosure_statements row, with ATO withholding warning and legal disclaimer**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-03-22T05:21:00Z
- **Completed:** 2026-03-22T05:25:00Z
- **Tasks:** 1
- **Files modified:** 3

## Accomplishments

- `/api/generate-disclosure` POST handler built and all 5 tests GREEN
- pdfmake installed as production dependency (^0.3.7)
- PDF output covers all 6 disclosure parts: property details, encumbrances/tenancy, planning/environment, buildings, rates, ATO clearance
- ATO 15% withholding warning included when clearance not obtained
- DEED legal disclaimer embedded per plan specification

## Task Commits

1. **Task 1: Install pdfmake and create api/generate-disclosure.js** - `8ecaad4` (feat)

## Files Created/Modified

- `api/generate-disclosure.js` - POST handler, buildDocDefinition(), 6-part PDF structure
- `package.json` - pdfmake ^0.3.7 added to dependencies
- `package-lock.json` - lock file updated

## Decisions Made

- Handler wraps pdfmake's callback-based `getBuffer()` in a `new Promise()` to maintain async/await compatibility with Vercel serverless
- ATO 15% withholding warning only rendered when `ato_clearance_obtained` is false — avoids cluttering standard PDF
- Supabase join query fetches `listings(address, suburb, seller_name)` in a single round-trip

## Deviations from Plan

None — plan executed exactly as written. The only minor technical note: the plan showed a bare callback form for `getBuffer()`, but wrapping in Promise is the standard pattern to avoid returning before `res.send()` fires.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required. The handler uses the existing `SUPABASE_SERVICE_KEY` env var already configured in Vercel.

## Next Phase Readiness

- LEGAL-04 complete: sellers can download pre-filled disclosure PDF from their dashboard
- `dashboard.html` `downloadDisclosure()` function can now wire to `POST /api/generate-disclosure` with `listing_id`
- Phase 2 has one plan remaining (02-05 was the final implementation plan in Wave 2)

---
*Phase: 02-qld-legal-scaffolding*
*Completed: 2026-03-22*

## Self-Check: PASSED

- api/generate-disclosure.js: FOUND
- 02-05-SUMMARY.md: FOUND
- commit 8ecaad4: FOUND
