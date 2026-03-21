---
phase: 1
slug: ai-pricing-tool
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-21
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 30.x |
| **Config file** | `package.json` (`"jest": { "testEnvironment": "node", "testMatch": ["**/api/__tests__/**/*.test.js"] }`) |
| **Quick run command** | `npm test -- --testPathPattern=price-estimate` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --testPathPattern=price-estimate`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 0 | PRICE-01 | unit | `npm test -- --testPathPattern=price-estimate` | ❌ W0 | ⬜ pending |
| 1-01-02 | 01 | 0 | PRICE-02 | unit | `npm test -- --testPathPattern=price-estimate` | ❌ W0 | ⬜ pending |
| 1-01-03 | 01 | 0 | PRICE-03 | unit | `npm test -- --testPathPattern=offer-floor` | ❌ W0 | ⬜ pending |
| 1-01-04 | 01 | 0 | PRICE-04 | unit | `npm test -- --testPathPattern=price-estimate` | ❌ W0 | ⬜ pending |
| 1-02-01 | 02 | 1 | PRICE-01 | unit | `npm test -- --testPathPattern=price-estimate` | ❌ W0 | ⬜ pending |
| 1-02-02 | 02 | 1 | PRICE-02 | unit | `npm test -- --testPathPattern=price-estimate` | ❌ W0 | ⬜ pending |
| 1-03-01 | 03 | 1 | PRICE-03 | unit | `npm test -- --testPathPattern=offer-floor` | ❌ W0 | ⬜ pending |
| 1-04-01 | 04 | 2 | PRICE-04 | manual | browser inspection | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `api/__tests__/price-estimate.test.js` — covers PRICE-01, PRICE-02, PRICE-04 (handler input validation, mocked Proptech Data response, percentile calculation)
- [ ] `api/__tests__/offer-floor.test.js` — covers PRICE-03 (below-floor detection logic, reason label generation)
- [ ] `api/__tests__/helpers/percentile.test.js` — pure unit tests for `percentile()` and `calcEstimate()` helper functions (no mocking needed)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Estimate recalculates when seller changes beds/baths/size in listing form | PRICE-04 | UI state change with API call — not testable without browser | Open sell.html, change beds dropdown, confirm estimate panel updates without page reload |
| Below-floor label displays correctly in seller dashboard offer list | PRICE-03 | UI rendering — requires seeded test offer data | Seed an offer below p25, open dashboard.html, confirm "below market" label appears |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
