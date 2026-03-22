# Requirements: DEED v2.0

**Defined:** 2026-03-21
**Core Value:** A seller can list privately and confidently — knowing every buyer has been verified — without paying agent commission.

## v2.0 Requirements

### Pricing (AI Pricing Tool)

- [ ] **PRICE-01**: Seller can see an AI-generated price estimate with confidence interval (low/mid/high) before publishing their listing
- [ ] **PRICE-02**: Price estimate displays the comparable sales it is based on (suburb, sale date, price, beds/baths)
- [ ] **PRICE-03**: Seller dashboard flags any incoming offer below the estimated floor price with a reason
- [ ] **PRICE-04**: Price estimate updates if seller changes property details (beds, baths, size)

### Verification (Buyer Finance Verification)

- [ ] **VERIF-01**: Buyer can complete finance verification via illion BankStatements within the pre-qualification flow
- [ ] **VERIF-02**: Verified buyer profile displays a verified badge and confirmed borrowing range (not raw bank data)
- [ ] **VERIF-03**: Seller sees buyer's verified badge and borrowing range before deciding to respond to an enquiry
- [ ] **VERIF-04**: Unverified buyers can still register interest but are ranked below verified buyers in seller view

### Legal (QLD Legal Scaffolding)

- [ ] **LEGAL-01**: Seller completes a guided QLD Property Disclosure Statement form as part of the listing flow
- [ ] **LEGAL-02**: Platform displays a 2024 QLD transparency checklist (climate risk, pool safety, body corp) with pass/fail status
- [ ] **LEGAL-03**: At offer acceptance, seller is shown a conveyancer referral prompt with a QLD-licensed partner
- [ ] **LEGAL-04**: Seller can download a pre-filled disclosure statement PDF from their dashboard

### Negotiation (Negotiation Facilitation)

- [ ] **NEGO-01**: Seller can submit a counteroffer with custom price and conditions directly from the dashboard
- [ ] **NEGO-02**: Buyer receives counteroffer notification and can accept, decline, or counter again
- [ ] **NEGO-03**: Dashboard shows all offers side-by-side when 2 or more offers exist
- [ ] **NEGO-04**: AI flags offers more than 5% below the floor price estimate with a "below market" label and reason

### Portal (REA/Domain Access)

- [x] **PORTAL-01**: DEED integrates with a QLD-licensed FSBO intermediary to submit listings to realestate.com.au
- [x] **PORTAL-02**: Seller can opt in to REA/Domain listing from the sell flow (with fee disclosure)
- [x] **PORTAL-03**: Listing status (live on REA/Domain) is visible in seller dashboard

## v3 Requirements (Deferred)

### Growth
- **GROW-01**: Broker outreach tools and referral tracking
- **GROW-02**: Seller success story / testimonial capture flow
- **GROW-03**: Suburb demand page (public-facing verified buyer counts per suburb)

### Platform
- **PLAT-01**: Mobile app
- **PLAT-02**: National expansion beyond QLD
- **PLAT-03**: Open banking CDR integration (Frollo/Basiq) — if illion proves insufficient

## Out of Scope

| Feature | Reason |
|---------|--------|
| iBuyer / guaranteed offer | Requires capital — different business model |
| Agent-facing tools | DEED displaces agents |
| National launch | QLD only until PMF confirmed |
| Mobile app | Web-first |
| Full legal services | DEED is not a law firm |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| PRICE-01 | Phase 1 | Pending |
| PRICE-02 | Phase 1 | Pending |
| PRICE-03 | Phase 1 | Pending |
| PRICE-04 | Phase 1 | Pending |
| VERIF-01 | Phase 2 | Pending |
| VERIF-02 | Phase 2 | Pending |
| VERIF-03 | Phase 2 | Pending |
| VERIF-04 | Phase 2 | Pending |
| LEGAL-01 | Phase 3 | Pending |
| LEGAL-02 | Phase 3 | Pending |
| LEGAL-03 | Phase 3 | Pending |
| LEGAL-04 | Phase 3 | Pending |
| NEGO-01 | Phase 4 | Pending |
| NEGO-02 | Phase 4 | Pending |
| NEGO-03 | Phase 4 | Pending |
| NEGO-04 | Phase 4 | Pending |
| PORTAL-01 | Phase 5 | Complete |
| PORTAL-02 | Phase 1 | Complete |
| PORTAL-03 | Phase 5 | Complete |

**Coverage:**
- v2.0 requirements: 19 total
- Mapped to phases: 19/19 ✓
- Unmapped: 0

---
*Requirements defined: 2026-03-21 | Traceability updated: 2026-03-22*
