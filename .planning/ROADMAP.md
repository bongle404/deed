# Roadmap: DEED v2.0

## Overview

v2.0 transforms DEED from a listing platform into a complete private sale execution engine. Five phases deliver the capabilities sellers need to close confidently without an agent: portal reach via REA/Domain, QLD legal scaffolding, AI-backed pricing intelligence, structured negotiation tooling, and verified buyer finance qualification. Each phase is independently deliverable and unblocks the next.

**Phase order revised 2026-03-22** based on market audit (`MARKET-AUDIT.md`). Original order was 1=Pricing, 2=Verification, 3=Legal, 4=Negotiation, 5=Portal. Portal access is table stakes — without REA/Domain, listings have no audience. QLD Form 2 disclosure (mandatory Aug 2025) is the strongest first-mover differentiator. AI Pricing neutralises agents' main objection once listings are live.

## Milestones

- [x] **v1.0 MVP** — Full listing platform, buyer pre-qual, seller flow, broker/developer portals (shipped 2026-03-21)
- [ ] **v2.0 Execution Engine** — Phases 1-5 (in progress)

## Phases

### v2.0 Execution Engine (In Progress)

**Milestone Goal:** Sellers can reach buyers via REA/Domain, navigate QLD legal obligations, price confidently with AI comparables, negotiate structured offers, and verify buyer finance — all without an agent.

- [ ] **Phase 1: REA/Domain Portal Integration** - Sellers can list on REA/Domain via FSBO intermediary from the sell flow
- [ ] **Phase 2: QLD Legal Scaffolding** - Guided Form 2 disclosure, transparency checklist, and conveyancer referral built into the sell flow
- [ ] **Phase 3: AI Pricing Tool** - Seller gets a confidence-interval price estimate backed by comparable sales before listing
- [ ] **Phase 4: Negotiation Facilitation** - Structured counteroffer flow with side-by-side offer comparison and AI below-market flagging
- [ ] **Phase 5: Buyer Finance Verification** - Verified buyer badge via illion BankStatements (or lighter pre-approval upload) ranks verified buyers above unverified

## Phase Details

### Phase 1: REA/Domain Portal Integration
**Goal**: Sellers can opt in to REA/Domain distribution via a QLD-licensed FSBO intermediary, with listing status visible in their dashboard
**Depends on**: Nothing (first phase — table stakes for all buyer reach)
**Requirements**: PORTAL-01, PORTAL-02, PORTAL-03
**Commercial dependency**: Ed is obtaining the QLD agent licence directly (DEED acts as its own licensed agency — no third-party partnership needed). Outstanding actions before going live: (1) confirm QLD corporate agent licence for DEED Pty Ltd with OFT, (2) apply for REA Ignite agency account and obtain SFTP credentials, (3) set portal listing fee amount, (4) run Supabase migration SQL. Code is built with a credential guard — safe to build and test before the account is live.
**Success Criteria** (what must be TRUE):
  1. DEED can submit a listing to realestate.com.au via REAXML feed from a licensed agency account
  2. Seller can opt in to REA/Domain listing during the sell flow with clear fee disclosure before confirming
  3. Seller dashboard shows whether their listing is live on REA/Domain and its current status
**Plans**: 5 plans

Plans:
- [x] 01-01-PLAN.md — Wave 1: Test stubs for PORTAL-01 (submit-to-portals) and PORTAL-03 (portal-status badge logic)
- [x] 01-02-PLAN.md — Wave 1: DB migration SQL + sell.html Step 6 opt-in toggle + goLive() portal fields (PORTAL-02)
- [ ] 01-03-PLAN.md — Wave 2: api/submit-to-portals.js — REAXML builder + SFTP delivery + credential guard (PORTAL-01)
- [ ] 01-04-PLAN.md — Wave 2: api/portal-status.js GET handler + dashboard.html portal status card (PORTAL-03)
- [ ] 01-05-PLAN.md — Wave 3: Human verification checkpoint (all three PORTAL requirements)

### Phase 2: QLD Legal Scaffolding
**Goal**: Sellers complete QLD mandatory disclosure obligations (Form 2, prescribed certificates) within the listing flow and can access a conveyancer referral at offer acceptance
**Depends on**: Phase 1
**Requirements**: LEGAL-01, LEGAL-02, LEGAL-03, LEGAL-04
**Market context**: Mandatory from 1 August 2025 under Property Law Act 2023. Zero FSBO competitors have built tooling for this. First-mover window is open. Also: ATO Clearance Certificate required for all QLD sales from 1 January 2025.
**Success Criteria** (what must be TRUE):
  1. Seller completes a guided QLD Seller Disclosure Statement (Form 2) as part of listing — cannot skip it
  2. Platform displays prescribed certificate checklist (pool safety, body corp, title, rates, water, planning) with pass/fail status on the listing
  3. At offer acceptance, seller is shown a conveyancer referral prompt with a QLD-licensed partner
  4. Seller can download a pre-filled disclosure statement PDF from their dashboard
**Plans**: 6 plans

Plans:
- [ ] 02-01-PLAN.md — Wave 0: test stubs for LEGAL-01, LEGAL-02, LEGAL-04 (disclosure, checklist, PDF)
- [ ] 02-02-PLAN.md — Wave 1: DB migration + Form 2 disclosure step in sell.html + publish gate (LEGAL-01)
- [ ] 02-03-PLAN.md — Wave 1: Conveyancer referral prompt in dashboard.html accept modal (LEGAL-03)
- [ ] 02-04-PLAN.md — Wave 2: Certificate checklist module + display on listing.html and dashboard.html (LEGAL-02)
- [ ] 02-05-PLAN.md — Wave 2: PDF generation API route /api/generate-disclosure (LEGAL-04)
- [ ] 02-06-PLAN.md — Wave 3: Human verification checkpoint (all four LEGAL requirements)

### Phase 3: AI Pricing Tool
**Goal**: Sellers can see a data-backed price estimate with comparable sales before they publish — and the platform uses that estimate to flag weak offers automatically
**Depends on**: Phase 1
**Requirements**: PRICE-01, PRICE-02, PRICE-03, PRICE-04
**Plans**: 6 plans (written and verified 2026-03-21)

Plans:
- [ ] 03-01-PLAN.md — Wave 0: test stubs for all Phase 3 requirements (percentile, price-estimate, offer-floor)
- [ ] 03-02-PLAN.md — Wave 1: DB migration + percentile helper + /api/price-estimate handler
- [ ] 03-03-PLAN.md — Wave 2: below-floor offer detection module + book-inspection.js hook
- [ ] 03-04-PLAN.md — Wave 3: sell.html price estimate widget with debounced recalculation
- [ ] 03-05-PLAN.md — Wave 3: dashboard.html below-floor offer flag UI
- [ ] 03-06-PLAN.md — Wave 4: human verification checkpoint

**Success Criteria** (what must be TRUE):
  1. Seller sees a low/mid/high price estimate with confidence interval before publishing their listing
  2. Estimate displays the comparable sales it is based on (suburb, date, price, beds/baths)
  3. Estimate recalculates when seller changes property details (beds, baths, size)
  4. Seller dashboard flags any incoming offer below the floor estimate with a reason label

### Phase 4: Negotiation Facilitation
**Goal**: Sellers and buyers can conduct structured counteroffers through the platform, with AI flagging offers that are materially below the estimated floor
**Depends on**: Phase 3
**Requirements**: NEGO-01, NEGO-02, NEGO-03, NEGO-04
**Success Criteria** (what must be TRUE):
  1. Seller can submit a counteroffer with custom price and conditions directly from the dashboard
  2. Buyer receives counteroffer notification and can accept, decline, or counter again from within the platform
  3. Dashboard shows all active offers side-by-side when 2 or more offers exist
  4. Offers more than 5% below the floor price estimate are labelled "below market" with an AI-generated reason
**Plans**: TBD

### Phase 5: Buyer Finance Verification
**Goal**: Buyers can signal verified finance capacity, and sellers can see who is verified before deciding to respond
**Depends on**: Phase 1
**Requirements**: VERIF-01, VERIF-02, VERIF-03, VERIF-04
**Implementation note**: Start with lightweight v1 — verified pre-approval badge via broker letter upload (manual confirmation by DEED). Validate adoption before building full illion BankStatements API integration. Full API integration is VERIF-02 scope.
**Success Criteria** (what must be TRUE):
  1. Buyer can complete finance verification inside the pre-qualification flow (v1: broker letter upload; v2: illion API)
  2. Verified buyer profile displays a verified badge and confirmed borrowing range (no raw bank data exposed)
  3. Seller sees the verified badge and borrowing range on a buyer's enquiry before responding
  4. Unverified buyers appear below verified buyers in seller view
**Plans**: TBD

## Progress

**Execution Order:** 1 → 2 → 3 → 4 → 5

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. REA/Domain Portal Integration | 2/5 | In Progress|  | - |
| 2. QLD Legal Scaffolding | v2.0 | 0/6 | Plans written | - |
| 3. AI Pricing Tool | v2.0 | 0/6 | Plans written + verified | - |
| 4. Negotiation Facilitation | v2.0 | 0/TBD | Not started | - |
| 5. Buyer Finance Verification | v2.0 | 0/TBD | Not started | - |

---
*Roadmap created: 2026-03-21 | Phase order revised: 2026-03-22 (see MARKET-AUDIT.md) | Phase 3 plans written: 2026-03-21 | Phase 2 plans written: 2026-03-22 | Phase 1 plans written: 2026-03-22*
