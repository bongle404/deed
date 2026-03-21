# Roadmap: DEED v2.0

## Overview

v2.0 transforms DEED from a listing platform into a complete private sale execution engine. Five phases deliver the capabilities sellers need to close confidently without an agent: AI-backed pricing intelligence, real buyer finance verification, QLD legal scaffolding, structured negotiation tooling, and portal reach via REA/Domain. Each phase is independently deliverable and unblocks the next.

## Milestones

- [x] **v1.0 MVP** — Full listing platform, buyer pre-qual, seller flow, broker/developer portals (shipped 2026-03-21)
- [ ] **v2.0 Execution Engine** — Phases 1-5 (in progress)

## Phases

### v2.0 Execution Engine (In Progress)

**Milestone Goal:** Sellers can price, verify buyers, navigate QLD legal obligations, negotiate structured offers, and reach buyers via REA/Domain — all without an agent.

- [ ] **Phase 1: AI Pricing Tool** - Seller gets a confidence-interval price estimate backed by comparable sales before listing
- [ ] **Phase 2: Buyer Finance Verification** - Real illion BankStatements integration ranks verified buyers above unverified in seller view
- [ ] **Phase 3: QLD Legal Scaffolding** - Guided disclosure statement, transparency checklist, and conveyancer referral built into the sell flow
- [ ] **Phase 4: Negotiation Facilitation** - Structured counteroffer flow with side-by-side offer comparison and AI below-market flagging
- [ ] **Phase 5: REA/Domain Portal Integration** - Sellers can opt in to REA/Domain listing via FSBO intermediary from the sell flow

## Phase Details

### Phase 1: AI Pricing Tool
**Goal**: Sellers can see a data-backed price estimate with comparable sales before they publish — and the platform uses that estimate to flag weak offers automatically
**Depends on**: Nothing (first phase)
**Requirements**: PRICE-01, PRICE-02, PRICE-03, PRICE-04
**Success Criteria** (what must be TRUE):
  1. Seller sees a low/mid/high price estimate with confidence interval before publishing their listing
  2. Estimate displays the comparable sales it is based on (suburb, date, price, beds/baths)
  3. Estimate recalculates when seller changes property details (beds, baths, size)
  4. Seller dashboard flags any incoming offer below the floor estimate with a reason label
**Plans**: 6 plans

Plans:
- [ ] 01-01-PLAN.md — Wave 0: test stubs for all Phase 1 requirements (percentile, price-estimate, offer-floor)
- [ ] 01-02-PLAN.md — Wave 1: DB migration + percentile helper + /api/price-estimate handler
- [ ] 01-03-PLAN.md — Wave 2: below-floor offer detection module + book-inspection.js hook
- [ ] 01-04-PLAN.md — Wave 3: sell.html price estimate widget with debounced recalculation
- [ ] 01-05-PLAN.md — Wave 3: dashboard.html below-floor offer flag UI
- [ ] 01-06-PLAN.md — Wave 4: human verification checkpoint

### Phase 2: Buyer Finance Verification
**Goal**: Buyers can complete real finance verification via illion, and sellers can see who is verified before deciding to respond
**Depends on**: Phase 1
**Requirements**: VERIF-01, VERIF-02, VERIF-03, VERIF-04
**Success Criteria** (what must be TRUE):
  1. Buyer can complete finance verification via illion BankStatements inside the pre-qualification flow
  2. Verified buyer profile displays a verified badge and confirmed borrowing range (no raw bank data exposed)
  3. Seller sees the verified badge and borrowing range on a buyer's enquiry before responding
  4. Unverified buyers appear below verified buyers in seller view
**Plans**: TBD

### Phase 3: QLD Legal Scaffolding
**Goal**: Sellers complete QLD disclosure obligations within the listing flow and can access a conveyancer referral at offer acceptance
**Depends on**: Phase 2
**Requirements**: LEGAL-01, LEGAL-02, LEGAL-03, LEGAL-04
**Success Criteria** (what must be TRUE):
  1. Seller completes a guided QLD Property Disclosure Statement as part of listing — cannot skip it
  2. Platform displays the 2024 QLD transparency checklist (climate risk, pool safety, body corp) with pass/fail status on the listing
  3. At offer acceptance, seller is shown a conveyancer referral prompt with a QLD-licensed partner
  4. Seller can download a pre-filled disclosure statement PDF from their dashboard
**Plans**: TBD

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

### Phase 5: REA/Domain Portal Integration
**Goal**: Sellers can opt in to REA/Domain distribution via a QLD-licensed FSBO intermediary, with listing status visible in their dashboard
**Depends on**: Phase 4
**Requirements**: PORTAL-01, PORTAL-02, PORTAL-03
**Success Criteria** (what must be TRUE):
  1. DEED can submit a listing to realestate.com.au via a QLD-licensed FSBO intermediary integration
  2. Seller can opt in to REA/Domain listing during the sell flow with clear fee disclosure before confirming
  3. Seller dashboard shows whether their listing is live on REA/Domain and its current status
**Plans**: TBD

## Progress

**Execution Order:** 1 → 2 → 3 → 4 → 5

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. AI Pricing Tool | v2.0 | 0/6 | Planning done | - |
| 2. Buyer Finance Verification | v2.0 | 0/TBD | Not started | - |
| 3. QLD Legal Scaffolding | v2.0 | 0/TBD | Not started | - |
| 4. Negotiation Facilitation | v2.0 | 0/TBD | Not started | - |
| 5. REA/Domain Portal Integration | v2.0 | 0/TBD | Not started | - |

---
*Roadmap created: 2026-03-21 | Phase 1 plans created: 2026-03-21*
