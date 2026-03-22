---
phase: 1
slug: rea-domain-portal-integration
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-22
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest (`npx jest` — installed via `npm install --save-dev jest`) |
| **Config file** | package.json `jest` key or `jest.config.js` — Wave 0 creates test files |
| **Quick run command** | `npx jest api/__tests__/submit-to-portals.test.js --no-coverage` |
| **Full suite command** | `npx jest --no-coverage` |
| **Estimated runtime** | ~3 seconds |

> **Wave 0 setup:** Confirm `jest` is in package.json `devDependencies` before Plan 01 execution. If absent, run `npm install --save-dev jest` as the first Wave 0 step. Jest mock APIs (`jest.fn`, `jest.mock`, `beforeEach`) are required by the test stubs — `node --test` is incompatible.

---

## Sampling Rate

- **After every task commit:** Run `npx jest api/__tests__/submit-to-portals.test.js --no-coverage`
- **After every plan wave:** Run `npx jest --no-coverage`
- **Before `/gsd:verify-work`:** All unit tests green + manual sell flow opt-in verified
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 0 | PORTAL-01 | unit | `npx jest api/__tests__/submit-to-portals.test.js --no-coverage` | ❌ W0 | ⬜ pending |
| 1-01-02 | 01 | 0 | PORTAL-03 | unit | `npx jest api/__tests__/portal-status.test.js --no-coverage` | ❌ W0 | ⬜ pending |
| 1-02-01 | 02 | 1 | PORTAL-02 | manual | browser: sell.html Step 6 opt-in + fee disclosure checkbox | n/a | ⬜ pending |
| 1-03-01 | 03 | 2 | PORTAL-01 | unit | `npx jest api/__tests__/submit-to-portals.test.js --no-coverage` | ❌ W0 | ⬜ pending |
| 1-04-01 | 04 | 2 | PORTAL-03 | unit | `npx jest api/__tests__/portal-status.test.js --no-coverage` | ❌ W0 | ⬜ pending |
| 1-05-01 | 05 | 3 | PORTAL-01,02,03 | manual | human verify checkpoint | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `api/__tests__/submit-to-portals.test.js` — PORTAL-01: buildReaXml() output, SFTP graceful skip when no credentials, rea_status update to 'pending'
- [ ] `api/__tests__/portal-status.test.js` — PORTAL-03: portal-status GET handler returning correct status fields for valid/invalid listing_id

> Jest must be installed (`npm install --save-dev jest`) if not already present in package.json devDependencies.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Portal opt-in checkbox saves `portal_opted_in=true` to Supabase | PORTAL-02 | UI state + DB write requires browser session | Open sell.html Step 6, check portal opt-in, click Go Live, verify `portal_opted_in=true` in Supabase listings table |
| Fee disclosure checkbox blocks submission if unchecked | PORTAL-02 | Form validation UI behaviour | Open sell.html Step 6, leave fee disclosure unchecked, click Go Live — confirm blocked with inline error |
| Dashboard badge labels render correctly for each rea_status value | PORTAL-03 | renderPortalStatus() is client-side JS in dashboard.html — not testable via Node | Open dashboard.html with a test listing at each rea_status value (pending, live, rejected) and confirm badge text and colour match spec |
| End-to-end SFTP submission with real REA credentials | PORTAL-01 | Requires live REA Ignite SFTP account (not available until licence activated) | Once licence active: run submit flow, check REA Ignite dashboard for listing receipt |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
