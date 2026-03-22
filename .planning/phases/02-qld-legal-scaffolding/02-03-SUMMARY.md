---
phase: 02-qld-legal-scaffolding
plan: 03
subsystem: ui
tags: [legal, conveyancer, referral, qls-rule-12.4.4, dashboard, modal]

# Dependency graph
requires:
  - phase: 02-qld-legal-scaffolding
    provides: accept-modal step structure with accept-step-1/2/3 panels in dashboard.html
provides:
  - Conveyancer referral card (#conveyancer-referral) in accept-modal step-3 above Close button
  - QLS Rule 12.4.4 referral disclosure language embedded in UI
  - CSS classes for conveyancer-card pattern (reusable for future partner cards)
affects:
  - 02-04
  - 02-05
  - any phase touching accept-modal or offer acceptance flow

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Legal disclosure card: blue (#eff6ff) card with label/headline/disclaimer structure for regulatory prompts
    - Inline legal disclaimers: italic .conveyancer-disclaimer class for QLS/regulatory required text

key-files:
  created: []
  modified:
    - dashboard.html

key-decisions:
  - "Referral card is always-present in step-3 HTML — no JavaScript toggle needed, existing modal show/hide handles visibility"
  - "Placeholder partner details used ([Partner Firm — Placeholder]) — real firm must be substituted when commercial arrangement established"
  - "Disclosure language defaults to 'may receive' framing even before arrangement exists — conservative/safer default per QLS guidance"

patterns-established:
  - "Legal prompt cards: .conveyancer-card CSS class with blue background, label/headline/body/disclaimer structure"
  - "QLS referral disclosure: 'DEED may receive a referral arrangement... not required to use...' boilerplate"

requirements-completed: [LEGAL-03]

# Metrics
duration: 4min
completed: 2026-03-22
---

# Phase 2 Plan 03: QLD Legal Scaffolding — Conveyancer Referral Prompt Summary

**Conveyancer referral card injected into accept-modal step-3 with QLS Rule 12.4.4 compliant disclosure and placeholder partner firm details.**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-03-22T05:20:00Z
- **Completed:** 2026-03-22T05:24:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Added #conveyancer-referral card to accept-modal step-3 in dashboard.html, positioned above the Close button
- Card includes: "Next Step: Engage a Solicitor" label, headline confirming DEED is not a law firm, placeholder QLD-licensed firm with phone and website, and italic QLS disclosure paragraph
- CSS block added with reusable .conveyancer-card pattern — five CSS classes covering card, label, headline, body paragraphs, and disclaimer

## Task Commits

Each task was committed atomically:

1. **Task 1: Add conveyancer referral card to accept-modal step-3** - `c406e5e` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified
- `dashboard.html` - Added .conveyancer-card CSS block (lines 247–279) and #conveyancer-referral HTML div (lines 687–698) inside accept-step-3 above modal-footer

## Decisions Made
- Referral card is always-present HTML in step-3 — no JS toggle required, modal step show/hide already controls visibility
- Disclosure defaults to "may receive" framing — conservative default covers both presence and absence of a commercial arrangement
- Placeholder text ([Partner Firm — Placeholder]) must be replaced when a real QLD conveyancing firm is partnered

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None — UI-only change. No environment variables or external services required.

Replace placeholder partner details in dashboard.html when a real QLD conveyancing firm is engaged:
- `[Partner Firm — Placeholder]` → firm name
- `[+61 7 XXXX XXXX]` → firm phone
- `[firmwebsite.com.au]` → firm website URL

## Next Phase Readiness
- LEGAL-03 complete: conveyancer referral prompt present at offer acceptance
- accept-modal step-3 is now the canonical location for post-acceptance legal guidance — future plans should treat this as established
- Awaiting human verification of visual layout before marking plan complete

---
*Phase: 02-qld-legal-scaffolding*
*Completed: 2026-03-22*
