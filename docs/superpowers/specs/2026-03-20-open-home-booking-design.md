# Open Home Booking — Design Spec
**Date:** 2026-03-20
**Project:** DEED — Private Property Sales Platform
**Scope:** listing.html open home inspection booking feature

---

## Overview

Buyers on a listing page can register for an open home inspection without leaving the page. A "Book an inspection" button in the sidebar opens a 3-screen modal: slot selection → contact form → success. A Supabase row is written and two emails fire (buyer confirmation, seller notification).

---

## Architecture

### 1. listing.html changes

**Button:** Add "Book an inspection →" as a third CTA in `.cta-area`, below the existing "Get pre-qualified" outline button. Uses existing `btn btn-outline btn-lg` styling with a calendar icon prefix.

**Modal HTML:** Single modal element appended to `<body>`. Three screens managed by toggling a `data-screen` attribute on the modal container. Overlay backdrop on click closes the modal (unless submission is in progress).

**Hardcoded demo slots (JS constant):**
```js
const OPEN_HOME_SLOTS = [
  { id: 'sat-1', label: 'Saturday 21 March', time: '10:00 – 10:30am' },
  { id: 'sun-1', label: 'Sunday 22 March',   time: '1:00 – 1:30pm'  },
];
```
These are defined in a `const` at the top of the listing script block, making them easy to replace with a Supabase fetch in a future iteration.

**JS responsibilities:**
- Render slot cards dynamically from `OPEN_HOME_SLOTS`
- Track selected slot in module-scoped `let selectedSlot = null`
- On slot card click: mark selected, advance to screen 2
- On form submit: POST to `/api/book-inspection`, show spinner, handle success/error
- On success: advance to screen 3
- On error: show inline error message, re-enable form

### 2. API endpoint — `api/book-inspection.js`

**Method:** POST

**Input (JSON body):**
```json
{
  "listing_id": "demo",
  "slot_id": "sat-1",
  "slot_label": "Saturday 21 March, 10:00–10:30am",
  "name": "Jane Buyer",
  "email": "jane@example.com",
  "phone": "0412 345 678"
}
```

**Validation:**
- All five fields required; reject with 400 if any missing
- Email format check (regex)
- Phone: strip spaces, must be 10 digits starting with 0 or +61

**Supabase write:**
Insert row into `open_home_bookings`. Use `SUPABASE_SERVICE_KEY` env var (same key used elsewhere in the project).

**Resend emails:**
1. **Buyer confirmation** — subject: "You're booked in · 14 Headland Drive, Burleigh Heads"
   - Slot time and date
   - Property address
   - Parking note: "Street parking available on Headland Drive"
   - Note: seller contact details will be sent the morning of your inspection
2. **Seller notification** — subject: "New inspection booking · [slot label]"
   - Buyer name, email, phone
   - Slot they selected

Seller email address hardcoded as env var `SELLER_EMAIL` for the demo. In production, pulled from the listing record.

**Response:**
- `200 { success: true }` on success
- `400 { error: "..." }` on validation failure
- `500 { error: "Booking failed" }` on Supabase/Resend error

### 3. Supabase table — `open_home_bookings`

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

No RLS required for demo. In production: sellers can read bookings for their own listings only.

---

## Modal Screens

### Screen 1 — Slot picker
- Header: "Book an inspection" + close button
- Subheading: "14 Headland Drive, Burleigh Heads"
- Two slot cards side by side (flex row, equal width)
  - Each card: day label (large), time (small), calendar icon
  - Selected state: gold border + gold text
- Clicking a slot immediately advances to screen 2 (no separate "next" button)

### Screen 2 — Contact form
- Header: "Your details" + back chevron (returns to screen 1, preserves slot selection) + close button
- Selected slot shown as a small recap pill at top: "📅 Sat 21 March · 10:00–10:30am"
- Fields: Full name, Email address, Mobile number (all required)
- Submit button: "Confirm booking →" (full width, gold)
- Loading state: button becomes spinner + "Booking…" text, fields disabled
- Error state: red inline message below form, button re-enabled

### Screen 3 — Success
- Large checkmark (green)
- Heading: "You're booked in"
- Recap: slot label + property address
- Body: "A confirmation has been sent to [email]. We'll be in touch the morning of your inspection with seller contact details."
- Close button: "Done"

---

## Error Handling

| Scenario | Behaviour |
|---|---|
| Network error on submit | Inline error: "Something went wrong. Please try again." |
| Validation error from API | Show specific message from API response |
| Resend email fails | Booking is still written to Supabase; API returns 200. Email failure is logged server-side but does not block the buyer. |
| Slot no longer available | Not enforced for demo (no capacity limits). Future: add `max_capacity` per slot and reject if full. |

---

## Out of Scope (This Iteration)

- Seller configuring open home times during listing creation
- Capacity limits per slot
- Cancellation or rescheduling
- Calendar invite (.ics) attachment in confirmation email
- Seller dashboard view of bookings

---

## Testing

- Submit with all fields valid → row appears in Supabase, both emails received
- Submit with missing field → inline validation error, no API call made
- Submit with invalid email → inline validation error
- Close modal mid-flow → state resets (selected slot cleared, form cleared) on next open
- Network failure simulation → error message shown, form re-enabled
