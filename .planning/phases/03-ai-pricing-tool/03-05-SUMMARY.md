---
phase: 03-ai-pricing-tool
plan: 05
subsystem: ui
tags: [dashboard, offers, below-floor, css, supabase]

# Dependency graph
requires:
  - phase: 03-ai-pricing-tool
    plan: 03
    provides: "below_floor and below_floor_reason fields written to offers table by offer-floor API"
provides:
  - "Below-floor offer flag rendered on seller dashboard offer cards when below_floor=true"
  - "CSS .below-floor-flag, .below-floor-flag-label, .below-floor-flag-reason classes"
affects: [dashboard.html, offer cards, seller UX]

# Tech tracking
tech-stack:
  added: []
  patterns: [conditional template literal rendering in renderOfferCard, CSS badge pattern with red warning colour scheme]

key-files:
  created: []
  modified:
    - dashboard.html

key-decisions:
  - "select('*') on offers table already fetches below_floor and below_floor_reason — no query change needed"
  - "Flag placed inside offer card div after .offer-insight strip, not as a separate card — consistent with existing offer card structure"
  - "Fallback reason text provided when below_floor_reason is null — defensive render"

patterns-established:
  - "Below-floor flag uses fef2f2/fecaca red palette — distinct from blue AI insight strip, avoids confusion with badge-verified/badge-open/badge-under patterns"

requirements-completed: [PRICE-03]

# Metrics
duration: 1min
completed: 2026-03-22
---

# Phase 03 Plan 05: Below-Floor Offer Flag UI Summary

**Below-floor warning badge added to seller dashboard offer cards — renders red flag with reason text when offer.below_floor is true, invisible otherwise**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-22T06:37:23Z
- **Completed:** 2026-03-22T06:38:14Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Added `.below-floor-flag` CSS block with red/warning colour scheme (fef2f2 background, fecaca border, dc2626 label text, 7f1d1d reason text)
- Updated `renderOfferCard()` JS function to conditionally render the flag div when `offer.below_floor === true`
- Flag displays `below_floor_reason` text from the offer record with a safe fallback string
- No existing offer card CSS or JS modified — purely additive change

## Task Commits

1. **Task 1: Add below-floor flag to dashboard offer cards** - `6572eb7` (feat)

## Files Created/Modified

- `/Users/edsteward/deed/dashboard.html` - Added CSS classes and conditional flag rendering in renderOfferCard()

## Decisions Made

- `select('*')` already used on the offers query — no need to enumerate columns. Both new fields are automatically included.
- Flag positioned after the `.offer-insight` AI strip within the offer card div, consistent with the card's bottom-to-top information hierarchy.
- Fallback reason string used when `below_floor_reason` is null — ensures the flag is always informative even if the backend omitted the text.

## Deviations from Plan

None — plan executed exactly as written. The `select('*')` observation simplified Step 1 (no query change required).

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- PRICE-03 visible half complete. The flag is live in the UI whenever the offers table contains `below_floor=true` records.
- The below-floor check backend (Plan 03) and this UI flag together deliver the full PRICE-03 feature.
- Phase 03 complete — all 5 plans executed.

---
*Phase: 03-ai-pricing-tool*
*Completed: 2026-03-22*
