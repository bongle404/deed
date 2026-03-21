# DEED

## What This Is

DEED is a Queensland private property sales platform that lets sellers list without a real estate agent, connecting them directly with AI-verified buyers. Sellers list free and pay a platform fee only on settlement. Buyers are identity and finance-verified before they can contact sellers.

## Core Value

A seller can list privately and confidently — knowing every buyer who contacts them has been verified and can actually close — without paying agent commission.

## Requirements

### Validated (v1.0 — shipped)

- ✓ Landing page with interactive commission calculator — v1.0
- ✓ Buyer pre-qualification flow (5-step, writes to Supabase) — v1.0
- ✓ Seller listing flow (AI copy generation, photo upload, deferred platform fee) — v1.0
- ✓ Browse page (private listings + developer project cards) — v1.0
- ✓ Property detail page with offer submission and strength scoring — v1.0
- ✓ Seller dashboard (real Supabase data, offer war room, timing intel) — v1.0
- ✓ AI contract generation on offer acceptance (Claude Haiku) — v1.0
- ✓ Email notifications via Resend (new offer, buyer match, offer round, offer accepted) — v1.0
- ✓ Broker portal (registration, magic link auth, buyer submission, dashboard) — v1.0
- ✓ Developer portal (registration, project listing, magic link auth) — v1.0
- ✓ Off-market pre-market buyer matching (email verified buyers on new listing) — v1.0
- ✓ Mobile responsive (480px breakpoint, sticky CTAs) — v1.0

### Active (v2.0 — this milestone)

- [ ] AI pricing tool with suburb comparable sales and confidence interval
- [ ] Real buyer finance verification via illion BankStatements API
- [ ] QLD legal scaffolding (conveyancer partner integration, disclosure statement)
- [ ] Negotiation facilitation (structured offer flow, counteroffer templates, AI flagging)
- [ ] Site copy rewrite reflecting verified buyer positioning and free-to-list model
- [ ] REA/Domain portal access via licensed intermediary structure

### Out of Scope

- Mobile app — web-first, defer to v3+
- iBuyer / guaranteed offer model — requires capital, different business model
- National expansion — QLD only until product-market fit confirmed
- Agent-facing tools — DEED displaces agents, not serves them

## Context

**Research findings (March 2026):** FSBO is stuck at ~1% of Australian transactions despite a $17.9B annual commission pool. The barrier is not awareness — it is seller execution risk. Purplebricks spent $20M in AU and failed because cheaper ≠ safer. The winning proposition is "private sale as safe as using an agent" — verified buyers, AI pricing, legal scaffolding, deferred fee alignment. Mortgage brokers grew to 76.8% market share via trust and interest alignment, not price. That is the model.

**QLD specific:** Median Brisbane house price $1.08M (Feb 2026). Average commission 2.45% = $26,473. QLD deregulated commissions in 2014. Private sales are legal without an agent — only a conveyancer is required for contract preparation. 198,019 QLD residential settlements in 2024 (PEXA).

**Tech stack:** Pure HTML/CSS/JS, no frameworks. Vercel hosting. Supabase (Postgres + Auth + Storage). Claude Haiku for AI features. Resend for email. GitHub: bongle404/deed.

**Portal dependency:** REA/Domain require a licensed agent or FSBO intermediary to list. DEED needs to resolve this via licence or partnership before buyer acquisition can scale.

## Constraints

- **Tech stack:** Pure HTML/CSS/JS only — no React/Next.js, no frameworks
- **Hosting:** Vercel serverless functions for API routes
- **Database:** Supabase (existing schema — extend, don't replace)
- **Legal:** Not a licensed real estate agent — cannot provide negotiation advice or act as agent
- **Auth:** Supabase magic link (existing pattern for brokers and developers)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Deferred fee on settlement | Aligns DEED with seller outcome; removes Purplebricks perverse incentive | ✓ Good |
| Free to list (no upfront fee) | Removes risk barrier for early adopters | ✓ Good |
| Supabase for everything | Simple, fast, no infrastructure overhead | ✓ Good |
| Pure HTML/CSS/JS | Ed is non-technical; no build step, easy to deploy | ✓ Good |
| QLD-only launch | Regulatory simplicity, focused market, manageable scope | — Pending |
| Broker portal as supply channel | Brokers have pre-approved buyers, no agent loyalty | — Pending |

---
*Last updated: 2026-03-21 — v2.0 milestone started*
