# Phase 1: REA/Domain Portal Integration — Research

**Researched:** 2026-03-22
**Domain:** Australian real estate portal listing submission (REAXML, REA Ignite, Domain API), QLD licensing, DEED codebase integration
**Confidence:** MEDIUM — core technical pattern (REAXML via licensed agent account) is well established; exact REA/Domain account onboarding steps require direct contact with portals to confirm.

---

## Summary

Every FSBO platform in Australia (BuyMyPlace, PropertyNow, SaleByHomeOwner) uses the same technical mechanism to get listings onto realestate.com.au and Domain: they hold a valid real estate agent licence in each state and use that licence to operate a licensed agency account with REA and Domain. Listings are submitted via REAXML — an XML feed format that is the sole standard for pushing listings into both portals. The feed is delivered by FTP/SFTP to an REA-approved endpoint, or via a CRM/data integration partner that handles the FTP leg. There is no direct public REST API for submitting listings to realestate.com.au. Domain has a developer API but its listing-write endpoints require an authenticated agency account, not a third-party developer key.

DEED's situation is simpler than competitors because Ed is obtaining the QLD agent licence himself. DEED will act as its own licensed agency — no partnership dependency. Once a corporate agent licence is in place and a REA Ignite agency account is established, DEED can submit REAXML feeds directly. The build task is: generate valid REAXML from a DEED listing, deliver it to the REA/Domain endpoints, and surface the submission status back in the seller dashboard.

The DEED codebase is pure HTML/JS with Supabase and Vercel serverless handlers. There is no `portal_status` field in the current listings schema — this must be added via migration. The opt-in step belongs in the existing sell.html Step 6 ("Go Live") flow, before the "Confirm & Go Live" button.

**Primary recommendation:** Build a Vercel serverless function (`/api/submit-to-portals`) that generates REAXML from the listing record and submits it via SFTP to the REA-approved endpoint. Add `portal_opted_in`, `rea_status`, `domain_status`, and `rea_listing_url` columns to the listings table. Insert a toggle UI in sell.html Step 6, and add a portal status panel to dashboard.html.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PORTAL-01 | DEED integrates with a QLD-licensed intermediary to submit listings to realestate.com.au | REAXML feed generation + REA Ignite agency account (DEED holds licence directly). See Standard Stack and Architecture Patterns sections. |
| PORTAL-02 | Seller can opt in to REA/Domain listing from the sell flow with fee disclosure | Insert toggle + fee disclosure card in sell.html Step 6 before Go Live button. See Code Examples — Opt-In UI. |
| PORTAL-03 | Listing status (live on REA/Domain) is visible in seller dashboard | Add portal_status panel to dashboard.html, reading rea_status + domain_status from Supabase. See Architecture Patterns — Dashboard Status Panel. |
</phase_requirements>

---

## Standard Stack

### Core
| Component | Version/Detail | Purpose | Why Standard |
|-----------|---------------|---------|--------------|
| REAXML | 1.x (DTD at reaxml.realestate.com.au) | XML format for REA listing submission | Sole accepted format for realestate.com.au; also accepted by Domain |
| REA Ignite | REA's agent portal | Manage agency account, approve CRM integrations | Required by REA for all agency accounts post-2020 |
| Domain API | developer.domain.com.au | Domain listing submission for agency accounts | Domain accepts both REAXML feed and direct API calls via authenticated agency account |
| ssh2-sftp-client | npm, latest stable | Node.js SFTP client for delivering REAXML to REA endpoint | Standard pattern; REA provides SFTP credentials to licensed agencies |
| xml-js or fast-xml-parser | npm | Generate/validate REAXML in Node.js serverless handler | Lightweight, no native XML in Vercel edge |
| Supabase migration | SQL ALTER TABLE | Add portal status columns to listings table | Existing pattern in project (see supabase-schema.sql) |

### Supporting
| Component | Purpose | When to Use |
|-----------|---------|-------------|
| Resend (existing) | Email seller when portal listing goes live / is rejected | Already integrated in /api/notify.js |
| Vercel env vars | Store REA SFTP credentials + Domain API key | Never commit credentials; existing pattern in DEED |
| Supabase service role | Update portal status columns from serverless handler | Existing pattern — service role used in all DEED API handlers |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Build own REAXML + SFTP | Use a CRM middleman (Agentbox, Rex) | CRM adds $200-500/month subscription fee and introduces a third-party dependency; building own feed is ~2 days work and keeps DEED independent |
| REAXML via FTP | Domain's JSON API directly | Domain's agency listings write API can accept JSON for Domain; REAXML covers both portals from one implementation — prefer REAXML for Phase 1 |

**Installation (serverless handler dependencies):**
```bash
npm install ssh2-sftp-client fast-xml-parser
```

---

## Architecture Patterns

### Recommended Project Structure additions
```
api/
├── submit-to-portals.js    # new: generate REAXML, SFTP to REA, POST to Domain
├── portal-status.js        # new: seller polls this for rea_status / domain_status
└── notify.js               # existing: extend with portal_live notification type
```

### Pattern 1: REAXML Generation and SFTP Submission
**What:** On seller opt-in and listing creation, a serverless function builds an REAXML document from the listing record and pushes it via SFTP to the REA-approved endpoint. REA processes the file asynchronously (typically within 1–2 hours during business hours).
**When to use:** Triggered after goLive() succeeds in sell.html and portal_opted_in is true.

**REAXML residential listing structure (minimum valid submission):**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<propertyList date="2026-03-22-12:00:00">
  <residential modTime="2026-03-22-12:00:00" status="current">
    <agentID>DEED_AGENCY_ID</agentID>
    <uniqueID>deed-listing-{uuid}</uniqueID>
    <authority value="exclusive"/>
    <underOffer value="no"/>
    <isHomeLandPackage value="no"/>
    <headline>3 bed house in Burleigh Heads</headline>
    <description>...</description>
    <price display="yes">850000</price>
    <priceView>Offers over $850,000</priceView>
    <address>
      <street>42 Example St</street>
      <suburb>Burleigh Heads</suburb>
      <state>QLD</state>
      <postcode>4220</postcode>
      <country>Australia</country>
    </address>
    <features>
      <bedrooms>3</bedrooms>
      <bathrooms>2</bathrooms>
      <garages>1</garages>
      <landSize unit="squareMeter">450</landSize>
    </features>
    <images>
      <img id="m" url="https://...photo1.jpg" format="jpg"/>
    </images>
    <listingAgent id="1">
      <name>DEED Property</name>
      <email>listings@deed.com.au</email>
      <telephone type="BH">07 XXXX XXXX</telephone>
    </listingAgent>
  </residential>
</propertyList>
```
Source: REAXML DTD — github.com/MattHealy/REAXML/blob/master/propertyList.dtd

**REAXML status values** (for updating after submission):
- `current` — listing is live
- `withdrawn` — removed from market
- `sold` — property sold (once set to sold, REA locks the record)
- `offmarket` — unlisted

**"Under offer" is not a top-level status in REAXML.** It is represented by the `<underOffer value="yes"/>` element with status remaining `current`. To show "Under Offer" on REA, submit an updated REAXML with `<underOffer value="yes"/>`.

### Pattern 2: Supabase Schema Migration
**What:** Add portal columns to the listings table via SQL migration run in Supabase SQL Editor.
```sql
alter table listings add column if not exists portal_opted_in boolean default false;
alter table listings add column if not exists portal_fee_acknowledged boolean default false;
alter table listings add column if not exists rea_status text default 'not_submitted';
  -- values: not_submitted, pending, live, rejected, withdrawn
alter table listings add column if not exists domain_status text default 'not_submitted';
  -- values: not_submitted, pending, live, rejected, withdrawn
alter table listings add column if not exists rea_listing_url text;
alter table listings add column if not exists domain_listing_url text;
alter table listings add column if not exists portal_submitted_at timestamptz;
alter table listings add column if not exists portal_error text;
```

### Pattern 3: Seller Opt-In in sell.html Step 6
**What:** Insert a portal opt-in toggle and fee disclosure card in Step 6 ("Go Live") of sell.html, before the "Confirm & Go Live" button. The fee disclosure must be explicit — price, what's included, and that the seller acknowledges before proceeding.

**Where to insert:** After line 927 (the existing fee-acknowledgement checkbox) and before the go-live-btn button. The goLive() function at line 1141 must be updated to read the opt-in checkbox value and include portal fields in the Supabase insert.

### Pattern 4: Dashboard Portal Status Panel
**What:** Add a portal status card to dashboard.html that reads rea_status and domain_status from Supabase and shows a labelled badge (Pending / Live / Rejected) with a link to the live listing URL when available.

**Polling vs push:** REA does not push status back via webhook in the REAXML flow. The standard pattern is: DEED polls its own Supabase record (which DEED's admin manually updates, or DEED builds a light webhook receiver if REA supports it). For Phase 1, the simplest safe approach is: DEED's operations team manually updates rea_status in Supabase after confirming the listing is live on REA. The dashboard reads that column. A future automation hook can replace the manual step.

### Anti-Patterns to Avoid
- **Polling REA's public website to detect listing status:** Rate-limited, fragile, ToS risk. Use the Supabase status column updated by DEED operations.
- **Storing REA SFTP credentials in the codebase:** Must live in Vercel env vars only (`REA_SFTP_HOST`, `REA_SFTP_USER`, `REA_SFTP_PASS`, `REA_AGENCY_ID`).
- **Attempting to submit via a scraper or headless browser:** REA's agent portal requires authenticated SFTP feed delivery for bulk/automated listings.
- **Building the portal feature before the agency account is live:** The REAXML submission cannot be tested end-to-end until DEED has a REA Ignite agency account with active SFTP credentials. Build with environment guards that skip the actual SFTP call when credentials are absent.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| REAXML XML generation | Custom string concatenation | fast-xml-parser (builder mode) or xmlbuilder2 | Encoding edge cases in property descriptions (ampersands, special characters) will break the feed silently |
| SFTP file delivery | Raw net.Socket TCP implementation | ssh2-sftp-client | Handles connection negotiation, key exchange, retry on drop |
| REAXML schema validation | Custom field validator | Validate against the official DTD before sending | REA rejects malformed files with cryptic error codes — pre-validate to catch issues before submission |
| Domain listing submission | Scraping Domain's agent portal | Domain agency API (authenticated) | Domain provides a documented JSON listings API for agency accounts; use it |

**Key insight:** The entire REAXML + SFTP pattern is well-understood in the Australian real estate industry. Dozens of CRMs do this. DEED is implementing the same pattern — it is just doing so inside a Vercel serverless function instead of a SaaS CRM.

---

## Common Pitfalls

### Pitfall 1: DEED Does Not Yet Have an REA Agency Account
**What goes wrong:** The REAXML submission code is built but cannot be tested end-to-end because DEED has no REA Ignite account with approved SFTP credentials yet.
**Why it happens:** The technical build and the commercial/licensing account setup are separate tracks that must run in parallel.
**How to avoid:** Build the submission function with an `if (!process.env.REA_SFTP_HOST)` guard that logs a warning and returns a mock success. Real submission activates automatically when credentials are set.
**Warning signs:** If SFTP credentials are absent from Vercel env vars, function will fail silently or throw — the guard prevents this.

### Pitfall 2: REA Rejects the Feed with Non-Obvious Error Codes
**What goes wrong:** REA processes REAXML files asynchronously and does not return errors in the SFTP upload response. Errors are sent back via email to the agency contact address or logged in REA Ignite.
**Why it happens:** SFTP delivery is fire-and-forget. REA validates the XML server-side after receipt.
**How to avoid:** Validate REAXML against the DTD before submission. Monitor the DEED agency email for REA rejection notices. Set rea_status to 'pending' on submission and do not mark 'live' until manually confirmed.
**Warning signs:** rea_status stays 'pending' for more than 24 hours without email confirmation.

### Pitfall 3: Missing Mandatory REAXML Fields
**What goes wrong:** Feed submitted but REA rejects with "missing required field" — common culprits are agentID, uniqueID, address.state, address.postcode.
**Why it happens:** DEED's listings schema stores address as a flat text field — it must be split into street number + street + suburb + state + postcode for REAXML.
**How to avoid:** The submit-to-portals handler must parse/split the address field before building REAXML. If DEED cannot split the address reliably, add explicit street_number and street_name fields to the sell.html form in Step 1.
**Warning signs:** Address field in Supabase contains "42 Example St, Burleigh Heads" — needs splitting before REAXML generation.

### Pitfall 4: Selling "Under Offer" vs "Sold" Status Confusion
**What goes wrong:** Once REA receives a REAXML with status="sold", the listing is locked — no further updates are accepted for that uniqueID.
**Why it happens:** REA treats sold as terminal.
**How to avoid:** Do not send status="sold" to REA until settlement is confirmed. Use `<underOffer value="yes"/>` to show "Under Offer" while status remains "current".

### Pitfall 5: Photo URLs Must Be Public and Stable
**What goes wrong:** REAXML images reference URLs. If photos are in a private Supabase bucket, REA cannot fetch them and the listing publishes without images.
**Why it happens:** DEED currently stores photos in Supabase Storage — bucket policy must be public, or photos must be served via a public CDN URL.
**How to avoid:** Verify the Supabase Storage bucket for listing photos is set to public. The existing upload-photo.js handler returns a URL — confirm this URL is publicly accessible before building REAXML.

### Pitfall 6: QLD Corporate Licence vs Individual Licence
**What goes wrong:** Ed obtains an individual agent licence but DEED (as a company) needs a corporate real estate agent licence to operate as an agency under the Property Occupations Act 2014 (QLD).
**Why it happens:** Agencies must hold corporate licences in addition to (or instead of) individual licences to operate as a business entity.
**How to avoid:** Confirm with the QLD Office of Fair Trading whether DEED Pty Ltd (or the operating entity) needs a corporate licence in addition to Ed's individual licence. REA will require the agency's licence number for the account application.
**Warning signs:** REA Ignite account setup requests an agency ABN and licence number — individual licence alone may not satisfy this.

---

## Code Examples

### REAXML Builder (Node.js serverless handler pattern)
```javascript
// Source: REAXML DTD spec + fast-xml-parser docs
// /api/submit-to-portals.js (skeleton)

const { XMLBuilder } = require('fast-xml-parser');
const SftpClient = require('ssh2-sftp-client');

function buildReaXml(listing) {
  const builder = new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    format: true,
  });

  const now = new Date().toISOString().replace('T', '-').substring(0, 19);

  const payload = {
    '?xml': { '@_version': '1.0', '@_encoding': 'UTF-8' },
    propertyList: {
      '@_date': now,
      residential: {
        '@_modTime': now,
        '@_status': 'current',
        agentID: process.env.REA_AGENCY_ID,
        uniqueID: `deed-${listing.id}`,
        authority: { '@_value': 'exclusive' },
        underOffer: { '@_value': 'no' },
        isHomeLandPackage: { '@_value': 'no' },
        headline: listing.address,
        description: listing.description,
        price: { '@_display': 'yes', '#text': listing.asking_price },
        priceView: listing.price_description || `Offers over $${listing.asking_price.toLocaleString()}`,
        address: {
          street: listing.street,       // must be split from listing.address
          suburb: listing.suburb,
          state: listing.state || 'QLD',
          postcode: listing.postcode,
          country: 'Australia',
        },
        features: {
          bedrooms: listing.bedrooms,
          bathrooms: listing.bathrooms,
          garages: listing.car_spaces,
          ...(listing.land_size && { landSize: { '@_unit': 'squareMeter', '#text': listing.land_size } }),
        },
        listingAgent: {
          '@_id': '1',
          name: 'DEED Property',
          email: process.env.DEED_LISTINGS_EMAIL || 'listings@deed.com.au',
        },
      },
    },
  };

  return builder.build(payload);
}

async function submitViasftp(xmlContent, filename) {
  const sftp = new SftpClient();
  try {
    await sftp.connect({
      host: process.env.REA_SFTP_HOST,
      port: 22,
      username: process.env.REA_SFTP_USER,
      password: process.env.REA_SFTP_PASS,
    });
    await sftp.put(Buffer.from(xmlContent, 'utf8'), `/listings/${filename}`);
  } finally {
    await sftp.end();
  }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  const { listing_id } = req.body;
  if (!listing_id) return res.status(400).json({ error: 'listing_id required' });

  // Guard: skip real submission if credentials absent (dev/test mode)
  const hasCredentials = process.env.REA_SFTP_HOST && process.env.REA_AGENCY_ID;

  try {
    // Fetch listing from Supabase using service role
    const { createClient } = require('@supabase/supabase-js');
    const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    const { data: listing, error } = await sb.from('listings').select('*').eq('id', listing_id).single();
    if (error || !listing) return res.status(404).json({ error: 'listing not found' });

    if (hasCredentials) {
      const xml = buildReaXml(listing);
      const filename = `deed-${listing.id}.xml`;
      await submitViasftp(xml, filename);
    }

    // Update status to pending (manual confirm to 'live' after REA processes)
    await sb.from('listings').update({
      rea_status: hasCredentials ? 'pending' : 'not_submitted',
      portal_submitted_at: new Date().toISOString(),
    }).eq('id', listing_id);

    return res.status(200).json({ ok: true, mode: hasCredentials ? 'submitted' : 'dev_skipped' });
  } catch (err) {
    console.error('Portal submission error:', err);
    return res.status(500).json({ error: err.message });
  }
};
```

### Dashboard Portal Status Panel (HTML pattern)
```html
<!-- Portal status card — insert into dashboard.html after listing-header section -->
<div id="portal-status-card" style="display:none; background:#fff; border:1px solid var(--border); border-radius:12px; padding:1.5rem 2rem; margin-bottom:2rem;">
  <div style="font-size:0.62rem; font-weight:500; letter-spacing:0.14em; text-transform:uppercase; color:var(--muted); margin-bottom:0.75rem;">Portal Distribution</div>
  <div style="display:flex; gap:1.5rem; flex-wrap:wrap;">
    <div>
      <span style="font-size:0.82rem; color:var(--muted);">realestate.com.au</span>
      <span id="rea-badge" class="badge-portal">—</span>
    </div>
    <div>
      <span style="font-size:0.82rem; color:var(--muted);">domain.com.au</span>
      <span id="domain-badge" class="badge-portal">—</span>
    </div>
  </div>
  <div id="rea-link-row" style="display:none; margin-top:0.75rem; font-size:0.82rem;">
    <a id="rea-listing-link" href="#" target="_blank" style="color:var(--blue);">View on realestate.com.au →</a>
  </div>
</div>
```

Status badge colour logic (JS):
```javascript
function renderPortalStatus(reaStatus, domainStatus, reaUrl) {
  const statusMap = {
    'not_submitted': { label: 'Not opted in', color: '#9ca3af' },
    'pending':       { label: 'Processing…', color: '#d97706' },
    'live':          { label: 'Live', color: '#16a34a' },
    'rejected':      { label: 'Rejected — contact DEED', color: '#dc2626' },
    'withdrawn':     { label: 'Withdrawn', color: '#6b7280' },
  };
  const rea = statusMap[reaStatus] || statusMap['not_submitted'];
  document.getElementById('rea-badge').textContent = rea.label;
  document.getElementById('rea-badge').style.color = rea.color;
  if (reaStatus === 'live' && reaUrl) {
    document.getElementById('rea-link-row').style.display = 'block';
    document.getElementById('rea-listing-link').href = reaUrl;
  }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| FTP (plaintext) delivery of REAXML | SFTP (encrypted) | ~2018 onwards | REA now requires SFTP; plain FTP endpoints are deprecated |
| Agents fax/email listings to portals | REAXML feed via approved CRM | Pre-2010 | Fully automated for licensed agencies |
| REA's old "Agent Admin" portal | REA Ignite (new agent portal) | ~2020-2022 | New agency account setup and CRM integration goes through Ignite |

**Deprecated/outdated:**
- Plain FTP to REA: replaced by SFTP. Do not use FTP.
- reaxml.realestate.com.au documentation site: may be outdated — verify current spec version with REA on account onboarding.

---

## Open Questions

1. **Does DEED's operating entity need a QLD corporate agent licence in addition to Ed's individual licence?**
   - What we know: The QLD Property Occupations Act 2014 requires agencies (companies) to hold a corporate real estate agent licence. Individual licences cover individual agents, not the business entity.
   - What's unclear: Whether DEED Pty Ltd (or whatever the registered trading entity is) needs its own corporate licence, or whether Ed's individual licence suffices for operating as DEED.
   - Recommendation: Contact the QLD Office of Fair Trading directly before building. This is a blocker for the REA Ignite account application, which will ask for an agency ABN and licence number.

2. **What are REA's current SFTP endpoint credentials and onboarding process for new agency accounts?**
   - What we know: Agencies get SFTP credentials from REA after their Ignite account is approved and a CRM integration is configured (or "change of listing uploader" request submitted).
   - What's unclear: Whether DEED can self-serve this as a new small agency, or must go through a REA account manager.
   - Recommendation: Contact REA's agency support (via Ignite once account is live, or via reaagents@rea-group.com) immediately — this is the longest lead-time item.

3. **Does Domain accept REAXML via SFTP or require its JSON API for new agency accounts in 2025+?**
   - What we know: Domain historically accepted REAXML. They also have a developer API. The current path for new agencies is not documented publicly.
   - What's unclear: Whether Domain still onboards new agencies via REAXML+SFTP or has migrated to API-only.
   - Recommendation: Contact Domain's agency support as part of REA Ignite onboarding. For Phase 1, implement Domain as a secondary target after REA is confirmed working — cover REA first.

4. **Where does the "street number + street name" split happen for REAXML?**
   - What we know: The current listings schema stores a flat `address` text field (e.g. "42 Example St, Burleigh Heads"). REAXML requires split fields: street, suburb, state, postcode.
   - What's unclear: Whether address parsing is reliable enough, or whether sell.html Step 1 needs explicit separate fields.
   - Recommendation: Add explicit `street_number` and `street_name` fields to sell.html Step 1 form as part of this phase. This is cleaner than regex-parsing a free-text field. The suburb and postcode already exist as separate fields.

5. **What is the DEED portal fee amount for REA/Domain opt-in?**
   - What we know: The current sell.html Step 6 mentions a "platform fee payable on settlement" but the portal opt-in is a separate incremental fee (competitors charge $499-$999 for REA/Domain listing).
   - What's unclear: What DEED will charge for portal distribution.
   - Recommendation: Ed must set the price before the fee disclosure UI can be built. This is a business decision, not a code decision. Unblock it before planning begins.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected — no jest.config, vitest.config, or test directory in /deed |
| Config file | Wave 0 creates this |
| Quick run command | `node --test api/__tests__/submit-to-portals.test.js` (Node built-in test runner, no framework dependency) |
| Full suite command | `node --test api/__tests__/*.test.js` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PORTAL-01 | buildReaXml() produces valid XML with required fields | unit | `node --test api/__tests__/submit-to-portals.test.js` | ❌ Wave 0 |
| PORTAL-01 | SFTP submission skipped gracefully when credentials absent | unit | `node --test api/__tests__/submit-to-portals.test.js` | ❌ Wave 0 |
| PORTAL-01 | Supabase listing rea_status updated to 'pending' after submit | integration (mock) | `node --test api/__tests__/submit-to-portals.test.js` | ❌ Wave 0 |
| PORTAL-02 | portal_opted_in flag saved to Supabase on goLive() | manual | Open sell.html in browser, opt in, confirm Go Live, check Supabase | N/A |
| PORTAL-02 | Fee disclosure checkbox prevents submission if unchecked | manual | Open sell.html Step 6, click Go Live without checking portal box | N/A |
| PORTAL-03 | Dashboard renders correct badge for each rea_status value | unit (DOM) | `node --test api/__tests__/portal-status.test.js` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `node --test api/__tests__/submit-to-portals.test.js`
- **Per wave merge:** `node --test api/__tests__/*.test.js`
- **Phase gate:** All unit tests green + manual sell flow opt-in verified before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `api/__tests__/submit-to-portals.test.js` — covers PORTAL-01 REAXML generation and status update
- [ ] `api/__tests__/portal-status.test.js` — covers PORTAL-03 dashboard badge rendering logic
- [ ] No test runner install needed — Node built-in `node:test` module used (Node 18+, available on Vercel)

---

## Sources

### Primary (HIGH confidence)
- REAXML DTD — github.com/MattHealy/REAXML/blob/master/propertyList.dtd — mandatory field list, status values, structure
- DEED supabase-schema.sql (local) — current listings schema, confirmed no portal columns exist
- DEED sell.html (local) — confirmed 6-step flow, goLive() function structure, opt-in insertion point

### Secondary (MEDIUM confidence)
- PropertyNow (propertynow.com.au) — confirmed "direct API integration to REA/Domain," holds licences in all states including QLD; consistent with REAXML + licensed agency model
- LockedOn Help Centre (help.lockedon.com) — confirmed Agent Unique ID is the core credential, portal setup involves notifying REA to configure feed
- QLD Government OFT (qld.gov.au) — confirmed individual and corporate real estate agent licence requirements, 4-6 week processing time
- WebRealty REAXML guide (webrealty.com.au) — confirmed SFTP delivery, five data categories, automated feed model

### Tertiary (LOW confidence — needs portal-direct verification)
- REA SFTP endpoint details, current onboarding process for new agencies: not publicly documented — must confirm with REA on account setup
- Domain's current listing submission format (REAXML vs JSON API) for new agencies in 2025: conflicting signals, needs direct confirmation
- Whether plain FTP is still supported by REA: search results reference SFTP as current standard but no official 2025 confirmation found

---

## Metadata

**Confidence breakdown:**
- Standard stack (REAXML + SFTP + licensed agency model): HIGH — confirmed by multiple FSBO platforms, CRM documentation, DTD spec
- Mandatory REAXML fields: HIGH — confirmed from DTD
- Architecture patterns (where to insert opt-in, schema migration): HIGH — based on direct codebase read
- REA/Domain account onboarding specifics: LOW — not publicly documented, requires direct contact
- QLD corporate licence requirement: MEDIUM — QLD OFT documentation is clear on corporate licences, specific application to DEED's structure needs OFT confirmation

**Research date:** 2026-03-22
**Valid until:** 2026-06-22 for REAXML spec and licensing framework; REA/Domain portal onboarding details should be re-verified at point of account setup as processes change
