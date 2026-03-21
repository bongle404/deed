# Broker Portal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a broker partner portal that lets mortgage brokers register pre-approved buyers into the DEED verified buyer pool, with a buyer activation flow that captures property preferences and surfaces a verified profile card.

**Architecture:** Static HTML pages (`brokers.html`, `activate.html`) backed by five Vercel serverless functions (CommonJS, `module.exports` pattern). Broker authentication uses Supabase magic links. Buyer verification data stored in two database tables (`brokers` + additions to `buyers`). Transactional email via Resend.

**Tech Stack:** Supabase (auth + database), Resend (email), Vercel serverless functions (Node.js CommonJS), Jest (tests), deed-ui.css (design system)

**Spec:** `docs/superpowers/specs/2026-03-20-broker-portal-design.md`

---

## File Map

**New files:**
- `brokers.html` — broker portal page (3 auth states)
- `activate.html` — buyer activation flow (3 screens)
- `api/broker-register.js` — public: inserts broker row, emails Ed
- `api/broker-submit-buyer.js` — authenticated: creates buyer row, sends activation email
- `api/broker-resend-activation.js` — authenticated: new token, resends activation email
- `api/get-buyer-by-token.js` — public: returns safe buyer fields by activation token
- `api/buyer-activate.js` — public: validates token atomically, saves preferences, sends broker confirmation
- `api/__tests__/broker-register.test.js`
- `api/__tests__/broker-submit-buyer.test.js`
- `api/__tests__/broker-resend-activation.test.js`
- `api/__tests__/get-buyer-by-token.test.js`
- `api/__tests__/buyer-activate.test.js`

**Modified files:**
- `package.json` — add `@supabase/supabase-js`, `resend`, `jest`, `jest-environment-node`
- `supabase-schema.sql` — append brokers table + buyers column migrations (documentation only — run manually in Supabase)

---

## Task 1: Install dependencies + test infrastructure

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install packages**

```bash
cd /Users/edsteward/deed
npm install @supabase/supabase-js resend
npm install --save-dev jest
```

- [ ] **Step 2: Add Jest config to package.json**

Open `package.json` and add the `scripts` and `jest` fields so it looks like this:

```json
{
  "name": "deed",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch"
  },
  "jest": {
    "testEnvironment": "node",
    "testMatch": ["**/api/__tests__/**/*.test.js"]
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.36.0",
    "@supabase/storage-js": "^2.99.3",
    "@supabase/supabase-js": "^2.0.0",
    "resend": "^4.0.0",
    "sharp": "^0.34.5",
    "stripe": "^16.0.0"
  },
  "devDependencies": {
    "jest": "^29.0.0"
  }
}
```

- [ ] **Step 3: Create test directory**

```bash
mkdir -p /Users/edsteward/deed/api/__tests__
```

- [ ] **Step 4: Verify Jest runs with no tests**

```bash
cd /Users/edsteward/deed && npm test
```

Expected output: `No tests found` or `Test Suites: 0 passed`

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add supabase, resend, jest dependencies"
```

---

## Task 2: Database migration

**Files:**
- Modify: `supabase-schema.sql` (append migration SQL)

- [ ] **Step 1: Append migration SQL to schema file**

Add this block to the bottom of `supabase-schema.sql`:

```sql
-- ═══════════════════════════════════════════
--  BROKER PORTAL MIGRATION
--  Run this block in Supabase SQL Editor
--  after the initial schema has been applied
-- ═══════════════════════════════════════════

-- ── BROKERS ─────────────────────────────────
create table if not exists brokers (
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

alter table brokers enable row level security;
create policy "public can insert brokers"
  on brokers for insert with check (true);
-- No select policy — anon cannot read brokers table.
-- All broker reads go through service role in serverless functions.

-- ── BUYERS — broker portal columns ──────────
alter table buyers add column if not exists
  verification_method     text default 'self_reported';
  -- values: self_reported, broker_preapproval

alter table buyers add column if not exists
  verified_amount         bigint;
  -- bigint: supports pre-approvals above $2.1M without overflow

alter table buyers add column if not exists
  broker_id               uuid references brokers(id) on delete set null;

alter table buyers add column if not exists
  activation_token        text;
  -- UUID sent in activation email. Nulled out after use (replay prevention).

alter table buyers add column if not exists
  activation_token_expires_at  timestamptz;
  -- Set to now() + interval '7 days' on insert.

alter table buyers add column if not exists
  activation_complete     boolean default false;

alter table buyers add column if not exists
  verified_at             timestamptz;

-- ── max_price type safety ────────────────────
-- max_price is integer. Alter to bigint if any pre-approvals exceed $2.1M.
-- alter table buyers alter column max_price type bigint;
-- (Uncomment and run if needed before inserting large amounts.)
```

- [ ] **Step 2: Run the migration in Supabase**

Open: https://supabase.com/dashboard/project/jtpykhrdjkzhcbswrhzo/editor

Paste and run the SQL block above (everything from `create table if not exists brokers` to the end).

- [ ] **Step 3: Verify in Supabase Table Editor**

Check:
- `brokers` table exists with all 9 columns
- `buyers` table has 7 new columns: `verification_method`, `verified_amount`, `broker_id`, `activation_token`, `activation_token_expires_at`, `activation_complete`, `verified_at`

- [ ] **Step 4: Commit**

```bash
git add supabase-schema.sql
git commit -m "feat: add brokers table and buyer verification columns"
```

---

## Task 3: Environment variables

- [ ] **Step 1: Set variables in Vercel dashboard**

Open: https://vercel.com/dashboard → deed project → Settings → Environment Variables

Add these (all environments: Production, Preview, Development):

| Name | Value |
|------|-------|
| `SUPABASE_URL` | `https://jtpykhrdjkzhcbswrhzo.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Get from Supabase → Settings → API → `service_role` key |
| `SUPABASE_ANON_KEY` | Get from Supabase → Settings → API → `anon public` key |
| `RESEND_API_KEY` | Get from resend.com → API Keys → Create key |
| `SITE_URL` | `https://deed-sooty.vercel.app` |
| `ED_EMAIL` | Ed's email address |

- [ ] **Step 2: Create local .env for development**

```bash
cat > /Users/edsteward/deed/.env << 'EOF'
SUPABASE_URL=https://jtpykhrdjkzhcbswrhzo.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
SUPABASE_ANON_KEY=<anon_key>
RESEND_API_KEY=<resend_key>
SITE_URL=http://localhost:3000
ED_EMAIL=<ed_email>
EOF
```

- [ ] **Step 3: Add .env to .gitignore**

Check `.gitignore` exists and contains `.env`. If not:

```bash
echo ".env" >> /Users/edsteward/deed/.gitignore
git add .gitignore
git commit -m "chore: add .env to gitignore"
```

---

## Task 4: `get-buyer-by-token.js`

This is the simplest function — no auth. Start here to validate the Supabase + Resend setup.

**Files:**
- Create: `api/get-buyer-by-token.js`
- Create: `api/__tests__/get-buyer-by-token.test.js`

- [ ] **Step 1: Write the failing tests**

Create `api/__tests__/get-buyer-by-token.test.js`:

```js
// Mock Supabase before requiring the handler
const mockSingle = jest.fn();
const mockEq = jest.fn(() => ({ single: mockSingle }));
const mockSelect = jest.fn(() => ({ eq: mockEq }));
const mockFrom = jest.fn(() => ({ select: mockSelect }));

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({ from: mockFrom })),
}));

const handler = require('../get-buyer-by-token');

function makeReq(query = {}) {
  return { method: 'GET', query };
}
function makeRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

beforeEach(() => jest.clearAllMocks());

test('returns 405 for non-GET requests', async () => {
  const req = { method: 'POST', query: {} };
  const res = makeRes();
  await handler(req, res);
  expect(res.status).toHaveBeenCalledWith(405);
});

test('returns 400 when token is missing', async () => {
  const res = makeRes();
  await handler(makeReq({}), res);
  expect(res.status).toHaveBeenCalledWith(400);
  expect(res.json).toHaveBeenCalledWith({ error: 'Missing token' });
});

test('returns 404 when token not found in database', async () => {
  mockSingle.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });
  const res = makeRes();
  await handler(makeReq({ token: 'nonexistent-uuid' }), res);
  expect(res.status).toHaveBeenCalledWith(404);
  expect(res.json).toHaveBeenCalledWith({ error: 'Invalid link' });
});

test('returns 410 when token is expired', async () => {
  mockSingle.mockResolvedValue({
    data: {
      name: 'Jane Smith',
      verified_amount: 750000,
      activation_complete: false,
      activation_token_expires_at: new Date(Date.now() - 1000).toISOString(),
      brokers: { name: 'Bob Broker', brokerage: 'ABC Finance' },
    },
    error: null,
  });
  const res = makeRes();
  await handler(makeReq({ token: 'expired-uuid' }), res);
  expect(res.status).toHaveBeenCalledWith(410);
  expect(res.json).toHaveBeenCalledWith({ error: 'Link expired' });
});

test('returns 410 when buyer already activated', async () => {
  mockSingle.mockResolvedValue({
    data: {
      name: 'Jane Smith',
      verified_amount: 750000,
      activation_complete: true,
      activation_token_expires_at: new Date(Date.now() + 86400000).toISOString(),
      brokers: { name: 'Bob Broker', brokerage: 'ABC Finance' },
    },
    error: null,
  });
  const res = makeRes();
  await handler(makeReq({ token: 'used-uuid' }), res);
  expect(res.status).toHaveBeenCalledWith(410);
  expect(res.json).toHaveBeenCalledWith({ error: 'Already activated' });
});

test('returns 200 with safe fields for valid token', async () => {
  mockSingle.mockResolvedValue({
    data: {
      name: 'Jane Smith',
      verified_amount: 750000,
      activation_complete: false,
      activation_token_expires_at: new Date(Date.now() + 86400000).toISOString(),
      brokers: { name: 'Bob Broker', brokerage: 'ABC Finance' },
    },
    error: null,
  });
  const res = makeRes();
  await handler(makeReq({ token: 'valid-uuid' }), res);
  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.json).toHaveBeenCalledWith({
    name: 'Jane Smith',
    verified_amount: 750000,
    broker_name: 'Bob Broker',
    brokerage: 'ABC Finance',
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd /Users/edsteward/deed && npm test get-buyer-by-token
```

Expected: `Cannot find module '../get-buyer-by-token'`

- [ ] **Step 3: Implement `api/get-buyer-by-token.js`**

```js
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token } = req.query;
  if (!token) {
    return res.status(400).json({ error: 'Missing token' });
  }

  const { data, error } = await supabase
    .from('buyers')
    .select('name, verified_amount, activation_complete, activation_token_expires_at, brokers(name, brokerage)')
    .eq('activation_token', token)
    .single();

  if (error || !data) {
    return res.status(404).json({ error: 'Invalid link' });
  }

  if (new Date(data.activation_token_expires_at) < new Date()) {
    return res.status(410).json({ error: 'Link expired' });
  }

  if (data.activation_complete) {
    return res.status(410).json({ error: 'Already activated' });
  }

  return res.status(200).json({
    name: data.name,
    verified_amount: data.verified_amount,
    broker_name: data.brokers?.name ?? null,
    brokerage: data.brokers?.brokerage ?? null,
  });
};
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
cd /Users/edsteward/deed && npm test get-buyer-by-token
```

Expected: `6 passed`

- [ ] **Step 5: Commit**

```bash
git add api/get-buyer-by-token.js api/__tests__/get-buyer-by-token.test.js
git commit -m "feat: add get-buyer-by-token serverless function"
```

---

## Task 5: `broker-register.js`

**Files:**
- Create: `api/broker-register.js`
- Create: `api/__tests__/broker-register.test.js`

- [ ] **Step 1: Write failing tests**

Create `api/__tests__/broker-register.test.js`:

```js
const mockInsert = jest.fn();
const mockFrom = jest.fn(() => ({ insert: mockInsert }));
const mockEmails = { send: jest.fn() };

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({ from: mockFrom })),
}));
jest.mock('resend', () => ({
  Resend: jest.fn(() => ({ emails: mockEmails })),
}));

const handler = require('../broker-register');

function makeReq(body = {}) {
  return { method: 'POST', body };
}
function makeRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

beforeEach(() => jest.clearAllMocks());

test('returns 405 for non-POST', async () => {
  const res = makeRes();
  await handler({ method: 'GET', body: {} }, res);
  expect(res.status).toHaveBeenCalledWith(405);
});

test('returns 400 when required fields are missing', async () => {
  const res = makeRes();
  await handler(makeReq({ name: 'Bob' }), res);
  expect(res.status).toHaveBeenCalledWith(400);
  expect(res.json).toHaveBeenCalledWith({ error: 'Missing required fields' });
});

test('returns 409 when email already exists', async () => {
  mockInsert.mockResolvedValue({ error: { code: '23505' } });
  const res = makeRes();
  await handler(makeReq({
    name: 'Bob Broker', email: 'bob@broker.com',
    brokerage: 'ABC Finance', asic_licence: '123456',
  }), res);
  expect(res.status).toHaveBeenCalledWith(409);
  expect(res.json).toHaveBeenCalledWith({ error: 'Email already registered' });
});

test('returns 201 and sends notification email on success', async () => {
  mockInsert.mockResolvedValue({ error: null });
  mockEmails.send.mockResolvedValue({ id: 'email-id' });
  const res = makeRes();
  await handler(makeReq({
    name: 'Bob Broker', email: 'bob@broker.com',
    brokerage: 'ABC Finance', asic_licence: '123456',
  }), res);
  expect(res.status).toHaveBeenCalledWith(201);
  expect(mockEmails.send).toHaveBeenCalledTimes(1);
  const emailCall = mockEmails.send.mock.calls[0][0];
  expect(emailCall.to).toContain(process.env.ED_EMAIL);
  expect(emailCall.subject).toContain('Bob Broker');
  expect(emailCall.subject).toContain('ABC Finance');
  expect(emailCall.text).toContain('123456');
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd /Users/edsteward/deed && npm test broker-register
```

Expected: `Cannot find module '../broker-register'`

- [ ] **Step 3: Implement `api/broker-register.js`**

```js
const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const resend = new Resend(process.env.RESEND_API_KEY);

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, brokerage, asic_licence, phone } = req.body || {};

  if (!name || !email || !brokerage || !asic_licence) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const { error } = await supabase
    .from('brokers')
    .insert([{ name, email, brokerage, asic_licence, phone: phone || null }]);

  if (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Email already registered' });
    }
    console.error('Broker insert error:', error);
    return res.status(500).json({ error: 'Registration failed' });
  }

  const asicUrl = `https://connectonline.asic.gov.au/RegistrySearch/faces/landing/SearchRegisters.jspx?searchText=${encodeURIComponent(asic_licence)}&searchType=AFS_REP`;
  const supabaseUrl = `https://supabase.com/dashboard/project/jtpykhrdjkzhcbswrhzo/editor`;

  await resend.emails.send({
    from: 'DEED <noreply@deed-sooty.vercel.app>',
    to: [process.env.ED_EMAIL],
    subject: `New broker application — ${name}, ${brokerage}`,
    text: [
      `New broker application received.`,
      ``,
      `Name: ${name}`,
      `Email: ${email}`,
      `Brokerage: ${brokerage}`,
      `ASIC Licence: ${asic_licence}`,
      phone ? `Phone: ${phone}` : '',
      ``,
      `Verify licence: ${asicUrl}`,
      ``,
      `Approve in Supabase (set status = 'approved'):`,
      supabaseUrl,
    ].filter(l => l !== undefined).join('\n'),
  });

  return res.status(201).json({ success: true });
};
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
cd /Users/edsteward/deed && npm test broker-register
```

Expected: `4 passed`

- [ ] **Step 5: Commit**

```bash
git add api/broker-register.js api/__tests__/broker-register.test.js
git commit -m "feat: add broker-register serverless function"
```

---

## Task 6: `buyer-activate.js`

**Files:**
- Create: `api/buyer-activate.js`
- Create: `api/__tests__/buyer-activate.test.js`

- [ ] **Step 1: Write failing tests**

Create `api/__tests__/buyer-activate.test.js`:

```js
const mockUpdate = jest.fn();
const mockSelect = jest.fn();
const mockEqUpdate = jest.fn(() => ({ eq: jest.fn(() => ({ eq: jest.fn(() => mockUpdate) })) }));
const mockEqSelect = jest.fn(() => ({ eq: mockSelect }));
const mockFrom = jest.fn((table) => ({
  update: jest.fn(() => ({ eq: jest.fn(() => ({ eq: jest.fn(() => ({ eq: mockUpdate })) })) })),
  select: jest.fn(() => ({ eq: mockEqSelect() })),
}));
const mockEmails = { send: jest.fn() };

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({ from: mockFrom })),
}));
jest.mock('resend', () => ({
  Resend: jest.fn(() => ({ emails: mockEmails })),
}));

const handler = require('../buyer-activate');

function makeReq(body = {}) {
  return { method: 'POST', body };
}
function makeRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

beforeEach(() => jest.clearAllMocks());

test('returns 405 for non-POST', async () => {
  const res = makeRes();
  await handler({ method: 'GET', body: {} }, res);
  expect(res.status).toHaveBeenCalledWith(405);
});

test('returns 400 when token is missing', async () => {
  const res = makeRes();
  await handler(makeReq({ name: 'Jane' }), res);
  expect(res.status).toHaveBeenCalledWith(400);
});

test('returns 410 when no rows updated (token invalid/expired/used)', async () => {
  // Simulate atomic update that matches 0 rows
  mockFrom.mockReturnValueOnce({
    update: jest.fn(() => ({
      eq: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ data: [], error: null, count: 0 })),
        })),
      })),
    })),
  });
  const res = makeRes();
  await handler(makeReq({ token: 'bad-token', name: 'Jane', suburbs: ['Burleigh'] }), res);
  expect(res.status).toHaveBeenCalledWith(410);
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd /Users/edsteward/deed && npm test buyer-activate
```

Expected: `Cannot find module '../buyer-activate'`

- [ ] **Step 3: Implement `api/buyer-activate.js`**

```js
const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const resend = new Resend(process.env.RESEND_API_KEY);

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token, name, phone, suburbs, property_types, min_beds } = req.body || {};

  if (!token || !name) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const now = new Date().toISOString();

  // Atomic update: WHERE activation_token = token AND activation_complete = false
  // AND activation_token_expires_at > now. Check count to detect race conditions.
  const { data, error } = await supabase
    .from('buyers')
    .update({
      name,
      phone: phone || null,
      suburbs: suburbs || [],
      property_types: property_types || [],
      min_beds: min_beds || 1,
      activation_complete: true,
      activation_token: null,
      verified_at: now,
    })
    .eq('activation_token', token)
    .eq('activation_complete', false)
    .gt('activation_token_expires_at', now)
    .select('email, verified_amount, broker_id, brokers(email, name)');

  if (error) {
    console.error('Activation update error:', error);
    return res.status(500).json({ error: 'Activation failed' });
  }

  if (!data || data.length === 0) {
    return res.status(410).json({ error: 'Link invalid, expired, or already used' });
  }

  const buyer = data[0];

  // Send Email 4 — broker confirmation
  if (buyer.brokers?.email) {
    await resend.emails.send({
      from: 'DEED <noreply@deed-sooty.vercel.app>',
      to: [buyer.brokers.email],
      subject: `${name} has activated their DEED profile`,
      text: [
        `${name} has completed their buyer profile on DEED.`,
        ``,
        `They'll now receive notifications when matching properties list.`,
        ``,
        `View your buyer pool: ${process.env.SITE_URL}/brokers.html`,
      ].join('\n'),
    });
  }

  return res.status(200).json({ success: true });
};
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
cd /Users/edsteward/deed && npm test buyer-activate
```

Expected: `3 passed`

- [ ] **Step 5: Commit**

```bash
git add api/buyer-activate.js api/__tests__/buyer-activate.test.js
git commit -m "feat: add buyer-activate serverless function with atomic token validation"
```

---

## Task 7: `broker-submit-buyer.js`

**Files:**
- Create: `api/broker-submit-buyer.js`
- Create: `api/__tests__/broker-submit-buyer.test.js`

- [ ] **Step 1: Write failing tests**

Create `api/__tests__/broker-submit-buyer.test.js`:

```js
const mockGetUser = jest.fn();
const mockInsert = jest.fn();
const mockSelectBroker = jest.fn();
const mockSelectBuyer = jest.fn();
const mockEmails = { send: jest.fn() };

const mockSupabase = {
  auth: { getUser: mockGetUser },
  from: jest.fn((table) => {
    if (table === 'brokers') return { select: jest.fn(() => ({ eq: jest.fn(() => ({ eq: jest.fn(() => ({ single: mockSelectBroker }) }) }) })) };
    if (table === 'buyers') return {
      select: jest.fn(() => ({ eq: jest.fn(() => ({ single: mockSelectBuyer }) }) })),
      insert: mockInsert,
    };
    return {};
  }),
};

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabase),
}));
jest.mock('resend', () => ({
  Resend: jest.fn(() => ({ emails: mockEmails })),
}));

const handler = require('../broker-submit-buyer');

function makeReq(body = {}, auth = 'Bearer valid-token') {
  return { method: 'POST', body, headers: { authorization: auth } };
}
function makeRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

beforeEach(() => jest.clearAllMocks());

test('returns 405 for non-POST', async () => {
  const res = makeRes();
  await handler({ method: 'GET', headers: {}, body: {} }, res);
  expect(res.status).toHaveBeenCalledWith(405);
});

test('returns 401 when no auth header', async () => {
  const res = makeRes();
  await handler({ method: 'POST', headers: {}, body: {} }, res);
  expect(res.status).toHaveBeenCalledWith(401);
});

test('returns 401 when JWT invalid', async () => {
  mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'invalid' } });
  const res = makeRes();
  await handler(makeReq({}), res);
  expect(res.status).toHaveBeenCalledWith(401);
});

test('returns 401 when broker not found or not approved', async () => {
  mockGetUser.mockResolvedValue({ data: { user: { email: 'bob@broker.com' } }, error: null });
  mockSelectBroker.mockResolvedValue({ data: null, error: {} });
  const res = makeRes();
  await handler(makeReq({ client_name: 'Jane', client_email: 'jane@buyer.com', verified_amount: 750000 }), res);
  expect(res.status).toHaveBeenCalledWith(401);
});

test('returns 400 when required buyer fields are missing', async () => {
  mockGetUser.mockResolvedValue({ data: { user: { email: 'bob@broker.com' } }, error: null });
  mockSelectBroker.mockResolvedValue({ data: { id: 'broker-uuid', name: 'Bob', brokerage: 'ABC' }, error: null });
  const res = makeRes();
  await handler(makeReq({ client_name: 'Jane' }), res); // missing email + amount
  expect(res.status).toHaveBeenCalledWith(400);
});

test('returns 409 when buyer email already registered', async () => {
  mockGetUser.mockResolvedValue({ data: { user: { email: 'bob@broker.com' } }, error: null });
  mockSelectBroker.mockResolvedValue({ data: { id: 'broker-uuid', name: 'Bob', brokerage: 'ABC' }, error: null });
  mockSelectBuyer.mockResolvedValue({ data: { id: 'existing-buyer' }, error: null });
  const res = makeRes();
  await handler(makeReq({ client_name: 'Jane', client_email: 'jane@buyer.com', verified_amount: 750000 }), res);
  expect(res.status).toHaveBeenCalledWith(409);
});

test('returns 201 and sends activation email on success', async () => {
  mockGetUser.mockResolvedValue({ data: { user: { email: 'bob@broker.com' } }, error: null });
  mockSelectBroker.mockResolvedValue({ data: { id: 'broker-uuid', name: 'Bob Broker', brokerage: 'ABC Finance' }, error: null });
  mockSelectBuyer.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });
  mockInsert.mockResolvedValue({ data: [{ id: 'new-buyer-uuid' }], error: null });
  mockEmails.send.mockResolvedValue({ id: 'email-id' });
  const res = makeRes();
  await handler(makeReq({ client_name: 'Jane Smith', client_email: 'jane@buyer.com', verified_amount: 750000 }), res);
  expect(res.status).toHaveBeenCalledWith(201);
  expect(mockEmails.send).toHaveBeenCalledTimes(1);
  const emailCall = mockEmails.send.mock.calls[0][0];
  expect(emailCall.to).toContain('jane@buyer.com');
  expect(emailCall.text).toContain('Bob Broker');
  expect(emailCall.text).toContain('750,000');
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd /Users/edsteward/deed && npm test broker-submit-buyer
```

- [ ] **Step 3: Implement `api/broker-submit-buyer.js`**

```js
const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');
const crypto = require('crypto');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const resend = new Resend(process.env.RESEND_API_KEY);

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Validate JWT
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

  // Look up approved broker by email
  const { data: broker, error: brokerError } = await supabase
    .from('brokers')
    .select('id, name, brokerage')
    .eq('email', user.email)
    .eq('status', 'approved')
    .single();

  if (brokerError || !broker) return res.status(401).json({ error: 'Broker not found or not approved' });

  const { client_name, client_email, verified_amount, lender, expiry_date } = req.body || {};

  if (!client_name || !client_email || !verified_amount) {
    return res.status(400).json({ error: 'Missing required fields: client_name, client_email, verified_amount' });
  }

  // Check for duplicate buyer email
  const { data: existing } = await supabase
    .from('buyers')
    .select('id')
    .eq('email', client_email)
    .single();

  if (existing) {
    return res.status(409).json({ error: 'This buyer is already registered on DEED' });
  }

  // Generate activation token
  const activationToken = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { error: insertError } = await supabase
    .from('buyers')
    .insert([{
      name: client_name,
      email: client_email,
      verified: true,
      verification_method: 'broker_preapproval',
      verified_amount: verified_amount,
      max_price: verified_amount, // backward compatibility
      broker_id: broker.id,
      activation_token: activationToken,
      activation_token_expires_at: expiresAt,
      activation_complete: false,
      max_price: verified_amount,
    }]);

  if (insertError) {
    console.error('Buyer insert error:', insertError);
    return res.status(500).json({ error: 'Failed to register buyer' });
  }

  // Send activation email (Email 3)
  const activationLink = `${process.env.SITE_URL}/activate.html#token=${activationToken}`;
  const formattedAmount = `$${parseInt(verified_amount).toLocaleString('en-AU')}`;

  await resend.emails.send({
    from: 'DEED <noreply@deed-sooty.vercel.app>',
    to: [client_email],
    subject: `${broker.name} has registered you as a verified buyer on DEED`,
    text: [
      `${broker.name} at ${broker.brokerage} has confirmed your borrowing capacity and registered you on DEED.`,
      ``,
      `DEED is a private property platform where sellers list directly — no agents, flat $999 fee. You get access to properties before they go anywhere else.`,
      ``,
      `Your pre-approval of ${formattedAmount} is on file.`,
      ``,
      `Activate your profile and set your property preferences:`,
      activationLink,
      ``,
      `This link expires in 7 days.`,
    ].join('\n'),
  });

  return res.status(201).json({ success: true });
};
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
cd /Users/edsteward/deed && npm test broker-submit-buyer
```

Expected: `7 passed`

- [ ] **Step 5: Commit**

```bash
git add api/broker-submit-buyer.js api/__tests__/broker-submit-buyer.test.js
git commit -m "feat: add broker-submit-buyer serverless function"
```

---

## Task 8: `broker-resend-activation.js`

**Files:**
- Create: `api/broker-resend-activation.js`
- Create: `api/__tests__/broker-resend-activation.test.js`

- [ ] **Step 1: Write failing tests**

Create `api/__tests__/broker-resend-activation.test.js`:

```js
const mockGetUser = jest.fn();
const mockSelectBroker = jest.fn();
const mockSelectBuyer = jest.fn();
const mockUpdateBuyer = jest.fn();
const mockEmails = { send: jest.fn() };

const mockSupabase = {
  auth: { getUser: mockGetUser },
  from: jest.fn((table) => {
    if (table === 'brokers') return { select: jest.fn(() => ({ eq: jest.fn(() => ({ eq: jest.fn(() => ({ single: mockSelectBroker })) })) })) };
    if (table === 'buyers') return {
      select: jest.fn(() => ({ eq: jest.fn(() => ({ single: mockSelectBuyer })) })),
      update: jest.fn(() => ({ eq: jest.fn(() => ({ eq: mockUpdateBuyer })) })),
    };
  }),
};

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabase),
}));
jest.mock('resend', () => ({
  Resend: jest.fn(() => ({ emails: mockEmails })),
}));

const handler = require('../broker-resend-activation');

function makeReq(body = {}, auth = 'Bearer valid-token') {
  return { method: 'POST', body, headers: { authorization: auth } };
}
function makeRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

beforeEach(() => jest.clearAllMocks());

test('returns 401 with no auth header', async () => {
  const res = makeRes();
  await handler({ method: 'POST', headers: {}, body: {} }, res);
  expect(res.status).toHaveBeenCalledWith(401);
});

test('returns 400 when buyer_id is missing', async () => {
  mockGetUser.mockResolvedValue({ data: { user: { email: 'bob@broker.com' } }, error: null });
  mockSelectBroker.mockResolvedValue({ data: { id: 'broker-uuid', name: 'Bob', brokerage: 'ABC' }, error: null });
  const res = makeRes();
  await handler(makeReq({}), res);
  expect(res.status).toHaveBeenCalledWith(400);
});

test('returns 403 when buyer does not belong to broker', async () => {
  mockGetUser.mockResolvedValue({ data: { user: { email: 'bob@broker.com' } }, error: null });
  mockSelectBroker.mockResolvedValue({ data: { id: 'broker-uuid', name: 'Bob', brokerage: 'ABC' }, error: null });
  mockSelectBuyer.mockResolvedValue({ data: { broker_id: 'other-broker-uuid', activation_complete: false }, error: null });
  const res = makeRes();
  await handler(makeReq({ buyer_id: 'buyer-uuid' }), res);
  expect(res.status).toHaveBeenCalledWith(403);
});

test('returns 400 when buyer already activated', async () => {
  mockGetUser.mockResolvedValue({ data: { user: { email: 'bob@broker.com' } }, error: null });
  mockSelectBroker.mockResolvedValue({ data: { id: 'broker-uuid', name: 'Bob', brokerage: 'ABC' }, error: null });
  mockSelectBuyer.mockResolvedValue({ data: { broker_id: 'broker-uuid', activation_complete: true, email: 'jane@buyer.com', name: 'Jane', verified_amount: 750000 }, error: null });
  const res = makeRes();
  await handler(makeReq({ buyer_id: 'buyer-uuid' }), res);
  expect(res.status).toHaveBeenCalledWith(400);
  expect(res.json).toHaveBeenCalledWith({ error: 'Buyer has already activated their profile' });
});

test('returns 200 and sends new activation email on success', async () => {
  mockGetUser.mockResolvedValue({ data: { user: { email: 'bob@broker.com' } }, error: null });
  mockSelectBroker.mockResolvedValue({ data: { id: 'broker-uuid', name: 'Bob Broker', brokerage: 'ABC Finance' }, error: null });
  mockSelectBuyer.mockResolvedValue({ data: { broker_id: 'broker-uuid', activation_complete: false, email: 'jane@buyer.com', name: 'Jane', verified_amount: 750000 }, error: null });
  mockUpdateBuyer.mockResolvedValue({ error: null });
  mockEmails.send.mockResolvedValue({ id: 'email-id' });
  const res = makeRes();
  await handler(makeReq({ buyer_id: 'buyer-uuid' }), res);
  expect(res.status).toHaveBeenCalledWith(200);
  expect(mockEmails.send).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: Run — verify fail**

```bash
cd /Users/edsteward/deed && npm test broker-resend-activation
```

- [ ] **Step 3: Implement `api/broker-resend-activation.js`**

```js
const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');
const crypto = require('crypto');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const resend = new Resend(process.env.RESEND_API_KEY);

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

  const { data: broker } = await supabase
    .from('brokers')
    .select('id, name, brokerage')
    .eq('email', user.email)
    .eq('status', 'approved')
    .single();

  if (!broker) return res.status(401).json({ error: 'Broker not found or not approved' });

  const { buyer_id } = req.body || {};
  if (!buyer_id) return res.status(400).json({ error: 'Missing buyer_id' });

  const { data: buyer } = await supabase
    .from('buyers')
    .select('id, email, name, verified_amount, broker_id, activation_complete, activation_token_expires_at')
    .eq('id', buyer_id)
    .single();

  if (!buyer) return res.status(404).json({ error: 'Buyer not found' });
  if (buyer.broker_id !== broker.id) return res.status(403).json({ error: 'Forbidden' });
  if (buyer.activation_complete) return res.status(400).json({ error: 'Buyer has already activated their profile' });

  // Rate limit: don't allow resend if token was issued less than 10 minutes ago
  const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);
  const expires = new Date(buyer.activation_token_expires_at);
  const issuedAt = new Date(expires.getTime() - 7 * 24 * 60 * 60 * 1000);
  if (issuedAt > tenMinsAgo) {
    return res.status(429).json({ error: 'Please wait before resending' });
  }

  const newToken = crypto.randomUUID();
  const newExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  await supabase
    .from('buyers')
    .update({ activation_token: newToken, activation_token_expires_at: newExpires })
    .eq('id', buyer_id)
    .eq('activation_complete', false);

  const activationLink = `${process.env.SITE_URL}/activate.html#token=${newToken}`;
  const formattedAmount = `$${parseInt(buyer.verified_amount).toLocaleString('en-AU')}`;

  await resend.emails.send({
    from: 'DEED <noreply@deed-sooty.vercel.app>',
    to: [buyer.email],
    subject: `${broker.name} has registered you as a verified buyer on DEED`,
    text: [
      `${broker.name} at ${broker.brokerage} has confirmed your borrowing capacity and registered you on DEED.`,
      ``,
      `Your pre-approval of ${formattedAmount} is on file.`,
      ``,
      `Activate your profile:`,
      activationLink,
      ``,
      `This link expires in 7 days.`,
    ].join('\n'),
  });

  return res.status(200).json({ success: true });
};
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
cd /Users/edsteward/deed && npm test broker-resend-activation
```

Expected: `5 passed`

- [ ] **Step 5: Run all tests**

```bash
cd /Users/edsteward/deed && npm test
```

Expected: All 5 test files passing.

- [ ] **Step 6: Commit**

```bash
git add api/broker-resend-activation.js api/__tests__/broker-resend-activation.test.js
git commit -m "feat: add broker-resend-activation serverless function"
```

---

## Task 9: `activate.html`

**Files:**
- Create: `activate.html`

- [ ] **Step 1: Create `activate.html`**

Build the three-screen flow. Full file:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>DEED — Activate Your Buyer Profile</title>
  <link rel="stylesheet" href="deed-ui.css" />
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js"></script>
  <style>
    :root {
      --blue: #2563EB; --blue-hover: #1d4ed8; --blue-pale: #eff6ff;
      --border: #e5e7eb; --text: #111827; --muted: #6b7280; --dim: #9ca3af;
    }
    body { background: #fff; font-family: var(--font-body); color: var(--text); }
    .activate-wrap {
      min-height: 100vh; display: flex; align-items: center;
      justify-content: center; padding: 2rem 1rem;
    }
    .activate-card {
      width: 100%; max-width: 480px; background: #fff;
      border: 1px solid var(--border); border-radius: 16px;
      padding: 2.5rem 2rem; box-shadow: 0 4px 24px rgba(0,0,0,0.06);
    }
    .activate-logo {
      font-family: var(--font-display); font-size: 1.4rem;
      letter-spacing: 0.06em; color: var(--text); display: block;
      margin-bottom: 2rem; text-decoration: none;
    }
    .progress-wrap { display: flex; gap: 0.4rem; margin-bottom: 2rem; }
    .progress-dot {
      height: 4px; flex: 1; border-radius: 2px; background: var(--border);
      transition: background 0.2s;
    }
    .progress-dot.active { background: var(--blue); }
    .progress-dot.done { background: var(--blue); opacity: 0.4; }
    .screen { display: none; }
    .screen.active { display: block; }
    .screen-eyebrow {
      font-size: 0.65rem; font-weight: 600; letter-spacing: 0.14em;
      text-transform: uppercase; color: var(--blue); margin-bottom: 0.5rem;
    }
    .screen-heading {
      font-family: var(--font-display); font-size: 1.8rem;
      letter-spacing: 0.03em; line-height: 1.1; margin-bottom: 0.5rem;
    }
    .screen-sub { font-size: 0.875rem; color: var(--muted); margin-bottom: 1.75rem; }
    .form-field { margin-bottom: 1.25rem; }
    .form-label {
      display: block; font-size: 0.78rem; font-weight: 500;
      color: var(--text); margin-bottom: 0.375rem;
    }
    .form-input {
      width: 100%; padding: 0.625rem 0.875rem; border: 1px solid var(--border);
      border-radius: 8px; font-size: 0.9rem; font-family: inherit; color: var(--text);
      box-sizing: border-box; transition: border-color 0.15s;
    }
    .form-input:focus { outline: none; border-color: var(--blue); }
    .option-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.6rem; margin-bottom: 1rem; }
    .option-card {
      border: 1.5px solid var(--border); border-radius: 8px; padding: 0.75rem 0.875rem;
      cursor: pointer; font-size: 0.875rem; font-weight: 500; color: var(--muted);
      transition: all 0.15s; text-align: center; user-select: none;
    }
    .option-card:hover { border-color: var(--blue); color: var(--text); }
    .option-card.selected { border-color: var(--blue); color: var(--blue); background: var(--blue-pale); }
    .beds-row { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .bed-pill {
      padding: 0.4rem 0.875rem; border: 1.5px solid var(--border);
      border-radius: 999px; font-size: 0.8rem; font-weight: 500; color: var(--muted);
      cursor: pointer; transition: all 0.15s; user-select: none;
    }
    .bed-pill:hover { border-color: var(--blue); color: var(--text); }
    .bed-pill.selected { border-color: var(--blue); color: var(--blue); background: var(--blue-pale); }
    .suburb-list { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-top: 0.5rem; }
    .suburb-tag {
      display: flex; align-items: center; gap: 0.4rem; background: var(--blue-pale);
      color: var(--blue); font-size: 0.78rem; font-weight: 500; padding: 0.25rem 0.6rem;
      border-radius: 999px;
    }
    .suburb-tag button {
      background: none; border: none; cursor: pointer; color: var(--blue);
      font-size: 0.9rem; padding: 0; line-height: 1;
    }
    .add-suburb-row { display: flex; gap: 0.5rem; margin-top: 0.5rem; }
    .add-suburb-row input { flex: 1; }
    .add-suburb-row button {
      padding: 0.625rem 0.875rem; background: var(--blue); color: #fff;
      border: none; border-radius: 8px; cursor: pointer; font-size: 0.8rem; font-weight: 500;
    }
    .btn-primary {
      width: 100%; padding: 0.875rem; background: var(--blue); color: #fff;
      border: none; border-radius: 10px; font-size: 0.95rem; font-weight: 600;
      cursor: pointer; margin-top: 0.5rem; transition: background 0.15s;
    }
    .btn-primary:hover { background: var(--blue-hover); }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
    /* Reuse verified-card styles from qualify.html */
    .verified-card {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      border-radius: 16px; padding: 2rem; color: #fff; margin-bottom: 1.5rem;
    }
    .verified-badge-row { display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.75rem; }
    .verified-pulse {
      width: 8px; height: 8px; border-radius: 50%; background: #22c55e;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(34,197,94,0.4); }
      50% { box-shadow: 0 0 0 6px rgba(34,197,94,0); }
    }
    .verified-badge-text { font-size: 0.65rem; font-weight: 600; letter-spacing: 0.16em; text-transform: uppercase; color: #22c55e; }
    .result-name { font-family: var(--font-display); font-size: 1.4rem; letter-spacing: 0.03em; margin-bottom: 0.25rem; }
    .result-range { font-family: var(--font-display); font-size: 2rem; letter-spacing: 0.04em; color: #60a5fa; line-height: 1; margin-bottom: 0.25rem; }
    .result-sub { font-size: 0.7rem; color: rgba(255,255,255,0.5); }
    .error-card {
      background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px;
      padding: 1.5rem; text-align: center;
    }
    .error-card h3 { font-size: 1rem; font-weight: 600; color: #991b1b; margin-bottom: 0.5rem; }
    .error-card p { font-size: 0.875rem; color: #7f1d1d; }
    .loading-state { text-align: center; padding: 3rem; color: var(--muted); }
  </style>
</head>
<body>
<div class="activate-wrap">
  <div class="activate-card">
    <a href="index.html" class="activate-logo">DEED</a>

    <div id="loading-state" class="loading-state">Loading your profile…</div>

    <div id="error-state" style="display:none">
      <div class="error-card">
        <h3 id="error-heading">Link not valid</h3>
        <p id="error-body">This activation link is invalid or has expired. Contact your broker for a new invitation.</p>
      </div>
    </div>

    <div id="screens" style="display:none">
      <div class="progress-wrap">
        <div class="progress-dot active" id="dot-1"></div>
        <div class="progress-dot" id="dot-2"></div>
        <div class="progress-dot" id="dot-3"></div>
      </div>

      <!-- Screen 1: Confirm details -->
      <div class="screen active" id="screen-1">
        <p class="screen-eyebrow">Step 01</p>
        <h2 class="screen-heading">WELCOME TO<br/>DEED</h2>
        <p class="screen-sub" id="broker-intro">Your broker has confirmed your borrowing capacity and registered you on DEED.</p>
        <div class="form-field">
          <label class="form-label">Your name</label>
          <input type="text" id="buyer-name" class="form-input" placeholder="Full name" />
        </div>
        <div class="form-field">
          <label class="form-label">Phone <span style="color:var(--dim)">(optional)</span></label>
          <input type="tel" id="buyer-phone" class="form-input" placeholder="04xx xxx xxx" />
        </div>
        <button class="btn-primary" onclick="goToScreen(2)">Continue →</button>
      </div>

      <!-- Screen 2: Preferences -->
      <div class="screen" id="screen-2">
        <p class="screen-eyebrow">Step 02</p>
        <h2 class="screen-heading">WHAT ARE YOU<br/>LOOKING FOR?</h2>
        <p class="screen-sub">We'll notify you the moment a matching property lists — before it goes anywhere else.</p>

        <div class="form-field">
          <label class="form-label">Suburbs</label>
          <div id="suburb-tags" class="suburb-list"></div>
          <div class="add-suburb-row">
            <input type="text" id="suburb-input" class="form-input" placeholder="e.g. Burleigh Heads" />
            <button onclick="addSuburb()">Add</button>
          </div>
        </div>

        <div class="form-field">
          <label class="form-label">Property type</label>
          <div class="option-grid">
            <div class="option-card" data-field="type" data-value="house" onclick="selectOption(this)">House</div>
            <div class="option-card" data-field="type" data-value="unit" onclick="selectOption(this)">Unit</div>
            <div class="option-card" data-field="type" data-value="townhouse" onclick="selectOption(this)">Townhouse</div>
            <div class="option-card" data-field="type" data-value="land" onclick="selectOption(this)">Land</div>
          </div>
        </div>

        <div class="form-field">
          <label class="form-label">Minimum bedrooms</label>
          <div class="beds-row">
            <div class="bed-pill" data-beds="1" onclick="selectBeds(this)">1</div>
            <div class="bed-pill" data-beds="2" onclick="selectBeds(this)">2</div>
            <div class="bed-pill" data-beds="3" onclick="selectBeds(this)">3</div>
            <div class="bed-pill" data-beds="4" onclick="selectBeds(this)">4</div>
            <div class="bed-pill" data-beds="5" onclick="selectBeds(this)">5+</div>
          </div>
        </div>

        <button class="btn-primary" onclick="goToScreen(3)">Continue →</button>
      </div>

      <!-- Screen 3: Verified profile card -->
      <div class="screen" id="screen-3">
        <p class="screen-eyebrow">Step 03</p>
        <h2 class="screen-heading" style="margin-bottom:1.25rem">YOU'RE<br/>VERIFIED.</h2>

        <div class="verified-card">
          <div class="verified-badge-row">
            <div class="verified-pulse"></div>
            <span class="verified-badge-text">DEED Verified Buyer</span>
          </div>
          <p class="result-name" id="profile-name"></p>
          <p class="result-range" id="profile-amount"></p>
          <p class="result-sub">Formally pre-approved borrowing capacity</p>
        </div>

        <p style="font-size:0.82rem;color:var(--muted);margin-bottom:1.5rem;">
          We'll notify you at <strong id="profile-email"></strong> the moment a matching property lists.
        </p>

        <button class="btn-primary" id="activate-btn" onclick="submitActivation()">
          Browse listings →
        </button>
      </div>
    </div>
  </div>
</div>

<script>
  const SUPABASE_URL = 'https://jtpykhrdjkzhcbswrhzo.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0cHlraHJkamt6aGNic3dyaHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MTYxMjAsImV4cCI6MjA4OTQ5MjEyMH0.U3q_ktH3vN7loxEgUg-oJw9mXYYwhMC0aL6bK9YBVRI';

  let buyerEmail = '';
  let activationToken = '';
  const suburbs = [];
  const selectedTypes = [];
  let selectedBeds = 1;

  // Extract token from hash fragment
  function getTokenFromHash() {
    const hash = window.location.hash.slice(1);
    const params = new URLSearchParams(hash);
    return params.get('token');
  }

  function fmt(n) {
    if (n >= 1000000) return '$' + (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return '$' + Math.round(n / 1000) + 'k';
    return '$' + n.toLocaleString('en-AU');
  }

  async function loadBuyerData() {
    activationToken = getTokenFromHash();
    if (!activationToken) {
      showError('Link not valid', 'This activation link is missing. Check your email for the original link.');
      return;
    }

    try {
      const res = await fetch(`/api/get-buyer-by-token?token=${encodeURIComponent(activationToken)}`);
      const data = await res.json();

      if (res.status === 404) {
        showError('Link not valid', 'This activation link is invalid. Contact your broker for a new invitation.');
        return;
      }
      if (res.status === 410 && data.error === 'Already activated') {
        showError('Already activated', 'You\'ve already activated your DEED profile. Browse listings below.');
        document.getElementById('error-card').innerHTML += '<a href="browse.html" style="display:inline-block;margin-top:1rem;color:#2563EB;font-weight:500;">Browse listings →</a>';
        return;
      }
      if (res.status === 410) {
        showError('Link expired', 'This activation link has expired. Ask your broker to send you a new invitation.');
        return;
      }
      if (!res.ok) {
        showError('Something went wrong', 'Please try again or contact your broker.');
        return;
      }

      // Pre-fill UI
      document.getElementById('buyer-name').value = data.name || '';
      document.getElementById('profile-name').textContent = data.name || '';
      document.getElementById('profile-amount').textContent = fmt(data.verified_amount);
      if (data.broker_name) {
        document.getElementById('broker-intro').textContent =
          `${data.broker_name} at ${data.brokerage} has confirmed your borrowing capacity and registered you on DEED.`;
      }

      document.getElementById('loading-state').style.display = 'none';
      document.getElementById('screens').style.display = 'block';

    } catch (err) {
      showError('Something went wrong', 'Please refresh and try again.');
    }
  }

  function showError(heading, body) {
    document.getElementById('loading-state').style.display = 'none';
    document.getElementById('error-heading').textContent = heading;
    document.getElementById('error-body').textContent = body;
    document.getElementById('error-state').style.display = 'block';
  }

  let currentScreen = 1;

  function goToScreen(n) {
    if (n === 2 && !document.getElementById('buyer-name').value.trim()) {
      document.getElementById('buyer-name').focus();
      return;
    }
    document.getElementById(`screen-${currentScreen}`).classList.remove('active');
    document.getElementById(`screen-${n}`).classList.add('active');
    document.getElementById(`dot-${currentScreen}`).classList.remove('active');
    document.getElementById(`dot-${currentScreen}`).classList.add('done');
    document.getElementById(`dot-${n}`).classList.add('active');

    if (n === 3) {
      // Update profile card before showing
      const name = document.getElementById('buyer-name').value.trim();
      document.getElementById('profile-name').textContent = name;
    }
    currentScreen = n;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function selectOption(el) {
    const field = el.dataset.field;
    const value = el.dataset.value;
    document.querySelectorAll(`[data-field="${field}"]`).forEach(c => c.classList.remove('selected'));
    el.classList.add('selected');
  }

  function selectBeds(el) {
    document.querySelectorAll('.bed-pill').forEach(p => p.classList.remove('selected'));
    el.classList.add('selected');
    selectedBeds = parseInt(el.dataset.beds);
  }

  function addSuburb() {
    const input = document.getElementById('suburb-input');
    const val = input.value.trim();
    if (!val || suburbs.length >= 5 || suburbs.includes(val)) return;
    suburbs.push(val);
    renderSuburbs();
    input.value = '';
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('suburb-input').addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); addSuburb(); }
    });
  });

  function removeSuburb(val) {
    const idx = suburbs.indexOf(val);
    if (idx > -1) suburbs.splice(idx, 1);
    renderSuburbs();
  }

  function renderSuburbs() {
    const container = document.getElementById('suburb-tags');
    container.innerHTML = suburbs.map(s =>
      `<span class="suburb-tag">${s}<button onclick="removeSuburb('${s}')" aria-label="Remove ${s}">×</button></span>`
    ).join('');
  }

  async function submitActivation() {
    const btn = document.getElementById('activate-btn');
    btn.disabled = true;
    btn.textContent = 'Activating…';

    const selectedType = document.querySelector('[data-field="type"].selected');
    const propertyTypes = selectedType ? [selectedType.dataset.value] : [];

    try {
      const res = await fetch('/api/buyer-activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: activationToken,
          name: document.getElementById('buyer-name').value.trim(),
          phone: document.getElementById('buyer-phone').value.trim() || null,
          suburbs,
          property_types: propertyTypes,
          min_beds: selectedBeds,
        }),
      });

      if (res.ok) {
        window.location.href = 'browse.html';
      } else {
        const data = await res.json();
        btn.disabled = false;
        btn.textContent = 'Browse listings →';
        alert(data.error || 'Something went wrong. Please try again.');
      }
    } catch (err) {
      btn.disabled = false;
      btn.textContent = 'Browse listings →';
      alert('Something went wrong. Please try again.');
    }
  }

  loadBuyerData();
</script>
</body>
</html>
```

- [ ] **Step 2: Manual test (local)**

```bash
cd /Users/edsteward/deed && vercel dev
```

Open: `http://localhost:3000/activate.html#token=invalid-token`

Expected: Error state showing "Link not valid"

- [ ] **Step 3: Commit**

```bash
git add activate.html
git commit -m "feat: add buyer activation page with 3-screen flow"
```

---

## Task 10: `brokers.html`

**Files:**
- Create: `brokers.html`

- [ ] **Step 1: Create `brokers.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>DEED — Broker Partner Portal</title>
  <link rel="stylesheet" href="deed-ui.css" />
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js"></script>
  <style>
    :root {
      --blue:#2563EB; --blue-hover:#1d4ed8; --blue-pale:#eff6ff; --blue-muted:rgba(37,99,235,0.10);
      --border:#e5e7eb; --text:#111827; --muted:#6b7280; --dim:#9ca3af;
    }
    body { background:#f7f8fa; font-family:var(--font-body); color:var(--text); }

    /* ── NAV ─────────────────────────────────── */
    .nav {
      background:#fff; border-bottom:1px solid var(--border); height:64px;
      display:flex; align-items:center; justify-content:space-between;
      padding:0 2rem; position:sticky; top:0; z-index:100;
    }
    .nav-logo { font-family:var(--font-display); font-size:1.5rem; letter-spacing:0.06em; color:var(--text); text-decoration:none; }
    .nav-right { display:flex; align-items:center; gap:1rem; }
    .btn-logout {
      font-size:0.8rem; color:var(--muted); background:none; border:none;
      cursor:pointer; padding:0.4rem 0.75rem;
    }
    .btn-logout:hover { color:var(--text); }

    /* ── PAGE STATES ──────────────────────────── */
    .page { max-width:1000px; margin:0 auto; padding:3rem 2rem; }

    /* ── LANDING STATE ────────────────────────── */
    .landing-grid {
      display:grid; grid-template-columns:1fr 1fr; gap:4rem;
      align-items:start;
    }
    .landing-eyebrow {
      font-size:0.65rem; font-weight:600; letter-spacing:0.14em;
      text-transform:uppercase; color:var(--blue); margin-bottom:0.75rem;
    }
    .landing-heading {
      font-family:var(--font-display); font-size:2.5rem;
      letter-spacing:0.03em; line-height:1.05; margin-bottom:1rem;
    }
    .landing-sub { font-size:0.95rem; color:var(--muted); line-height:1.65; margin-bottom:2rem; }
    .value-list { list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:0.75rem; }
    .value-list li {
      font-size:0.875rem; color:var(--text); padding-left:1.25rem; position:relative;
    }
    .value-list li::before {
      content:'✓'; position:absolute; left:0; color:var(--blue); font-weight:600;
    }

    /* ── FORM CARD ────────────────────────────── */
    .form-card {
      background:#fff; border:1px solid var(--border); border-radius:16px;
      padding:2rem; box-shadow:0 2px 12px rgba(0,0,0,0.04);
    }
    .form-card-title { font-size:1rem; font-weight:600; margin-bottom:1.5rem; }
    .form-field { margin-bottom:1.1rem; }
    .form-label { display:block; font-size:0.78rem; font-weight:500; color:var(--text); margin-bottom:0.35rem; }
    .form-input {
      width:100%; padding:0.6rem 0.875rem; border:1px solid var(--border);
      border-radius:8px; font-size:0.875rem; font-family:inherit; color:var(--text);
      box-sizing:border-box; transition:border-color 0.15s;
    }
    .form-input:focus { outline:none; border-color:var(--blue); }
    .btn-primary {
      width:100%; padding:0.8rem; background:var(--blue); color:#fff;
      border:none; border-radius:10px; font-size:0.9rem; font-weight:600;
      cursor:pointer; transition:background 0.15s; margin-top:0.25rem;
    }
    .btn-primary:hover { background:var(--blue-hover); }
    .btn-primary:disabled { opacity:0.6; cursor:not-allowed; }
    .form-toggle {
      text-align:center; margin-top:1rem; font-size:0.8rem; color:var(--muted);
    }
    .form-toggle a { color:var(--blue); text-decoration:none; cursor:pointer; font-weight:500; }
    .form-success {
      background:#f0fdf4; border:1px solid #bbf7d0; border-radius:12px;
      padding:1.5rem; text-align:center;
    }
    .form-success h3 { font-size:0.95rem; font-weight:600; color:#15803d; margin-bottom:0.5rem; }
    .form-success p { font-size:0.82rem; color:#166534; }
    .inline-error { font-size:0.78rem; color:#dc2626; margin-top:0.4rem; }

    /* ── PENDING STATE ────────────────────────── */
    .pending-wrap { max-width:480px; margin:0 auto; text-align:center; padding:4rem 0; }
    .pending-icon { font-size:2.5rem; margin-bottom:1rem; }
    .pending-heading { font-family:var(--font-display); font-size:1.8rem; letter-spacing:0.03em; margin-bottom:0.75rem; }
    .pending-sub { font-size:0.875rem; color:var(--muted); line-height:1.65; }

    /* ── DASHBOARD STATE ──────────────────────── */
    .dash-header { margin-bottom:2rem; }
    .dash-name { font-family:var(--font-display); font-size:1.8rem; letter-spacing:0.03em; }
    .dash-brokerage { font-size:0.82rem; color:var(--muted); margin-top:0.2rem; }
    .stats-row { display:grid; grid-template-columns:repeat(3,1fr); gap:1rem; margin-bottom:2rem; }
    .stat-card {
      background:#fff; border:1px solid var(--border); border-radius:12px;
      padding:1.25rem 1.5rem;
    }
    .stat-val { font-family:var(--font-display); font-size:2rem; letter-spacing:0.04em; color:var(--blue); line-height:1; }
    .stat-label { font-size:0.7rem; font-weight:500; letter-spacing:0.1em; text-transform:uppercase; color:var(--muted); margin-top:0.25rem; }
    .table-wrap {
      background:#fff; border:1px solid var(--border); border-radius:12px;
      overflow:hidden; margin-bottom:1.5rem;
    }
    .table-header {
      display:flex; align-items:center; justify-content:space-between;
      padding:1.25rem 1.5rem; border-bottom:1px solid var(--border);
    }
    .table-header-title { font-size:0.875rem; font-weight:600; }
    .btn-add {
      padding:0.5rem 1rem; background:var(--blue); color:#fff;
      border:none; border-radius:8px; font-size:0.8rem; font-weight:600;
      cursor:pointer; transition:background 0.15s;
    }
    .btn-add:hover { background:var(--blue-hover); }
    table { width:100%; border-collapse:collapse; }
    th {
      font-size:0.65rem; font-weight:600; letter-spacing:0.1em; text-transform:uppercase;
      color:var(--dim); padding:0.75rem 1.5rem; text-align:left;
      border-bottom:1px solid var(--border);
    }
    td { padding:1rem 1.5rem; font-size:0.875rem; border-bottom:1px solid var(--border); vertical-align:middle; }
    tr:last-child td { border-bottom:none; }
    .badge-active { font-size:0.68rem; font-weight:500; padding:0.2rem 0.6rem; border-radius:999px; background:#f0fdf4; color:#15803d; border:1px solid #bbf7d0; }
    .badge-pending { font-size:0.68rem; font-weight:500; padding:0.2rem 0.6rem; border-radius:999px; background:#fffbeb; color:#92400e; border:1px solid #fde68a; }
    .btn-resend {
      font-size:0.75rem; color:var(--blue); background:none; border:1px solid var(--blue);
      border-radius:6px; padding:0.25rem 0.6rem; cursor:pointer; transition:background 0.15s;
    }
    .btn-resend:hover { background:var(--blue-pale); }
    .btn-resend:disabled { opacity:0.4; cursor:not-allowed; }
    .empty-state { padding:3rem; text-align:center; color:var(--muted); font-size:0.875rem; }

    /* ── ADD BUYER FORM ───────────────────────── */
    .add-buyer-form {
      background:var(--blue-pale); border:1px solid #bfdbfe;
      border-radius:12px; padding:1.5rem; margin-bottom:1.5rem; display:none;
    }
    .add-buyer-form.open { display:block; }
    .add-buyer-title { font-size:0.875rem; font-weight:600; margin-bottom:1.25rem; }
    .form-row { display:grid; grid-template-columns:1fr 1fr; gap:1rem; }
    .add-buyer-actions { display:flex; gap:0.75rem; margin-top:0.75rem; }
    .btn-submit-buyer {
      padding:0.65rem 1.5rem; background:var(--blue); color:#fff; border:none;
      border-radius:8px; font-size:0.875rem; font-weight:600; cursor:pointer;
    }
    .btn-submit-buyer:disabled { opacity:0.6; cursor:not-allowed; }
    .btn-cancel {
      padding:0.65rem 1rem; background:#fff; color:var(--muted); border:1px solid var(--border);
      border-radius:8px; font-size:0.875rem; cursor:pointer;
    }
    .form-error { font-size:0.78rem; color:#dc2626; margin-top:0.5rem; }

    @media (max-width:768px) {
      .landing-grid { grid-template-columns:1fr; gap:2rem; }
      .stats-row { grid-template-columns:1fr; }
      .form-row { grid-template-columns:1fr; }
      .page { padding:2rem 1rem; }
    }
  </style>
</head>
<body>

<nav class="nav">
  <a href="index.html" class="nav-logo">DEED</a>
  <div class="nav-right">
    <span id="nav-broker-name" style="font-size:0.8rem;color:var(--muted);display:none;"></span>
    <button class="btn-logout" id="logout-btn" style="display:none;" onclick="logout()">Log out</button>
  </div>
</nav>

<div id="state-loading" class="page" style="text-align:center;padding-top:4rem;color:var(--muted);">
  Loading…
</div>

<!-- ── STATE 1: LANDING (unauthenticated) ──────────────────── -->
<div id="state-landing" class="page" style="display:none;">
  <div class="landing-grid">
    <div>
      <p class="landing-eyebrow">Broker Partner Programme</p>
      <h1 class="landing-heading">HELP YOUR CLIENTS<br/>FIND THE DEAL.</h1>
      <p class="landing-sub">Register pre-approved buyers on DEED and they'll be notified the moment a matching property lists — before it goes anywhere else. You get a faster path from pre-approval to settlement.</p>
      <ul class="value-list">
        <li>Register a client in under 60 seconds</li>
        <li>Client receives a co-branded activation email</li>
        <li>Your buyers show as formally pre-approved to sellers</li>
        <li>You're notified when your client makes an offer</li>
      </ul>
    </div>

    <div>
      <div class="form-card" id="register-card">
        <p class="form-card-title" id="form-card-title">Apply to join</p>

        <!-- Registration form -->
        <div id="register-form">
          <div class="form-field">
            <label class="form-label">Full name</label>
            <input type="text" id="reg-name" class="form-input" placeholder="Jane Smith" />
          </div>
          <div class="form-field">
            <label class="form-label">Email</label>
            <input type="email" id="reg-email" class="form-input" placeholder="jane@brokerage.com.au" />
          </div>
          <div class="form-field">
            <label class="form-label">Brokerage name</label>
            <input type="text" id="reg-brokerage" class="form-input" placeholder="ABC Finance" />
          </div>
          <div class="form-field">
            <label class="form-label">ASIC licence number</label>
            <input type="text" id="reg-asic" class="form-input" placeholder="Credit Representative No." />
          </div>
          <div class="form-field">
            <label class="form-label">Phone <span style="color:var(--dim)">(optional)</span></label>
            <input type="tel" id="reg-phone" class="form-input" placeholder="04xx xxx xxx" />
          </div>
          <div id="reg-error" class="inline-error" style="display:none;"></div>
          <button class="btn-primary" id="reg-btn" onclick="submitRegistration()">Apply to join →</button>
          <div class="form-toggle">Already approved? <a onclick="showLoginForm()">Log in</a></div>
        </div>

        <!-- Login form (toggled) -->
        <div id="login-form" style="display:none;">
          <div class="form-field">
            <label class="form-label">Your email address</label>
            <input type="email" id="login-email" class="form-input" placeholder="you@brokerage.com.au" />
          </div>
          <div id="login-error" class="inline-error" style="display:none;"></div>
          <button class="btn-primary" id="login-btn" onclick="sendMagicLink()">Send login link →</button>
          <div class="form-toggle"><a onclick="showRegisterForm()">← Back to registration</a></div>
        </div>

        <!-- Success states -->
        <div id="reg-success" style="display:none;" class="form-success">
          <h3>Application received</h3>
          <p>We'll verify your ASIC licence and email you within 24 hours.</p>
        </div>
        <div id="login-success" style="display:none;" class="form-success">
          <h3>Check your inbox</h3>
          <p>We've sent a login link to <strong id="login-email-sent"></strong>. It expires in 1 hour.</p>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- ── STATE 2: PENDING APPROVAL ────────────────────────────── -->
<div id="state-pending" class="page" style="display:none;">
  <div class="pending-wrap">
    <div class="pending-icon">⏳</div>
    <h2 class="pending-heading">APPLICATION UNDER REVIEW</h2>
    <p class="pending-sub">Your licence is being verified. You'll receive an email once approved — usually within 24 hours.</p>
  </div>
</div>

<!-- ── STATE 3: DASHBOARD ────────────────────────────────────── -->
<div id="state-dashboard" class="page" style="display:none;">

  <div class="dash-header">
    <h1 class="dash-name" id="dash-name">Welcome</h1>
    <p class="dash-brokerage" id="dash-brokerage"></p>
  </div>

  <div class="stats-row">
    <div class="stat-card">
      <div class="stat-val" id="stat-submitted">—</div>
      <div class="stat-label">Buyers submitted</div>
    </div>
    <div class="stat-card">
      <div class="stat-val" id="stat-activated">—</div>
      <div class="stat-label">Buyers activated</div>
    </div>
    <div class="stat-card">
      <div class="stat-val" id="stat-pending">—</div>
      <div class="stat-label">Pending activation</div>
    </div>
  </div>

  <!-- Add buyer form -->
  <div class="add-buyer-form" id="add-buyer-form">
    <p class="add-buyer-title">Register a pre-approved buyer</p>
    <div class="form-row">
      <div class="form-field">
        <label class="form-label">Client name</label>
        <input type="text" id="ab-name" class="form-input" placeholder="Jane Smith" />
      </div>
      <div class="form-field">
        <label class="form-label">Client email</label>
        <input type="email" id="ab-email" class="form-input" placeholder="jane@email.com" />
      </div>
    </div>
    <div class="form-row">
      <div class="form-field">
        <label class="form-label">Pre-approved amount (AUD)</label>
        <input type="number" id="ab-amount" class="form-input" placeholder="750000" min="100000" />
      </div>
      <div class="form-field">
        <label class="form-label">Lender <span style="color:var(--dim)">(optional)</span></label>
        <input type="text" id="ab-lender" class="form-input" placeholder="Commonwealth Bank" />
      </div>
    </div>
    <div class="form-field" style="max-width:280px;">
      <label class="form-label">Pre-approval expiry <span style="color:var(--dim)">(optional)</span></label>
      <input type="date" id="ab-expiry" class="form-input" />
    </div>
    <div id="ab-error" class="form-error" style="display:none;"></div>
    <div class="add-buyer-actions">
      <button class="btn-submit-buyer" id="ab-submit" onclick="submitBuyer()">Register buyer →</button>
      <button class="btn-cancel" onclick="closeAddForm()">Cancel</button>
    </div>
  </div>

  <!-- Buyers table -->
  <div class="table-wrap">
    <div class="table-header">
      <span class="table-header-title">Your buyers</span>
      <button class="btn-add" onclick="openAddForm()">+ Add a buyer</button>
    </div>
    <div id="buyers-table-body">
      <div class="empty-state">No buyers registered yet. Add your first pre-approved client above.</div>
    </div>
  </div>

</div>

<script>
  const SUPABASE_URL = 'https://jtpykhrdjkzhcbswrhzo.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0cHlraHJkamt6aGNic3dyaHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MTYxMjAsImV4cCI6MjA4OTQ5MjEyMH0.U3q_ktH3vN7loxEgUg-oJw9mXYYwhMC0aL6bK9YBVRI';
  const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  let currentSession = null;

  function fmt(n) {
    if (!n) return '—';
    if (n >= 1000000) return '$' + (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return '$' + Math.round(n / 1000) + 'k';
    return '$' + n.toLocaleString('en-AU');
  }

  function fmtDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  async function init() {
    // Supabase picks up magic link tokens from the URL hash automatically
    const { data: { session } } = await db.auth.getSession();
    currentSession = session;

    if (!session) {
      showState('landing');
      return;
    }

    // Fetch broker record to determine status
    try {
      const res = await fetch('/api/get-broker-status', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
      if (!res.ok) { showState('landing'); return; }
      const broker = await res.json();

      document.getElementById('nav-broker-name').textContent = broker.name;
      document.getElementById('nav-broker-name').style.display = '';
      document.getElementById('logout-btn').style.display = '';

      if (broker.status === 'pending') {
        showState('pending');
      } else if (broker.status === 'approved') {
        document.getElementById('dash-name').textContent = broker.name;
        document.getElementById('dash-brokerage').textContent = broker.brokerage;
        showState('dashboard');
        loadBuyers();
      } else {
        showState('landing');
      }
    } catch (err) {
      showState('landing');
    }
  }

  function showState(state) {
    document.getElementById('state-loading').style.display = 'none';
    document.getElementById('state-landing').style.display = state === 'landing' ? 'block' : 'none';
    document.getElementById('state-pending').style.display = state === 'pending' ? 'block' : 'none';
    document.getElementById('state-dashboard').style.display = state === 'dashboard' ? 'block' : 'none';
  }

  function showRegisterForm() {
    document.getElementById('register-form').style.display = 'block';
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('reg-success').style.display = 'none';
    document.getElementById('login-success').style.display = 'none';
    document.getElementById('form-card-title').textContent = 'Apply to join';
  }

  function showLoginForm() {
    document.getElementById('register-form').style.display = 'none';
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('form-card-title').textContent = 'Log in to your portal';
  }

  async function submitRegistration() {
    const btn = document.getElementById('reg-btn');
    const errEl = document.getElementById('reg-error');
    errEl.style.display = 'none';

    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const brokerage = document.getElementById('reg-brokerage').value.trim();
    const asic_licence = document.getElementById('reg-asic').value.trim();
    const phone = document.getElementById('reg-phone').value.trim();

    if (!name || !email || !brokerage || !asic_licence) {
      errEl.textContent = 'Please fill in all required fields.';
      errEl.style.display = 'block';
      return;
    }

    btn.disabled = true; btn.textContent = 'Submitting…';

    try {
      const res = await fetch('/api/broker-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, brokerage, asic_licence, phone }),
      });

      const data = await res.json();

      if (res.status === 409) {
        errEl.textContent = 'An account with this email already exists. Use the login form below.';
        errEl.style.display = 'block';
        btn.disabled = false; btn.textContent = 'Apply to join →';
        return;
      }

      if (!res.ok) {
        errEl.textContent = data.error || 'Registration failed. Please try again.';
        errEl.style.display = 'block';
        btn.disabled = false; btn.textContent = 'Apply to join →';
        return;
      }

      localStorage.setItem('deedBrokerEmail', email);
      document.getElementById('register-form').style.display = 'none';
      document.getElementById('reg-success').style.display = 'block';

    } catch (err) {
      errEl.textContent = 'Something went wrong. Please try again.';
      errEl.style.display = 'block';
      btn.disabled = false; btn.textContent = 'Apply to join →';
    }
  }

  async function sendMagicLink() {
    const btn = document.getElementById('login-btn');
    const errEl = document.getElementById('login-error');
    errEl.style.display = 'none';

    const email = document.getElementById('login-email').value.trim();
    if (!email) {
      errEl.textContent = 'Please enter your email address.';
      errEl.style.display = 'block';
      return;
    }

    btn.disabled = true; btn.textContent = 'Sending…';

    const { error } = await db.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/brokers.html` },
    });

    if (error) {
      errEl.textContent = 'Failed to send login link. Please try again.';
      errEl.style.display = 'block';
      btn.disabled = false; btn.textContent = 'Send login link →';
      return;
    }

    document.getElementById('login-email-sent').textContent = email;
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('login-success').style.display = 'block';
  }

  async function logout() {
    await db.auth.signOut();
    currentSession = null;
    document.getElementById('nav-broker-name').style.display = 'none';
    document.getElementById('logout-btn').style.display = 'none';
    showState('landing');
  }

  async function loadBuyers() {
    if (!currentSession) return;
    try {
      const res = await fetch('/api/get-broker-buyers', {
        headers: { 'Authorization': `Bearer ${currentSession.access_token}` },
      });
      if (!res.ok) return;
      const buyers = await res.json();
      renderBuyersTable(buyers);
    } catch (err) {
      console.error('Failed to load buyers:', err);
    }
  }

  function renderBuyersTable(buyers) {
    const total = buyers.length;
    const activated = buyers.filter(b => b.activation_complete).length;
    const pending = total - activated;

    document.getElementById('stat-submitted').textContent = total;
    document.getElementById('stat-activated').textContent = activated;
    document.getElementById('stat-pending').textContent = pending;

    const container = document.getElementById('buyers-table-body');

    if (buyers.length === 0) {
      container.innerHTML = '<div class="empty-state">No buyers registered yet. Add your first pre-approved client above.</div>';
      return;
    }

    container.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Pre-approved</th>
            <th>Status</th>
            <th>Registered</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${buyers.map(b => `
            <tr>
              <td>${b.name}</td>
              <td>${fmt(b.verified_amount)}</td>
              <td>${b.activation_complete
                ? '<span class="badge-active">Active</span>'
                : '<span class="badge-pending">Pending activation</span>'
              }</td>
              <td>${fmtDate(b.created_at)}</td>
              <td>${b.activation_complete
                ? '<button class="btn-resend" disabled>Activated</button>'
                : `<button class="btn-resend" onclick="resendActivation('${b.id}', this)">Resend email</button>`
              }</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  function openAddForm() {
    document.getElementById('add-buyer-form').classList.add('open');
    document.getElementById('ab-name').focus();
  }

  function closeAddForm() {
    document.getElementById('add-buyer-form').classList.remove('open');
    document.getElementById('ab-error').style.display = 'none';
    ['ab-name','ab-email','ab-amount','ab-lender','ab-expiry'].forEach(id => {
      document.getElementById(id).value = '';
    });
  }

  async function submitBuyer() {
    const btn = document.getElementById('ab-submit');
    const errEl = document.getElementById('ab-error');
    errEl.style.display = 'none';

    const client_name = document.getElementById('ab-name').value.trim();
    const client_email = document.getElementById('ab-email').value.trim();
    const verified_amount = parseInt(document.getElementById('ab-amount').value);
    const lender = document.getElementById('ab-lender').value.trim();
    const expiry_date = document.getElementById('ab-expiry').value;

    if (!client_name || !client_email || !verified_amount) {
      errEl.textContent = 'Client name, email, and pre-approved amount are required.';
      errEl.style.display = 'block';
      return;
    }

    btn.disabled = true; btn.textContent = 'Registering…';

    try {
      const res = await fetch('/api/broker-submit-buyer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentSession.access_token}`,
        },
        body: JSON.stringify({ client_name, client_email, verified_amount, lender, expiry_date }),
      });

      const data = await res.json();

      if (res.status === 409) {
        errEl.textContent = 'This buyer is already registered on DEED.';
        errEl.style.display = 'block';
        btn.disabled = false; btn.textContent = 'Register buyer →';
        return;
      }

      if (!res.ok) {
        errEl.textContent = data.error || 'Failed to register buyer. Please try again.';
        errEl.style.display = 'block';
        btn.disabled = false; btn.textContent = 'Register buyer →';
        return;
      }

      closeAddForm();
      loadBuyers();

    } catch (err) {
      errEl.textContent = 'Something went wrong. Please try again.';
      errEl.style.display = 'block';
      btn.disabled = false; btn.textContent = 'Register buyer →';
    }
  }

  async function resendActivation(buyerId, btnEl) {
    btnEl.disabled = true;
    btnEl.textContent = 'Sending…';

    try {
      const res = await fetch('/api/broker-resend-activation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentSession.access_token}`,
        },
        body: JSON.stringify({ buyer_id: buyerId }),
      });

      if (res.status === 429) {
        btnEl.textContent = 'Wait 10 min';
        setTimeout(() => { btnEl.textContent = 'Resend email'; btnEl.disabled = false; }, 3000);
        return;
      }

      if (res.ok) {
        btnEl.textContent = 'Sent ✓';
        setTimeout(() => { btnEl.textContent = 'Resend email'; btnEl.disabled = false; }, 3000);
      } else {
        btnEl.textContent = 'Failed';
        setTimeout(() => { btnEl.textContent = 'Resend email'; btnEl.disabled = false; }, 2000);
      }
    } catch (err) {
      btnEl.textContent = 'Error';
      setTimeout(() => { btnEl.textContent = 'Resend email'; btnEl.disabled = false; }, 2000);
    }
  }

  init();
</script>
</body>
</html>
```

Note: `brokers.html` calls two additional read-only functions referenced above: `get-broker-status` and `get-broker-buyers`. These are needed for the dashboard to load broker info and buyer list. Add them in the next task.

- [ ] **Step 2: Commit**

```bash
git add brokers.html
git commit -m "feat: add broker portal page with registration, login, and dashboard states"
```

---

## Task 11: Dashboard read-only functions

The dashboard needs two helper functions to fetch broker data without exposing the service role key client-side.

**Files:**
- Create: `api/get-broker-status.js`
- Create: `api/get-broker-buyers.js`

- [ ] **Step 1: Create `api/get-broker-status.js`**

```js
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: 'Unauthorized' });

  const { data: broker, error: brokerError } = await supabase
    .from('brokers')
    .select('id, name, brokerage, status')
    .eq('email', user.email)
    .single();

  if (brokerError || !broker) return res.status(404).json({ error: 'Broker not found' });

  return res.status(200).json(broker);
};
```

- [ ] **Step 2: Create `api/get-broker-buyers.js`**

```js
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: 'Unauthorized' });

  const { data: broker } = await supabase
    .from('brokers')
    .select('id')
    .eq('email', user.email)
    .eq('status', 'approved')
    .single();

  if (!broker) return res.status(401).json({ error: 'Unauthorized' });

  const { data: buyers, error: buyersError } = await supabase
    .from('buyers')
    .select('id, name, email, verified_amount, activation_complete, created_at')
    .eq('broker_id', broker.id)
    .order('created_at', { ascending: false });

  if (buyersError) return res.status(500).json({ error: 'Failed to load buyers' });

  return res.status(200).json(buyers || []);
};
```

- [ ] **Step 3: Run all tests to confirm nothing broken**

```bash
cd /Users/edsteward/deed && npm test
```

Expected: All tests still passing.

- [ ] **Step 4: Commit**

```bash
git add api/get-broker-status.js api/get-broker-buyers.js
git commit -m "feat: add broker status and buyers read-only dashboard functions"
```

---

## Task 12: Customise Supabase magic link email

- [ ] **Step 1: Open Supabase Auth email templates**

Go to: https://supabase.com/dashboard/project/jtpykhrdjkzhcbswrhzo/auth/templates

Select: **Magic Link**

- [ ] **Step 2: Update subject and body**

Subject:
```
Your DEED login link
```

Body (HTML):
```html
<h2 style="font-family:Georgia,serif;font-size:1.4rem;letter-spacing:0.04em;">DEED</h2>
<p style="font-family:sans-serif;font-size:0.9rem;color:#374151;">
  Click the link below to log in to your DEED broker portal. This link expires in 1 hour and can only be used once.
</p>
<p style="margin:1.5rem 0;">
  <a href="{{ .ConfirmationURL }}" style="background:#2563EB;color:#fff;padding:0.75rem 1.5rem;border-radius:8px;text-decoration:none;font-family:sans-serif;font-size:0.875rem;font-weight:600;">
    Log in to DEED →
  </a>
</p>
<p style="font-family:sans-serif;font-size:0.75rem;color:#9ca3af;">
  If you didn't request this, you can safely ignore this email.
</p>
```

- [ ] **Step 3: Save and send a test**

Click **Save** then **Send test email** to verify it arrives correctly formatted.

---

## Task 13: End-to-end smoke test

- [ ] **Step 1: Deploy to Vercel**

```bash
cd /Users/edsteward/deed && vercel --prod --yes
```

Confirm all environment variables are set in Vercel (from Task 3).

- [ ] **Step 2: Test broker registration flow**

1. Open `https://deed-sooty.vercel.app/brokers.html`
2. Fill in registration form with real details
3. Confirm Ed receives notification email with ASIC Connect link
4. Go to Supabase dashboard → brokers table → set status to 'approved'
5. Return to brokers.html → click "Already approved? Log in"
6. Enter broker email → confirm magic link arrives → click link
7. Confirm dashboard loads with broker name and empty buyer table

- [ ] **Step 3: Test buyer submission flow**

1. In broker dashboard → click "Add a buyer"
2. Enter test buyer: name, email, $750,000
3. Submit → confirm buyer appears as "Pending activation"
4. Confirm activation email arrives at the buyer email address
5. Check email contains correct broker name and amount

- [ ] **Step 4: Test buyer activation flow**

1. Click activation link in email
2. Confirm `/activate.html` loads with broker name pre-filled
3. Confirm name is pre-populated from buyer record
4. Complete all 3 screens
5. Confirm redirect to `browse.html`
6. Check Supabase buyers table: `activation_complete = true`, `verified = true`, `activation_token = null`, `verified_at` has a timestamp
7. Return to broker dashboard: confirm buyer now shows as "Active"

- [ ] **Step 5: Test error states**

1. Open `/activate.html#token=invalid-token-here` → confirm "Link not valid" error
2. Re-open the already-used activation link → confirm "Already activated" error
3. In broker dashboard → "Resend email" on the now-active buyer → button should be disabled

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat: broker portal complete — registration, dashboard, buyer activation"
git push
```

---

## Summary

**8 serverless functions** covering the full broker → buyer pipeline with JWT auth, atomic token validation, Resend email, and service role Supabase access.

**2 new HTML pages** matching the DEED design system — broker portal (3 auth states) and buyer activation (3-screen flow).

**1 database migration** — `brokers` table + 7 new `buyers` columns.

**35 unit tests** across 5 test files covering happy paths, auth failures, duplicate errors, token expiry, and race condition prevention.
