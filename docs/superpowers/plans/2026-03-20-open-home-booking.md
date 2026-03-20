# Open Home Booking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add open home inspection booking to listing.html — a sidebar button opens a 3-screen modal (slot picker → contact form → success), writes a Supabase row, and fires confirmation emails to buyer and seller.

**Architecture:** "Book an inspection" button in sidebar opens a modal managed by `data-screen` attribute. JS handles all state. POSTs to `/api/book-inspection` which validates, inserts to Supabase, and sends two Resend emails.

**Tech Stack:** Vanilla JS, HTML/CSS (no framework), Vercel serverless functions (Node.js CommonJS), `@supabase/supabase-js` (already in dependencies), Resend email API (already used in `api/notify.js`)

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `api/book-inspection.js` | **Create** | Validate input, insert to Supabase, send emails |
| `listing.html` | **Modify** | Button, modal HTML, modal CSS, modal JS |

No new dependencies required — `@supabase/supabase-js` is already installed.

---

## Task 1: Create Supabase table

**Files:**
- No files — run SQL in Supabase dashboard

- [ ] **Step 1: Open Supabase SQL editor**

Go to https://supabase.com/dashboard → project `jtpykhrdjkzhcbswrhzo` → SQL Editor → New query.

- [ ] **Step 2: Run table creation SQL**

```sql
create table open_home_bookings (
  id           uuid primary key default gen_random_uuid(),
  listing_id   text not null,
  slot_id      text not null,
  slot_label   text not null,
  name         text not null,
  email        text not null,
  phone        text not null,
  created_at   timestamptz default now()
);
```

- [ ] **Step 3: Verify table exists**

In Supabase → Table Editor → confirm `open_home_bookings` appears with all 8 columns.

---

## Task 2: Create `api/book-inspection.js`

**Files:**
- Create: `api/book-inspection.js`

- [ ] **Step 1: Create the file with validation and Supabase insert**

```js
// DEED — Open home inspection booking handler
// POST /api/book-inspection
// Requires: SUPABASE_SERVICE_KEY, RESEND_API_KEY, SELLER_EMAIL env vars

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://jtpykhrdjkzhcbswrhzo.supabase.co';
const RESEND_API   = 'https://api.resend.com/emails';
const PROPERTY_ADDRESS = '14 Headland Drive, Burleigh Heads QLD 4220'; // hardcoded for demo

// ─── Validation ──────────────────────────────────────────────────────────────

function validateInput({ listing_id, slot_id, slot_label, name, email, phone }) {
  if (!listing_id || !slot_id || !slot_label || !name || !email || !phone) {
    return 'All fields are required.';
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'Please enter a valid email address.';
  }
  const cleanPhone = phone.replace(/[\s\-]/g, '');
  if (!/^(0\d{9}|\+61\d{9})$/.test(cleanPhone)) {
    return 'Please enter a valid Australian mobile number (e.g. 0412 345 678).';
  }
  return null; // valid
}

// ─── Email helpers ───────────────────────────────────────────────────────────

async function sendEmail({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('RESEND_API_KEY not set — email skipped');
    return;
  }
  const from = process.env.DEED_FROM_EMAIL || 'DEED <onboarding@resend.dev>';
  // Route to dev override email until domain is verified (matches pattern in notify.js)
  const devOverride = process.env.DEED_DEV_EMAIL || 'ed@noys.co';
  const recipient   = process.env.DEED_DOMAIN_VERIFIED ? to : devOverride;

  const res = await fetch(RESEND_API, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: recipient, subject, html }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Resend error');
}

function buyerEmail({ name, email, slot_label }) {
  return {
    to: email,
    subject: `You're booked in · 14 Headland Drive, Burleigh Heads`,
    html: `
<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f8f7f5;font-family:Arial,sans-serif;">
  <div style="max-width:520px;margin:2rem auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
    <div style="background:#0b0b0b;padding:1.5rem 2rem;">
      <span style="font-family:Georgia,serif;font-size:1.3rem;letter-spacing:0.14em;color:#ede8df;">DEED</span>
    </div>
    <div style="padding:2rem;">
      <h2 style="margin:0 0 0.5rem;font-size:1.3rem;color:#0b0b0b;">You're booked in, ${name.split(' ')[0]}.</h2>
      <p style="margin:0 0 1.5rem;color:#666;font-size:0.9rem;">Here are your inspection details.</p>

      <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:1.25rem 1.5rem;margin-bottom:1.5rem;">
        <p style="margin:0 0 0.25rem;font-size:0.7rem;letter-spacing:0.12em;text-transform:uppercase;color:#92400e;">Your inspection</p>
        <p style="margin:0;font-size:1rem;font-weight:600;color:#78350f;">📅 ${slot_label}</p>
      </div>

      <table style="width:100%;border-collapse:collapse;margin-bottom:1.5rem;">
        <tr><td style="padding:0.6rem 0;border-bottom:1px solid #f0ece6;color:#999;font-size:0.85rem;width:40%;">Property</td><td style="padding:0.6rem 0;border-bottom:1px solid #f0ece6;font-size:0.85rem;color:#0b0b0b;">${PROPERTY_ADDRESS}</td></tr>
        <tr><td style="padding:0.6rem 0;color:#999;font-size:0.85rem;">Parking</td><td style="padding:0.6rem 0;font-size:0.85rem;color:#0b0b0b;">Street parking on Headland Drive</td></tr>
      </table>

      <p style="font-size:0.82rem;color:#666;line-height:1.6;margin:0;">We'll send you the seller's contact details the morning of your inspection. If you have any questions, reply to this email.</p>
    </div>
    <div style="padding:1rem 2rem;border-top:1px solid #f0ece6;font-size:0.75rem;color:#999;">No agent. No commission. Private sale via DEED.</div>
  </div>
</body></html>`,
  };
}

function sellerEmail({ name, email, phone, slot_label }) {
  const sellerTo = process.env.SELLER_EMAIL || process.env.DEED_DEV_EMAIL || 'ed@noys.co';
  return {
    to: sellerTo,
    subject: `New inspection booking · ${slot_label}`,
    html: `
<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f8f7f5;font-family:Arial,sans-serif;">
  <div style="max-width:520px;margin:2rem auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
    <div style="background:#0b0b0b;padding:1.5rem 2rem;">
      <span style="font-family:Georgia,serif;font-size:1.3rem;letter-spacing:0.14em;color:#ede8df;">DEED</span>
    </div>
    <div style="padding:2rem;">
      <h2 style="margin:0 0 0.5rem;font-size:1.2rem;color:#0b0b0b;">New inspection booking</h2>
      <p style="margin:0 0 1.5rem;color:#666;font-size:0.9rem;">A buyer has registered for your open home.</p>

      <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:1.25rem 1.5rem;margin-bottom:1.5rem;">
        <p style="margin:0 0 0.25rem;font-size:0.7rem;letter-spacing:0.12em;text-transform:uppercase;color:#92400e;">Slot</p>
        <p style="margin:0;font-size:1rem;font-weight:600;color:#78350f;">📅 ${slot_label}</p>
      </div>

      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:0.6rem 0;border-bottom:1px solid #f0ece6;color:#999;font-size:0.85rem;width:30%;">Name</td><td style="padding:0.6rem 0;border-bottom:1px solid #f0ece6;font-size:0.85rem;color:#0b0b0b;">${name}</td></tr>
        <tr><td style="padding:0.6rem 0;border-bottom:1px solid #f0ece6;color:#999;font-size:0.85rem;">Email</td><td style="padding:0.6rem 0;border-bottom:1px solid #f0ece6;font-size:0.85rem;color:#0b0b0b;"><a href="mailto:${email}" style="color:#b45309;">${email}</a></td></tr>
        <tr><td style="padding:0.6rem 0;color:#999;font-size:0.85rem;">Mobile</td><td style="padding:0.6rem 0;font-size:0.85rem;color:#0b0b0b;"><a href="tel:${phone}" style="color:#b45309;">${phone}</a></td></tr>
      </table>
    </div>
  </div>
</body></html>`,
  };
}

// ─── Handler ─────────────────────────────────────────────────────────────────

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { listing_id, slot_id, slot_label, name, email, phone } = req.body || {};

  const validationError = validateInput({ listing_id, slot_id, slot_label, name, email, phone });
  if (validationError) return res.status(400).json({ error: validationError });

  try {
    // 1. Write booking to Supabase
    const sb = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    const { error: dbError } = await sb
      .from('open_home_bookings')
      .insert({ listing_id, slot_id, slot_label, name, email, phone });

    if (dbError) {
      console.error('Supabase insert error:', dbError.message);
      return res.status(500).json({ error: 'Booking failed. Please try again.' });
    }

    // 2. Send emails (failures are logged but do not block the 200 response)
    try {
      await Promise.all([
        sendEmail(buyerEmail({ name, email, slot_label })),
        sendEmail(sellerEmail({ name, email, phone, slot_label })),
      ]);
    } catch (emailError) {
      console.error('Email send error:', emailError.message);
      // Booking is saved — email failure is non-fatal for demo
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('book-inspection error:', err.message);
    return res.status(500).json({ error: 'Booking failed. Please try again.' });
  }
};
```

- [ ] **Step 2: Start local dev server and test validation with curl**

First, start the local dev server (leave it running for Steps 2–3):

```bash
cd /Users/edsteward/deed
npx vercel dev
# Leave this running. Server is ready when you see "Ready" on port 3000.
```

Then in a second terminal, run these curl commands. Each should return a 400 with an error message:

```bash
# Missing field test
curl -s -X POST http://localhost:3000/api/book-inspection \
  -H "Content-Type: application/json" \
  -d '{"listing_id":"demo","slot_id":"sat-1","slot_label":"Saturday 21 March","name":"Test","email":""}' \
  | cat
# Expected: {"error":"All fields are required."}

# Invalid email test
curl -s -X POST http://localhost:3000/api/book-inspection \
  -H "Content-Type: application/json" \
  -d '{"listing_id":"demo","slot_id":"sat-1","slot_label":"Sat","name":"Test","email":"notanemail","phone":"0412345678"}' \
  | cat
# Expected: {"error":"Please enter a valid email address."}

# Invalid phone test
curl -s -X POST http://localhost:3000/api/book-inspection \
  -H "Content-Type: application/json" \
  -d '{"listing_id":"demo","slot_id":"sat-1","slot_label":"Sat","name":"Test","email":"a@b.com","phone":"12345"}' \
  | cat
# Expected: {"error":"Please enter a valid Australian mobile number..."}
```

> To run locally: `npx vercel dev` from the `deed/` directory (requires Vercel CLI).

- [ ] **Step 3: Test valid submission with curl**

```bash
curl -s -X POST http://localhost:3000/api/book-inspection \
  -H "Content-Type: application/json" \
  -d '{
    "listing_id": "demo",
    "slot_id": "sat-1",
    "slot_label": "Saturday 21 March · 10:00–10:30am",
    "name": "Test Buyer",
    "email": "test@example.com",
    "phone": "0412345678"
  }' | cat
# Expected: {"success":true}
```

Then verify in Supabase Table Editor → `open_home_bookings` → row appears.

- [ ] **Step 4: Commit**

```bash
git add api/book-inspection.js
git commit -m "feat: add book-inspection API endpoint with Supabase insert and Resend emails"
```

---

## Task 3: Add modal CSS to listing.html

**Files:**
- Modify: `listing.html` (inside the `<style>` block, before `</style>`)

- [ ] **Step 1: Add modal CSS**

Inside the `<style>` block in `listing.html`, add before the closing `</style>` tag:

```css
/* ── BOOKING MODAL ─────────────────────────────── */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(11,11,11,0.7);
  backdrop-filter: blur(4px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease;
}
.modal-backdrop.open {
  opacity: 1;
  pointer-events: all;
}

.modal {
  background: var(--light-surface);
  border: 1px solid var(--light-border);
  border-radius: var(--radius-lg);
  width: 100%;
  max-width: 440px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
  transform: translateY(8px);
  transition: transform 0.2s ease;
  overflow: hidden;
}
.modal-backdrop.open .modal {
  transform: translateY(0);
}

.modal-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--light-border);
}
.modal-back {
  background: none;
  border: none;
  font-size: 1.1rem;
  color: var(--light-muted);
  cursor: pointer;
  padding: 0;
  line-height: 1;
  display: none;
}
.modal-back.visible { display: block; }
.modal-title {
  flex: 1;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--light-text);
}
.modal-subtitle {
  font-size: 0.75rem;
  color: var(--light-muted);
}
.modal-close {
  background: none;
  border: none;
  font-size: 1.2rem;
  color: var(--light-muted);
  cursor: pointer;
  padding: 0;
  line-height: 1;
  margin-left: auto;
}
.modal-close:hover { color: var(--light-text); }

.modal-body { padding: 1.5rem; }

/* Slot cards */
.slot-grid {
  display: flex;
  gap: 0.75rem;
}
.slot-card {
  flex: 1;
  border: 1px solid var(--light-border);
  border-radius: var(--radius);
  padding: 1rem;
  cursor: pointer;
  transition: border-color var(--trans-fast), background var(--trans-fast);
  text-align: center;
}
.slot-card:hover { border-color: var(--light-border-2); }
.slot-card.selected {
  border-color: var(--gold);
  background: var(--gold-pale);
}
.slot-icon { font-size: 1.25rem; margin-bottom: 0.5rem; }
.slot-day {
  font-size: 0.82rem;
  font-weight: 500;
  color: var(--light-text);
  margin-bottom: 0.2rem;
}
.slot-time {
  font-size: 0.72rem;
  color: var(--light-muted);
}
.slot-card.selected .slot-day { color: #92400e; }
.slot-card.selected .slot-time { color: #b45309; }

@media (max-width: 480px) {
  .slot-grid { flex-direction: column; }
}

/* Slot recap pill (screen 2) */
.slot-recap {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--gold-pale);
  border: 1px solid #fed7aa;
  border-radius: var(--radius-pill);
  padding: 0.4rem 0.9rem;
  font-size: 0.78rem;
  color: #92400e;
  margin-bottom: 1.25rem;
}

/* Form fields */
.booking-field {
  margin-bottom: 1rem;
}
.booking-field label {
  display: block;
  font-size: 0.72rem;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--light-muted);
  margin-bottom: 0.4rem;
}
.booking-field input {
  width: 100%;
  box-sizing: border-box;
  padding: 0.65rem 0.9rem;
  border: 1px solid var(--light-border);
  border-radius: var(--radius);
  font-size: 0.88rem;
  color: var(--light-text);
  background: var(--light-bg);
  transition: border-color var(--trans-fast);
  font-family: inherit;
}
.booking-field input:focus {
  outline: none;
  border-color: var(--gold);
}
.booking-field input:disabled { opacity: 0.5; }

.booking-error {
  font-size: 0.78rem;
  color: var(--red);
  margin-top: 0.75rem;
  display: none;
}
.booking-error.visible { display: block; }

/* Success screen */
.success-icon {
  font-size: 2.5rem;
  text-align: center;
  margin-bottom: 0.75rem;
}
.success-title {
  font-family: var(--font-display);
  font-size: 1.4rem;
  text-align: center;
  color: var(--light-text);
  margin-bottom: 0.25rem;
}
.success-recap {
  text-align: center;
  font-size: 0.82rem;
  font-weight: 500;
  color: var(--light-text);
  margin-bottom: 0.5rem;
}
.success-note {
  text-align: center;
  font-size: 0.78rem;
  color: var(--light-muted);
  line-height: 1.6;
  margin-bottom: 1.5rem;
}
```

- [ ] **Step 2: Commit**

```bash
git add listing.html
git commit -m "feat: add booking modal CSS to listing.html"
```

---

## Task 4: Add modal HTML and JS to listing.html

**Files:**
- Modify: `listing.html`

### 4a — Add booking button to sidebar

- [ ] **Step 1: Add button below "Get pre-qualified" in `.cta-area`**

Find this block in `listing.html`:
```html
          <a href="qualify.html" class="btn btn-outline btn-lg" style="width:100%;justify-content:center;">
            Get pre-qualified first
          </a>
```

Replace it with:
```html
          <a href="qualify.html" class="btn btn-outline btn-lg" style="width:100%;justify-content:center;">
            Get pre-qualified first
          </a>
          <button id="book-btn" class="btn btn-outline btn-lg" onclick="openBookingModal()"
            style="width:100%;justify-content:center;margin-top:0.5rem;display:none;">
            📅 Book an inspection →
          </button>
```

The button starts `display:none` and is shown by JS only when `OPEN_HOME_SLOTS` is non-empty.

### 4b — Add modal HTML

- [ ] **Step 2: Add modal HTML before `</body>`**

Find the closing `</body>` tag and insert before it:

```html
  <!-- BOOKING MODAL -->
  <div class="modal-backdrop" id="booking-modal" onclick="handleBackdropClick(event)">
    <div class="modal" role="dialog" aria-modal="true" aria-label="Book an inspection">

      <!-- Screen 1: Slot picker -->
      <div data-screen="1">
        <div class="modal-header">
          <div>
            <p class="modal-title">Book an inspection</p>
            <p class="modal-subtitle" id="modal-address-sub">14 Headland Drive, Burleigh Heads</p>
          </div>
          <button class="modal-close" onclick="closeBookingModal()" aria-label="Close">✕</button>
        </div>
        <div class="modal-body">
          <div class="slot-grid" id="slot-grid"></div>
        </div>
      </div>

      <!-- Screen 2: Contact form -->
      <div data-screen="2" style="display:none;">
        <div class="modal-header">
          <button class="modal-back visible" onclick="goBack()" aria-label="Back">←</button>
          <div>
            <p class="modal-title">Your details</p>
          </div>
          <button class="modal-close" onclick="closeBookingModal()" aria-label="Close">✕</button>
        </div>
        <div class="modal-body">
          <div class="slot-recap">📅 <span id="recap-slot-label"></span></div>
          <div class="booking-field">
            <label for="book-name">Full name</label>
            <input type="text" id="book-name" placeholder="Jane Buyer" autocomplete="name" />
          </div>
          <div class="booking-field">
            <label for="book-email">Email address</label>
            <input type="email" id="book-email" placeholder="jane@example.com" autocomplete="email" />
          </div>
          <div class="booking-field">
            <label for="book-phone">Mobile number</label>
            <input type="tel" id="book-phone" placeholder="0412 345 678" autocomplete="tel" />
          </div>
          <div class="booking-error" id="booking-error"></div>
          <button class="btn btn-gold btn-lg" id="book-submit" onclick="submitBooking()"
            style="width:100%;justify-content:center;margin-top:0.5rem;">
            Confirm booking →
          </button>
        </div>
      </div>

      <!-- Screen 3: Success -->
      <div data-screen="3" style="display:none;">
        <div class="modal-header">
          <div style="flex:1;"></div>
          <button class="modal-close" onclick="closeBookingModal()" aria-label="Close">✕</button>
        </div>
        <div class="modal-body" style="text-align:center;padding-bottom:2rem;">
          <div class="success-icon">✅</div>
          <p class="success-title">You're booked in</p>
          <p class="success-recap" id="success-slot"></p>
          <p class="success-recap" style="font-weight:400;color:var(--light-muted);font-size:0.78rem;margin-bottom:1rem;">
            14 Headland Drive, Burleigh Heads
          </p>
          <p class="success-note" id="success-note"></p>
          <button class="btn btn-outline btn-lg" onclick="closeBookingModal()"
            style="width:100%;justify-content:center;">
            Done
          </button>
        </div>
      </div>

    </div>
  </div>
```

### 4c — Add booking JS

- [ ] **Step 3: Add JS before `</body>` (after the modal HTML)**

```html
  <script>
    // ─── Open Home Booking ───────────────────────────────────────────────
    const OPEN_HOME_SLOTS = [
      { id: 'sat-1', day: 'Saturday 21 March', time: '10:00 – 10:30am', label: 'Saturday 21 March · 10:00–10:30am' },
      { id: 'sun-1', day: 'Sunday 22 March',   time: '1:00 – 1:30pm',   label: 'Sunday 22 March · 1:00–1:30pm'   },
    ];

    let selectedSlot = null;
    let bookingInProgress = false;

    // Show book button only if slots exist
    if (OPEN_HOME_SLOTS.length > 0) {
      document.getElementById('book-btn').style.display = 'flex';
    }

    // Render slot cards
    function renderSlots() {
      const grid = document.getElementById('slot-grid');
      grid.innerHTML = OPEN_HOME_SLOTS.map(slot => `
        <div class="slot-card ${selectedSlot && selectedSlot.id === slot.id ? 'selected' : ''}"
          onclick="selectSlot('${slot.id}')">
          <div class="slot-icon">🏡</div>
          <div class="slot-day">${slot.day}</div>
          <div class="slot-time">${slot.time}</div>
        </div>
      `).join('');
    }

    function selectSlot(slotId) {
      selectedSlot = OPEN_HOME_SLOTS.find(s => s.id === slotId);
      renderSlots();
      document.getElementById('recap-slot-label').textContent = selectedSlot.label;
      goToScreen(2);
    }

    function goBack() {
      renderSlots(); // re-render so selected slot stays visually highlighted
      goToScreen(1);
    }

    function goToScreen(n) {
      document.querySelectorAll('[data-screen]').forEach(el => {
        el.style.display = el.dataset.screen === String(n) ? '' : 'none';
      });
    }

    function openBookingModal() {
      selectedSlot = null;
      bookingInProgress = false;
      resetForm();
      renderSlots();
      goToScreen(1);
      document.getElementById('booking-modal').classList.add('open');
      document.body.style.overflow = 'hidden';
    }

    function closeBookingModal() {
      if (bookingInProgress) return;
      document.getElementById('booking-modal').classList.remove('open');
      document.body.style.overflow = '';
      // Reset state for next open
      setTimeout(() => {
        selectedSlot = null;
        resetForm();
        goToScreen(1);
      }, 200);
    }

    function handleBackdropClick(e) {
      if (e.target === document.getElementById('booking-modal')) {
        closeBookingModal();
      }
    }

    function resetForm() {
      ['book-name', 'book-email', 'book-phone'].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.value = ''; el.disabled = false; }
      });
      const errEl = document.getElementById('booking-error');
      if (errEl) { errEl.textContent = ''; errEl.classList.remove('visible'); }
      const btn = document.getElementById('book-submit');
      if (btn) { btn.textContent = 'Confirm booking →'; btn.disabled = false; }
    }

    function showBookingError(msg) {
      const errEl = document.getElementById('booking-error');
      errEl.textContent = msg;
      errEl.classList.add('visible');
      const btn = document.getElementById('book-submit');
      btn.textContent = 'Confirm booking →';
      btn.disabled = false;
      bookingInProgress = false;
      ['book-name', 'book-email', 'book-phone'].forEach(id => {
        document.getElementById(id).disabled = false;
      });
    }

    async function submitBooking() {
      if (bookingInProgress) return;

      const name  = document.getElementById('book-name').value.trim();
      const email = document.getElementById('book-email').value.trim();
      const phone = document.getElementById('book-phone').value.trim();

      // Client-side validation
      if (!name || !email || !phone) {
        showBookingError('Please fill in all fields.');
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showBookingError('Please enter a valid email address.');
        return;
      }
      const cleanPhone = phone.replace(/[\s\-]/g, '');
      if (!/^(0\d{9}|\+61\d{9})$/.test(cleanPhone)) {
        showBookingError('Please enter a valid Australian mobile number (e.g. 0412 345 678).');
        return;
      }

      // Start loading state
      bookingInProgress = true;
      document.getElementById('book-submit').textContent = 'Booking…';
      document.getElementById('book-submit').disabled = true;
      ['book-name', 'book-email', 'book-phone'].forEach(id => {
        document.getElementById(id).disabled = true;
      });
      document.getElementById('booking-error').classList.remove('visible');

      try {
        const res = await fetch('/api/book-inspection', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            listing_id: 'demo',
            slot_id: selectedSlot.id,
            slot_label: selectedSlot.label,
            name, email, phone,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          showBookingError(data.error || 'Something went wrong. Please try again.');
          return;
        }

        // Success
        bookingInProgress = false;
        document.getElementById('success-slot').textContent = selectedSlot.label;
        document.getElementById('success-note').textContent =
          `A confirmation has been sent to ${email}. We'll be in touch the morning of your inspection with seller contact details.`;
        goToScreen(3);

      } catch (err) {
        showBookingError('Something went wrong. Please try again.');
      }
    }
  </script>
```

- [ ] **Step 4: Commit**

```bash
git add listing.html
git commit -m "feat: add open home booking modal to listing page"
```

---

## Task 5: End-to-End Manual Test

- [ ] **Step 1: Start local dev server**

```bash
cd /Users/edsteward/deed
npx vercel dev
```

Open http://localhost:3000/listing.html

- [ ] **Step 2: Verify button appears**

Confirm "📅 Book an inspection →" button is visible below "Get pre-qualified first" in the sidebar.

- [ ] **Step 3: Test slot picker**

Click "Book an inspection →" → modal opens on screen 1 with two slot cards side by side. Click "Saturday 21 March" card → advances to screen 2, recap pill shows correct slot label.

- [ ] **Step 4: Test back button**

On screen 2, click ← back → returns to screen 1, Saturday slot still visually selected. Click "Sunday 22 March" → advances to screen 2 with Sunday in recap pill.

- [ ] **Step 5: Test validation**

On screen 2, click "Confirm booking →" with empty fields → error "Please fill in all fields." appears. Enter invalid email → correct email error. Enter "12345" as phone → correct phone error. Form re-enables after each error.

- [ ] **Step 6: Test valid submission**

Fill in: name "Test Buyer", email (your own), phone "0412 345 678". Click confirm → button shows "Booking…", then screen 3 success appears with correct slot and email address.

- [ ] **Step 7: Verify Supabase row**

In Supabase → Table Editor → `open_home_bookings` → confirm row exists with correct data.

- [ ] **Step 8: Verify emails**

Check inbox for buyer confirmation email and seller notification. Confirm slot label, address, and parking note are correct.

- [ ] **Step 9: Test backdrop close**

Open modal, click outside it → closes. Re-open → state is reset (slot picker shown, form cleared).

- [ ] **Step 10: Test empty slots**

Temporarily set `OPEN_HOME_SLOTS = []` in listing.html → confirm "Book an inspection" button does not render. Revert.

- [ ] **Step 10b: Test network failure**

In Chrome DevTools → Network tab → throttling dropdown → select "Offline". Open the modal, fill in valid details, submit. Confirm inline error "Something went wrong. Please try again." appears and the form re-enables. Switch Network back to "No throttling" before continuing.

- [ ] **Step 11: Deploy to production**

```bash
cd /Users/edsteward/deed
vercel --prod --yes
```

Confirm live at https://deed-sooty.vercel.app/listing.html
