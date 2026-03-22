---
phase: 2
slug: qld-legal-scaffolding
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-22
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest (existing project) |
| **Config file** | package.json (scripts.test) |
| **Quick run command** | `npm test -- --testPathPattern=legal` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --testPathPattern=legal`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 2-01-01 | 01 | 1 | LEGAL-01 | unit | `npm test -- --testPathPattern=disclosure` | ❌ W0 | ⬜ pending |
| 2-01-02 | 01 | 1 | LEGAL-01 | unit | `npm test -- --testPathPattern=disclosure` | ❌ W0 | ⬜ pending |
| 2-01-03 | 01 | 2 | LEGAL-01 | integration | `npm test -- --testPathPattern=disclosure` | ❌ W0 | ⬜ pending |
| 2-02-01 | 02 | 1 | LEGAL-02 | unit | `npm test -- --testPathPattern=certificates` | ❌ W0 | ⬜ pending |
| 2-02-02 | 02 | 1 | LEGAL-02 | unit | `npm test -- --testPathPattern=certificates` | ❌ W0 | ⬜ pending |
| 2-03-01 | 03 | 1 | LEGAL-03 | manual | — | n/a | ⬜ pending |
| 2-04-01 | 04 | 1 | LEGAL-04 | unit | `npm test -- --testPathPattern=pdf` | ❌ W0 | ⬜ pending |
| 2-04-02 | 04 | 2 | LEGAL-04 | integration | `npm test -- --testPathPattern=pdf` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/disclosure.test.js` — stubs for LEGAL-01 (Form 2 gate, field validation)
- [ ] `tests/certificates.test.js` — stubs for LEGAL-02 (checklist, pass/fail logic)
- [ ] `tests/pdf.test.js` — stubs for LEGAL-04 (PDF generation, download endpoint)
- [ ] `tests/setup.js` — shared fixtures if not already present

*LEGAL-03 (conveyancer referral prompt) is UI-only — manual verification only.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Conveyancer referral prompt appears at offer acceptance | LEGAL-03 | UI interaction flow — triggered by offer state change, no headless test harness in project | Accept a test offer → confirm referral modal/prompt renders with conveyancer details and dismisses correctly |
| Form 2 listing gate blocks publish | LEGAL-01 | End-to-end seller dashboard flow | Log in as seller → attempt to publish without completing Form 2 → confirm blocked → complete Form 2 → confirm unblocked |
| PDF download renders correctly | LEGAL-04 | File generation and download | Submit complete disclosure → click Download PDF → open file → verify all submitted fields populate correctly |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
