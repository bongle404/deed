# Developer Listing Portal — Design Spec
**Date:** 2026-03-21
**Status:** Approved (v2 — post spec review)
**Project:** DEED — `~/deed/` | https://deed-sooty.vercel.app

---

## Overview

A self-serve portal for property developers to list new developments on DEED — both completed stock (unsold finished units) and off-the-plan (OTP) projects. Simultaneously, the existing $999 upfront Stripe fee model is replaced across all listings with a platform fee payable on settlement.

The developer portal is Priority 1 in the DEED build queue: getting property inventory into the platform by targeting developers with unsold stock who want a no-agent channel.

---

## Fee Model Change (All Listings)

The $999 Stripe checkout in `sell.html` is removed. All listings — private seller and developer — move to:

> **Platform technology fee, payable on settlement of sale.**

- Zero upfront cost to list
- Fee due on settlement (amount TBD — pending QLD property law legal advice on structuring as a platform fee vs agent commission)
- `sell.html` final step replaced with confirmation screen + single checkbox acknowledgement
- Legal language to be reviewed by QLD property solicitor before launch

**Note:** DEED must not use the word "commission" in any user-facing copy. All references must be "platform fee" or "technology fee".

---

## Architecture

### New Pages

| File | Purpose |
|---|---|
| `developer.html` | Combined developer registration + dashboard (single page, state-driven like `brokers.html`) |
| `project.html` | Project landing page template — served at `/projects/[slug]` via Vercel rewrite |

### Updated Pages

| File | Change |
|---|---|
| `sell.html` | Remove Stripe checkout step and Stripe CDN `<script>` tag. Replace with platform fee acknowledgement screen. |
| `browse.html` | Add developer project cards alongside private listings. Project cards link to `/projects/[slug]`. |

### API Endpoints

**Retired (Stripe removal frees 2 function slots):**
- `api/checkout.js` — delete (Stripe removed)
- `api/create-payment-intent.js` — delete (Stripe removed)

**New — consolidated into a single file to stay within Vercel Hobby 12-function limit:**
- `api/developer-api.js` — handles all developer + project operations via `?action=` param:
  - `action=register` — create developer account
  - `action=dashboard` — fetch developer profile + projects + activity
  - `action=create-project` — create new project (status: draft)
  - `action=get-project` — fetch project data by slug
  - `action=register-interest` — buyer submits EOI on OTP project
  - `action=submit-offer` — buyer submits offer on completed stock unit

**Net function change:** -2 (retired) + 1 (new) = **-1 net**. Total remains at 11, within the 12-function Hobby plan limit.

### Vercel Routing

Add to `vercel.json`:
```json
{
  "rewrites": [
    { "source": "/projects/:slug", "destination": "/project.html" }
  ]
}
```

`project.html` reads `window.location.pathname` to extract slug, then calls `api/developer-api.js?action=get-project&slug=[slug]`.

---

## New DB Tables

```sql
-- Developers
CREATE TABLE developers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_user_id uuid REFERENCES auth.users(id), -- links Supabase auth session to developer record
  name text NOT NULL,
  company text NOT NULL,
  email text NOT NULL UNIQUE,
  phone text,
  project_types text[], -- ['completed', 'otp', 'both']
  status text DEFAULT 'pending', -- pending | approved | active
  created_at timestamptz DEFAULT now()
);

-- Projects
CREATE TABLE projects (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  developer_id uuid REFERENCES developers(id),
  slug text NOT NULL UNIQUE, -- generated from project name, collision-safe (appends -2, -3 etc)
  name text NOT NULL,
  type text NOT NULL, -- 'completed' | 'otp'
  suburb text NOT NULL,
  price_from integer NOT NULL,
  total_units integer NOT NULL,
  units_available integer NOT NULL, -- manually maintained by developer via Edit form (v1 limitation — no auto-sync)
  completion_date text, -- OTP only, free text (e.g. "Q4 2027")
  description text,
  renders text[] DEFAULT '{}',
  floor_plans text[] DEFAULT '{}',
  status text DEFAULT 'draft', -- draft | live | sold_out
  created_at timestamptz DEFAULT now()
);

-- Units (completed stock only — enables per-unit grid and offer tracking)
CREATE TABLE units (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid REFERENCES projects(id),
  unit_number text NOT NULL, -- e.g. "12", "3B", "Lot 7"
  beds integer,
  baths integer,
  car_spaces integer,
  size_sqm numeric,
  price integer NOT NULL,
  status text DEFAULT 'available', -- available | under_offer | sold
  created_at timestamptz DEFAULT now()
);

-- EOI registrations (OTP projects — intentionally low friction, no DEED account required)
CREATE TABLE project_interests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid REFERENCES projects(id),
  buyer_id uuid REFERENCES buyers(id), -- nullable (unverified registrants allowed)
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  created_at timestamptz DEFAULT now()
);

-- Unit offers (completed stock — inline flow on project.html, not offer.html)
CREATE TABLE unit_offers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_id uuid REFERENCES units(id),
  project_id uuid REFERENCES projects(id),
  buyer_name text NOT NULL,
  buyer_email text NOT NULL,
  offer_price integer NOT NULL,
  settlement_days integer,
  deposit_percent numeric,
  message text,
  status text DEFAULT 'pending', -- pending | accepted | declined
  created_at timestamptz DEFAULT now()
);
```

**Note on `units_available`:** This is a manually maintained integer. The developer updates it via the Edit form in their dashboard. It will not auto-sync with `units.status`. This is an accepted v1 limitation — document this clearly in the dashboard UI.

---

## Developer Authentication

**Registration flow:**
1. Developer submits registration form → `api/developer-api.js?action=register`
2. The API calls `supabase.auth.admin.inviteUserByEmail(email)` — this returns the created auth user object including `user.id`
3. Inserts a row into `developers` table with `status: 'pending'` and `auth_user_id = user.id` (populated immediately at registration from the invite response — not deferred to first login)
4. `action=dashboard` always queries by `auth_user_id = user.id` — guaranteed to be set from step 3

**Approval flow:**
1. Ed sets `status = 'approved'` in the Supabase dashboard
2. Ed manually sends the developer a magic link from the Supabase Auth dashboard (Auth → Users → [developer] → Send magic link)
3. This is the v1 approval process — no admin UI or automated trigger needed

**Login:**
- Developer clicks magic link → redirects to `developer.html`
- JS calls `supabase.auth.getUser()` to get the session
- Dashboard fetches developer record by matching `auth_user_id = user.id` via `api/developer-api.js?action=dashboard`

---

## Developer Flow

### Registration (developer.html — unauthenticated state)

1. Form: name, company, email, phone, project type (completed stock / OTP / both)
2. Submit → `api/developer-api.js?action=register`
   - Calls `supabase.auth.admin.inviteUserByEmail()`
   - Inserts into `developers` (status: `pending`)
   - Sends notification email to Ed via Resend
3. Developer sees: "Account under review — we'll be in touch within 24 hours"

### Approval

Ed sets `status = 'approved'` in Supabase dashboard, then manually sends magic link from Auth → Users. Developer receives link, clicks it, lands on `developer.html` in dashboard mode.

### Project Creation (developer.html — authenticated state)

1. Developer clicks "Add Project"
2. Form: project name, suburb, type (completed/OTP), price from, total units, description, completion date (OTP only)
3. For completed stock: developer also enters unit inventory (unit number, beds, baths, car, size, price) — can add multiple units
4. Upload: hero image + renders (reuses `api/upload-photo.js`), floor plans (image or PDF)
5. Submit → `api/developer-api.js?action=create-project`
   - Creates project row (status: `draft`)
   - Generates slug from project name (e.g. "Azure Residences" → `azure-residences`, checks for collision, appends `-2` etc)
   - Creates unit rows if completed stock
6. Project appears in dashboard as **Draft**
7. Developer clicks "Submit for Review" → Ed sets `status = 'live'` in Supabase → project page live at `/projects/[slug]`

---

## Project Page (`/projects/[slug]`)

Loaded by `project.html` — reads slug from `window.location.pathname`, calls `api/developer-api.js?action=get-project&slug=[slug]`.

### Hero
- Full-bleed render/photo
- Project name, suburb, "from $XXX,000", developer company name
- CTAs (stacked on mobile): "Register Interest" (OTP) / "View Available Units" (completed stock)
- Registration count badge:
  - OTP: **"X people registered interest"** (not "verified buyers" — registrants are unverified)
  - Completed stock: **"X verified buyers in the queue"** (only shown if buyers from `qualify.html` have submitted offers)

### Project Overview
- Description, total units, units available
- Completion date (OTP only)

### OTP — EOI Flow
- "Register Interest" opens inline 3-field form: name, email, phone
- `api/developer-api.js?action=register-interest` saves to `project_interests`
- No DEED account required — intentionally low friction
- Confirmation: "You're registered. We'll notify you when units open for offer."

### Completed Stock — Unit Grid + Offer Flow
- Grid of available units from `units` table: unit number, beds/baths/car, size m², price, status badge (Available / Under Offer / Sold)
- "Make Offer" button on each available unit → opens inline offer form on the same page (not `offer.html` — that page is built for the `listings` table and cannot accept `project_id` + `unit_id` without a rebuild)
- Inline offer form: name, email, offer price, settlement days, deposit %, optional message
- Submits to `api/developer-api.js?action=submit-offer` → saves to `unit_offers` table
- **Integration with `offer.html` is v2** — requires extending offer.html to support the units data model

### Floor Plans + Renders
- Scrollable image strip (same pattern as `listing.html`)

---

## Developer Dashboard (developer.html — authenticated)

### Header
Developer name, company, Active status badge

### Project Cards (one per project)
- Name, suburb, type badge (Completed Stock / Off-the-Plan), status badge (Draft / Live / Sold Out)
- Stats: units available (note: manually maintained), EOIs registered, offers received, settled
- "View project page" → `/projects/[slug]`
- "Edit" → inline form: update description, price, `units_available` (manual), renders

### Buyer Activity
- OTP projects: EOI list (name, email, date registered)
- Completed stock: `unit_offers` per unit (buyer name, offer price, settlement days, status)

### Settlement Tracker
- Table: unit, buyer name, offer price, settlement date, platform fee due
- Status: Under Contract / Settled / Fee Paid
- Ed updates settlement status in Supabase directly (no payment infrastructure at launch)

### "Add Project" button → project creation flow

---

## browse.html Updates

- Developer projects appear as distinct cards in the listing grid
- Card: hero image, project name, suburb, "from $XXX,000", units available, **New Development** badge
- Card links to `/projects/[slug]`
- Private listings unchanged
- Project cards sourced from `projects` table (status = 'live')

---

## sell.html Updates

**Remove:**
- Stripe CDN `<script src="https://js.stripe.com/v3/">` tag from `<head>`
- Stripe checkout UI and all Stripe JS (PaymentElement, confirmPayment calls)
- Payment confirmation screen

**Replace with final confirmation screen:**
- Heading: "Your listing is live"
- Body: "DEED's platform fee is payable on settlement of sale. We'll be in touch when your property sells."
- Checkbox (required before submit): "I understand the platform fee is due on settlement of sale"
- CTA: "Confirm & Go Live"

**Note:** `api/checkout.js` and `api/create-payment-intent.js` are also deleted as part of this change (see API section above).

---

## Mobile Requirements

All new and updated pages (`developer.html`, `project.html`, `sell.html`, `browse.html`) must be mobile-first:

- Single-column layout below 768px
- Minimum 44px touch targets
- Stacked CTAs (not side-by-side)
- Unit grid → single column on mobile
- Dashboard tables → card-style stacked layout on mobile
- Existing pages (broker portal, listing, dashboard, qualify, offer) are **not** in scope for this build

---

## Constraints & Risks

| Risk | Mitigation |
|---|---|
| Vercel function limit | Resolved: retire checkout.js + create-payment-intent.js (-2), add developer-api.js (+1). Net -1, total 11 functions. |
| "Platform fee payable on settlement" may be classified as agent commission under *Property Occupations Act 2014* (QLD) | Use "platform fee" / "technology fee" language only. Get QLD property solicitor sign-off before launch. Never use "commission". |
| `units_available` goes stale | Accepted v1 limitation. Developer updates manually. Dashboard shows inline note explaining this. |
| Auth session → developer record join | `auth_user_id` column on `developers` table. Dashboard fetches by `auth_user_id = user.id`. |
| Slug collisions | `create-project.js` checks for existing slug, appends `-2` / `-3` if collision found. |
| OTP registrants labelled "verified buyers" | Resolved: badge copy is "X people registered interest" for OTP. "Verified buyers" reserved for completed stock with `qualify.html` completion. |

---

## Out of Scope (v1)

- OTP contracts (legally complex — developer's own lawyers handle)
- Developer acquisition landing page (build after first developer stories exist)
- Payment collection for platform fee (manual process at launch)
- Admin UI for Ed (Supabase dashboard sufficient)
- Mobile fix for existing pages
- `offer.html` integration for developer units (v2 — requires extending offer.html data model)
- Auto-sync of `units_available` (v2 — requires trigger or computed column)

---

## Build Sequence

1. DB migration — create `developers`, `projects`, `units`, `project_interests`, `unit_offers` tables in Supabase SQL editor
2. `vercel.json` — add `/projects/:slug` rewrite; delete `checkout.js` and `create-payment-intent.js`
3. `api/developer-api.js` — implement all 6 actions
4. `project.html` — project landing page (mobile-first)
5. `developer.html` — registration + dashboard (mobile-first)
6. `browse.html` — add project cards
7. `sell.html` — remove Stripe, add platform fee screen (mobile-first)
8. Deploy + smoke test all flows
