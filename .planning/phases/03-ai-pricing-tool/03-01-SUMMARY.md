---
phase: 03-ai-pricing-tool
plan: 01
subsystem: testing
tags: [jest, tdd, price-estimate, offer-floor, percentile]

# Dependency graph
requires:
  - phase: 02-qld-legal-scaffolding
    provides: Established test patterns (makeReq/makeRes, jest.mock shapes) used by these stubs
provides:
  - Failing test stubs for percentile helper, price-estimate handler, and offer-floor detection
  - Automated verify commands for all Wave 1 implementation tasks
affects: [03-02, 03-03, 03-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Wave 0 TDD: test stubs written before implementation — RED state is the correct terminal state for Wave 0"
    - "Supabase cache-miss mock: mockSingle returns { data: null, error: null } to simulate cold cache"
    - "node-fetch mocked at module level for API response simulation"
    - "@anthropic-ai/sdk mocked as jest.fn() constructor returning messages.create stub"

key-files:
  created:
    - api/__tests__/helpers/percentile.test.js
    - api/__tests__/price-estimate.test.js
    - api/__tests__/offer-floor.test.js
  modified: []

key-decisions:
  - "03-01: percentile.test.js uses pure function tests — no mocking needed, no Supabase dependency"
  - "03-01: price-estimate.test.js mocks node-fetch (not https) to match expected implementation pattern"
  - "03-01: offer-floor.test.js mocks @anthropic-ai/sdk as constructor function (jest.fn().mockImplementation) to match SDK instantiation pattern"
  - "03-01: below_floor_reason regex allows both $720,000 and $720000 formatting to keep test resilient to formatting choice"

patterns-established:
  - "Wave 0 contract: test stubs define the module interface before implementation exists — Cannot find module is the expected output"
  - "PRICE-04 test: calls handler twice with different bedroom counts and different mock comp sets, asserts low/mid/high differ"

requirements-completed: [PRICE-01, PRICE-02, PRICE-03, PRICE-04]

# Metrics
duration: 2min
completed: 2026-03-22
---

# Phase 3 Plan 01: AI Pricing Tool — Wave 0 Test Stubs Summary

**Three failing test files defining the full contract for percentile math, price-estimate API, and below-floor detection — 21 test cases total, all in correct RED state**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-22T06:20:33Z
- **Completed:** 2026-03-22T06:22:08Z
- **Tasks:** 3
- **Files modified:** 3 created

## Accomplishments

- Created `api/__tests__/helpers/percentile.test.js` — 8 test cases covering percentile() nearest-rank and calcEstimate() confidence levels
- Created `api/__tests__/price-estimate.test.js` — 7 test cases covering 405/400 validation, response shape, comparable fields, PRICE-04 bedroom recalc, confidence
- Created `api/__tests__/offer-floor.test.js` — 6 test cases covering below-floor detection, reason content, and no-floor edge case

## Task Commits

Each task was committed atomically:

1. **Task 1: Create percentile helper test stub** - `fc36578` (test)
2. **Task 2: Create price-estimate handler test stub** - `4e7c481` (test)
3. **Task 3: Create offer-floor detection test stub** - `7c04d8d` (test)

## Files Created/Modified

- `api/__tests__/helpers/percentile.test.js` — Pure unit tests for percentile() and calcEstimate() — no mocking, known array inputs
- `api/__tests__/price-estimate.test.js` — Handler tests with Supabase cache-miss mock and node-fetch mock returning 6 fake comparables
- `api/__tests__/offer-floor.test.js` — checkBelowFloor() tests with @anthropic-ai/sdk mocked to return a fixed reason string

## Decisions Made

- percentile.test.js uses pure function tests — no mocking needed, no Supabase dependency
- price-estimate.test.js mocks node-fetch (not https) to match expected implementation pattern
- offer-floor.test.js mocks @anthropic-ai/sdk as a jest.fn() constructor to match SDK instantiation pattern
- below_floor_reason regex allows both $720,000 and $720000 formatting — test remains resilient to formatter choice

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

Jest 30 replaced `--testPathPattern` with `--testPathPatterns` (plural). Used correct flag in verification. No impact on test files.

## Next Phase Readiness

- All three test files exist and fail with "Cannot find module" — Wave 0 contract is set
- Wave 1 (03-02) can implement api/helpers/percentile.js and api/price-estimate.js, turning tests GREEN
- Wave 2 (03-03 or later) implements api/offer-floor.js
- Full suite: 13 test suites, 68 tests passing (pre-existing), 3 new suites failing with module-not-found only

---
*Phase: 03-ai-pricing-tool*
*Completed: 2026-03-22*
