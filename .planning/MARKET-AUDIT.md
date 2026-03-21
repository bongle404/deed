# DEED Market Audit — March 2026

**Research date:** 2026-03-21
**Sources:** Live web data via Brave Search, Firecrawl, Reddit, ProductReview.com.au, Trustpilot, PEXA settlement data

---

## Verdict: Worth building. Build order needs to change.

The market is real, the commission pain is real, and the competitive gap is genuine. But the current 1→2→3→4→5 phase order puts the most defensible differentiators last.

---

## The Market

- **686,040 residential settlements nationally in 2024.** QLD led with 198,019 worth $152.4 billion.
- **QLD commission economics:** 2.0–3.0% (avg 2.5%). Brisbane median $1.05M → ~$26,364 saved. Gold Coast median $1.17M → ~$29,250 saved.
- **National agent commissions:** ~$14.3 billion paid annually (est. at 2% avg on $714.7B total sales value).
- **FSBO penetration: under 1%.** The category is structurally underdeveloped. Platforms today serve a narrow slice of confident DIY sellers — not growing the market meaningfully.
- **No funded AI-powered FSBO platform exists in Australia.** The AI proptech wave (Agentsy, Voqo AI, FOUNDIT) has gone entirely toward agent efficiency tools. Private seller AI is untouched.

---

## Competitive Landscape

Every FSBO platform does the same thing: flat fee ($499–$1,995), list on REA and Domain, leave the seller to figure out the rest.

| Platform | Price (Sale) | REA | Domain | AI Tools | Buyer Verification | QLD Legal |
|---|---|---|---|---|---|---|
| BuyMyPlace | $745–$1,995 | ✓ | ✓ | None | None | None |
| PropertyNow | $929 | ✓ | ✓ | None | None | None |
| For Sale By Owner | ~$499–$799 | ✓ | ✓ | None | None | None |
| SaleByHomeOwner (QLD-based) | $499–$1,795 | ✓ | ✓ | None | None | None |
| No Agent Property | $948+ | ✓ | ✓ | Passive buyer DB only | None | None |
| Minus The Agent | $799+ | ✓ | ✓ | None | None | None |
| For Sale or Rent By Owner | $699 | ✓ | ✓ | None | None | None |
| Abodely | Free | ✗ | ✗ | None | None | None |
| **DEED** | **$999** | **TBC** | **TBC** | **Planned** | **Planned** | **Planned** |

### Market leaders by proof points
- **By recent sales volume:** For Sale By Owner (922 sales past 12 months)
- **By cumulative sales:** BuyMyPlace (27,000+), No Agent Property (20,005+)
- **By review count/trust:** PropertyNow (4,053 Trustpilot reviews, 4.8/5; won ProductReview Real Estate Award 6 of last 7 years)
- **QLD-based:** SaleByHomeOwner (Brisbane) — does not leverage QLD positioning meaningfully

---

## Three Uncontested Gaps

### Gap 1: QLD Form 2 — first-mover window is open

From 1 August 2025, Queensland introduced mandatory seller disclosure under the Property Law Act 2023. Sellers must prepare a Seller Disclosure Statement plus prescribed certificates before a buyer signs a contract:

**Required certificates:** title search, survey plan, body corporate/CMS (units), pool safety, environmental/building notices, council rates, water charges, resumption/transport notices.

**Legal consequence:** Failure to provide gives the buyer a no-fault termination right (section 104(2) PLA) — no materiality test required. Additionally from 1 January 2025, an ATO Clearance Certificate is required for all QLD sales regardless of price.

**Competitive position:** Zero FSBO platforms have built tooling for this. The scheme is 8 months old. DEED is QLD-native. This is the most defensible first-mover opportunity in the current market.

### Gap 2: Buyer pre-qualification — category's biggest unsolved problem

Unqualified buyer enquiries are the most cited operational pain across all FSBO reviews. Agents use signed contracts to filter tyre-kickers; FSBO sellers have no equivalent filter. No platform screens buyers in any meaningful way.

**Caution on mechanism:** The illion BankStatements API integration (current Phase 2) carries funnel risk — asking buyers to submit detailed bank data before inspection is high friction. Buyers are simultaneously evaluating multiple properties. Consider a lighter v1: "verified pre-approval" badge where buyers upload a broker letter, manually confirmed by DEED. Test demand before building the full API integration.

### Gap 3: AI pricing — neutralises agents' strongest objection

"You'll price it wrong" is the primary agent argument against FSBO. Research shows agents systematically under-appraise by $30k–$90k to drive quick commission. A suburb comparables engine with low/mid/high estimate directly neutralises this.

Real examples from ProductReview:
- "Two agents said $140k. I sold for $170k." (BuyMyPlace review)
- "Agents appraised at $715k. We listed at $779k and sold in 4 days at asking price." (Reddit)
- "Sold for $90k more than agents offered, plus saved $20k in fees — $110k difference." (BuyMyPlace review)

No FSBO platform offers data-backed pricing intelligence as part of onboarding.

---

## Validated Seller Pain Points (ranked by frequency)

| Rank | Pain Point | Evidence |
|---|---|---|
| 1 | **Pricing uncertainty** — don't know what to ask | Most structurally significant; drives FSBO abandonment. Agents low-ball appraisals to protect their commission. |
| 2 | **Unqualified buyers / time wasters** | Most cited operational frustration across all review platforms. Discount-seekers assume private sale = commission saving passed to them. |
| 3 | **Legal/contract complexity** | Sharply elevated post-August 2025. QLD Form 2 is new, mandatory, and poorly understood by private sellers. Conveyancing is non-negotiable. |
| 4 | **Negotiation confidence** | Sellers without experience negotiating directly with buyers freeze or fold. Agents act as a buffer — FSBO sellers carry this alone. |
| 5 | **Listing setup / presentation** | Professional photography and signage consistently cited as conversion-critical. "90% of my enquiries came from realestate.com.au — presentation is essential." |

**Top reasons sellers abandon FSBO and go back to agents:**
1. No enquiry after weeks/months (pricing wrong or slow market)
2. Time/financial pressure demands certainty of sale
3. Confidence failure in direct negotiation
4. Legal complexity overwhelming them (especially post-August 2025 in QLD)
5. Platform/tech failures breaking the enquiry flow

---

## Recommended Phase Order (Revised)

| Current | Revised | Phase | Rationale |
|---|---|---|---|
| Phase 5 | **Phase 1** | REA/Domain Portal Integration | Table stakes. Without REA/Domain, listings have no audience — 90%+ of buyer enquiries come from REA. Nothing else matters until this works. Requires licensed FSBO intermediary partnership. |
| Phase 3 | **Phase 2** | QLD Legal Scaffolding | First-mover gap. Form 2 is mandatory (Aug 2025), 8 months old, zero competitors have it. This is the QLD headline differentiator — should be the marketing lead, not a later phase. Window closes when competitors notice. |
| Phase 1 | **Phase 3** | AI Pricing Tool | Validated need, no competitor. Neutralises agents' main FSBO objection. Plans already written and verified — ready to execute once portal is live. |
| Phase 4 | **Phase 4** | Negotiation Facilitation | No competitors. Directionally right but lower urgency — sellers cite pricing and legal complexity before negotiation friction. |
| Phase 2 | **Phase 5** | Buyer Finance Verification | Pain is real, mechanism is unproven. Start with manual "verified pre-approval" badge (broker letter upload) before building full illion API integration. Test adoption first. |

---

## DEED's Strongest Differentiation Angles

1. **QLD-native with Form 2 compliance built in** — only platform that can claim this
2. **AI pricing tool** — only platform providing suburb comparables and confidence-interval estimates
3. **Verified buyer badge** — once built, only platform filtering unqualified enquiries
4. **Developer portal** — uncontested B2B revenue stream; no competitor has this
5. **Flat $999 vs confusing ladders** — simpler to communicate than competitors' multi-tier pricing

---

## Key Question Before Proceeding

Does DEED currently have a path to REA/Domain listing via a licensed FSBO intermediary? If yes, the portal phase is mainly an integration build. If no, the commercial partnership must be initiated before Phase 1 development starts — this has the longest lead time of anything in v2.0.

---

## Red Flags

1. **Portal access is a commodity, not a moat.** Every competitor already lists on REA/Domain. DEED must differentiate on tools — which the roadmap does, but only if built and functional.
2. **BuyMyPlace already has a CMA report product.** DEED's pricing tool must be genuinely live and AI-powered, not a reformatted static report.
3. **Off-market growth (20%+ of Sydney sales) benefits agents, not FSBO platforms.** This trend is agent-facilitated — it doesn't help DEED directly.
4. **Buyer finance verification has a structural funnel problem.** Buyers transact across multiple listings simultaneously. High friction to submit bank data for one property. De-risk with lighter v1 before API build.

---

*Prepared from three parallel research streams: competitor mapping, seller sentiment analysis, and market validation. All data from live web sources, March 2026.*
