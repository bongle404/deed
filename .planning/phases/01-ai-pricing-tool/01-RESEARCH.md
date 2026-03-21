# Phase 1: AI Pricing Tool - Research

**Researched:** 2026-03-21
**Domain:** Australian property data APIs, comparable sales algorithms, Vercel serverless + Supabase patterns
**Confidence:** MEDIUM — API access details are enterprise/contact-only; algorithm approach is HIGH confidence; codebase patterns are HIGH confidence

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PRICE-01 | Seller sees an AI-generated price estimate with confidence interval (low/mid/high) before publishing | Comparable sales algorithm (percentile bands), `/api/price-estimate` serverless function pattern |
| PRICE-02 | Price estimate displays the comparable sales it is based on (suburb, sale date, price, beds/baths) | Proptech Data Nearby Sales API returns this structure; must be surfaced in UI |
| PRICE-03 | Seller dashboard flags any incoming offer below the estimated floor price with a reason | Floor = low-band estimate; compare on offer insert, store flag on offers table |
| PRICE-04 | Price estimate recalculates when seller changes property details (beds, baths, size) | Debounced JS call to `/api/price-estimate` on input change; no page reload needed |
</phase_requirements>

---

## Summary

DEED is a pure HTML/CSS/JS platform with Vercel serverless API functions and Supabase Postgres. There is no React — UI interactions are vanilla JS DOM manipulation. All new API work follows the existing pattern: a Node.js module in `/api/` exported as `module.exports = async function handler(req, res)`, called via `fetch()` from the front end.

The core challenge for Phase 1 is the Australian property data API market. The gold-standard providers (CoreLogic/Cotality, PropTrack/REA) are enterprise-only with no public pricing and no self-serve sign-up — they require a commercial contract. The most viable path for a pre-revenue startup is **Proptech Data** (proptechdata.com.au), which offers a 30-day free trial (100 req/day) and a startup-accessible commercial tier. Domain Group's API has a free innovation tier but does not surface individual comparable sale transactions — it is listing data, not settled sales data. As a fallback, Queensland Government open data provides land valuation bulk data, but it lacks the per-transaction detail (beds/baths, sale price) needed for comparables.

The algorithm for low/mid/high estimation does not require ML. Given a set of comparable sales, the standard approach is: filter by suburb + beds within ±1 + property type + sold within 12 months, compute the 25th percentile (low), median (mid), and 75th percentile (high) of sale prices. Floor price = the 25th percentile (low estimate). This is the same methodology used by appraisers under the Sales Comparison Approach, and it is transparent enough to show sellers why the estimate was generated.

**Primary recommendation:** Sign up for Proptech Data free trial immediately, test the `/market-activity/sales` and suburb stats endpoints for QLD data quality, then build the estimate function against that API. Cache responses in a `comparable_sales_cache` Supabase table (TTL 7 days) to stay within rate limits. If Proptech Data data quality is insufficient, escalate to a CoreLogic commercial conversation before development continues.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js (Vercel serverless) | 18.x (Vercel default) | `/api/price-estimate` handler | Matches all existing API functions |
| @supabase/supabase-js | ^2.99.3 (already installed) | Cache comparable sales, store floor price on listings | Already the project's DB client |
| @anthropic-ai/sdk | ^0.36.0 (already installed) | Generate plain-English reason label for below-floor offer flag | Already used for contract + copy generation |
| Vanilla JS (fetch + DOM) | ES2020 | Front-end estimate widget, debounced recalculation | No frameworks in this project — hard constraint |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Proptech Data API | SaaS — no npm pkg | Source of comparable sales data | Primary data source; call from serverless function |
| Domain Group API | SaaS — no npm pkg | Fallback suburb median data | If Proptech Data doesn't cover a suburb |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Proptech Data | CoreLogic/Cotality | CoreLogic is best data quality but enterprise-only, 6-12 week commercial onboarding, not viable for a pre-revenue platform |
| Proptech Data | PropTrack (REA) | PropTrack APIs launched but are gated behind REA partner agreements — same commercial barrier |
| Proptech Data | Queensland Government open data (QVAS) | QVAS provides bulk land valuation data (not sale price per transaction) and does not include bedrooms/bathrooms; cannot build per-property comparables |
| Proptech Data | Scraping Domain/REA | ToS violation; not defensible; breaks unpredictably |
| Percentile-band algorithm | Hedonic regression (ML) | Regression requires 1000s of labelled training rows and model retraining; percentile bands are accurate enough for a seller-facing tool and require no training data |

**Installation:**
```bash
# No new npm packages needed — all dependencies already in package.json
# Register at proptechdata.com.au for API key
```

---

## Architecture Patterns

### Recommended Project Structure
```
/api/
├── price-estimate.js       # New: POST handler — takes suburb/beds/baths/size, returns low/mid/high + comps
/
├── sell.html               # Modified: add pricing widget between property details and review step
├── dashboard.html          # Modified: add below-floor flag banner on offer cards
├── supabase-schema.sql     # Existing (do not modify) — migrations go in schema-part1-tables.sql pattern
```

Supabase schema additions (new migration SQL file):
```
comparable_sales_cache     # suburb + beds + type + fetched_at + JSON blob of comps + median/low/high
listings (alter)           # Add: price_estimate_low, price_estimate_mid, price_estimate_high, price_estimate_fetched_at
offers (alter)             # Add: below_floor boolean default false, below_floor_reason text
```

### Pattern 1: Serverless Price Estimate Handler
**What:** POST `/api/price-estimate` accepts `{suburb, bedrooms, bathrooms, property_type, land_size}` — queries Proptech Data for recent sales, runs percentile calculation, returns estimate object.
**When to use:** Called from sell.html during listing creation (property details step), and on PRICE-04 recalculation.
**Example:**
```javascript
// api/price-estimate.js — matches existing handler signature
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { suburb, bedrooms, property_type } = req.body || {};
  if (!suburb || !bedrooms) return res.status(400).json({ error: 'Missing suburb or bedrooms' });

  // 1. Check Supabase cache (TTL 7 days)
  // 2. If stale or missing, call Proptech Data API
  // 3. Filter comps: same suburb, beds ±1, sold within 12 months
  // 4. Calculate percentiles: low=p25, mid=p50, high=p75
  // 5. Store in cache, return to client

  return res.status(200).json({
    low: 820000,
    mid: 950000,
    high: 1080000,
    confidence: 'HIGH',     // HIGH if 5+ comps, MEDIUM if 3-4, LOW if <3
    comp_count: 8,
    comparables: [
      { address: '14 Smith St', suburb: 'Burleigh Heads', sold_date: '2025-11-12',
        price: 940000, bedrooms: 4, bathrooms: 2 }
    ]
  });
};
```

### Pattern 2: Percentile Band Calculation (pure JS, no library)
**What:** Given an array of sale prices, compute p25/p50/p75 using the nearest-rank method.
**When to use:** Inside price-estimate.js, after filtering comps.
**Example:**
```javascript
function percentile(sortedArr, p) {
  if (sortedArr.length === 0) return null;
  const index = Math.ceil((p / 100) * sortedArr.length) - 1;
  return sortedArr[Math.max(0, index)];
}

function calcEstimate(comparables) {
  const prices = comparables.map(c => c.price).sort((a, b) => a - b);
  return {
    low: percentile(prices, 25),
    mid: percentile(prices, 50),
    high: percentile(prices, 75),
    confidence: prices.length >= 5 ? 'HIGH' : prices.length >= 3 ? 'MEDIUM' : 'LOW'
  };
}
```

### Pattern 3: Below-Floor Offer Flagging
**What:** On offer submission (existing `offer` insert flow), compare `offer_price` against `listings.price_estimate_low`. If below, set `offers.below_floor = true` and call Claude Haiku for a one-sentence reason label.
**When to use:** Triggered during offer insert — same location as the existing `calculate_offer_strength` trigger, or in the serverless layer before insert.
**Example:**
```javascript
// Inside offer submission handler — after offer insert
if (listing.price_estimate_low && offer.offer_price < listing.price_estimate_low) {
  const reason = await generateBelowFloorReason(offer, listing); // Claude Haiku call
  await supabase.from('offers').update({
    below_floor: true,
    below_floor_reason: reason
  }).eq('id', newOffer.id);
}
```
Floor price = `price_estimate_low` (p25 of comps). This is the defensible boundary — 25% of comparable sales in the suburb sold at or below this price, so anything under it is genuinely below-market.

### Pattern 4: Front-end Debounced Recalculation (PRICE-04)
**What:** In sell.html, attach `input` event listeners to beds/baths/size fields. Debounce 600ms, then POST to `/api/price-estimate` and re-render the estimate widget.
**When to use:** On any property detail change after the seller has entered suburb and beds.
**Example:**
```javascript
let debounceTimer;
['bedrooms', 'bathrooms', 'land_size'].forEach(id => {
  document.getElementById(id).addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(refreshEstimate, 600);
  });
});

async function refreshEstimate() {
  const result = await fetch('/api/price-estimate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ suburb, bedrooms, bathrooms, property_type })
  }).then(r => r.json());
  renderEstimateWidget(result);
}
```

### Anti-Patterns to Avoid
- **Calling Proptech Data API on every page load without caching:** Rate limits (100/day on free trial) will be exhausted within hours if multiple sellers are active. Always check the Supabase cache first.
- **Storing raw API response without normalisation:** Proptech Data response shape may change. Normalise to a defined comparable object `{address, suburb, sold_date, price, bedrooms, bathrooms}` before caching.
- **Using the asking_price as floor for offer flagging instead of the AI estimate:** The asking price is seller input and may be wrong. The estimate's p25 (low) is the data-backed floor.
- **Making Claude Haiku the source of the estimate:** Claude should only generate the text reason label for the below-floor flag. Price numbers must come from real comparable sales data. Using Claude to generate prices from training knowledge violates Ed's Rule 4 (real data only).
- **Updating the offer strength trigger in Postgres to incorporate floor price:** The existing trigger calculates strength relative to asking_price. Keep it separate — below-floor is a separate concept and should live in the serverless layer or application logic.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Comparable sales data | Scraping REA/Domain | Proptech Data API | ToS violation, breaks unpredictably, maintenance cost |
| Percentile calculation | Complex stats library | 10-line native JS (shown above) | No external dependency needed; percentile bands are 5 lines of code |
| Caching layer | Redis or separate cache service | Supabase table `comparable_sales_cache` | Already the project's DB; no new infrastructure |
| Below-floor reason text | Rule-based string templates | Claude Haiku (already integrated) | Haiku already used for generate-contract and generate-copy; same pattern, same env var |
| AVM model training | Building a regression model | Proptech Data AVM endpoint | Proptech Data offers an AVM endpoint — use it if comparable sales count is too low (<3) |

**Key insight:** The statistics here are simple — the complexity is in data sourcing, not the math. The percentile algorithm is trivial; the hard part is having reliable comparable sale records for QLD suburbs.

---

## Common Pitfalls

### Pitfall 1: API Data Sparsity for Regional/Small Suburbs
**What goes wrong:** Proptech Data may return fewer than 3 comparable sales for small QLD suburbs (e.g., Toogoolawah, Esk). The estimate becomes unreliable.
**Why it happens:** Thin markets have few transactions. API data reflects actual sales volume.
**How to avoid:** Use a confidence tier: HIGH (5+ comps), MEDIUM (3-4 comps), LOW (1-2 comps). When confidence is LOW, widen the suburb radius or relax the beds filter. Show confidence level to seller so they understand the basis.
**Warning signs:** `comp_count < 3` in the API response.

### Pitfall 2: Stale Cache Misleading Sellers in Fast-Moving Market
**What goes wrong:** If comparable sales data is cached for too long, it may reflect a market that has moved significantly.
**Why it happens:** Brisbane/QLD has been running 12-13% annual growth. A 30-day cache could understate current prices.
**How to avoid:** Set cache TTL to 7 days, not 30. On cache hit, show "Based on sales data from [fetched_at date]" in the UI so sellers can see currency of data.
**Warning signs:** Seller feedback that estimates are too low compared to what neighbours sold for recently.

### Pitfall 3: Price Estimate Stored But Not Refreshed on Listing Edit
**What goes wrong:** Seller creates a listing with estimate, then later edits beds/baths. The stored `price_estimate_low/mid/high` on the listing row becomes stale but the offer flagging still uses it.
**Why it happens:** Offer flagging reads from the listings table, not re-runs the estimate.
**How to avoid:** Whenever PRICE-04 recalculates (beds/baths change), write the new estimate back to the listings table via a PATCH to `/api/price-estimate` that also upserts the listing row. Alternatively, re-run the estimate at offer-insert time using the listing's current details.
**Warning signs:** Dashboard showing below-floor flag on an offer that the seller thinks is fair.

### Pitfall 4: Proptech Data API Key Exposed Client-Side
**What goes wrong:** If the API key is called from the browser (fetch in sell.html directly to Proptech Data), it is visible in DevTools.
**Why it happens:** Attempting to avoid the serverless hop.
**How to avoid:** Always proxy through `/api/price-estimate`. The Proptech Data API key lives in Vercel environment variables only — it never touches the client. This is the pattern used by all existing DEED API functions.
**Warning signs:** `PROPTECH_DATA_API_KEY` appearing in any HTML file or client JS.

### Pitfall 5: Below-Floor Flag Without Context Feels Accusatory
**What goes wrong:** Seller sees a red banner saying "This offer is below your floor price" with no context. They dismiss it as noise or feel anxious.
**Why it happens:** The flag is binary without explanation.
**How to avoid:** The Claude Haiku reason label is essential — it should read like: "This offer of $720,000 is 8.6% below the comparable sales floor of $787,000 for 4-bedroom houses in this suburb. Recent sales in [suburb] have ranged from $787,000 to $920,000 over the past 12 months." Always include the percentage gap and the comparable range.
**Warning signs:** Sellers complaining the flag is confusing or contacting support asking what it means.

---

## Code Examples

Verified patterns from existing DEED codebase:

### Existing Handler Pattern (from api/generate-copy.js)
```javascript
// Every DEED API handler follows this exact pattern
const Anthropic = require('@anthropic-ai/sdk');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { suburb, bedrooms } = req.body || {};
  if (!suburb) return res.status(400).json({ error: 'Missing suburb' });
  // ... logic
  return res.status(200).json({ result: '...' });
};
```

### Supabase Service Role Pattern (from api/broker-dashboard.js pattern)
```javascript
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY  // service role — bypasses RLS for cache reads/writes
);
```

### Existing Test Pattern (from api/__tests__/buyer-activate.test.js)
```javascript
// Tests mock Supabase and external deps, call handler directly
jest.mock('@supabase/supabase-js', () => ({ createClient: jest.fn(() => ({ from: jest.fn(...) })) }));
const handler = require('../price-estimate');
test('returns 400 when suburb missing', async () => {
  const res = makeRes();
  await handler({ method: 'POST', body: {} }, res);
  expect(res.status).toHaveBeenCalledWith(400);
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Valuer-General land valuations (site value only) | Transaction-based comparable sales APIs with bedrooms/bathrooms filtering | ~2015-2020 | Enables meaningful per-property estimates instead of land-value-only benchmarks |
| ML regression models requiring training data | Percentile-band calculation on live comparable sales | Standard practice | No training data needed; immediately deployable; transparent to sellers |
| CoreLogic monopoly on data | Proptech Data, PropTrack competing APIs | 2021-2024 | First viable self-serve API options for startups appeared |

**Deprecated/outdated:**
- Queensland Government QVAS bulk data: Useful for land valuation trends, not usable for per-property comparable sales (no bedrooms/bathrooms, no per-transaction sale price in open-access tier).
- Scraping REA/Domain: ToS violation and technically fragile. Not viable.

---

## Open Questions

1. **Proptech Data data quality for QLD suburbs**
   - What we know: The API has a `/market-activity/sales` endpoint and suburb statistics endpoint. Free trial available (100 req/day, 30 days).
   - What's unclear: Whether the per-transaction data includes bedrooms and bathrooms for QLD properties, and whether coverage is good for smaller QLD suburbs outside Brisbane/Gold Coast.
   - Recommendation: Sign up for the free trial immediately and run a test query for 5-10 representative QLD suburbs (Burleigh Heads, Paddington Brisbane, Toowoomba, Rockhampton, Noosa) before committing to the build. If beds/baths are missing from transactions, the filtering algorithm breaks.

2. **Proptech Data commercial pricing**
   - What we know: Free trial is 100 req/day for 30 days. Commercial packages exist but pricing is not public.
   - What's unclear: Monthly cost for a startup with low-to-moderate traffic (~50-200 estimate requests/day).
   - Recommendation: Email hello@proptechdata.com.au during free trial, describe the use case (FSBO platform, QLD only, pre-revenue), and ask for startup pricing. Have CoreLogic as a backup conversation but do not initiate until Proptech Data pricing is known.

3. **Domain Group API — sold properties endpoint**
   - What we know: Domain has a developer portal and a free innovation tier. It includes listing data. Articles from 2016 mention "sales data" but this may mean sold listings (still on-market portal), not settled comparable transactions.
   - What's unclear: Whether Domain's API returns individual settled sale prices with bedrooms/bathrooms and exact sold date — or only listing price at time of sale.
   - Recommendation: Treat Domain as a secondary validation source only, not primary comps source. Their data is listing-derived; Proptech Data is settlement-derived.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest 30.x |
| Config file | package.json (`"jest": { "testEnvironment": "node", "testMatch": ["**/api/__tests__/**/*.test.js"] }`) |
| Quick run command | `npm test -- --testPathPattern=price-estimate` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PRICE-01 | `/api/price-estimate` returns `{low, mid, high, confidence, comparables}` | unit | `npm test -- --testPathPattern=price-estimate` | ❌ Wave 0 |
| PRICE-01 | Returns 400 when suburb or bedrooms missing | unit | `npm test -- --testPathPattern=price-estimate` | ❌ Wave 0 |
| PRICE-01 | Returns 405 for non-POST | unit | `npm test -- --testPathPattern=price-estimate` | ❌ Wave 0 |
| PRICE-02 | Comparables array includes suburb, sold_date, price, bedrooms, bathrooms | unit | `npm test -- --testPathPattern=price-estimate` | ❌ Wave 0 |
| PRICE-03 | Below-floor detection: `offer_price < low` sets `below_floor = true` | unit | `npm test -- --testPathPattern=offer-floor` | ❌ Wave 0 |
| PRICE-03 | Below-floor reason label is non-empty string | unit | `npm test -- --testPathPattern=offer-floor` | ❌ Wave 0 |
| PRICE-04 | Percentile recalculation returns different results when bedrooms changes | unit | `npm test -- --testPathPattern=price-estimate` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test -- --testPathPattern=price-estimate`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `api/__tests__/price-estimate.test.js` — covers PRICE-01, PRICE-02, PRICE-04 (handler input validation, mocked Proptech Data response, percentile calculation)
- [ ] `api/__tests__/offer-floor.test.js` — covers PRICE-03 (below-floor detection logic, reason label generation)
- [ ] `api/__tests__/helpers/percentile.test.js` — pure unit tests for the `percentile()` and `calcEstimate()` helper functions (no mocking needed)

---

## Sources

### Primary (HIGH confidence)
- DEED codebase (`/api/*.js`, `supabase-schema.sql`, `package.json`) — existing patterns confirmed by direct code reading
- proptechdata.com.au/api/ — endpoint names, free trial terms, AVM offering confirmed

### Secondary (MEDIUM confidence)
- WebSearch: CoreLogic/Cotality enterprise-only confirmed by multiple sources; no public pricing or self-serve sign-up
- WebSearch: PropTrack/REA API confirmed as commercial/partner-gated
- WebSearch: Domain Group API free innovation tier confirmed; sold data scope unclear
- WebSearch: QLD Government property sales data — confirmed as per-property text format, not bulk API, not suitable for comparable sales use
- Wikipedia AVM article — percentile/FSD methodology confirmed as industry standard

### Tertiary (LOW confidence)
- Proptech Data commercial pricing — not publicly disclosed; only free trial terms confirmed
- Domain API sold properties endpoint — article sources from 2016-2018; current status of sold data endpoint not verified (developer portal unreachable during research)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all existing libraries confirmed in package.json; Proptech Data free trial confirmed
- Algorithm (percentile bands): HIGH — standard AVM methodology, no library dependency, pure math
- Comparable sales data quality: MEDIUM — Proptech Data API endpoints confirmed, QLD coverage quality unverified until trial
- API access costs: LOW — Proptech Data commercial pricing undisclosed; CoreLogic confirmed enterprise-only

**Research date:** 2026-03-21
**Valid until:** 2026-04-21 (30 days) — Australian property API market is relatively stable; Proptech Data trial terms may change
