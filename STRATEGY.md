# DEED — Strategy Document
**Last updated:** 2026-03-20
**Status:** Live MVP, pre-revenue, building toward Series A / strategic acquisition
**Live URL:** https://deed-sooty.vercel.app
**Local:** `~/deed/` | **GitHub:** bongle404/deed
**Deploy:** `cd ~/deed && vercel --prod --yes`

---

## The Thesis

Real estate agents in Australia survive not because they're valuable — but because sellers are scared. Scared of getting the price wrong. Scared of the paperwork. Scared of dealing with buyers directly. Agents exploit that fear and charge 2–3% of the biggest financial transaction of most people's lives for it.

DEED removes every reason that fear exists.

It is not a listing site with lower fees. It is the full infrastructure layer that makes agents structurally unnecessary — verified buyers, AI pricing, AI copy, predictive marketing, automated contracts, legal referrals, and data no agent has ever had access to.

The exit is not a lifestyle business. It's an 8-figure acquisition by REA Group, a major bank (CBA/NAB/ANZ), or a global PropTech (Opendoor, Zillow) entering the Australian market. What they're buying is not the platform — it's the verified buyer database and the open banking integration that makes it the most financially accurate buyer pool in Australian real estate history.

---

## Why Now

- QLD is Australia's fastest-growing property market with the highest interstate migration
- Agent commission has never been higher in absolute dollar terms (median QLD price ~$780k × 2.5% = $19,500)
- Open banking (CDR) is now mature in Australia — Basiq has live integrations with all major lenders
- AI makes it possible to replace every "expertise" function agents claim to provide
- No competitor has combined verified buyer data + private sale infrastructure in a single platform
- REA/Domain are agent-dependent — they cannot disrupt their own revenue model. DEED can.

---

## The Real Product

Most people will see DEED as "save $20k on agent fees." That's the hook.

The real product is **information symmetry**.

Agents survive by controlling information — they know what buyers will pay, they know comparable sales, they know which buyers are serious. They drip-feed this to sellers to maintain dependency.

DEED gives sellers everything agents know, in real time, for $999:
- Which buyers are financially verified and how strong their position is
- What comparable properties sold for and when
- Which offer to accept and why, explained in plain English
- When to list, how to price it, and what the market is actually doing

And it gives buyers what they've never had:
- A way to prove their seriousness before they even make an offer
- Verified financial standing that makes their offer stand out
- Direct access to sellers without an agent filter

---

## Current Build Status

**Last updated:** 2026-03-20 — Major build session complete

### Pages (all live)

| Page | Purpose | Status |
|---|---|---|
| `index.html` | Landing page + commission calculator | ✅ Live |
| `browse.html` | Property search — Supabase + demo fallback | ✅ Live |
| `listing.html` | Property detail — real photos from Supabase Storage | ✅ Live |
| `qualify.html` | Buyer pre-qualification (5-step, writes to Supabase) | ✅ Live |
| `sell.html` | Seller listing flow — AI copy, photo upload + enhancement, buyer matching trigger | ✅ Live |
| `offer.html` | Offer submission (strength score via DB trigger) | ✅ Live |
| `dashboard.html` | Seller dashboard — real Supabase data, war room, contract generation, timing intel | ✅ Live |
| `success.html` | Post-payment confirmation | ✅ Live |

### Backend (Supabase)

- **Project:** https://jtpykhrdjkzhcbswrhzo.supabase.co
- **Tables:** buyers, listings, offers, watchers, notifications
- **Triggers:** set_offer_strength, sync_offer_count, sync_watcher_count
- **Offer strength scoring:** 0–100, automated on insert (unconditional 40pts, price vs asking 30pts, deposit 15pts, settlement speed 15pts)
- **⚠ SQL migration needed:** `ALTER TABLE listings ADD COLUMN IF NOT EXISTS photos text[] DEFAULT '{}'; CREATE POLICY "public can update listing photos" ON listings FOR UPDATE USING (true) WITH CHECK (true);`

### API endpoints

| File | Purpose |
|---|---|
| `api/generate-copy.js` | AI listing description via Claude Haiku |
| `api/generate-contract.js` | AI REIQ-style contract draft from accepted offer |
| `api/upload-photo.js` | Photo upload to Supabase Storage (`listing-photos` bucket) |
| `api/notify.js` | Email via Resend — new_offer, listing_confirmed, buyer_match, offer_round, offer_accepted |
| `api/checkout.js` | Stripe checkout (built, keys not live) |

### AI Features (built)

- Offer strength scoring (DB trigger)
- AI Advisor card — plain-English offer landscape summary
- Per-offer AI insight strip — risk, settlement, deposit, recommendation
- Buyer pool preview at sell step 2 ("14 verified buyers match")
- AI time-to-offer prediction
- AI listing copy generation (◆ Write with AI in sell step 3)
- AI contract generation on offer acceptance (REIQ-style draft)

### Infrastructure

- **Stripe:** Built (`api/checkout.js`), not yet live — needs real keys from stripe.com
- **Email:** Resend live in Vercel production (`RESEND_API_KEY` set)
- **AI:** Claude Haiku live in Vercel production (`ANTHROPIC_API_KEY` set)
- **Storage:** Supabase `listing-photos` bucket — needs to be created as public in Supabase dashboard
- **⚠ Missing env var:** `SUPABASE_SERVICE_KEY` — needed for buyer match emails and offer round notifications. Get from Supabase → Settings → API → service_role key. Add: `cd ~/deed && vercel env add SUPABASE_SERVICE_KEY`
- **Design system:** `deed-ui.css` — Bebas Neue + DM Sans, dark/light sections, gold accent

---

## Priority Build Order (Corrected)

The previous priority order was wrong. Mobile polish first was a mistake. Here is the correct sequence based on what actually builds the moat and makes this pitchable.

### Phase 1 — Make it real ✅ COMPLETE
1. ~~Stripe live payments~~ — parked, prototype doesn't need it
2. ✅ **Dashboard → real Supabase data** — wired, live
3. ✅ **Mobile optimisation** — responsive across all 8 pages

### Phase 2 — The moat
4. **Open banking (Basiq)** — BLOCKED: needs Basiq account (basiq.io). Sign up → get API key → add `BASIQ_API_KEY` to Vercel. Add bank connection step to qualify.html, pull verified income/deposit/borrowing capacity, store on buyers table (add `verified_income`, `verified_deposit`, `verified_borrowing` columns), feed into offer strength + AI Advisor.
5. **Predictive pricing engine** — BLOCKED: needs CoreLogic or Domain API. Replace hardcoded comp sales in sell.html step 2.

### Phase 3 — Seller acquisition tools ✅ COMPLETE
6. ✅ **AI listing copy** — live (◆ Write with AI in sell step 3)
7. ✅ **Image optimisation** — live (canvas enhancement, dark/portrait warnings)
8. ~~Advertising layer~~ — parked

### Phase 3.5 — Completed this session
- ✅ **Commission calculator** — interactive widget on index.html hero (slider, real dollar amounts)
- ✅ **Photos end-to-end** — sell.html uploads to Supabase Storage, listing.html shows hero + gallery
- ✅ **Pre-market buyer matching** — on listing creation, emails all matching buyers (suburb/price/beds)
- ✅ **Offer war room** — "Start offer round" button on dashboard, 24h countdown, notifies all watchers
- ✅ **Timing intelligence** — live buyer count for suburb + days-to-offer estimate on dashboard
- ✅ **AI contract generation** — Accept → spinner → full REIQ-style draft contract, copy to clipboard
- ✅ **Offer accepted emails** — seller next-steps (conveyancer/deposit/settlement) + buyer congratulations

| Package | Includes | Price |
|---|---|---|
| Standard | REA/Domain listing | Included |
| Boost | + Meta/Instagram QLD-targeted ads, 14 days | +$499 |
| Premium | + Google display + REA Premier, 28 days | +$1,200 |
| Full Market | Everything + suburb letterbox drop | +$2,000 |

### Phase 4 — The killer features (scale)
9. **Pre-market buyer matching** — Before a property goes public, DEED matches it to verified buyers already in the database and sends personalised alerts. Sellers get offers before they even list publicly. This is what agents call "off-market" and charge a premium for. DEED does it automatically because it has the buyer pool.
10. **Offer war room** — When multiple verified buyers are identified, DEED runs a structured multi-round offer process. All offers visible simultaneously. Timed rounds. Fully documented. Transparent and seller-controlled.
11. **Open home coordinator network** — Build a network of vetted local coordinators (not agents — no license needed for administrative tasks) who attend open homes for a flat $200 fee. They collect buyer details, answer questions from a DEED briefing pack, report back. Seller doesn't have to host strangers alone.
12. **Contract generation** — AI-drafted REIQ-compliant contract from accepted offer. Reviewed by partner conveyancer. Replaces the last "I need an agent for the paperwork" objection.

### Phase 5 — Revenue layer (post-Series A or acquisition)
13. **Buyer premium subscription** — $49/month. Priority buyer alerts, pre-market access, deeper suburb data, FHOG/grant eligibility check.
14. **Legal concierge** — Flat $895 full-settlement conveyancing package via 3–5 QLD partner firms. DEED takes $100 referral fee. Kills the last professional-help objection.
15. **Referral partner network** — Mortgage brokers, conveyancers, building/pest inspectors — auto-triggered at each stage of the transaction. $240–$900 per referral.
16. **Rental management extension** — Once DEED owns the transaction, extend into property management. Lease generation, rent collection, maintenance, bond, QCAT. Flat $499/year vs agent 8–10% ($2,600–$3,200/year). Extends LTV dramatically.
17. **Developer channel** — New estates and OTP projects. Developers pay 2–3% commission on every sale. DEED offers a flat-fee developer portal: buyer registrations, expressions of interest, OTP contracts. Massive volume, no agent.

---

## How We Destroy Real Estate Agents — The Full Playbook

### 1. Eliminate every "but agents..." objection

| What agents claim | What DEED replaces it with |
|---|---|
| "I'll get you a better price" | AI pricing engine with CoreLogic data and confidence bands |
| "I know the buyers" | Verified buyer database with open banking — we know buyers better than any agent |
| "I handle the marketing" | Self-serve ad packages, AI-generated creative, real reporting |
| "I write the listing" | AI copy generated from seller's own data, reviewed in 30 seconds |
| "I run the open home" | Coordinator network, $200 flat fee |
| "I negotiate for you" | AI offer analysis, strength scoring, recommendation engine |
| "I handle the contracts" | AI-drafted REIQ contract, partner conveyancer for $895 flat |
| "I deal with the buyers" | Qualified buyers only — unqualified buyers can't even submit an offer |

### 2. The commission calculator — make it visceral on the landing page

Enter property value → see exactly what an agent takes in dollar terms. At $900k: "Your agent takes $22,500. DEED: $999. You keep $21,501." Not percentages. Dollars. Make it real.

### 3. Neighbourhood intelligence — surface what agents hide

Agents don't tell sellers about planned infrastructure, flood mapping, school zone changes, or proposed rezoning because it either doesn't help their sale or they don't bother to find it. DEED surfaces all of it at listing:

- Flood overlay and insurance risk rating
- Proximity to planned transport (Cross River Rail, M1 upgrades, BRT)
- School zone boundaries and current ranking
- Council development applications within 500m
- QBCC building complaints history for the address

Sellers get information their agent never gave them. Buyers get confidence their agent never provided.

### 4. Timing intelligence — a data advantage no agent has

"Based on buyer pool activity in Burleigh Heads: 11 verified buyers matching your profile have set alerts in this suburb in the last 30 days. Listing Thursday 3 April generates 40% more first-week enquiry than Monday. Market velocity in this price range: average 18 days to accepted offer."

Agents guess. DEED knows.

### 5. FHOG / grant eligibility layer

First home buyer grants, stamp duty concessions, shared equity schemes, Regional Home Guarantee, Defence Housing loan access. DEED checks buyer eligibility automatically and surfaces it at the offer stage. First home buyers are the largest buyer segment in QLD. Making DEED their default platform is a structural advantage.

### 6. Community and social proof — suburb by suburb

"31 families in Burleigh Heads sold privately with DEED in 2026, saving an average of $18,700 in agent commission."

The biggest barrier to private sales is fear. Social proof at suburb level, with real dollar amounts and real outcomes, destroys it faster than any feature. Build the community before competitors know what's happening.

### 7. The REA/Domain bypass strategy

REA and Domain cannot disrupt agents — agents are their customers. DEED's long-term play is to build enough buyer pool density that sellers don't need REA.

**The inflection point:** When DEED can credibly say "your property will be seen by 5,000 verified, financially pre-qualified buyers in QLD before it hits REA" — agents lose their last card. REA has traffic. DEED has intent and verified capacity. That's a different product entirely.

Short-term: list on REA/Domain (get an agency license or use a digital-only agency reseller). Long-term: make listing on DEED sufficient.

### 8. Body corporate / strata — an underserved nightmare

Strata properties (apartments, townhouses) require body corporate information certificates, QBCC insurance certificates, and complex disclosure documents. Agents get this wrong constantly and sellers pay for the delays. DEED auto-generates the requests, tracks the responses, and compiles the disclosure package. One less reason to think you need an agent.

### 9. B2B data layer — accelerate the acquisition

Rather than waiting for REA to come to us, make the data moat visible and monetised early. With buyer consent, sell anonymised buyer intent data as a B2B API to:

- Lenders — "2,400 pre-approved buyers are actively searching in QLD right now"
- Developers — "47 verified buyers want a 3-bed apartment under $650k in South East QLD"
- Insurers — confirmed settlement dates, property values, buyer profiles

This turns the buyer database into a revenue line before the acquisition, which drives the valuation multiple significantly higher.

---

## Revenue Model (at scale)

| Stream | Calculation | Annual |
|---|---|---|
| Seller listing fee ($999) | 5,000 sales/year | $5.0M |
| Ad packages (avg $600, 60% attach) | 5,000 × 0.60 × $600 | $1.8M |
| Mortgage referral (30%, $3K avg) | 5,000 × 0.30 × $3,000 | $4.5M |
| Conveyancing referral ($240) | 5,000 × $240 | $1.2M |
| Building inspection referral ($100) | 5,000 × $100 | $0.5M |
| Buyer premium subscription ($49/mo) | 10,000 subscribers | $5.9M |
| B2B data API | TBD | $1–3M |
| **Total ARR** | | **~$20–22M** |

At a 10x ARR multiple (conservative for a data-moat proptech): **$200M+ valuation.**

---

## Exit Thesis

**Target:** $50M–$150M acquisition. Higher with B2B data revenue line established.

**Acquirers:**
- **REA Group** — They're a marketplace that routes everything through agents. DEED shows them the agent-free model works. They acquire to either deploy it or bury it.
- **Major bank (CBA/NAB/ANZ)** — The verified buyer database is a mortgage origination engine. A bank with DEED has sight of every buyer in market before they apply for finance. Worth billions in mortgage flow.
- **Global PropTech (Opendoor/Zillow)** — Both have announced AU interest. DEED is the Australian private sale infrastructure they'd need to build. Easier to acquire.

**The moat is the verified buyer database.** Not the platform. Every buyer who connects open banking creates a profile no competitor can replicate without the same time and trust investment. REA has 12M monthly users and knows nothing real about them. DEED will know everything that matters.

---

## Design System Reference

| Token | Value |
|---|---|
| Dark bg | `#0b0b0b` |
| Dark surface | `#161616` |
| Dark text | `#ede8df` (cream) |
| Light bg | `#f8f7f5` |
| Light card | `#ffffff` |
| Light text | `#1a1a1a` |
| Gold accent | `#c8922a` |
| Green | `#22c55e` |
| Red | `#ef4444` |
| Display font | Bebas Neue |
| Body font | DM Sans |
| Framework | None — pure HTML/CSS/JS |

---

## How We Build

One feature at a time. No frameworks. No complexity for its own sake. Deploy after every step with `cd ~/deed && vercel --prod --yes`. Claude leads the build sequence. Ed approves before each deploy.

Every session starts by reading this document.
