# DEED Homepage Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite `index.html` as a cinematic dark-to-light parallax homepage targeting both sellers and buyers, with electric blue accent, dual savings hook, and 6-section scroll narrative.

**Architecture:** Complete rewrite of `index.html` page-specific `<style>` block and `<body>` content. All new CSS lives in the inline `<style>` tag — `deed-ui.css` is not touched. All JavaScript lives in a `<script>` block at the end of `<body>`. Six sections: Hero → Stats Strip → How It Works → Why No Agent → Trust/Social Proof → Final CTA.

**Tech Stack:** Vanilla HTML/CSS/JS. `IntersectionObserver` for scroll animations. `requestAnimationFrame` for parallax. Bebas Neue (already loaded via deed-ui.css). No new dependencies.

**Spec:** `docs/superpowers/specs/2026-03-20-deed-homepage-redesign.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `index.html` | Rewrite `<style>` block + `<body>` | All page-specific CSS, HTML, and JS |
| `deed-ui.css` | No changes | Global tokens, nav, buttons, forms |

---

## Task 1: Add blue tokens, update nav button

**Files:**
- Modify: `index.html` — page-specific `<style>` block (top of existing block)
- Modify: `index.html` — nav `btn-gold` → `btn-blue`

**Context:** `deed-ui.css` already has `.btn-gold` and `.btn-gold-outline`. We define parallel `.btn-blue` and `.btn-blue-outline` classes in the page `<style>` block, using the new `--blue` tokens. Nav CTA currently reads `class="btn btn-gold btn-md"` — change to `btn-blue`.

- [ ] **Step 1: Add blue design tokens to top of `<style>` block**

In `index.html`, inside the `<style>` tag, add at the very top before any existing rules:

```css
/* ── BLUE ACCENT TOKENS ─────────────────────── */
:root {
  --blue:          #2563EB;
  --blue-light:    #3b82f6;
  --blue-dim:      #1e3a8a;
  --blue-pale:     #eff6ff;
  --blue-muted:    rgba(37, 99, 235, 0.15);
}

/* ── BLUE BUTTON VARIANTS ──────────────────── */
.btn-blue {
  background: var(--blue);
  color: #fff;
  border: 1px solid var(--blue);
}
.btn-blue:hover {
  background: var(--blue-light);
  border-color: var(--blue-light);
}
.btn-blue-outline {
  background: transparent;
  color: var(--blue-light);
  border: 1px solid var(--blue);
}
.btn-blue-outline:hover {
  background: var(--blue-muted);
}
```

- [ ] **Step 2: Update nav button class**

Find in `index.html`:
```html
<a href="qualify.html" class="btn btn-gold btn-md">Get pre-qualified</a>
```
Replace with:
```html
<a href="qualify.html" class="btn btn-blue btn-md">Get pre-qualified</a>
```

- [ ] **Step 3: Verify in browser**

Open `index.html` in a browser. Nav button should be electric blue, not gold. No other visual changes yet.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: add blue accent tokens and update nav button"
```

---

## Task 2: Rewrite hero section

**Files:**
- Modify: `index.html` — replace all hero CSS rules in `<style>` block
- Modify: `index.html` — replace `<!-- HERO -->` section in `<body>`

**Context:** Current hero is seller-only with a DEED stamp watermark. New hero: full-viewport, parallax photo layer, dual savings headline, two CTAs (sell/buy), micro-stats row, animated floating property cards. The `<div class="hero-stamp">` and all stamp/eyebrow/gold references are removed.

- [ ] **Step 1: Replace hero CSS in `<style>` block**

Find the `/* ── HERO ──` comment block and replace everything through `.scroll-hint::after { ... }` with:

```css
/* ── HERO ──────────────────────────────── */
.hero {
  min-height: 100vh;
  background: #0a0a0a;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 8rem 3rem 6rem;
  position: relative;
  overflow: hidden;
  text-align: center;
}

.hero-parallax-bg {
  position: absolute;
  inset: -10%;
  background-image: url('https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=1800&q=60');
  background-size: cover;
  background-position: center;
  opacity: 0.12;
  will-change: transform;
  pointer-events: none;
}

.hero-eyebrow {
  font-size: 0.68rem;
  font-weight: 500;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--blue-light);
  margin-bottom: 1.75rem;
}

.hero-content {
  position: relative;
  z-index: 2;
  max-width: 820px;
  animation: fadeUp 0.9s ease forwards 0.15s;
  opacity: 0;
}

.hero-headline {
  font-family: var(--font-display);
  font-size: clamp(3.5rem, 7vw, 7rem);
  letter-spacing: 0.02em;
  line-height: 1;
  color: var(--dark-text);
  margin-bottom: 1.6rem;
}

.hero-headline .hl-sellers { color: var(--dark-text); }
.hero-headline .hl-sep {
  display: block;
  font-size: 0.38em;
  letter-spacing: 0.3em;
  color: var(--dark-muted);
  margin: 0.4em 0;
  font-family: var(--font-body);
  font-weight: 300;
  text-transform: uppercase;
}
.hero-headline .hl-buyers { color: var(--blue-light); }

.hero-sub {
  font-size: 1rem;
  font-weight: 300;
  color: var(--dark-muted);
  max-width: 480px;
  margin: 0 auto 2.5rem;
  line-height: 1.75;
}

.hero-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 3.5rem;
}

.hero-micro-stats {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2rem;
  padding-top: 2rem;
  border-top: 1px solid var(--dark-border);
  width: fit-content;
  margin: 0 auto;
}

.hero-micro-stat-val {
  font-family: var(--font-display);
  font-size: 1.5rem;
  letter-spacing: 0.05em;
  color: var(--dark-text);
  line-height: 1;
}

.hero-micro-stat-label {
  font-size: 0.68rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--dark-muted);
  margin-top: 0.25rem;
}

.hero-micro-divider {
  width: 1px;
  height: 2.5rem;
  background: var(--dark-border-2);
}

/* Floating property cards */
.hero-cards {
  position: absolute;
  right: -2rem;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 1rem;
  animation: cardsFloat 6s ease-in-out infinite;
  pointer-events: none;
  z-index: 1;
}

@keyframes cardsFloat {
  0%, 100% { transform: translateY(-50%) translateX(0); }
  50%       { transform: translateY(-52%) translateX(-8px); }
}

.hero-card {
  width: 200px;
  background: rgba(22, 22, 22, 0.85);
  border: 1px solid var(--blue);
  border-radius: var(--radius-lg);
  padding: 0.9rem 1.1rem;
  backdrop-filter: blur(12px);
  animation: fadeIn 0.6s ease forwards;
  opacity: 0;
}

.hero-card:nth-child(1) { animation-delay: 0.8s; }
.hero-card:nth-child(2) { animation-delay: 1.1s; }
.hero-card:nth-child(3) { animation-delay: 1.4s; }

.hero-card-suburb {
  font-size: 0.68rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--dark-muted);
  margin-bottom: 0.3rem;
}

.hero-card-price {
  font-family: var(--font-display);
  font-size: 1.25rem;
  letter-spacing: 0.04em;
  color: var(--dark-text);
  line-height: 1;
}

.hero-card-tag {
  display: inline-block;
  margin-top: 0.5rem;
  font-size: 0.6rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--blue-light);
  background: var(--blue-muted);
  padding: 0.2rem 0.5rem;
  border-radius: var(--radius-pill);
}

.scroll-hint {
  position: absolute;
  bottom: 2rem;
  right: 3rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  opacity: 0;
  animation: fadeIn 0.6s ease forwards 1.4s;
}
.scroll-hint span {
  font-size: 0.62rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--dark-dim);
  writing-mode: vertical-rl;
}
.scroll-hint::after {
  content: '';
  width: 1px;
  height: 4rem;
  background: linear-gradient(to bottom, var(--dark-border-2), transparent);
  animation: scrollPulse 2.2s ease-in-out infinite;
}
```

- [ ] **Step 2: Replace hero HTML in `<body>`**

Find `<!-- HERO -->` through the closing `</section>` of the hero and replace with:

```html
<!-- HERO -->
<section class="hero" id="hero">
  <div class="hero-parallax-bg" id="hero-parallax-bg"></div>

  <div class="hero-content">
    <p class="hero-eyebrow">Queensland's Private Property Platform</p>
    <h1 class="hero-headline">
      <span class="hl-sellers">SELLERS KEEP $20,000.</span>
      <span class="hl-sep">·</span>
      <span class="hl-buyers">BUYERS SKIP THE QUEUE.</span>
    </h1>
    <p class="hero-sub">No agents. No commissions. AI-qualified buyers and verified listings — built for Queensland.</p>
    <div class="hero-actions">
      <a href="sell.html" class="btn btn-blue btn-lg">List your property →</a>
      <a href="browse.html" class="btn btn-blue-outline btn-lg">Browse homes</a>
    </div>
    <div class="hero-micro-stats">
      <div class="hero-micro-stat">
        <div class="hero-micro-stat-val">$18,400</div>
        <div class="hero-micro-stat-label">Avg. seller saving</div>
      </div>
      <div class="hero-micro-divider"></div>
      <div class="hero-micro-stat">
        <div class="hero-micro-stat-val">47</div>
        <div class="hero-micro-stat-label">Active listings</div>
      </div>
      <div class="hero-micro-divider"></div>
      <div class="hero-micro-stat">
        <div class="hero-micro-stat-val">48hrs</div>
        <div class="hero-micro-stat-label">To first qualified offer</div>
      </div>
    </div>
  </div>

  <!-- Decorative floating property cards — illustrative content only -->
  <div class="hero-cards" aria-hidden="true">
    <div class="hero-card">
      <p class="hero-card-suburb">Paddington, QLD</p>
      <p class="hero-card-price">$895,000</p>
      <span class="hero-card-tag">AI Qualified Buyers</span>
    </div>
    <div class="hero-card">
      <p class="hero-card-suburb">Ascot, QLD</p>
      <p class="hero-card-price">$1,240,000</p>
      <span class="hero-card-tag">Offer Received</span>
    </div>
    <div class="hero-card">
      <p class="hero-card-suburb">New Farm, QLD</p>
      <p class="hero-card-price">$1,075,000</p>
      <span class="hero-card-tag">3 Qualified Buyers</span>
    </div>
  </div>

  <div class="scroll-hint" aria-hidden="true"><span>Scroll</span></div>
</section>
```

- [ ] **Step 3: Verify in browser**

Open `index.html`. Hero should show:
- Dark full-viewport section, centred text
- Electric blue eyebrow, white/blue headline, muted subtext
- Two blue buttons side by side
- 3 micro-stats below a divider line
- 3 floating cards on the right edge fading in with stagger
- Scroll hint bottom-right
- Faint background photo texture

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: redesign hero — dual-audience headline, blue accent, floating cards"
```

---

## Task 3: Rewrite stats strip with count-up animation

**Files:**
- Modify: `index.html` — replace stats strip CSS in `<style>` block
- Modify: `index.html` — replace `<!-- STATS STRIP -->` HTML
- Modify: `index.html` — add `countUp()` JS function in `<script>` block (create block if not yet present)

**Context:** Background shifts to deep charcoal `#111111`. Stats change to the new 4 values. Count-up animation fires once via IntersectionObserver.

- [ ] **Step 1: Replace stats strip CSS**

Find `/* ── STATS STRIP ──` block and replace through the closing rules with:

```css
/* ── STATS STRIP ───────────────────────── */
.stats-strip {
  background: #111111;
  padding: 3rem 3rem;
}
.stats-strip-inner {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0;
}
.strip-item {
  padding: 0 2.5rem;
  border-right: 1px solid var(--dark-border);
}
.strip-item:first-child { padding-left: 0; }
.strip-item:last-child  { border-right: none; }
.strip-val {
  font-family: var(--font-display);
  font-size: 2.5rem;
  letter-spacing: 0.04em;
  color: var(--dark-text);
  line-height: 1;
  margin-bottom: 0.3rem;
}
.strip-label {
  font-size: 0.68rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--dark-muted);
  margin-bottom: 0.25rem;
}
.strip-desc {
  font-size: 0.76rem;
  color: var(--dark-dim);
}
```

- [ ] **Step 2: Replace stats strip HTML**

Find `<!-- STATS STRIP -->` through its closing `</div>` and replace with:

```html
<!-- STATS STRIP -->
<div class="stats-strip" id="stats-strip">
  <div class="stats-strip-inner">
    <div class="strip-item">
      <p class="strip-label">Average seller saving</p>
      <p class="strip-val" data-count-to="18400" data-prefix="$">$0</p>
      <p class="strip-desc">Versus standard QLD agent commission</p>
    </div>
    <div class="strip-item">
      <p class="strip-label">Agent commission</p>
      <p class="strip-val" data-count-to="0" data-suffix="%">0%</p>
      <p class="strip-desc">DEED charges a flat $999 fee only</p>
    </div>
    <div class="strip-item">
      <p class="strip-label">Time to first qualified offer</p>
      <p class="strip-val" data-count-to="48" data-suffix="hrs">0hrs</p>
      <p class="strip-desc">From listing going live</p>
    </div>
    <div class="strip-item">
      <p class="strip-label">Private sales</p>
      <p class="strip-val" data-count-to="100" data-suffix="%">0%</p>
      <p class="strip-desc">No portal listings. Direct to buyers.</p>
    </div>
  </div>
</div>
```

- [ ] **Step 3: Add count-up JS to `<script>` block**

At the end of `<body>`, replace any existing `<script>` block (or create one) with at minimum this function — preserve any existing JS functions you aren't replacing yet:

```javascript
/* ── COUNT-UP ANIMATION ─────────────────── */
function animateCountUp(el) {
  const target = parseInt(el.dataset.countTo, 10);
  const prefix = el.dataset.prefix || '';
  const suffix = el.dataset.suffix || '';
  if (target === 0) return; // already 0%, no animation needed
  const duration = 1200;
  const step = 16;
  const increment = target / (duration / step);
  let current = 0;
  const timer = setInterval(() => {
    current = Math.min(current + increment, target);
    el.textContent = prefix + Math.floor(current).toLocaleString() + suffix;
    if (current >= target) clearInterval(timer);
  }, step);
}

const statsObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.querySelectorAll('[data-count-to]').forEach(animateCountUp);
      statsObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.3 });

const statsStrip = document.getElementById('stats-strip');
if (statsStrip) statsObserver.observe(statsStrip);
```

- [ ] **Step 4: Verify in browser**

Scroll down to the stats strip. On first scroll into view, numbers should count up from 0 to their targets over ~1.2s. `0%` agent commission stays static. Reload and scroll again — animation fires once only.

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat: redesign stats strip with charcoal bg and count-up animation"
```

---

## Task 4: Rewrite How It Works — stepped timeline layout

**Files:**
- Modify: `index.html` — replace How It Works CSS
- Modify: `index.html` — replace `<!-- HOW IT WORKS -->` HTML
- Modify: `index.html` — add dark-to-light gradient transition between stats strip and this section

**Context:** Background transition from `#111` (charcoal) to `#F7F5F2` (warm off-white) over ~100px. Layout changes from 3-card grid to 3-step vertical alternating timeline. Scroll-triggered stagger reveals added.

- [ ] **Step 1: Replace How It Works CSS**

Find `/* ── HOW IT WORKS ──` block and replace through closing `}` of `.how-tag` with:

```css
/* ── HOW IT WORKS ──────────────────────── */
.how-section {
  background: linear-gradient(to bottom, #111111 0%, #F7F5F2 120px);
  padding: 7rem 3rem 7rem;
}
.how-section-header {
  text-align: center;
  margin-bottom: 5rem;
}
.how-eyebrow {
  font-size: 0.68rem;
  font-weight: 500;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--light-muted);
  margin-bottom: 1rem;
}
.how-headline {
  font-family: var(--font-display);
  font-size: clamp(2.5rem, 5vw, 4.5rem);
  letter-spacing: 0.02em;
  color: var(--light-text);
  line-height: 1;
}
.how-timeline {
  position: relative;
  max-width: 860px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 0;
}
.how-timeline::before {
  content: '';
  position: absolute;
  left: 50%;
  top: 0;
  bottom: 0;
  width: 1px;
  background: linear-gradient(to bottom, var(--blue-muted), transparent);
  transform: translateX(-50%);
}
.how-step {
  display: grid;
  grid-template-columns: 1fr 80px 1fr;
  align-items: center;
  gap: 0;
  padding: 3rem 0;
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.6s ease, transform 0.6s ease;
}
.how-step.visible {
  opacity: 1;
  transform: translateY(0);
}
.how-step:nth-child(2) { transition-delay: 0.15s; }
.how-step:nth-child(3) { transition-delay: 0.3s; }

/* Odd steps: content left, empty right */
.how-step:nth-child(odd) .how-step-content  { grid-column: 1; text-align: right; padding-right: 2.5rem; }
.how-step:nth-child(odd) .how-step-node     { grid-column: 2; }
.how-step:nth-child(odd) .how-step-spacer   { grid-column: 3; }

/* Even steps: empty left, content right */
.how-step:nth-child(even) .how-step-spacer  { grid-column: 1; }
.how-step:nth-child(even) .how-step-node    { grid-column: 2; }
.how-step:nth-child(even) .how-step-content { grid-column: 3; text-align: left; padding-left: 2.5rem; }

.how-step-node {
  display: flex;
  align-items: center;
  justify-content: center;
}
.how-step-node-inner {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-full);
  background: var(--blue-pale);
  border: 2px solid var(--blue);
  display: flex;
  align-items: center;
  justify-content: center;
}
.how-step-num {
  font-family: var(--font-display);
  font-size: 1.25rem;
  letter-spacing: 0.05em;
  color: var(--blue);
  line-height: 1;
}
.how-step-content {}
.how-step-title {
  font-family: var(--font-display);
  font-size: 1.75rem;
  letter-spacing: 0.02em;
  color: var(--light-text);
  line-height: 1.1;
  margin-bottom: 0.75rem;
}
.how-step-body {
  font-size: 0.88rem;
  color: var(--light-muted);
  line-height: 1.75;
  max-width: 340px;
}
.how-step:nth-child(odd)  .how-step-body { margin-left: auto; }
.how-step:nth-child(even) .how-step-body { margin-right: auto; }
```

- [ ] **Step 2: Replace How It Works HTML**

Find `<!-- HOW IT WORKS -->` through its closing `</section>` and replace with:

```html
<!-- HOW IT WORKS -->
<section class="how-section">
  <div class="how-section-header">
    <p class="how-eyebrow">How it works</p>
    <h2 class="how-headline">SIMPLE. PRIVATE. YOURS.</h2>
  </div>
  <div class="how-timeline" id="how-timeline">
    <div class="how-step">
      <div class="how-step-content">
        <h3 class="how-step-title">LIST YOUR PROPERTY</h3>
        <p class="how-step-body">AI-guided listing flow walks you through pricing, photos checklist, and property details. Go live in under 10 minutes with market-comparable data built in.</p>
      </div>
      <div class="how-step-node"><div class="how-step-node-inner"><span class="how-step-num">01</span></div></div>
      <div class="how-step-spacer"></div>
    </div>
    <div class="how-step">
      <div class="how-step-spacer"></div>
      <div class="how-step-node"><div class="how-step-node-inner"><span class="how-step-num">02</span></div></div>
      <div class="how-step-content">
        <h3 class="how-step-title">WE QUALIFY YOUR BUYERS</h3>
        <p class="how-step-body">Identity verified, finance pre-checked before any buyer can contact you. No tyre-kickers, no wasted weekends. You see a verified badge and borrowing range before the first message.</p>
      </div>
    </div>
    <div class="how-step">
      <div class="how-step-content">
        <h3 class="how-step-title">NEGOTIATE AND SETTLE</h3>
        <p class="how-step-body">Built-in offer management creates competitive tension between buyers. Post-offer, a pipeline tracks finance confirmation, building & pest, and settlement milestones. Your conveyancer handles legal — DEED handles everything else.</p>
      </div>
      <div class="how-step-node"><div class="how-step-node-inner"><span class="how-step-num">03</span></div></div>
      <div class="how-step-spacer"></div>
    </div>
  </div>
</section>
```

- [ ] **Step 3: Add How It Works scroll reveal JS**

In the `<script>` block, add after the stats observer code:

```javascript
/* ── HOW IT WORKS REVEAL ────────────────── */
const howObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, { threshold: 0.2 });

document.querySelectorAll('.how-step').forEach(el => howObserver.observe(el));
```

- [ ] **Step 4: Verify in browser**

Scroll from stats strip to How It Works. The background should transition from dark charcoal to warm off-white. Three steps should appear in an alternating left-right timeline as you scroll. Steps 2 and 3 fade in with slight delays.

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat: redesign how it works — alternating timeline with scroll reveals"
```

---

## Task 5: Rewrite Why No Agent — comparison table

**Files:**
- Modify: `index.html` — replace truth section CSS (rename class references)
- Modify: `index.html` — replace `<!-- WHY AGENTS FAIL -->` HTML

**Context:** Section retains warm off-white background. Headline changes from confrontational to aspirational. Right column becomes a clean comparison table (not a ✕-list). Section class renamed from `truth-section` to `agent-section` to avoid confusion.

- [ ] **Step 1: Replace truth section CSS**

Find `/* ── WHY AGENTS FAIL ──` block and replace through all `.truth-*` rules with:

```css
/* ── WHY NO AGENT ───────────────────────── */
.agent-section {
  background: #F7F5F2;
  padding: 7rem 3rem;
  border-top: 1px solid var(--light-border);
}
.agent-grid {
  display: grid;
  grid-template-columns: 1fr 1.3fr;
  gap: 6rem;
  align-items: start;
  max-width: 1100px;
  margin: 0 auto;
}
.agent-left-headline {
  font-family: var(--font-display);
  font-size: clamp(2.5rem, 4.5vw, 4rem);
  letter-spacing: 0.02em;
  line-height: 1;
  color: var(--light-text);
  margin-bottom: 1.5rem;
}
.agent-left-sub {
  font-family: var(--font-display);
  font-size: 1.4rem;
  letter-spacing: 0.02em;
  color: var(--light-muted);
  margin-bottom: 1.25rem;
}
.agent-left p {
  font-size: 0.9rem;
  color: var(--light-muted);
  line-height: 1.8;
}
.agent-left p + p { margin-top: 1rem; }

/* Comparison table */
.compare-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}
.compare-table thead th {
  padding: 0.75rem 1rem;
  font-size: 0.7rem;
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--light-muted);
  text-align: left;
  border-bottom: 1px solid var(--light-border);
}
.compare-table thead th.col-deed {
  border-top: 2px solid var(--blue);
  color: var(--blue);
}
.compare-table tbody tr {
  border-bottom: 1px solid var(--light-border);
  opacity: 0;
  transform: translateY(8px);
  transition: opacity 0.4s ease, transform 0.4s ease;
}
.compare-table tbody tr.visible {
  opacity: 1;
  transform: translateY(0);
}
.compare-table tbody td {
  padding: 1rem 1rem;
  color: var(--light-text);
  vertical-align: top;
}
.compare-table tbody td:first-child {
  font-weight: 500;
  font-size: 0.8rem;
  color: var(--light-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  white-space: nowrap;
}
.compare-no {
  color: var(--red);
  font-weight: 500;
}
.compare-yes {
  color: var(--blue);
  font-weight: 500;
}
.compare-note {
  display: block;
  font-size: 0.75rem;
  color: var(--light-dim);
  margin-top: 0.2rem;
  font-weight: 300;
}
```

- [ ] **Step 2: Replace Why Agents Fail HTML**

Find `<!-- WHY AGENTS FAIL -->` through its closing `</section>` and replace with:

```html
<!-- WHY NO AGENT -->
<section class="agent-section">
  <div class="agent-grid">
    <div class="agent-left">
      <h2 class="agent-left-headline">THE AGENT'S CUT WAS NEVER YOURS TO GIVE.</h2>
      <p class="agent-left-sub">$20,000. Gone. For what?</p>
      <p>Queensland's real estate commission model was built before price transparency, AI-verified finance, and digital contracts existed. Agents haven't changed because they haven't had to — until now.</p>
      <p>DEED does what a good agent should do: qualifies buyers, manages the offer process, and gets you to settlement. Without the 2.75% toll on everything you've built.</p>
    </div>
    <div class="agent-right">
      <table class="compare-table" id="compare-table">
        <thead>
          <tr>
            <th></th>
            <th>Traditional Agent</th>
            <th class="col-deed">DEED</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Commission fee</td>
            <td><span class="compare-no">✕ 2.75%</span><span class="compare-note">$20,000+ on avg. QLD home</span></td>
            <td><span class="compare-yes">✓ $999 flat</span><span class="compare-note">No commission, ever</span></td>
          </tr>
          <tr>
            <td>Buyer qualification</td>
            <td><span class="compare-no">✕ None</span><span class="compare-note">Any enquiry accepted</span></td>
            <td><span class="compare-yes">✓ AI verified</span><span class="compare-note">Finance + identity checked</span></td>
          </tr>
          <tr>
            <td>Contract support</td>
            <td><span class="compare-no">✕ Basic</span><span class="compare-note">Disappears post-offer</span></td>
            <td><span class="compare-yes">✓ Full pipeline</span><span class="compare-note">Finance, B&amp;P, settlement tracked</span></td>
          </tr>
          <tr>
            <td>Listing control</td>
            <td><span class="compare-no">✕ Agent-led</span><span class="compare-note">You're consulted, not in charge</span></td>
            <td><span class="compare-yes">✓ You control</span><span class="compare-note">Your price, your timeline</span></td>
          </tr>
          <tr>
            <td>Privacy</td>
            <td><span class="compare-no">✕ Portal listed</span><span class="compare-note">Public on REA, Domain</span></td>
            <td><span class="compare-yes">✓ Private</span><span class="compare-note">No public portal exposure</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</section>
```

- [ ] **Step 3: Add comparison table row reveal JS**

In the `<script>` block, add:

```javascript
/* ── COMPARISON TABLE ROW REVEAL ────────── */
const tableObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.querySelectorAll('tbody tr').forEach((row, i) => {
        row.style.transitionDelay = `${i * 0.08}s`;
        row.classList.add('visible');
      });
      tableObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.2 });

const compareTable = document.getElementById('compare-table');
if (compareTable) tableObserver.observe(compareTable);
```

- [ ] **Step 4: Verify in browser**

Scroll to the "Why No Agent" section. Should show two-column layout: aspirational prose left, comparison table right. Table rows should stagger-reveal on scroll. DEED column header has a blue top border. ✕ marks are red, ✓ marks are blue.

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat: redesign why-no-agent section — aspirational copy + comparison table"
```

---

## Task 6: Add Trust / Social Proof section

**Files:**
- Modify: `index.html` — add trust section CSS to `<style>` block
- Modify: `index.html` — replace `<!-- COMMISSION CALCULATOR -->` HTML with trust section

**Context:** Calculator section is removed entirely and replaced with the trust section. Background deepens to `#EEE9E1`. Three testimonial cards, trust badges, cumulative saving stat.

- [ ] **Step 1: Add trust section CSS**

Find `/* ── COMMISSION CALCULATOR ──` block and replace all calc rules through the closing `}` of `.calc-keep-val` with:

```css
/* ── TRUST / SOCIAL PROOF ───────────────── */
.trust-section {
  background: #EEE9E1;
  padding: 7rem 3rem;
  border-top: 1px solid var(--light-border);
}
.trust-eyebrow {
  font-size: 0.68rem;
  font-weight: 500;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--light-muted);
  text-align: center;
  margin-bottom: 3rem;
}
.trust-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
  margin-bottom: 4rem;
}
.trust-card {
  background: #fff;
  border-left: 3px solid var(--blue);
  border-radius: var(--radius-lg);
  padding: 2rem;
  box-shadow: var(--shadow-sm);
  opacity: 0;
  transform: translateY(16px);
  transition: opacity 0.5s ease, transform 0.5s ease;
}
.trust-card.visible {
  opacity: 1;
  transform: translateY(0);
}
.trust-card:nth-child(2) { transition-delay: 0.12s; }
.trust-card:nth-child(3) { transition-delay: 0.24s; }
.trust-quote {
  font-family: var(--font-display);
  font-size: 1.1rem;
  letter-spacing: 0.01em;
  color: var(--light-text);
  line-height: 1.45;
  margin-bottom: 1.25rem;
}
.trust-attribution {
  font-size: 0.72rem;
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--light-muted);
}

.trust-badges {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2.5rem;
  flex-wrap: wrap;
  padding: 2rem 0;
  border-top: 1px solid var(--light-border);
  border-bottom: 1px solid var(--light-border);
  margin-bottom: 3rem;
}
.trust-badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.72rem;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--light-muted);
}
.trust-badge-icon {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--blue-pale);
  border-radius: var(--radius-full);
  color: var(--blue);
  font-size: 0.65rem;
}

.trust-cumulative {
  text-align: center;
}
.trust-cumulative-val {
  font-family: var(--font-display);
  font-size: clamp(3rem, 6vw, 5rem);
  letter-spacing: 0.03em;
  color: var(--light-text);
  line-height: 1;
  display: block;
}
.trust-cumulative-label {
  font-size: 0.78rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--light-muted);
  margin-top: 0.5rem;
}
```

- [ ] **Step 2: Replace Commission Calculator HTML with Trust section**

Find `<!-- COMMISSION CALCULATOR -->` through its closing `</section>` and replace with:

```html
<!-- TRUST / SOCIAL PROOF -->
<section class="trust-section" id="trust-section">
  <p class="trust-eyebrow">What sellers and buyers say</p>

  <!-- Testimonials are placeholder content — replace with real testimonials before launch -->
  <div class="trust-cards">
    <div class="trust-card">
      <p class="trust-quote">We saved $19,400 compared to what the agent quoted. The process was more organised than I expected — every step was tracked.</p>
      <p class="trust-attribution">Sarah M. — Seller · Paddington, QLD</p>
    </div>
    <div class="trust-card">
      <p class="trust-quote">As a buyer, knowing everyone else had been finance-checked meant the offer process was serious. No wasted inspections on homes we couldn't afford.</p>
      <p class="trust-attribution">James K. — Buyer · New Farm, QLD</p>
    </div>
    <div class="trust-card">
      <p class="trust-quote">The AI contract generation was the surprise. Our conveyancer said it was the cleanest contract they'd received in years. Settled in 28 days.</p>
      <p class="trust-attribution">Michelle T. — Seller · Ascot, QLD</p>
    </div>
  </div>

  <!-- Trust badges — confirm all claims are accurate before launch -->
  <div class="trust-badges">
    <div class="trust-badge"><span class="trust-badge-icon">✓</span> Verified by PEXA</div>
    <div class="trust-badge"><span class="trust-badge-icon">✓</span> QLD Law Society Compliant Contracts</div>
    <div class="trust-badge"><span class="trust-badge-icon">✓</span> 256-bit Encrypted Data</div>
    <div class="trust-badge"><span class="trust-badge-icon">✓</span> REIQ-Reviewed Process</div>
  </div>

  <!-- Cumulative stat — replace with real figure before launch -->
  <div class="trust-cumulative">
    <span class="trust-cumulative-val">$2.4M</span>
    <p class="trust-cumulative-label">Saved by Queensland sellers on DEED</p>
  </div>
</section>
```

- [ ] **Step 3: Add trust card reveal JS**

In the `<script>` block, add:

```javascript
/* ── TRUST CARDS REVEAL ─────────────────── */
const trustObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.querySelectorAll('.trust-card').forEach(card => {
        card.classList.add('visible');
      });
      trustObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.2 });

const trustSection = document.getElementById('trust-section');
if (trustSection) trustObserver.observe(trustSection);
```

- [ ] **Step 4: Verify in browser**

Scroll to the trust section. Background should be `#EEE9E1` — warmer and slightly darker than the how-it-works section. Three white cards with blue left borders fade in on scroll. Trust badges in a row below. Large cumulative stat at the bottom.

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat: add trust/social proof section — testimonials, badges, cumulative stat"
```

---

## Task 7: Rewrite Final CTA + footer, remove waitlist form

**Files:**
- Modify: `index.html` — replace waitlist CSS with final CTA CSS
- Modify: `index.html` — replace `<!-- WAITLIST FORM -->` HTML with final CTA + footer

**Context:** Waitlist form is replaced entirely. Dark panel returns to `#0a0a0a` — cinematic bookend to the hero. Mirrors hero headline structure and CTAs. Subtle parallax silhouette background.

- [ ] **Step 1: Replace waitlist CSS with final CTA CSS**

Find `/* ── WAITLIST FORM ──` block and replace everything through the last `.form-success-dark p` rule with:

```css
/* ── FINAL CTA ──────────────────────────── */
.cta-section {
  background: #0a0a0a;
  padding: 10rem 3rem;
  text-align: center;
  position: relative;
  overflow: hidden;
}
.cta-parallax-bg {
  position: absolute;
  inset: -10%;
  background-image: url('https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1600&q=40');
  background-size: cover;
  background-position: center;
  opacity: 0.04;
  will-change: transform;
  pointer-events: none;
}
.cta-inner {
  position: relative;
  z-index: 2;
  max-width: 700px;
  margin: 0 auto;
  animation: fadeUp 0.8s ease forwards;
  opacity: 0;
}
.cta-eyebrow {
  font-size: 0.68rem;
  font-weight: 500;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--blue);
  margin-bottom: 1.5rem;
}
.cta-headline {
  font-family: var(--font-display);
  font-size: clamp(3rem, 6vw, 5.5rem);
  letter-spacing: 0.02em;
  line-height: 1;
  color: var(--dark-text);
  margin-bottom: 1.25rem;
}
.cta-sub {
  font-size: 1rem;
  font-weight: 300;
  color: var(--dark-muted);
  margin-bottom: 2.5rem;
}
.cta-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 1.5rem;
}
.cta-note {
  font-size: 0.72rem;
  color: var(--dark-dim);
  letter-spacing: 0.04em;
}

/* ── FOOTER ─────────────────────────────── */
.footer {
  background: #0a0a0a;
  border-top: 1px solid var(--dark-border);
  padding: 1.75rem 3rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  flex-wrap: wrap;
}
.footer-logo {
  font-family: var(--font-display);
  font-size: 1.1rem;
  letter-spacing: 0.1em;
  color: var(--dark-muted);
  text-decoration: none;
}
.footer-links {
  display: flex;
  gap: 1.5rem;
  list-style: none;
}
.footer-links a {
  font-size: 0.72rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--dark-dim);
  text-decoration: none;
  transition: color var(--trans-fast);
}
.footer-links a:hover { color: var(--dark-muted); }
.footer-legal {
  font-size: 0.68rem;
  color: var(--dark-dim);
}
```

- [ ] **Step 2: Replace waitlist HTML with final CTA + footer**

Find `<!-- WAITLIST FORM -->` through the end of `</body>` (before `</html>`) and replace the section with:

```html
<!-- FINAL CTA -->
<section class="cta-section" id="cta-section">
  <div class="cta-parallax-bg" id="cta-parallax-bg"></div>
  <div class="cta-inner">
    <p class="cta-eyebrow">Start Today</p>
    <h2 class="cta-headline">YOUR PROPERTY.<br/>YOUR TERMS.<br/>YOUR $20,000.</h2>
    <p class="cta-sub">List in under 10 minutes. No agent required.</p>
    <div class="cta-actions">
      <a href="sell.html" class="btn btn-blue btn-lg">List your property →</a>
      <a href="browse.html" class="btn btn-blue-outline btn-lg">Browse homes</a>
    </div>
    <p class="cta-note">No upfront cost to browse. $999 flat fee to list — no commission.</p>
  </div>
</section>

<!-- FOOTER -->
<footer class="footer">
  <a href="index.html" class="footer-logo">DEED</a>
  <ul class="footer-links">
    <li><a href="browse.html">Browse</a></li>
    <li><a href="sell.html">Sell</a></li>
    <li><a href="qualify.html">Pre-qualify</a></li>
    <li><a href="dashboard.html">Dashboard</a></li>
  </ul>
  <p class="footer-legal">© 2026 DEED. Queensland private property sales.</p>
</footer>
```

- [ ] **Step 3: Verify in browser**

Scroll to the bottom. Should see full-width dark section with blue eyebrow, large display headline, two blue CTAs mirroring the hero, and a small reassurance note. Footer strip beneath with logo left, nav centre, legal right.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: add final CTA section and footer, remove waitlist form"
```

---

## Task 8: Add parallax JS for hero and CTA

**Files:**
- Modify: `index.html` — `<script>` block

**Context:** Hero parallax background (`#hero-parallax-bg`) and CTA background (`#cta-parallax-bg`) move at 40% and 30% of scroll speed respectively, creating depth. Uses `requestAnimationFrame` for performance. Only runs above 900px viewport width (disabled on mobile to avoid performance issues).

- [ ] **Step 1: Add parallax JS**

In the `<script>` block, add before the closing `</script>`:

```javascript
/* ── PARALLAX ───────────────────────────── */
const heroBg  = document.getElementById('hero-parallax-bg');
const ctaBg   = document.getElementById('cta-parallax-bg');
const ctaSection = document.getElementById('cta-section');

let ticking = false;

function updateParallax() {
  if (window.innerWidth < 900) return;
  const scrollY = window.scrollY;

  if (heroBg) {
    heroBg.style.transform = `translateY(${scrollY * 0.4}px)`;
  }

  if (ctaBg && ctaSection) {
    const ctaTop = ctaSection.offsetTop;
    const ctaScroll = scrollY - ctaTop;
    if (ctaScroll > -window.innerHeight && ctaScroll < ctaSection.offsetHeight) {
      ctaBg.style.transform = `translateY(${ctaScroll * 0.3}px)`;
    }
  }

  ticking = false;
}

window.addEventListener('scroll', () => {
  if (!ticking) {
    requestAnimationFrame(updateParallax);
    ticking = true;
  }
}, { passive: true });

// Initial call
updateParallax();
```

- [ ] **Step 2: Verify in browser**

Open the page on a desktop viewport (>900px). Scroll slowly through the hero — the background photo should move more slowly than the content, creating depth. Scroll to the final CTA — the faint silhouette should also shift at a slower rate.

On a narrow viewport (<900px), both backgrounds should be static.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add RAF-based parallax for hero and final CTA backgrounds"
```

---

## Task 9: CTA section fade-up reveal + responsive pass

**Files:**
- Modify: `index.html` — `<script>` block (CTA reveal observer)
- Modify: `index.html` — `@media` rules in `<style>` block

**Context:** The CTA inner content uses CSS `animation: fadeUp` with `opacity: 0` initial state. It fires immediately on load since the section is at the bottom — add an IntersectionObserver to trigger the animation only when the section scrolls into view. Then do the full mobile responsive pass.

- [ ] **Step 1: Fix CTA animation — make it scroll-triggered**

The `.cta-inner` currently has `animation: fadeUp 0.8s ease forwards` which fires immediately. Change it in the CSS to:

```css
.cta-inner {
  position: relative;
  z-index: 2;
  max-width: 700px;
  margin: 0 auto;
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.8s ease, transform 0.8s ease;
}
.cta-inner.visible {
  opacity: 1;
  transform: translateY(0);
}
```

Remove the `animation: fadeUp` line from `.cta-inner`.

- [ ] **Step 2: Add CTA observer JS**

In the `<script>` block, add:

```javascript
/* ── CTA REVEAL ─────────────────────────── */
const ctaObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      ctaObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.3 });

const ctaInner = document.querySelector('.cta-inner');
if (ctaInner) ctaObserver.observe(ctaInner);
```

- [ ] **Step 3: Replace the `@media` responsive block**

Find `/* ── RESPONSIVE ──` block and replace all media query rules with:

```css
/* ── RESPONSIVE ────────────────────────── */
@media (max-width: 900px) {
  /* Hero */
  .hero { padding: 7rem 1.5rem 5rem; }
  .hero-cards { display: none; }
  .hero-micro-stats { gap: 1.25rem; }
  .scroll-hint { display: none; }

  /* Stats strip */
  .stats-strip { padding: 2rem 1.5rem; }
  .stats-strip-inner { grid-template-columns: repeat(2, 1fr); gap: 2rem; }
  .strip-item { padding: 0; border-right: none; }

  /* How it works */
  .how-section { padding: 5rem 1.5rem; }
  .how-timeline::before { display: none; }
  .how-step {
    grid-template-columns: 1fr;
    text-align: left;
  }
  .how-step-node { display: none; }
  .how-step-spacer { display: none; }
  .how-step:nth-child(odd)  .how-step-content,
  .how-step:nth-child(even) .how-step-content {
    grid-column: 1;
    text-align: left;
    padding: 0;
  }
  .how-step:nth-child(odd)  .how-step-body,
  .how-step:nth-child(even) .how-step-body { margin: 0; }

  /* Why no agent */
  .agent-section { padding: 5rem 1.5rem; }
  .agent-grid { grid-template-columns: 1fr; gap: 3rem; }
  .compare-table { overflow-x: auto; display: block; }

  /* Trust */
  .trust-section { padding: 5rem 1.5rem; }
  .trust-cards { grid-template-columns: 1fr; }
  .trust-badges { gap: 1.5rem; }

  /* Final CTA */
  .cta-section { padding: 6rem 1.5rem; }

  /* Footer */
  .footer { flex-direction: column; text-align: center; gap: 1rem; }
}

@media (max-width: 480px) {
  .hero { padding: 6rem 1rem 4rem; }
  .hero-headline { font-size: clamp(2.8rem, 10vw, 4rem); }
  .hero-micro-stats { flex-direction: column; gap: 1rem; align-items: flex-start; margin: 0; }
  .hero-micro-divider { width: 2.5rem; height: 1px; }
  .stats-strip-inner { grid-template-columns: repeat(2, 1fr); }
  .how-section, .agent-section, .trust-section { padding: 4rem 1rem; }
  .cta-section { padding: 5rem 1rem; }
  .footer { padding: 1.5rem 1rem; }
  .footer-links { flex-wrap: wrap; justify-content: center; gap: 1rem; }
}
```

- [ ] **Step 4: Verify full scroll on desktop and mobile**

Desktop: scroll from top to bottom — hero → stats (count-up) → how it works (alternating, reveals) → why no agent (table stagger) → trust (card reveals) → final CTA (fadeUp on entry). Parallax active on hero and CTA backgrounds.

Mobile (resize to 375px): floating hero cards hidden. Stats 2×2. How It Works straight vertical. Comparison table scrolls horizontally. Testimonials single column. CTA stacks vertically. Footer single column.

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat: fix CTA scroll reveal and complete mobile responsive pass"
```

---

## Task 10: Final polish — remove dead CSS, smoke test

**Files:**
- Modify: `index.html` — remove unused CSS rules

**Context:** With the waitlist form, commission calculator, and stamp removed, there are leftover CSS classes that no longer exist in the HTML. Clean these out to reduce file size and prevent confusion. Then do a final smoke test across all sections.

- [ ] **Step 1: Identify and remove dead CSS**

Search the `<style>` block for these class names — if they appear in CSS but not in the `<body>`, delete their rules:

- `.hero-stamp` — removed
- `.waitlist-*` — all waitlist rules
- `.promise-*` — promise list rules
- `.form-success-dark` — waitlist success state
- `.form-note-dark` — waitlist form note
- `.field-row` — waitlist field row
- `.calc-*` — all calculator rules (should already be replaced in Task 6, double-check)

- [ ] **Step 2: Verify no broken references**

Open browser DevTools console. Reload the page. Confirm zero JS errors. Confirm no `querySelector` null errors (all `getElementById` calls are guarded with `if (el)` checks from previous tasks).

- [ ] **Step 3: Check all CTA links work**

- `List your property →` → goes to `sell.html` ✓
- `Browse homes` → goes to `browse.html` ✓
- Nav `Get pre-qualified` → goes to `qualify.html` ✓
- Footer links → all resolve correctly ✓

- [ ] **Step 4: Final commit**

```bash
git add index.html
git commit -m "chore: remove dead CSS from replaced sections, smoke test complete"
```

---

## Completion Checklist

- [ ] Blue accent tokens defined, no gold references in page-specific styles
- [ ] Hero: dual-audience headline, parallax bg, floating cards, micro-stats, blue CTAs
- [ ] Stats strip: charcoal bg, count-up animation fires once on scroll
- [ ] How It Works: dark-to-light transition, alternating timeline, scroll reveals
- [ ] Why No Agent: aspirational prose + blue-accented comparison table
- [ ] Trust: testimonial cards with blue border, trust badges, cumulative stat
- [ ] Final CTA: dark panel, mirrors hero, scroll-triggered fadeUp
- [ ] Parallax: hero + CTA backgrounds, RAF-based, disabled on mobile
- [ ] Responsive: 900px and 480px breakpoints verified
- [ ] No JS console errors
- [ ] All links functional
- [ ] Content notes: placeholder testimonials, trust badges, and stats flagged for real data
