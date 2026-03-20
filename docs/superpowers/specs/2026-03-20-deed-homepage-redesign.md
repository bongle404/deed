# DEED Homepage Redesign — Design Spec
**Date:** 2026-03-20
**Status:** Approved by user

---

## Overview

A full redesign of the DEED homepage (`index.html`) targeting both sellers and buyers equally. The design direction is cinematic dark-to-light scroll with parallax depth, electric blue accent, and editorial typography. The goal is aspiration and trust/legitimacy — not disruption or aggression.

**Primary audience:** Sellers wanting to avoid agent commissions + buyers seeking off-market, AI-qualified listings
**Core emotional target:** Aspiration + trust/legitimacy
**Visual treatment:** Dark hero → charcoal → warm off-white → deeper warm tone → dark close
**Accent colour:** Electric blue (`#2563EB` range) — replaces all gold
**Section count:** 6 (same structure as current, redesigned execution)

---

## Section 1: Hero

**Background:** Near-black (`#0a0a0a`). Full viewport height.

**Parallax layer:** Low-opacity architectural/property photograph (Queensland streets, modern homes, or aerial suburb) behind a dark gradient overlay. Photo parallaxes at ~60% scroll speed relative to content, creating depth. Content stays fixed until hero exits viewport.

**Content (centred, stacked):**
- Eyebrow: small caps, muted electric blue — `QUEENSLAND'S PRIVATE PROPERTY PLATFORM`
- Headline (display serif, `clamp(4rem, 7vw, 7rem)`): `Sellers keep $20,000. Buyers skip the queue.`
- Subhead (~16px, muted white, max-width 520px): "No agents. No commissions. AI-qualified buyers and verified listings."
- Two CTAs side by side: `List your property` (solid blue button) + `Browse homes` (ghost/outline button, blue border)
- Thin divider line → 3 inline micro-stats: average seller saving / properties listed / average days to first offer

> **Content note:** Hero micro-stat values (saving amount, property count, days to offer) are placeholders. Use same `$18,400` / `47 listings` / `48hrs` figures as stats strip, or supply real platform data before launch.

**Animated property cards:** 2–3 listing card thumbnails floating in from the right edge, partially cropped, with a slow drift animation. Thin electric blue border. Suggest live platform activity without being UI-heavy. Cards are decorative — not interactive. Each card shows: a mock suburb name, a price range (e.g. `$680,000`), and a placeholder property image (grey gradient or a stock photo). Content is illustrative only.

**Scroll hint:** Bottom-right, vertical "SCROLL" text + animated descending line. Same treatment as current.

**Animation:** Hero content fades up on load (`fadeUp`, 0.9s, 0.15s delay). Property cards drift in after 0.6s.

---

## Section 2: Stats Strip

**Background:** Deep charcoal (`#111111`) — a deliberate step from near-black. No hard border between hero and strip; the colour shift is the separator.

**Layout:** Four stats across full width, edge-to-edge. No container max-width.

**Stats:**
1. `$18,400` — Average seller saving
2. `0%` — Agent commission
3. `48hrs` — Average time to first qualified offer
4. `100%` — Private sales, no portal listings

**Typography:** Large display numerals in white. Labels in muted grey, small caps.

**Animation:** Intersection Observer triggers count-up animation when strip enters viewport. Counts from 0 to final value over ~1.2s. Fires once — does not loop.

---

## Section 3: How It Works

**Background transition:** Charcoal (`#111`) bleeding into warm off-white (`#F7F5F2`) over ~100px gradient. Feels like the page breathing out — cinematic exhale into the light content.

**Section header:**
- Eyebrow: `HOW IT WORKS` small caps, muted
- Headline (display serif): `Simple. Private. Yours.`

**Layout:** Stepped vertical timeline — three steps stacked, alternating left/right offset. Thin vertical blue timeline line runs down centre. On mobile: straight vertical stack.

**Steps:**

1. **List your property**
   Display numeral `01` in electric blue. Title in display serif. Body: AI-guided listing flow, professional photos checklist, price guidance tool.

2. **We qualify your buyers**
   Display numeral `02`. Body: Identity verified, finance pre-checked before buyers can contact seller. No tyre-kickers.

3. **Negotiate and settle**
   Display numeral `03`. Body: Built-in offer management, AI contract generation, settlement support.

Each step has a minimal line-art icon (not photography). Steps reveal on scroll via Intersection Observer fade-in.

---

## Section 4: Why No Agent

**Background:** Warm off-white (`#F7F5F2`) — continuous from Section 3.

**Headline (display serif):** `The agent's cut was never yours to give.`

**Layout:** Two columns, ~45/55 split.

**Left column:**
- Display subheading: `$20,000. Gone. For what?`
- 3–4 sentences in prose — the emotional argument. What an agent actually does versus what DEED delivers. No bullet points. Confident, editorial tone.

**Right column:** Clean comparison table.
- Headers: `Traditional Agent` | `DEED`
- DEED column header: thin electric blue top border accent
- Rows: Commission fee / Buyer qualification / Contract support / Listing control / Timeline / Privacy
- Agent column: red `✕` + brief cost/pain note
- DEED column: blue `✓` + brief benefit note
- Table: light border, clean row separators, no zebra striping

Tone is aspirational, not aggressive. No rhetorical "gotcha" language.

---

## Section 5: Trust / Social Proof

**Background:** Slightly deeper warm tone (`#EEE9E1`) — signals transition before final CTA.

**Section header eyebrow:** `WHAT SELLERS AND BUYERS SAY`

**Testimonials:** Three cards in a horizontal row (desktop). Static — no carousel.

Each card:
- Pullquote in display serif, ~1.1rem, dark ink — full quote, no truncation
- Name, suburb, role (Seller / Buyer) in small caps below
- Thin electric blue left border accent

**Trust badge row:** Below testimonials. Small horizontal strip — logomark + label for each:
- Verified by PEXA
- Queensland Law Society compliant contracts
- 256-bit encrypted data
- REIQ-reviewed process

Restrained sizing — these are credibility signals, not hero elements. The restraint is what makes them feel legitimate.

> **Content note:** Trust badge claims and REIQ/PEXA verification must be confirmed as accurate before launch. Build with placeholder labels; swap in verified copy only.

**Cumulative stat:** Centred below trust badges. Large display type: `$2.4M saved by Queensland sellers`. One line, no surrounding copy — let it land.

> **Content note:** Testimonial quotes, names, suburbs, and the cumulative savings figure are placeholder content. Real testimonials and verified figures must be supplied before launch.

---

## Section 6: Final CTA

**Background:** Near-black (`#0a0a0a`) — returns to hero colour. Intentional cinematic symmetry.

**Parallax background:** Very subtle property silhouette or skyline in deep charcoal (`~5% opacity`), parallaxing slowly as section enters. Echoes hero without repeating it.

**Content (centred, generous vertical padding):**
- Eyebrow: `START TODAY` small caps, electric blue
- Display headline (large): `Your property. Your terms. Your $20,000.`
- Subhead (muted white): "List in under 10 minutes. No agent required."
- Two CTAs: `List your property` (solid blue) + `Browse homes` (ghost/outline) — mirrors hero CTAs exactly
- Reassurance line (small, muted): "No upfront cost to browse. $999 flat fee to list — no commission."

**Footer:** Below CTA panel. Thin dark strip — logo left, nav links centre, legal right.

---

## Design Tokens

| Token | Value |
|-------|-------|
| Accent | `#2563EB` (electric blue) |
| Dark BG | `#0a0a0a` |
| Charcoal | `#111111` |
| Warm off-white | `#F7F5F2` |
| Deeper warm | `#EEE9E1` |
| Display font | Existing `var(--font-display)` |
| Body font | Existing `var(--font-body)` |

---

## Parallax Implementation

Use CSS `transform: translateY()` driven by scroll position via `requestAnimationFrame`. No external library required — native scroll events + RAF for performance.

- Hero photo layer: parallax at 0.4 multiplier (moves 40% of scroll distance)
- Final CTA background silhouette: parallax at 0.3 multiplier
- Content never parallaxes — only background layers

---

## Scroll Animations

All triggered by `IntersectionObserver` with `threshold: 0.15`.

| Element | Animation |
|---------|-----------|
| Hero content | `fadeUp` on load, no IO |
| Stats strip numbers | Count-up, fires once |
| How It Works steps | Stagger fade-in left/right alternating |
| Comparison table rows | Stagger fade-in top to bottom |
| Testimonial cards | Stagger fade-in |
| Trust badges | Fade-in as group |
| Final CTA content | `fadeUp` |

---

## Responsiveness

- Hero: headline scales with `clamp()`, CTAs stack vertically on mobile, property cards hidden on mobile
- Stats strip: 2×2 grid on mobile
- How It Works: straight vertical stack on mobile (no alternating offset)
- Comparison table: horizontal scroll on mobile (table preserved, not collapsed)
- Testimonials: single column vertical stack on mobile
- Trust badges: 2×2 grid on mobile

---

## Out of Scope

- No changes to any other page (qualify.html, browse.html, listing.html, etc.)
- No backend changes
- No new routes or API endpoints
- No changes to `deed-ui.css` global tokens — new styles in `index.html` page-specific block only
