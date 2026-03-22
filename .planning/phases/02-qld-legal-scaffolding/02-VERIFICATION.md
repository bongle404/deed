---
phase: 02-qld-legal-scaffolding
verified: 2026-03-22T06:09:24Z
status: human_needed
score: 4/4 must-haves verified (automated); 1 item requires human confirmation
human_verification:
  - test: "Navigate sell.html to step 5 and confirm the form renders 6 labelled parts, then attempt Go Live without completing disclosure"
    expected: "Go Live is blocked with a message; after completing all 6 parts and clicking Save & Continue the listing can proceed"
    why_human: "Publish gate is JavaScript client-side (canPublish() via Supabase RLS query) — cannot verify gate triggers correctly without a real Supabase session and browser execution"
  - test: "Open a listing page (listing.html?id=...) for a listing with a completed disclosure record"
    expected: "The Seller Disclosure card appears with 8 checklist items showing pass/fail/warning icons; self-reported disclaimer is below the list"
    why_human: "Checklist card starts with display:none and is revealed by a Supabase JS query on page load — cannot execute browser JS programmatically"
  - test: "Accept an offer in dashboard.html and proceed to accept-step-3"
    expected: "Blue conveyancer referral card appears above the Close button with solicitor placeholder, phone, website, and italic referral disclaimer"
    why_human: "Card is inside accept-step-3 which is hidden by default and revealed by the confirmAccept() flow — requires browser interaction"
  - test: "Click Download Disclosure Summary (PDF) in the dashboard disclosure status card"
    expected: "A PDF named disclosure-statement.pdf downloads; it contains the seller's answers across all 6 parts plus the DEED disclaimer and ATO section"
    why_human: "Requires a live Supabase record and deployed /api/generate-disclosure endpoint — cannot verify PDF content programmatically against real data"
---

# Phase 2: QLD Legal Scaffolding — Verification Report

**Phase Goal:** Sellers complete a Form 2 disclosure before listing, buyers see a certificate checklist on the listing page, sellers are prompted to engage a solicitor at offer acceptance, and sellers can download a disclosure summary PDF.
**Verified:** 2026-03-22T06:09:24Z
**Status:** human_needed (all automated checks pass; 4 UI-flow items require browser confirmation)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Seller cannot go live without completing disclosure (LEGAL-01 gate) | ? HUMAN | `canPublish()` function exists in sell.html (line 1418), called before `goLive()` (line 1442), queries `disclosure_statements.completed_at` via Supabase — gate logic is correct but requires a live Supabase session to confirm it fires |
| 2 | Disclosure form has 6 visible parts covering QLD Property Law Act 2023 Form 2 | ✓ VERIFIED | `id="step-disclosure"` panel present (sell.html line 862); all 6 parts confirmed: Property Details, Encumbrances & Tenancy, Planning & Environment, Buildings (with 3-option pool radio at line 970-973), Rates, ATO (line 1024); `ds-save-btn` at line 1036 calls `saveDisclosure()` which POSTs to `/api/disclosure` (line 1400) |
| 3 | Buyer sees 8-item certificate checklist on listing page | ✓ VERIFIED | `disclosure-checklist-card` div present in listing.html (line 633); `deriveChecklist()` inlined (line 817); `renderChecklist()` at line 868; Supabase query for `disclosure_statements` at line 887 feeds checklist on load; self-reported disclaimer confirmed |
| 4 | Seller sees conveyancer referral prompt at offer acceptance | ✓ VERIFIED | `id="conveyancer-referral"` at dashboard.html line 724, inside `accept-step-3` (starts line 712); "QLD-licensed" text at line 726; "referral arrangement" disclaimer at line 734; wiring: `accept-step-3` is revealed by `confirmAccept()` flow at line 1106 |
| 5 | Seller can download a disclosure PDF from dashboard | ✓ VERIFIED | `disclosure-status-card` at dashboard.html line 453; `disclosure-pdf-link` with `onclick="downloadDisclosure(event)"` at line 456; `downloadDisclosure()` POSTs to `/api/generate-disclosure` (line 1340); `api/generate-disclosure.js` exists with full `buildDocDefinition()` covering all 6 parts, disclaimer, and ATO section |
| 6 | Disclosure data saves to Supabase with completed_at | ✓ VERIFIED | `api/disclosure.js` upserts to `disclosure_statements` with `completed_at: new Date().toISOString()` (line 41); all 5 disclosure.test.js tests pass GREEN |

**Score:** 5/6 truths verified programmatically; truth #1 (publish gate trigger) requires human browser test

---

### Required Artifacts

| Artifact | Plan Specified Path | Actual Path | Status | Details |
|----------|---------------------|-------------|--------|---------|
| `api/disclosure.js` | `api/disclosure.js` | `api/disclosure.js` | ✓ VERIFIED | Substantive handler, 52 lines; POST only, 405/400 guards, upsert with completed_at, canPublish check via `_action` param; 5/5 tests green |
| `api/helpers/disclosure-checklist.js` | `api/helpers/disclosure-checklist.js` | `helpers/disclosure-checklist.js` | ✓ VERIFIED (path deviation) | File placed at project root `helpers/` not `api/helpers/`; `api/helpers/` directory does not exist. Tests pass because `require('../../helpers/disclosure-checklist')` from `api/__tests__/` resolves correctly to `helpers/disclosure-checklist.js`. Functionally correct — 9/9 tests green, full 107-line implementation |
| `api/generate-disclosure.js` | `api/generate-disclosure.js` | `api/generate-disclosure.js` | ✓ VERIFIED | 159 lines; `buildDocDefinition()` covers all 6 parts with disclaimer and ATO warning; pdfmake wired; 5/5 tests green |
| `sell.html` (disclosure step) | `sell.html` contains `id="step-disclosure"` | sell.html | ✓ VERIFIED | 17 matches for disclosure markers; step-disclosure panel, 6 form parts, pool 3-option radio, ATO section, ds-save-btn, canPublish gate all confirmed |
| `listing.html` (checklist card) | `listing.html` contains `disclosure-checklist-card` | listing.html | ✓ VERIFIED | Card at line 633, deriveChecklist inlined at line 817, renderChecklist at line 868, Supabase query feeds it on load |
| `dashboard.html` (status card + conveyancer + PDF link) | `disclosure-status-card`, `conveyancer-referral` | dashboard.html | ✓ VERIFIED | disclosure-status-card at line 453, PDF download link at line 456, conveyancer-referral at line 724 inside accept-step-3 |
| `api/__tests__/disclosure.test.js` | `api/__tests__/disclosure.test.js` | confirmed | ✓ VERIFIED | 5 tests, all green |
| `api/__tests__/disclosure-checklist.test.js` | `api/__tests__/disclosure-checklist.test.js` | confirmed | ✓ VERIFIED | 9 tests, all green |
| `api/__tests__/generate-disclosure.test.js` | `api/__tests__/generate-disclosure.test.js` | confirmed | ✓ VERIFIED | 5 tests, all green |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `sell.html` `ds-save-btn` | `api/disclosure` | `fetch('/api/disclosure', {method:'POST',...})` | ✓ WIRED | sell.html line 1400 confirms exact call |
| `sell.html` `goLive()` | `disclosure_statements` | `canPublish()` Supabase query | ✓ WIRED | canPublish() at line 1418 queries `disclosure_statements.completed_at`; called at line 1442 inside goLive() |
| `listing.html` | `disclosure_statements` + `deriveChecklist` | Supabase query on load → renderChecklist | ✓ WIRED | Line 887: Supabase fetch; line 891: renderChecklist(deriveChecklist(data)) |
| `dashboard.html` | `disclosure_statements` + `deriveChecklist` | Supabase query on load → renderChecklist | ✓ WIRED | Line 1326: Supabase fetch; line 1330: renderChecklist(deriveChecklist(data)) |
| `dashboard.html` `downloadDisclosure` | `/api/generate-disclosure` | `fetch POST` → blob → anchor download | ✓ WIRED | Lines 1336-1344 confirmed |
| `api/generate-disclosure.js` | `disclosure_statements` | Supabase `select('*, listings(...)')` | ✓ WIRED | Lines 141-145 confirmed |
| `api/generate-disclosure.js` | pdfmake | `pdfmake.createPdf(docDefinition).getBuffer()` | ✓ WIRED | Lines 152-158 confirmed; pdfmake in package.json dependencies |
| `dashboard.html` `accept-step-3` | conveyancer referral card | Always-present in step-3, revealed by `confirmAccept()` | ✓ WIRED | conveyancer-referral div at line 724 inside accept-step-3 at line 712 |

---

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| LEGAL-01 | 02-01, 02-02, 02-06 | Seller completes guided QLD Property Disclosure Statement as part of listing flow | ✓ SATISFIED | `step-disclosure` panel with 6-part form in sell.html; `api/disclosure.js` saves to Supabase with completed_at; publish gate via canPublish() in goLive(); 5/5 tests green |
| LEGAL-02 | 02-01, 02-04, 02-06 | Platform displays 2024 QLD transparency checklist with pass/fail status | ✓ SATISFIED | 8-item checklist (pool, body corp, title, council rates, water rates, building notices, planning/contamination, ATO) on listing.html and dashboard.html; deriveChecklist() at helpers/disclosure-checklist.js; 9/9 tests green |
| LEGAL-03 | 02-03, 02-06 | At offer acceptance, seller is shown a conveyancer referral prompt with a QLD-licensed partner | ✓ SATISFIED (automated) | conveyancer-referral div in accept-step-3 of dashboard.html; QLS Rule 12.4.4 referral disclosure language present; requires human browser test to confirm flow |
| LEGAL-04 | 02-01, 02-05, 02-06 | Seller can download a pre-filled disclosure statement PDF from their dashboard | ✓ SATISFIED (automated) | api/generate-disclosure.js with full buildDocDefinition() covering 6 parts + disclaimer + ATO; dashboard PDF download button wired to fetch POST; 5/5 tests green; requires human test to confirm PDF content on real data |

**Requirement traceability note:** REQUIREMENTS.md maps LEGAL-01 through LEGAL-04 to "Phase 3" in the traceability table but marks them [x] complete and maps them correctly in requirements content section. The phase numbering in the traceability table appears to use a different numbering system than the directory naming (this phase is directory `02-qld-legal-scaffolding` but the requirements table says "Phase 3"). This is a documentation inconsistency — no code impact, requirements are satisfied.

**Orphaned requirements check:** No LEGAL-xx requirements mapped to Phase 2 in REQUIREMENTS.md that are absent from plan frontmatter. No orphaned requirements found.

---

### Anti-Patterns Found

| File | Content | Severity | Impact |
|------|---------|----------|--------|
| `dashboard.html` line 729 | `[Partner Firm — Placeholder]` with `[+61 7 XXXX XXXX]` and `[firmwebsite.com.au]` | ⚠️ Warning | Intentional placeholder per plan — a real QLD conveyancing partner has not been engaged yet. The plan explicitly notes "placeholder partner details until a real arrangement is established." Does not block functionality but is visible to end users in production. |
| `helpers/disclosure-checklist.js` location | File at `helpers/` not `api/helpers/` as specified in plan artifacts | ℹ️ Info | Tests resolve correctly; module is functional. Path deviation from plan specification. No runtime impact. |
| `ROADMAP.md` Phase 2 plan checkboxes | Plans 02-01 through 02-06 listed as `[ ]` (unchecked) despite being completed | ℹ️ Info | Top-level Phase 2 entry correctly shows `[x]` completed. Individual plan checkbox entries were not updated. Documentation-only gap. |

---

### Human Verification Required

#### 1. Publish Gate — Disclosure Form Blocks Go Live

**Test:** Open sell.html in a browser, navigate through steps 1-4 (property, comparables, pricing, photos), then attempt to click Go Live without completing the disclosure step. Then return to step 5, complete all 6 parts, click Save & Continue, and attempt Go Live again.
**Expected:** Go Live is blocked with "Please complete the legal disclosure section before going live." on the first attempt. After completing disclosure, Go Live proceeds normally.
**Why human:** canPublish() queries Supabase via the anon client (RLS-protected) and requires a real listing session — cannot verify the gate fires correctly without an active browser session with a real listing ID.

#### 2. Certificate Checklist Renders on Listing Page

**Test:** Open listing.html?id=[a listing with a completed disclosure record] in a browser.
**Expected:** A "Seller Disclosure — QLD Property Law Act 2023" card appears with 8 checklist items showing coloured icons (green tick / amber warning / red X). The self-reported disclaimer "Certificates are self-reported by the seller..." appears below the list.
**Why human:** The checklist card starts with `display:none` and is revealed by a Supabase JS query on page load — requires a real disclosure record in Supabase and browser JS execution.

#### 3. Conveyancer Referral Appears at Offer Acceptance

**Test:** In dashboard.html as a seller with an active offer, click Accept, proceed through step-1 (offer summary) and step-2 (contract generation loading), and confirm step-3.
**Expected:** Blue conveyancer referral card appears above the Close button with "Next Step: Engage a Solicitor" label, solicitor placeholder text, phone/website, and italic referral disclaimer. Close button still works.
**Why human:** accept-step-3 is hidden by default and revealed by the confirmAccept() flow — requires a real offer in Supabase and browser interaction to trigger the modal progression.

#### 4. PDF Download — Content and Format

**Test:** In dashboard.html for a listing with a completed disclosure, click "Download Disclosure Summary (PDF)" in the disclosure status card.
**Expected:** A PDF named `disclosure-statement.pdf` downloads. It contains the seller's submitted answers across all 6 parts (Property Details, Encumbrances & Tenancy, Planning & Environment, Buildings, Rates, ATO), the DEED disclaimer ("DEED is not a law firm"), and if ATO clearance was not obtained, the 15% withholding warning.
**Why human:** Requires a live Supabase disclosure record and the deployed /api/generate-disclosure endpoint — cannot verify PDF content against real data programmatically.

---

### Gaps Summary

No gaps were found. All four requirements (LEGAL-01 through LEGAL-04) have substantive, wired implementations confirmed in the codebase. The full test suite runs 68/68 tests green. The four human verification items above are flow-confirmation checks, not indicators of missing or broken code — the underlying logic is verified.

**One path deviation noted:** `api/helpers/disclosure-checklist.js` was specified in plan artifacts but the file was placed at `helpers/disclosure-checklist.js` (project root). The module resolves correctly and all tests pass. The `api/helpers/` directory does not exist. This is informational only.

**One placeholder noted:** The conveyancer referral card contains `[Partner Firm — Placeholder]` placeholder content. This is expected until a real QLD conveyancing partner arrangement is established.

---

_Verified: 2026-03-22T06:09:24Z_
_Verifier: Claude (gsd-verifier)_
