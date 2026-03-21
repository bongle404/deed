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
| **Framework** | Node built-in test runner (`node:test` — no install needed, Node 18+) |
| **Config file** | none — Wave 0 creates test files |
| **Quick run command** | `node --test api/__tests__/submit-to-portals.test.js` |
| **Full suite command** | `node --test api/__tests__/*.test.js` |
| **Estimated runtime** | ~3 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node --test api/__tests__/submit-to-portals.test.js`
- **After every plan wave:** Run `node --test api/__tests__/*.test.js`
- **Before `/gsd:verify-work`:** All unit tests green + manual sell flow opt-in verified
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 0 | PORTAL-01 | unit | `node --test api/__tests__/submit-to-portals.test.js` | ❌ W0 | ⬜ pending |
| 1-01-02 | 01 | 0 | PORTAL-03 | unit | `node --test api/__tests__/portal-status.test.js` | ❌ W0 | ⬜ pending |
| 1-02-01 | 02 | 1 | PORTAL-01 | unit | `node --test api/__tests__/submit-to-portals.test.js` | ❌ W0 | ⬜ pending |
| 1-03-01 | 03 | 1 | PORTAL-01 | unit | `node --test api/__tests__/submit-to-portals.test.js` | ❌ W0 | ⬜ pending |
| 1-04-01 | 04 | 2 | PORTAL-02 | manual | browser: sell.html Step 6 opt-in + fee disclosure checkbox | n/a | ⬜ pending |
| 1-05-01 | 05 | 2 | PORTAL-03 | unit | `node --test api/__tests__/portal-status.test.js` | ❌ W0 | ⬜ pending |
| 1-06-01 | 06 | 3 | PORTAL-01,02,03 | manual | human verify checkpoint | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `api/__tests__/submit-to-portals.test.js` — PORTAL-01: buildReaXml() output, SFTP graceful skip when no credentials, rea_status update to 'pending'
- [ ] `api/__tests__/portal-status.test.js` — PORTAL-03: dashboard badge rendering for each rea_status value (pending, live, rejected, none)

*No test runner install needed — Node built-in `node:test` module (Node 18+, available on Vercel)*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Portal opt-in checkbox saves `portal_opted_in=true` to Supabase | PORTAL-02 | UI state + DB write requires browser session | Open sell.html Step 6, check portal opt-in, click Go Live, verify `portal_opted_in=true` in Supabase listings table |
| Fee disclosure checkbox blocks submission if unchecked | PORTAL-02 | Form validation UI behaviour | Open sell.html Step 6, leave fee disclosure unchecked, click Go Live — confirm blocked with inline error |
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
