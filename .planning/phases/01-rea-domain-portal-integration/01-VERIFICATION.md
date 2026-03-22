---
phase: 01-rea-domain-portal-integration
verified: 2026-03-22T00:00:00Z
status: human_needed
score: 3/3 must-haves verified (automated); human sign-off on UI flows required
human_verification:
  - test: "Open sell.html Step 6 in browser — confirm portal opt-in card appears, fee gate blocks Go Live when opt-in checked but fee-ack unchecked, and Go Live proceeds when both are checked"
    expected: "Card visible above Go Live button; alert fires if fee-ack unchecked; flow completes when both checked"
    why_human: "Form validation UI behaviour and browser alert cannot be verified via grep or Jest"
  - test: "Open dashboard.html with a test listing that has portal_opted_in=true and cycle rea_status through pending, live (with rea_listing_url set), and rejected in Supabase — confirm badge text and colour change correctly, and the 'View on realestate.com.au' link appears on live"
    expected: "pending = amber 'Processing...'; live = green 'Live' + link; rejected = red 'Rejected — contact DEED'"
    why_human: "renderPortalStatus() is client-side JS in dashboard.html — badge rendering cannot be tested via Node"
---

# Phase 1: REA/Domain Portal Integration — Verification Report

**Phase Goal:** Sellers can opt in to REA/Domain distribution via a QLD-licensed FSBO intermediary, with listing status visible in their dashboard.
**Verified:** 2026-03-22
**Status:** human_needed — all automated checks pass; two UI flows require in-browser sign-off
**Re-verification:** No — initial verification

---

## Goal Achievement

### Success Criteria (from ROADMAP.md)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | DEED can submit a listing to realestate.com.au via REAXML feed from a licensed agency account | VERIFIED | `api/submit-to-portals.js` exists with `buildReaXml()` producing valid XML containing all mandatory fields; SFTP delivery via `ssh2-sftp-client`; 5 Jest tests pass |
| 2 | Seller can opt in to REA/Domain listing during sell flow with clear fee disclosure before confirming | VERIFIED (automated) / HUMAN NEEDED (browser) | `sell.html` Step 6 contains portal opt-in card with `[PORTAL_FEE_PLACEHOLDER]`, `togglePortalFeeAck()`, and `goLive()` blocks if fee-ack unchecked — browser confirmation outstanding |
| 3 | Seller dashboard shows whether listing is live on REA/Domain and its current status | VERIFIED (automated) / HUMAN NEEDED (browser) | `api/portal-status.js` GET handler + `dashboard.html` portal status card with `renderPortalStatus()` — badge rendering confirmation outstanding |

**Automated score:** 3/3 truths implemented and wired. 2/3 require in-browser human sign-off to fully close.

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `api/submit-to-portals.js` | REAXML builder + SFTP delivery + credential guard | VERIFIED | 144 lines; exports `handler` (default) + `buildReaXml` (named); all mandatory REAXML fields present; credential guard on `REA_SFTP_HOST` |
| `api/portal-status.js` | GET handler returning portal status fields | VERIFIED | 25 lines; returns `portal_opted_in`, `rea_status`, `domain_status`, `rea_listing_url`, `domain_listing_url` |
| `api/__tests__/submit-to-portals.test.js` | 5 tests for PORTAL-01 | VERIFIED | 131 lines; 5 substantive test cases — all pass |
| `api/__tests__/portal-status.test.js` | 4 tests for PORTAL-03 | VERIFIED | 80 lines; 4 substantive test cases — all pass |
| `sell.html` (Step 6 edit) | Portal opt-in toggle + fee disclosure + goLive() update | VERIFIED | `portal-opt-in`, `portal-fee-ack`, `togglePortalFeeAck()`, `goLive()` validation, Supabase insert with `portal_opted_in`/`portal_fee_acknowledged`, fire-and-forget `fetch('/api/submit-to-portals')` |
| `dashboard.html` (portal card) | Portal status card with badge labels | VERIFIED | `portal-status-card`, `rea-badge`, `domain-badge`, `rea-listing-link`, `renderPortalStatus()`, `loadPortalStatus()` — called after listing load |
| `supabase-schema.sql` | 8-column portal migration SQL block | VERIFIED | All 8 columns present with `if not exists` guards: `portal_opted_in`, `portal_fee_acknowledged`, `rea_status`, `domain_status`, `rea_listing_url`, `domain_listing_url`, `portal_submitted_at`, `portal_error` |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `sell.html goLive()` | Supabase listings table | `portal_opted_in` field in insert | WIRED | Line 1214 confirms `portal_opted_in: portalOptedIn` in Supabase insert |
| `sell.html goLive()` | `/api/submit-to-portals` | `fetch('/api/submit-to-portals', { method: 'POST', body: { listing_id } })` | WIRED | Line 1249 confirms fire-and-forget POST call when `portalOptedIn=true` |
| `dashboard.html renderPortalStatus()` | `/api/portal-status?listing_id=xxx` | `fetch('/api/portal-status?...')` in `loadPortalStatus()` | WIRED | Line 1158 confirms fetch; `loadPortalStatus(listingId)` called at line 1127 |
| `api/submit-to-portals.js buildReaXml()` | `fast-xml-parser` XMLBuilder | `require('fast-xml-parser').XMLBuilder` | WIRED | Line 1 of handler confirms import |
| `api/submit-to-portals.js submitViaSftp()` | REA SFTP endpoint | `ssh2-sftp-client connect() + put()` + `REA_SFTP_HOST` guard | WIRED | Lines 69-81; guard at line 109 |
| `api/submit-to-portals.js` | Supabase listings table | `sb.from('listings').update({ rea_status })` | WIRED | Lines 111-116 (dev_skipped path) and 125-131 (SFTP success path) |
| `api/portal-status.js` | Supabase listings table | `sb.from('listings').select(...)` | WIRED | Lines 10-14 confirm SELECT with correct columns |

---

## Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| PORTAL-01 | 01-01, 01-03 | DEED integrates with QLD-licensed FSBO intermediary to submit listings to realestate.com.au | SATISFIED | `api/submit-to-portals.js` implements REAXML build + SFTP delivery; credential guard handles dev/prod split; 5 tests pass |
| PORTAL-02 | 01-02 | Seller can opt in to REA/Domain listing from sell flow with fee disclosure | SATISFIED (code) / HUMAN NEEDED (UI) | `sell.html` Step 6 has opt-in card, fee gate in `goLive()`, Supabase save confirmed; browser sign-off outstanding |
| PORTAL-03 | 01-01, 01-04 | Listing status (live on REA/Domain) visible in seller dashboard | SATISFIED (code) / HUMAN NEEDED (UI) | `api/portal-status.js` + dashboard card with 5-state badge map; browser badge rendering confirmation outstanding |

**Requirements.md traceability note:** PORTAL-01 and PORTAL-03 are recorded as "Phase 5" in the Traceability table in REQUIREMENTS.md, while PORTAL-02 is recorded as "Phase 1". The ROADMAP.md Phase 1 details and the requirements themselves are marked `[x]` (complete), so coverage is confirmed — the "Phase 5" traceability entries appear to be stale from the original ordering before the phase order was revised on 2026-03-22. This is a documentation inconsistency but does not reflect missing implementation.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `api/submit-to-portals.js` | 109 | Credential guard checks only `REA_SFTP_HOST`, not `REA_AGENCY_ID` — plan specified `!!(process.env.REA_SFTP_HOST && process.env.REA_AGENCY_ID)` | Warning | If `REA_SFTP_HOST` is set but `REA_AGENCY_ID` is absent, the SFTP submission proceeds with an empty `<agentID>` element in the XML — REA would likely reject the listing. No runtime crash; tests still pass. Fix before adding production credentials. |
| `sell.html` | 936 | `[PORTAL_FEE_PLACEHOLDER]` in fee disclosure text | Info (intentional) | Fee amount not set yet — documented in SUMMARY as outstanding commercial decision. Not a code defect. |

---

## Human Verification Required

### 1. Sell Flow Portal Opt-In (PORTAL-02)

**Test:** Open `sell.html` in a browser. Navigate to Step 6 (or jump via devtools: `document.getElementById('step-6').classList.add('active')`). Confirm:
1. The "List on realestate.com.au & Domain" blue card appears above the "Confirm & Go Live" button
2. `[PORTAL_FEE_PLACEHOLDER]` is visible in the card body (fee amount not yet set)
3. Clicking the opt-in checkbox reveals the fee acknowledgement checkbox
4. Clicking "Confirm & Go Live" WITHOUT the fee acknowledgement checkbox checked fires an alert and blocks submission
5. Checking both checkboxes allows Go Live to proceed normally

**Expected:** All five checks pass without error
**Why human:** Browser alert, checkbox visibility toggles, and form validation blocking behaviour cannot be verified programmatically

### 2. Dashboard Portal Status Badge Rendering (PORTAL-03)

**Test:** Open `dashboard.html?listing_id=<test-id>` in a browser with a listing that has `portal_opted_in=true`. Set `rea_status` to each value in Supabase and reload:
1. `pending` — badge should read "Processing..." in amber (`#d97706`)
2. `live` with `rea_listing_url` set — badge should read "Live" in green (`#16a34a`) and "View on realestate.com.au →" link should appear
3. `rejected` — badge should read "Rejected — contact DEED" in red (`#dc2626`)
4. Confirm `domain-badge` shows "Not opted in" (Domain is Phase 1b — expected)

**Expected:** Each status renders the correct label and colour; live link appears on the live state
**Why human:** `renderPortalStatus()` is client-side JavaScript in `dashboard.html` — badge rendering cannot be tested via Node

---

## Test Suite Status

All 49 Jest tests pass across 7 test suites:

| Suite | Tests | Status |
|-------|-------|--------|
| `api/__tests__/submit-to-portals.test.js` | 5 | Passed |
| `api/__tests__/portal-status.test.js` | 4 | Passed |
| `api/__tests__/broker-register.test.js` | (existing) | Passed |
| `api/__tests__/broker-submit-buyer.test.js` | (existing) | Passed |
| `api/__tests__/buyer-activate.test.js` | (existing) | Passed |
| `api/__tests__/broker-resend-activation.test.js` | (existing) | Passed |
| `api/__tests__/developer-api.test.js` | (existing) | Passed |

---

## Outstanding Commercial Prerequisites

These are not code gaps — they are documented as required before production listings can be submitted:

1. **Portal listing fee** — Replace `[PORTAL_FEE_PLACEHOLDER]` in `sell.html` once Ed confirms the dollar amount
2. **Supabase DB migration** — Run the SQL block in `supabase-schema.sql` in Supabase SQL Editor before testing with real data (portal columns do not exist in production DB until this is run)
3. **REA Ignite agency account** — Contact `reaagents@rea-group.com` for SFTP credentials (2-4 week lead time)
4. **Vercel env vars** — Add `REA_SFTP_HOST`, `REA_SFTP_USER`, `REA_SFTP_PASS`, `REA_AGENCY_ID` once REA Ignite account is active
5. **QLD corporate agent licence** — Confirm with OFT whether DEED Pty Ltd requires a corporate licence before applying for REA Ignite account

The SFTP credential guard ensures no real listings are submitted until `REA_SFTP_HOST` is set in Vercel — there is no production risk from the code being deployed.

---

*Verified: 2026-03-22*
*Verifier: Claude (gsd-verifier)*
