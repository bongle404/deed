# DEED Broker Portal — Design Spec
**Date:** 2026-03-20
**Status:** Approved
**Scope:** Broker partner onboarding + verified buyer registration pipeline

---

## Context

DEED is a private property sales platform displacing agent commissions with a flat $999 seller fee. The core product depends on a pool of verified buyers — sellers need confidence that buyers in the pool have real, confirmed borrowing capacity, not self-reported estimates.

Open banking (Basiq/Frollo) is the long-term self-serve verification path. The broker portal is the faster, higher-credibility path to bootstrap the verified buyer pool: mortgage brokers who have already formally assessed a client's borrowing capacity register them directly on DEED.

This is priority 1 in the DEED partnership strategy. It must ship before the developer listing portal (inventory) because you cannot convert developers without a demonstrable buyer pool.

---

## Strategic Context

### Why broker-first
- Broker pre-approval is stronger than open banking alone — it includes a credit check and a licensed professional's assessment
- Brokers have incentive: faster buyer-to-property match = faster commission
- DEED carries no credit advice liability — the broker makes the capacity claim, DEED surfaces it
- Unlocks the chicken-and-egg problem: gets verified buyers into the system before inventory exists

### Verification tiers (full picture)
| Tier | Method | Badge | Signal strength |
|------|--------|-------|----------------|
| 1 | Broker pre-approval (this build) | Formally pre-approved: $X | Strongest |
| 2 | Frollo Financial Passport (future) | Bank-verified capacity: $X–$Y | Strong |
| 3 | Self-reported qualify form (existing) | Estimated range: $X–$Y | Indicative |

---

## Architecture

### Auth approach
Magic link authentication via Supabase Auth. No passwords. Broker enters email → client calls `supabase.auth.signInWithOtp()` directly (anon key, client-side — no serverless function needed) → Supabase sends a one-time login link → broker clicks → Supabase JS SDK picks up the `#access_token` fragment automatically → session established → page re-renders to dashboard state.

The magic link redirect URL is set to `/brokers.html` in the `signInWithOtp()` options. On every page load, the page calls `supabase.auth.getSession()` to determine which state to render.

### Auth in serverless functions
All broker-authenticated serverless functions (`broker-submit-buyer`, `broker-resend-activation`) require the client to pass the Supabase session JWT as `Authorization: Bearer <token>`. The function validates the token by calling `supabase.auth.getUser(token)` using the **service role client** (not the anon client). The broker is identified by matching the email from the JWT to the `brokers` table. If no match or status !== 'approved', return 401.

### All admin writes use the service role key
All serverless functions that write to or read protected data use `SUPABASE_SERVICE_ROLE_KEY`, not the anon key. The anon key is used only for the magic link OTP call and the token-lookup on `/activate`.

### Pages
- `/brokers.html` — single page, three states based on auth + approval status
- `/activate.html` — buyer onboarding flow (3 screens)

Both pages live inside the existing DEED static site. Same HTML + Supabase + Vercel pattern as all other pages.

### Serverless functions (Vercel `/api/`)
| Function | Auth required | Purpose |
|----------|--------------|---------|
| `broker-register.js` | None | Inserts broker row (status:pending), emails Ed |
| `broker-submit-buyer.js` | Broker JWT | Creates buyer row, sends activation email to client |
| `broker-resend-activation.js` | Broker JWT | Generates new token, resends activation email |
| `get-buyer-by-token.js` | None | Returns safe buyer fields (name, verified_amount, broker name) by activation token — used by /activate to pre-fill UI |
| `buyer-activate.js` | None | Validates token + expiry, saves preferences, marks activation complete, sends broker confirmation email |

Note: `broker-login` is not a serverless function. The magic link OTP is called client-side via `supabase.auth.signInWithOtp()` using the anon key.

### Email infrastructure
Resend. Five transactional emails. `RESEND_API_KEY` set as Vercel environment variable.

---

## Environment Variables

All must be set in Vercel project settings:

| Variable | Used by | Purpose |
|----------|---------|---------|
| `SUPABASE_URL` | All functions | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | All functions | Bypasses RLS for admin writes |
| `SUPABASE_ANON_KEY` | Client pages | Read-only / auth operations |
| `RESEND_API_KEY` | Email-sending functions | Transactional email |
| `SITE_URL` | All functions | Base URL for constructing links (e.g. https://deed-sooty.vercel.app) |
| `ED_EMAIL` | broker-register.js | Recipient for broker application notifications |

---

## Database

### New `brokers` table
```sql
create table brokers (
  id              uuid primary key default uuid_generate_v4(),
  created_at      timestamptz default now(),
  name            text not null,
  email           text not null unique,
  brokerage       text not null,
  asic_licence    text not null,
  phone           text,
  status          text default 'pending', -- pending, approved, suspended
  approved_at     timestamptz
);

-- RLS
alter table brokers enable row level security;
-- Public can insert (registration form, no auth)
create policy "public can insert brokers" on brokers for insert with check (true);
-- No client-side reads. All broker data reads go through service role in serverless functions.
-- (no select policy = anon cannot read brokers table)
```

### New columns on `buyers` table
```sql
-- Note: buyers table RLS is already enabled from the original schema.
-- Existing policies remain unchanged.

alter table buyers add column verification_method     text default 'self_reported';
-- values: self_reported, broker_preapproval
alter table buyers add column verified_amount         bigint;
-- bigint (not integer) — supports pre-approvals above $2.1M without silent overflow
alter table buyers add column broker_id               uuid references brokers(id) on delete set null;
alter table buyers add column activation_token        text;
-- UUID sent in activation email. Set to NULL after use to prevent replay.
alter table buyers add column activation_token_expires_at timestamptz;
-- Set to now() + interval '7 days' on insert. Check on every token validation.
alter table buyers add column activation_complete     boolean default false;
alter table buyers add column verified_at             timestamptz;

-- max_price is an existing integer column. Verify its type before inserting verified_amount
-- into it for backward compatibility. If integer, run:
--   alter table buyers alter column max_price type bigint;
-- before go-live to prevent truncation on $2M+ pre-approvals.
```

The existing `verified` boolean (already on buyers table, default false) is set to `true` when a broker submits a buyer. `verified_amount` is the authoritative figure for broker-verified buyers.

### RLS for updated `buyers` table
No new RLS policies are added to the `buyers` table. All activation-flow reads use `get-buyer-by-token.js` which runs with the service role key (RLS bypassed). Do NOT add a permissive public select policy — it would expose pending buyer names, pre-approval amounts, and broker IDs to unauthenticated requests.

---

## Page Flows

### Broker registration → approval → first login

```
/brokers.html (unauthenticated — no session)
  └── Renders State 1: registration form + login toggle

  [Registration path]
  └── Submits form → POST /api/broker-register
      ├── Checks: does email already exist in brokers table? → return 409 if so
      ├── Inserts broker row (status: pending)
      └── Sends Email 1 to Ed:
          name, brokerage, ASIC licence, email
          ASIC Connect URL: https://connectonline.asic.gov.au/RegistrySearch/
            faces/landing/SearchRegisters.jspx?_adf.ctrl-state=jh2jaoi0o_4&
            _afrLoop=314667474638898&searchText=[asic_licence]&
            searchType=AFS_REP (constructed in function)
          Direct Supabase dashboard link to brokers table
      └── Form replaced with: "Application received — we'll be in touch within 24 hours"
          Page stores broker email in localStorage: key 'deedBrokerEmail'

  [Approval — manual, Ed]
  └── Ed opens ASIC Connect, verifies licence (30 seconds)
      └── Ed updates status to 'approved' in Supabase dashboard
          └── Ed sends Email 2 manually from his email client
              (MVP: manual. Automate via Supabase webhook in a later build.)

  [Login path — broker returns after approval]
  └── Clicks "Already approved? Log in" toggle
      └── Enters email → client calls supabase.auth.signInWithOtp({
            email,
            options: { emailRedirectTo: '[SITE_URL]/brokers.html' }
          })
          └── Supabase sends magic link email to broker
              └── Broker clicks link → redirected to /brokers.html
                  └── Supabase JS SDK processes #access_token fragment
                      └── supabase.auth.getSession() returns valid session
                          └── Function fetches broker row via service role (by email)
                              ├── status === 'pending' → render State 2 (pending message)
                              └── status === 'approved' → render State 3 (dashboard)
```

### Broker submits a buyer

```
State 3 dashboard → "Add a buyer" button → inline form expands
  └── Fields: client name, client email, pre-approved amount, lender (optional),
              pre-approval expiry date (optional)
      └── Client calls POST /api/broker-submit-buyer
          Headers: { Authorization: Bearer [session.access_token] }
          ├── Function validates JWT via supabase.auth.getUser(token)
          ├── Looks up broker row by email (service role)
          ├── Returns 401 if broker not found or not approved
          ├── Checks: does client email already exist in buyers table?
          │   └── If yes: return 409 "This buyer is already registered on DEED"
          ├── Generates activation_token = crypto.randomUUID()
          ├── Inserts buyer row:
          │     name: client_name
          │     email: client_email
          │     verified: true
          │     verification_method: 'broker_preapproval'
          │     verified_amount: amount
          │     broker_id: broker.id
          │     activation_token: token
          │     activation_token_expires_at: now() + 7 days
          │     activation_complete: false
          │     max_price: amount (for backward compatibility with existing queries)
          └── Sends Email 3 to client
              └── Returns { success: true, buyer_id: uuid }
                  └── Dashboard re-fetches buyer list — new buyer appears as "Pending activation"
```

### Resend activation email

```
Dashboard buyer row → "Resend" action
  └── POST /api/broker-resend-activation
      Headers: { Authorization: Bearer [session.access_token] }
      Body: { buyer_id: uuid }
      ├── Validates broker JWT (same as above)
      ├── Confirms buyer.broker_id === broker.id (broker can only resend for their own buyers)
      ├── Confirms activation_complete === false
      ├── Generates new activation_token = crypto.randomUUID()
      ├── Updates buyer: activation_token = new token,
          activation_token_expires_at = now() + interval '7 days'
      │   (Resend rate limit: if activation_token_expires_at > now() - interval '10 minutes',
      │    return 429 "Please wait before resending." MVP-optional but recommended.)
      └── Sends Email 3 again with new token
          └── Returns { success: true }
```

### Buyer activation

```
Client inbox → Email 3 → "Activate my profile" → /activate.html#token=[uuid]

Token is passed in the URL hash fragment (not query string). Hash values are never
sent to the server, never appear in server logs, and are not included in referrer
headers — reducing the exposure surface for this single-use credential.

On page load:
  └── Page extracts token from window.location.hash
  └── GET /api/get-buyer-by-token?token=[uuid]
      ├── Function uses service role to query buyers
      ├── Returns 404 if token not found
      ├── Returns 410 if activation_token_expires_at < now()
      ├── Returns 410 if activation_complete === true
      └── Returns: { name, verified_amount, broker_name } (safe fields only)
          └── Page pre-fills Screen 1 with name

  Screen 1: Confirm details
    └── Name (pre-filled, editable), phone (optional) → Continue

  Screen 2: Property preferences
    └── Suburb (text input, add multiple), property type (cards),
        min bedrooms (1–5+) → Continue

  Screen 3: Verified profile card
    └── "Pre-approved: $[verified_amount]" + DEED Verified Buyer badge
        └── User clicks "Browse listings →"
            └── POST /api/buyer-activate
                Body: { token, name, phone, suburbs, property_types, min_beds }
                ├── Re-validates token atomically: single UPDATE with WHERE
                │   activation_token = token AND activation_complete = false
                │   AND activation_token_expires_at > now().
                │   Check rows_affected === 1 to confirm.
                │   (Atomic update prevents race condition from simultaneous POSTs.)
                ├── Updates buyer row:
                │     name (if edited)
                │     phone
                │     suburbs
                │     property_types (array)
                │     min_beds
                │     activation_complete: true
                │     activation_token: null  (invalidate — prevent replay)
                │     verified_at: now()
                └── Sends Email 4 to broker
                    └── Redirects to browse.html
```

---

## Emails

All sent via Resend from `noreply@deed.com.au` (or verified Resend domain).

### Email 1 — Ed notification (broker applies)
- **To:** `ED_EMAIL` env var
- **Subject:** `New broker application — [Name], [Brokerage]`
- **Body:** Name, brokerage, ASIC licence, email. ASIC Connect verification URL constructed with licence number. Direct link to Supabase brokers table. Plain text only.

### Email 2 — Broker approval (MVP: Ed sends manually)
- **To:** broker email
- **Subject:** `You're approved on DEED`
- **Body:** Account live. Link to `/brokers.html`. Plain text.
- **Note:** For MVP, Ed copies and sends this himself after approving in Supabase. Automate via Supabase webhook in a later build.

### Email 3 — Buyer activation
- **To:** client email
- **Subject:** `[Broker Name] has registered you as a verified buyer on DEED`
- **Body:**
  - What DEED is (one sentence: private property listings, no agents, flat seller fee)
  - "[Broker Name] at [Brokerage] has confirmed your borrowing capacity and registered you on DEED."
  - "Your pre-approval of $[amount] is on file."
  - CTA button: "Activate my profile" → `[SITE_URL]/activate.html?token=[uuid]`
  - Small print: "This link expires in 7 days."

### Email 4 — Broker confirmation (buyer activated)
- **To:** broker email
- **Subject:** `[Client name] has activated their DEED profile`
- **Body:** Client is live in the buyer pool with their preferences set. Link to `/brokers.html`.

### Email 5 — Magic link (sent by Supabase natively)
Not a custom Resend email. Supabase sends this automatically. Customise the template in Supabase Auth > Email Templates to match DEED brand. Subject: `Your DEED login link`. Redirect URL: `[SITE_URL]/brokers.html`.

---

## UI

### `/brokers.html` — three states

**State 1: Public landing (unauthenticated)**

Two-column layout matching DEED design system (white bg, blue accent, deed-ui.css).

Left column — partnership value prop:
- Heading: "Partner with DEED"
- Three bullet points: what verified buyers get, how fast it works, what brokers earn (listings matched to their clients faster = commission faster)
- Trust note: ASIC licence verified on every application

Right column — registration form:
- Fields: Full name, Email, Brokerage name, ASIC licence number, Phone (optional)
- "Apply to join" primary button
- On submit: replace form with confirmation message, store email in localStorage
- Below form: "Already approved?" toggle → swaps form for login form (email input + "Send login link" button)

On login link sent: show "Check your inbox — we've sent a login link to [email]"

**State 2: Pending approval**
- Centred, minimal layout
- Message: "Your application is under review. You'll receive an email once your licence has been verified — usually within 24 hours."
- Show broker email from localStorage

**State 3: Broker dashboard (authenticated + approved)**

Header bar: broker name, brokerage name, "Log out" link (calls `supabase.auth.signOut()`)

Stats row — three cards:
- Buyers submitted (total count)
- Buyers activated (activation_complete = true)
- Pending activation (submitted but not yet activated)

Buyer table columns: Name | Pre-approved amount | Status | Date submitted | Action
- Status values: green "Active" / amber "Pending activation"
- Action column: "Resend email" (calls broker-resend-activation, disabled if already active)

"Add a buyer" button — opens inline form below the stats row:
- Client first name + last name (stored as single `name` field)
- Client email
- Pre-approved amount (AUD, formatted input)
- Lender name (optional)
- Pre-approval expiry date (optional)
- "Register buyer" submit button
- On success: form collapses, table refreshes, new row appears as "Pending activation"
- On 409: inline error "This buyer is already registered on DEED"

### `/activate.html`

Centred layout, no sidebar, no nav (standalone experience). Progress indicator at top: three dots or "1 of 3" label.

**Screen 1 — Confirm details**
- Heading: "Welcome to DEED"
- Subtext: "[Broker Name] at [Brokerage] has confirmed your borrowing capacity. You're nearly there."
- Fields: Name (pre-filled from buyer row, editable), Phone (optional)
- "Continue →" button

**Screen 2 — What are you looking for?**
- Heading: "Set your property preferences"
- Subtext: "We'll notify you the moment a matching property lists — before it goes anywhere else."
- Suburb: text input with "+ Add another suburb" link (stores as array, max 5)
- Property type: card selectors (House / Unit / Townhouse / Land), multiple allowed
- Min bedrooms: pill selectors (1 / 2 / 3 / 4 / 5+)
- "Continue →" button

**Screen 3 — Verified profile**
- Uses existing `verified-card` component from qualify.html (copy the HTML structure)
- Shows: name, "Pre-approved: $[verified_amount formatted]", suburbs, DEED Verified Buyer badge + pulse indicator
- Heading: "YOU'RE VERIFIED."
- Subtext: "We'll notify you at [email] the moment a matching property lists."
- CTA: "Browse listings →" (calls buyer-activate then redirects)

---

## Error handling

| Scenario | Where | Handling |
|----------|-------|---------|
| Duplicate broker email on register | broker-register returns 409 | Form: "An account with this email already exists. Use the login form below." |
| Broker not yet approved tries to log in | Page detects pending status after auth | Render State 2 (pending message) |
| Magic link expired or already used | Supabase returns error on session | /brokers shows "Link expired — enter your email to get a new one" + email input |
| Activation token not found | get-buyer-by-token returns 404 | /activate: "This link isn't valid. Contact your broker for a new one." |
| Activation token expired (7 days) | get-buyer-by-token returns 410 | /activate: "This link has expired. Ask your broker to resend your invitation." |
| Activation token already used | get-buyer-by-token returns 410 | /activate: "You've already activated your profile. Browse listings →" |
| Buyer email already in system | broker-submit-buyer returns 409 | Dashboard inline: "This buyer is already registered on DEED" |
| broker-submit-buyer JWT invalid/expired | Returns 401 | Page prompts re-login: "Your session has expired — log in again" |
| Resend attempt on already-activated buyer | broker-resend-activation returns 400 | Dashboard: action button disabled for active buyers |
| Resend API failure on any email | Catch in serverless function | Log error, return 500, show "Email failed to send — try again or contact support" |

---

## Out of scope (this build)

- Automated broker approval email (MVP: Ed sends manually — automate via Supabase webhook in a later build)
- Broker can edit or delete submitted buyers
- Broker performance metrics / commission tracking
- Open banking (Frollo/Basiq) verification — separate build
- Developer listing portal — next build after this ships
- Viewing host marketplace — requires legal sign-off first
- Broker referral fee tracking
