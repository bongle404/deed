# Phase 2: QLD Legal Scaffolding - Research

**Researched:** 2026-03-22
**Domain:** Queensland property law compliance — Property Law Act 2023, Form 2 seller disclosure, prescribed certificates, ATO clearance certificates, PDF generation, conveyancer referral
**Confidence:** HIGH (legal requirements verified against multiple official and practitioner sources)

---

## Summary

The Property Law Act 2023 (QLD) introduced a mandatory seller disclosure regime that came into force on 1 August 2025. Every seller of Queensland residential property must complete a Seller Disclosure Statement (Form 2) and provide all prescribed certificates to the buyer **before** the buyer signs the contract. Failure gives the buyer an unconditional right to terminate at any time before settlement. This applies to FSBO sellers equally — there is no exemption for private sales. Zero FSBO platforms have built tooling for this. DEED has a genuine first-mover window.

Separately, the ATO's Foreign Resident Capital Gains Withholding (FRCGW) rules changed on 1 January 2025: the threshold dropped from $750,000 to $0, meaning **every** Queensland property sale now requires an ATO Clearance Certificate from the seller at or before settlement. Buyers who don't receive one must withhold 15% of the sale price. This is a second disclosure obligation the platform should surface.

The technical implementation is straightforward for the DEED stack: Form 2 data is collected as a multi-step form within sell.html (matching the existing listing flow pattern), stored in Supabase as a new `disclosure_statements` table, and the downloadable PDF is generated server-side in a Vercel API route using pdfmake (the right choice for a structured, data-driven document on a serverless Node.js environment). The conveyancer referral is a UI prompt — not an integration — displayed at the offer acceptance stage in dashboard.html.

**Primary recommendation:** Build the Form 2 guided form as an embedded step in sell.html (after property details, before publish), store disclosure data in Supabase, generate the PDF on-demand via `/api/generate-disclosure`, and display the prescribed certificate checklist as a status card on the public listing page and seller dashboard.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| LEGAL-01 | Seller completes a guided QLD Property Disclosure Statement form as part of the listing flow | Form 2 has 6 defined parts with ~15 conditional fields. Multi-step form pattern already established in sell.html. Must be non-skippable — publish button gated on form completion. |
| LEGAL-02 | Platform displays a 2024 QLD transparency checklist (pool safety, body corp, climate risk) with pass/fail status | 8 prescribed certificates identified. Status is self-reported by seller (not fetched from registries). Pass/fail driven by seller answers in LEGAL-01 form. Displayed on listing card and seller dashboard. |
| LEGAL-03 | At offer acceptance, seller is shown a conveyancer referral prompt with a QLD-licensed partner | No integration required. UI prompt injected into the offer-acceptance flow in dashboard.html. Must disclose any referral arrangement per QLS Rule 12.4.4. |
| LEGAL-04 | Seller can download a pre-filled disclosure statement PDF from their dashboard | pdfmake via Vercel serverless API route. Data sourced from Supabase `disclosure_statements` row linked to listing_id. |
</phase_requirements>

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| pdfmake | ^0.2.x | Server-side PDF generation from structured JSON | Declarative layout, no headless browser required, fits Vercel 10s timeout, pure Node.js — no binary dependencies unlike Puppeteer |
| @supabase/supabase-js | ^2.99.3 (existing) | Store disclosure answers, link to listing | Already in project |
| Vercel serverless functions | Existing pattern | `/api/generate-disclosure` API route | Matches all existing API routes |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| html2pdf.js | Client-side only | Alternative to server PDF if needed | Only if server approach causes timeout issues — but pdfmake avoids this |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| pdfmake (server-side) | html2pdf.js (client-side) | Client-side keeps server simple, but sensitive legal data shouldn't be assembled only in the browser; server-side is more robust and allows re-generation from stored data |
| pdfmake | Puppeteer/Chromium | Puppeteer is 100MB+ binary, hits Vercel 250MB limit risk, has cold-start delays; pdfmake is 2-3MB, generates instantly |
| pdfmake | pdf-lib | pdf-lib is better for filling existing PDF forms; pdfmake is better for generating documents from structured data (which is our case) |

**Installation:**
```bash
npm install pdfmake
```

---

## Architecture Patterns

### Recommended Project Structure

New files to add:
```
api/
  generate-disclosure.js   # POST — generates PDF from stored disclosure data
sell.html                   # Add Form 2 step (Step N in existing multi-step flow)
dashboard.html              # Add: disclosure status card, PDF download button, conveyancer prompt on offer accept
listing.html                # Add: prescribed certificate checklist card (read-only)
```

New Supabase table:
```sql
disclosure_statements (
  id, listing_id, created_at, updated_at,
  -- Part 1: Property
  lot_number, plan_number, scheme_type,
  -- Part 2: Title & Encumbrances
  has_unregistered_encumbrances, encumbrance_details,
  has_tenancy, tenancy_details,
  -- Part 3: Planning & Environment
  zoning, has_transport_notice, has_contamination_notice,
  has_heritage_listing, has_resumption_notice, has_tree_dispute,
  -- Part 4: Buildings & Infrastructure
  has_pool, pool_certificate_status,    -- 'compliant' | 'non_compliant' | 'no_pool'
  has_building_notices, building_notice_details,
  has_community_title, body_corp_certificate_status,
  -- Part 5: Rates
  council_rates_amount, water_rates_amount,
  -- Part 6: Additional
  ato_clearance_obtained,               -- ATO FRCGW certificate
  completed_at,                          -- timestamp when seller submitted
  completed_by                           -- seller email
)
```

### Pattern 1: Non-Skippable Disclosure Step

**What:** The publish button in sell.html is disabled until disclosure_statement record exists for the listing_id. The Form 2 step appears after property details are saved.

**When to use:** Always — mandatory by law.

**Implementation:**
```javascript
// In sell.html publish step — check disclosure completion before allowing publish
async function canPublish(listingId) {
  const { data } = await supabase
    .from('disclosure_statements')
    .select('completed_at')
    .eq('listing_id', listingId)
    .single();
  return data?.completed_at != null;
}
```

### Pattern 2: Prescribed Certificate Checklist (Pass/Fail Display)

**What:** Checklist derived from seller's disclosure answers — not fetched from external registries. Status is honest self-reporting with a clear disclaimer that buyers should verify independently.

**Pass/Fail logic:**

| Certificate | Pass Condition | Fail/Pending Condition |
|-------------|---------------|----------------------|
| Pool Safety Certificate | `pool_certificate_status === 'compliant'` OR `has_pool === false` | `pool_certificate_status === 'non_compliant'` |
| Body Corporate Certificate | `body_corp_certificate_status === 'provided'` OR `has_community_title === false` | `body_corp_certificate_status === 'pending'` |
| Title Search | Always "required from conveyancer" — surface as a reminder, not pass/fail | — |
| Council Rates | `council_rates_amount` is populated | Blank |
| Water Rates | `water_rates_amount` is populated | Blank |
| Building Notices | `has_building_notices === false` | `has_building_notices === true` + shows details |
| Contamination/Planning | `has_contamination_notice === false` | True = flag |
| ATO Clearance Certificate | `ato_clearance_obtained === true` | False = warning |

### Pattern 3: PDF Generation via `/api/generate-disclosure`

**What:** POST request with listing_id, fetches disclosure record from Supabase via service role, generates PDF using pdfmake, returns as application/pdf.

```javascript
// api/generate-disclosure.js
const pdfmake = require('pdfmake/build/pdfmake');
const pdfFonts = require('pdfmake/build/vfs_fonts');
pdfmake.vfs = pdfFonts.pdfMake.vfs;

module.exports = async function handler(req, res) {
  const { listing_id } = req.body;
  // ... fetch from Supabase
  const docDefinition = {
    content: [
      { text: 'QLD Seller Disclosure Statement (Form 2)', style: 'header' },
      // ... sections from disclosure data
    ]
  };
  const pdfDoc = pdfmake.createPdf(docDefinition);
  pdfDoc.getBuffer((buffer) => {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="disclosure-statement.pdf"');
    res.send(buffer);
  });
};
```

### Pattern 4: Conveyancer Referral Prompt

**What:** A UI modal or inline card shown in dashboard.html when an offer is accepted. Not an integration — static referral card with partner name, phone, and a disclosure notice.

**Legal requirement:** If DEED receives any payment for referrals, this must be disclosed overtly to the seller (QLS Rule 12.4.4). If DEED receives no payment, a simple "we recommend" framing is fine.

**Safe implementation:** Display the prompt, include text "DEED is not a law firm. You must engage a QLD-licensed solicitor to prepare your contract of sale." If a commercial referral arrangement is established later, update the prompt to include the fee disclosure.

### Anti-Patterns to Avoid

- **Fetching certificates from QBCC/council registries:** API access is not straightforward, costs money, and is not required by law. The law requires seller self-disclosure — not platform verification. Self-reporting with a buyer-beware note is correct.
- **Calling it "Form 2" on the platform:** DEED generates a disclosure summary that mirrors Form 2's content, but should not present it as the official government form. The official form PDF (244.9 KiB) is available from Queensland Government Publications — DEED can link to it or guide sellers to use it, but should not claim to replace a solicitor's preparation of the form.
- **Blocking disclosure if pool certificate is not yet obtained:** Form 36 (notice of no pool safety certificate) is a valid disclosure document. The correct response is to mark it as "not yet obtained" and inform the seller of their obligations — not to block submission.
- **Skipping the ATO clearance certificate:** It is easy to forget this is now mandatory for ALL QLD sales (not just $750k+). Every listing flow must surface this.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PDF generation | Custom HTML-to-image pipeline | pdfmake | Binary-free, instant, fits Vercel serverless — no timeout, no size issues |
| Certificate verification | Registry API calls to QBCC, council, Titles Queensland | Seller self-disclosure + disclaimer | APIs are costly, fragmented, not required by law — self-reporting is legally sufficient |
| Contract preparation | AI-drafted QLD contracts of sale | Refer to conveyancer | DEED is not a law firm, contract prep requires a solicitor in QLD |
| Electronic signature of Form 2 | Custom e-sign flow | Inform seller to use DocuSign / email delivery | The law allows electronic delivery — sellers can share via email link |

**Key insight:** The law requires disclosure, not verification. DEED's job is to guide the seller to self-disclose accurately and give them a downloadable record. It is the conveyancer's job to prepare the actual contract.

---

## Common Pitfalls

### Pitfall 1: Treating Form 2 as Optional

**What goes wrong:** Seller skips disclosure, listing goes live, offer is accepted. Buyer discovers no disclosure was provided and terminates at settlement. Seller loses months of effort.

**Why it happens:** Platforms treat legal compliance as friction to minimise rather than protection to enforce.

**How to avoid:** Hard gate. The "Publish" button must be disabled until disclosure is marked complete. This is non-negotiable.

**Warning signs:** Any code path that allows listing status to change to "active" without a linked `disclosure_statements.completed_at`.

### Pitfall 2: Missing the ATO Clearance Certificate

**What goes wrong:** Seller doesn't know about the new 1 January 2025 FRCGW rules. Buyer withholds 15% at settlement. Seller is shocked and blames DEED.

**Why it happens:** The ATO clearance certificate is managed separately from the QLD disclosure scheme and is easy to omit from a disclosure checklist.

**How to avoid:** Include `ato_clearance_obtained` as an explicit field in the disclosure form. Surface a warning in the checklist if false.

**Warning signs:** A disclosure checklist that only covers QLD-legislation items without mentioning the ATO requirement.

### Pitfall 3: Confusing "Pool Safety Certificate" with "Form 36"

**What goes wrong:** Platform assumes absence of a pool safety certificate = block or fail. In reality, Form 36 (notice of no pool safety certificate) is a valid disclosure document — it transfers the obligation to the buyer.

**Why it happens:** Developers read "pool safety certificate required" and implement a binary pass/fail without understanding the Form 36 pathway.

**How to avoid:** The disclosure form should offer three options: (a) "We have a pool safety certificate", (b) "We have a pool but no certificate — I will provide Form 36", (c) "No pool on property."

**Warning signs:** A binary yes/no for pool safety that doesn't account for Form 36.

### Pitfall 4: Claiming the Platform Produces the Official Form 2

**What goes wrong:** DEED presents its disclosure summary as "the Form 2" — which it legally is not. If challenged, the platform may be seen as providing legal services without a licence.

**Why it happens:** It seems simpler to call it Form 2 to make it concrete for users.

**How to avoid:** Frame it as a "disclosure guide" or "disclosure checklist". Link to the official Form 2 PDF. Recommend the seller have a solicitor review before contract execution. Include a disclaimer: "This is not legal advice. DEED is not a law firm."

**Warning signs:** Any UI copy that says "Your Form 2 is complete" without a disclaimer.

### Pitfall 5: Body Corporate Certificate Delays

**What goes wrong:** Seller has strata/unit property. Body corporate has up to 5 business days to produce the certificate. Contract signs before it arrives. Disclosure is technically incomplete.

**Why it happens:** The body corporate certificate is the only certificate in the scheme not produced by the seller — it requires a third-party request.

**How to avoid:** Flag in the disclosure form: "Is this a community title/strata property? If yes, you need to request the body corporate certificate immediately — allow 5 business days." Offer to mark the listing as "preparing disclosure documents" (not published) until received.

---

## Code Examples

Verified patterns from official sources and project conventions:

### Supabase DB Migration (add disclosure table)
```sql
-- .planning/phases/02-qld-legal-scaffolding/migration-disclosure.sql
create table disclosure_statements (
  id                          uuid primary key default uuid_generate_v4(),
  listing_id                  uuid references listings(id) on delete cascade,
  created_at                  timestamptz default now(),
  updated_at                  timestamptz default now(),

  -- Part 1: Property identification
  lot_number                  text,
  plan_number                 text,
  scheme_type                 text,                    -- 'torrens' | 'community_title' | 'bugta'

  -- Part 2: Title & encumbrances
  has_unregistered_encumbrances boolean default false,
  encumbrance_details         text,
  has_tenancy                 boolean default false,
  tenancy_details             text,

  -- Part 3: Planning & environment
  zoning                      text,
  has_transport_notice        boolean default false,
  has_contamination_notice    boolean default false,
  has_heritage_listing        boolean default false,
  has_resumption_notice       boolean default false,
  has_tree_dispute            boolean default false,

  -- Part 4: Buildings
  has_pool                    boolean default false,
  pool_status                 text,                    -- 'compliant' | 'non_compliant_form36' | 'no_pool'
  has_building_notices        boolean default false,
  building_notice_details     text,
  has_community_title         boolean default false,
  body_corp_cert_status       text,                    -- 'provided' | 'pending' | 'not_applicable'

  -- Part 5: Rates
  council_rates_amount        text,
  water_rates_amount          text,

  -- ATO (separate from QLD scheme but mandatory)
  ato_clearance_obtained      boolean default false,

  -- Completion tracking
  completed_at                timestamptz,
  completed_by                text                     -- seller email
);

create index on disclosure_statements (listing_id);
```

### pdfmake API Route Pattern (matching existing api/*.js style)
```javascript
// api/generate-disclosure.js
const pdfmake = require('pdfmake/build/pdfmake');
const pdfFonts = require('pdfmake/build/vfs_fonts');
const { createClient } = require('@supabase/supabase-js');

pdfmake.vfs = pdfFonts.pdfMake.vfs;

const SUPABASE_URL = 'https://jtpykhrdjkzhcbswrhzo.supabase.co';

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { listing_id } = req.body || {};
  if (!listing_id) return res.status(400).json({ error: 'listing_id required' });

  const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  const { data: disclosure } = await supabase
    .from('disclosure_statements')
    .select('*, listings(address, suburb, seller_name)')
    .eq('listing_id', listing_id)
    .single();

  if (!disclosure) return res.status(404).json({ error: 'Disclosure not found' });

  const docDefinition = buildDocDefinition(disclosure);

  pdfmake.createPdf(docDefinition).getBuffer((buffer) => {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="disclosure-statement.pdf"');
    res.send(Buffer.from(buffer));
  });
};

function buildDocDefinition(d) {
  return {
    content: [
      { text: 'QLD Property Disclosure Summary', style: 'h1' },
      { text: 'Property Law Act 2023 — Seller Disclosure', style: 'subtitle' },
      { text: `Property: ${d.listings?.address}, ${d.listings?.suburb} QLD`, margin: [0, 8, 0, 4] },
      { text: `Seller: ${d.listings?.seller_name}`, margin: [0, 0, 0, 16] },
      { text: 'This disclosure summary was completed by the seller. DEED is not a law firm. Buyers should verify all certificates independently.', style: 'disclaimer' },
      // ... sections
    ],
    styles: {
      h1: { fontSize: 18, bold: true, margin: [0, 0, 0, 4] },
      subtitle: { fontSize: 11, color: '#6b7280', margin: [0, 0, 0, 16] },
      disclaimer: { fontSize: 9, color: '#9ca3af', italics: true, margin: [0, 0, 0, 16] },
    }
  };
}
```

### Conveyancer Referral Prompt (dashboard.html injection point)
```javascript
// In dashboard.html — offer acceptance handler, after contract generation
function showConveyancerReferral(listing) {
  const modal = document.getElementById('conveyancer-referral-modal');
  modal.innerHTML = `
    <div class="info-card info-card-blue">
      <div class="info-card-label">Next Step: Engage a Solicitor</div>
      <p>Offer accepted. A QLD-licensed solicitor must prepare the contract of sale.
         DEED is not a law firm and cannot provide legal advice.</p>
      <p><strong>Recommended: [Partner Firm Name]</strong><br>
         QLD-licensed conveyancing solicitors<br>
         Phone: [number] · Web: [url]</p>
      <p style="font-size:0.78rem;color:#6b7280">
        DEED may receive a referral arrangement with our partner firms.
        You are not obligated to use any firm we recommend.
      </p>
    </div>
  `;
  modal.style.display = 'block';
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| QLD used "buyer beware" — no mandatory seller disclosure | Mandatory Form 2 disclosure before contract signing | 1 August 2025 | Every QLD seller must now complete disclosure. Non-compliance = buyer termination right |
| ATO clearance only required for sales $750k+ | Required for ALL QLD property sales at any price | 1 January 2025 | Every DEED seller needs one |
| Section 206 body corporate statement (old BCCMA form) | Body corporate certificate (new prescribed form) | 1 August 2025 | Strata sellers must request the new format from their body corporate |
| Electronic QR code links accepted as delivery proof | QR codes alone explicitly insufficient — requires email/signed delivery with read confirmation | 1 August 2025 | Delivery method matters for legal proof |

**Deprecated/outdated:**
- Section 206 BCCMA statement: Replaced by body corporate certificate. Any reference to "s206" in platform copy should use "body corporate certificate."
- Pool safety "sustainability declaration": The old sustainability declaration in REIQ contracts has been replaced by Form 2 obligations. Do not reference sustainability declaration.

---

## Open Questions

1. **Conveyancer referral partner — commercial arrangement not yet established**
   - What we know: DEED needs at least one QLD-licensed solicitor firm as a named referral partner
   - What's unclear: Whether a revenue share is possible, what firm to partner with
   - Recommendation: Build the referral prompt UI with a placeholder partner. Finalise commercial arrangement before Phase 2 ships. If no paid arrangement, the prompt is still legally fine — just recommend without claiming endorsement.

2. **Should DEED generate the actual Form 2 PDF or link to the official government form?**
   - What we know: The official Form 2 is a 244.9 KiB PDF available at publications.qld.gov.au. DEED can link to it.
   - What's unclear: Whether generating a pre-filled version crosses into "legal services."
   - Recommendation: Generate a "Disclosure Summary" (clearly labelled as DEED's record, not the official form). Link to the official Form 2 PDF for sellers who want the government version. Instruct sellers their solicitor will prepare the actual contract with the formal Form 2.

3. **Title search — who pays and how is it obtained?**
   - What we know: A title search is a prescribed certificate that must accompany Form 2. It is obtained from Titles Queensland (~$28-35 AUD).
   - What's unclear: Whether DEED should guide sellers to get it themselves or if the conveyancer handles it.
   - Recommendation: List "Title Search" in the checklist as "obtain from titles.qld.gov.au — your conveyancer can do this". Do not attempt to integrate with Titles Queensland API.

---

## Validation Architecture

No `workflow.nyquist_validation: false` found in config.json (file does not exist) — treat as enabled.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Jest (already configured in package.json) |
| Config file | package.json `jest` block — `testEnvironment: node`, `testMatch: **/api/__tests__/**/*.test.js` |
| Quick run command | `npm test -- --testPathPattern=disclosure` |
| Full suite command | `npm test` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LEGAL-01 | Disclosure form saves to Supabase with completed_at set | unit | `npm test -- --testPathPattern=disclosure` | Wave 0 |
| LEGAL-01 | Listing cannot publish if no completed disclosure | unit | `npm test -- --testPathPattern=disclosure` | Wave 0 |
| LEGAL-02 | Checklist status derives correctly from disclosure answers | unit | `npm test -- --testPathPattern=disclosure-checklist` | Wave 0 |
| LEGAL-04 | generate-disclosure API returns PDF buffer for valid listing_id | unit | `npm test -- --testPathPattern=generate-disclosure` | Wave 0 |
| LEGAL-04 | generate-disclosure returns 404 for missing listing | unit | `npm test -- --testPathPattern=generate-disclosure` | Wave 0 |
| LEGAL-03 | Conveyancer prompt displays on offer acceptance (UI — manual) | manual | Visual check in dashboard.html | N/A |

### Sampling Rate
- **Per task commit:** `npm test -- --testPathPattern=disclosure`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `api/__tests__/generate-disclosure.test.js` — covers LEGAL-04
- [ ] `api/__tests__/disclosure-checklist.test.js` — covers LEGAL-02 checklist logic
- [ ] `api/__tests__/disclosure-gate.test.js` — covers LEGAL-01 publish gate
- [ ] `npm install pdfmake` — required before generate-disclosure.js can run

---

## Sources

### Primary (HIGH confidence)
- [QLD Government — Seller Disclosure Scheme](https://www.qld.gov.au/law/housing-and-neighbours/buying-and-selling-a-property/seller-disclosure-scheme) — official scheme overview, exemptions, delivery rules
- [QLD Government Publications — Form 2 PDF](https://www.publications.qld.gov.au/dataset/property-law-act-2023-forms/resource/7a1be178-d2d5-4744-9147-9699c04ee8d8) — official form, confirmed live
- [ATO — Australian Residents and Clearance Certificates](https://www.ato.gov.au/individuals-and-families/investments-and-assets/capital-gains-tax/foreign-residents-and-capital-gains-tax/foreign-resident-capital-gains-withholding/australian-residents-and-clearance-certificates) — FRCGW rules, 1 Jan 2025 threshold change
- [QLS — Paying Referral Fees Rule 12.4.4](https://www.qls.com.au/Guidance-Statements/No-03-Paying-Referral-Fees-and-Rule-12-4-4-Austral) — referral fee disclosure requirements
- [QBCC — Form 36 Pool Safety](https://www.qbcc.qld.gov.au/resources/form/form-36-notice-no-pool-safety-certificate) — Form 36 confirmed, penalties confirmed

### Secondary (MEDIUM confidence)
- [Holding Redlich — QLD Seller Disclosure Aug 2025](https://www.holdingredlich.com/queensland-s-property-law-act-new-seller-disclosure-requirements-from-1-august-2025) — practitioner analysis, prescribed certificate list
- [Ensure Legal — Complete Guide Form 2](https://ensurelegal.com.au/complete-guide-to-the-new-seller-disclosure-statement-in-qld-effective-1-august-2025/) — Form 2 parts breakdown, buyer remedies, exemptions
- [Spot On Conveyancing — Form 2 Analysis](https://spotonconveyancing.com.au/navigating-queenslands-new-seller-disclosure-regime-an-analysis-of-form-2-under-the-property-law-act-2023/) — electronic delivery proof requirements
- [pdfmake official docs](https://pdfmake.github.io/docs/0.1/) — server-side PDF generation

### Tertiary (LOW confidence)
- WebSearch results on pool safety penalties (~$23k) — credible but verify against QBCC official before surfacing to users

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — pdfmake is established, no competing claims, fits Vercel constraints perfectly
- Legal requirements (Form 2, FRCGW): HIGH — verified against official QLD Government and ATO sources
- Architecture: HIGH — follows existing project patterns, no framework deviations
- Conveyancer referral rules: MEDIUM — QLS guidance is clear on solicitor obligations; platform-side disclosure obligation is inferred from best-practice guidance, not statute
- Pitfalls: HIGH — Form 36 and body corporate delay pitfalls verified against practitioner sources

**Research date:** 2026-03-22
**Valid until:** 2026-09-22 (QLD property law is stable post-August 2025 implementation; ATO rules are settled; review if QBCC pool certificate rules change)
