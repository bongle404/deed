# Developer Listing Portal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a self-serve developer portal for property developers to list new developments on DEED (both OTP and completed stock), and replace the $999 Stripe checkout across all listings with a platform fee payable on settlement.

**Architecture:** A single consolidated API endpoint (`api/developer-api.js`) handles all developer + project operations via an `?action=` param pattern, matching the existing `broker-dashboard.js` consolidation pattern. Project pages are served from a single `project.html` template at clean URLs (`/projects/[slug]`) via a Vercel rewrite. Developer and seller flows are state-driven single-page HTML files.

**Tech Stack:** Pure HTML/CSS/JS (no frameworks), Supabase (Postgres + Auth), Resend (email), Vercel (hosting + serverless functions), Jest (tests). Node.js API handlers matching existing codebase patterns.

---

## File Map

**Create:**
- `vercel.json` — Vercel rewrite for `/projects/:slug → /project.html`
- `api/developer-api.js` — All developer/project API actions (register, dashboard, create-project, get-project, register-interest, submit-offer)
- `api/__tests__/developer-api.test.js` — Jest test suite for developer-api.js
- `project.html` — Project landing page template (mobile-first)
- `developer.html` — Developer registration + dashboard (mobile-first)

**Modify:**
- `browse.html` — Add project cards sourced from `projects` table
- `sell.html` — Remove Stripe CDN + JS, replace checkout step with platform fee screen

**Delete:**
- `api/checkout.js`
- `api/create-payment-intent.js`

---

## Task 1: Database Migration

**Files:**
- Run SQL in Supabase SQL Editor at https://supabase.com/dashboard/project/jtpykhrdjkzhcbswrhzo/editor

- [ ] **Step 1: Run the following SQL in the Supabase SQL Editor**

```sql
-- Developers table
CREATE TABLE developers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_user_id uuid REFERENCES auth.users(id),
  name text NOT NULL,
  company text NOT NULL,
  email text NOT NULL UNIQUE,
  phone text,
  project_types text[],
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

-- Projects table
CREATE TABLE projects (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  developer_id uuid REFERENCES developers(id),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  type text NOT NULL,
  suburb text NOT NULL,
  price_from integer NOT NULL,
  total_units integer NOT NULL,
  units_available integer NOT NULL,
  completion_date text,
  description text,
  renders text[] DEFAULT '{}',
  floor_plans text[] DEFAULT '{}',
  status text DEFAULT 'draft',
  created_at timestamptz DEFAULT now()
);

-- Units table (completed stock only)
CREATE TABLE units (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid REFERENCES projects(id),
  unit_number text NOT NULL,
  beds integer,
  baths integer,
  car_spaces integer,
  size_sqm numeric,
  price integer NOT NULL,
  status text DEFAULT 'available',
  created_at timestamptz DEFAULT now()
);

-- OTP EOI registrations (no DEED account required)
CREATE TABLE project_interests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid REFERENCES projects(id),
  buyer_id uuid REFERENCES buyers(id),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  created_at timestamptz DEFAULT now()
);

-- Completed stock unit offers (inline on project.html)
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
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE developers ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE unit_offers ENABLE ROW LEVEL SECURITY;

-- Public read policies for live projects and units
CREATE POLICY "public can read live projects" ON projects FOR SELECT USING (status = 'live');
CREATE POLICY "public can read units" ON units FOR SELECT USING (true);
CREATE POLICY "service role full access developers" ON developers USING (true) WITH CHECK (true);
CREATE POLICY "service role full access projects" ON projects USING (true) WITH CHECK (true);
CREATE POLICY "service role full access units" ON units USING (true) WITH CHECK (true);
CREATE POLICY "public can insert project_interests" ON project_interests FOR INSERT WITH CHECK (true);
CREATE POLICY "public can insert unit_offers" ON unit_offers FOR INSERT WITH CHECK (true);
CREATE POLICY "service role read project_interests" ON project_interests FOR SELECT USING (true);
CREATE POLICY "service role read unit_offers" ON unit_offers FOR SELECT USING (true);
```

- [ ] **Step 2: Verify tables created**

In Supabase Table Editor, confirm all 5 tables exist: `developers`, `projects`, `units`, `project_interests`, `unit_offers`.

- [ ] **Step 3: Commit note**

```bash
cd ~/deed
git commit --allow-empty -m "chore: db migration complete — developers, projects, units, project_interests, unit_offers tables"
```

---

## Task 2: Infrastructure — Vercel Config + Stripe Removal

**Files:**
- Create: `vercel.json`
- Delete: `api/checkout.js`, `api/create-payment-intent.js`

- [ ] **Step 1: Create `vercel.json`**

```json
{
  "rewrites": [
    { "source": "/projects/:slug", "destination": "/project.html" }
  ]
}
```

- [ ] **Step 2: Delete the Stripe API files**

```bash
cd ~/deed
rm api/checkout.js api/create-payment-intent.js
```

- [ ] **Step 3: Verify function count**

```bash
ls ~/deed/api/*.js | grep -v __tests__ | wc -l
```

Expected: `11` (was 12, removed 2, will add 1 in Task 3 = 11 net after that task).

- [ ] **Step 4: Commit**

```bash
git add vercel.json
git rm api/checkout.js api/create-payment-intent.js
git commit -m "chore: add vercel rewrite for project pages, remove Stripe endpoints"
```

---

## Task 3: API — `developer-api.js` (register + dashboard actions)

**Files:**
- Create: `api/developer-api.js`
- Create: `api/__tests__/developer-api.test.js`

- [ ] **Step 1: Write failing tests for `register` action**

Create `api/__tests__/developer-api.test.js`:

```javascript
// Mock setup — must mirror broker-register.test.js pattern
const mockFrom = jest.fn();
const mockInsert = jest.fn();
const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockSingle = jest.fn();
const mockEmails = { send: jest.fn() };
const mockInviteUser = jest.fn();
const mockGetUser = jest.fn();

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: mockFrom,
    auth: {
      getUser: mockGetUser,
      admin: { inviteUserByEmail: mockInviteUser },
    },
  })),
}));
jest.mock('resend', () => ({
  Resend: jest.fn(() => ({ emails: mockEmails })),
}));

const handler = require('../developer-api');

function makeReq(method = 'GET', query = {}, body = {}, headers = {}) {
  return { method, query, body, headers };
}
function makeRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockFrom.mockReturnValue({ insert: mockInsert, select: mockSelect });
  mockSelect.mockReturnValue({ eq: mockEq });
  mockEq.mockReturnValue({ single: mockSingle, eq: mockEq });
  mockSingle.mockResolvedValue({ data: null, error: null });
  mockInsert.mockResolvedValue({ error: null });
});

// ── register ──────────────────────────────────────────────────────
describe('action=register', () => {
  test('returns 405 for non-POST', async () => {
    const res = makeRes();
    await handler(makeReq('GET', { action: 'register' }), res);
    expect(res.status).toHaveBeenCalledWith(405);
  });

  test('returns 400 when required fields missing', async () => {
    const res = makeRes();
    await handler(makeReq('POST', { action: 'register' }, { name: 'Alice' }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('returns 409 when email already registered', async () => {
    mockInviteUser.mockResolvedValue({ data: { user: { id: 'uid-1' } }, error: null });
    mockInsert.mockResolvedValue({ error: { code: '23505' } });
    const res = makeRes();
    await handler(makeReq('POST', { action: 'register' }, {
      name: 'Alice', company: 'DevCo', email: 'a@b.com', phone: '0400000000', project_types: ['otp'],
    }), res);
    expect(res.status).toHaveBeenCalledWith(409);
  });

  test('returns 201 and sends notification email on success', async () => {
    mockInviteUser.mockResolvedValue({ data: { user: { id: 'uid-1' } }, error: null });
    mockInsert.mockResolvedValue({ error: null });
    mockEmails.send.mockResolvedValue({});
    const res = makeRes();
    await handler(makeReq('POST', { action: 'register' }, {
      name: 'Alice', company: 'DevCo', email: 'a@b.com', phone: '0400000000', project_types: ['otp'],
    }), res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(mockEmails.send).toHaveBeenCalled();
  });
});

// ── dashboard ─────────────────────────────────────────────────────
describe('action=dashboard', () => {
  test('returns 401 when no auth header', async () => {
    const res = makeRes();
    await handler(makeReq('GET', { action: 'dashboard' }), res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('returns 401 when token invalid', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('bad token') });
    const res = makeRes();
    await handler(makeReq('GET', { action: 'dashboard' }, {}, { authorization: 'Bearer bad' }), res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('returns 200 with developer + projects on success', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'uid-1', email: 'a@b.com' } }, error: null });
    mockSingle.mockResolvedValue({ data: { id: 'dev-1', name: 'Alice', company: 'DevCo', status: 'approved' }, error: null });
    // projects select returns array
    mockFrom.mockReturnValueOnce({ select: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ data: [], error: null }) }) });
    const res = makeRes();
    await handler(makeReq('GET', { action: 'dashboard' }, {}, { authorization: 'Bearer valid' }), res);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd ~/deed && npm test -- --testPathPattern=developer-api --verbose 2>&1 | head -40
```

Expected: FAIL — `Cannot find module '../developer-api'`

- [ ] **Step 3: Implement `register` and `dashboard` actions in `api/developer-api.js`**

```javascript
const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const resend = new Resend(process.env.RESEND_API_KEY);

module.exports = async function handler(req, res) {
  const { action } = req.query;

  switch (action) {
    case 'register':     return handleRegister(req, res);
    case 'dashboard':    return handleDashboard(req, res);
    case 'create-project': return handleCreateProject(req, res);
    case 'get-project':  return handleGetProject(req, res);
    case 'register-interest': return handleRegisterInterest(req, res);
    case 'submit-offer': return handleSubmitOffer(req, res);
    default:             return res.status(400).json({ error: 'Invalid action' });
  }
};

// ── REGISTER ─────────────────────────────────────────────────────
async function handleRegister(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, company, email, phone, project_types } = req.body || {};
  if (!name || !company || !email) return res.status(400).json({ error: 'Missing required fields' });

  // Create Supabase auth user via invite (returns user.id immediately)
  const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email);
  if (inviteError && inviteError.message !== 'User already registered') {
    console.error('Invite error:', inviteError);
    return res.status(500).json({ error: 'Failed to create account' });
  }
  const authUserId = inviteData?.user?.id || null;

  const { error } = await supabase.from('developers').insert([{
    name, company, email, phone: phone || null,
    project_types: project_types || [],
    auth_user_id: authUserId,
  }]);

  if (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Email already registered' });
    console.error('Developer insert error:', error);
    return res.status(500).json({ error: 'Registration failed' });
  }

  await resend.emails.send({
    from: 'DEED <noreply@deed-sooty.vercel.app>',
    to: [process.env.ED_EMAIL],
    subject: `New developer application — ${name}, ${company}`,
    text: [
      `New developer portal application.`,
      ``,
      `Name: ${name}`,
      `Company: ${company}`,
      `Email: ${email}`,
      phone ? `Phone: ${phone}` : '',
      `Project types: ${(project_types || []).join(', ')}`,
      ``,
      `Approve in Supabase (set status = 'approved'):`,
      `https://supabase.com/dashboard/project/jtpykhrdjkzhcbswrhzo/editor`,
      ``,
      `After approving, send magic link from Supabase Auth → Users → ${email} → Send magic link`,
    ].filter(Boolean).join('\n'),
  });

  return res.status(201).json({ success: true });
}

// ── DASHBOARD ─────────────────────────────────────────────────────
async function handleDashboard(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

  const { data: developer, error: devError } = await supabase
    .from('developers')
    .select('id, name, company, status')
    .eq('auth_user_id', user.id)
    .single();

  if (devError || !developer) return res.status(404).json({ error: 'Developer not found' });

  const { data: projects } = await supabase
    .from('projects')
    .select('id, slug, name, type, suburb, price_from, units_available, status, created_at')
    .eq('developer_id', developer.id)
    .order('created_at', { ascending: false });

  return res.status(200).json({ developer, projects: projects || [] });
}

// ── PLACEHOLDERS (implemented in Tasks 4 + 5) ────────────────────
async function handleCreateProject(req, res) {
  return res.status(501).json({ error: 'Not implemented' });
}
async function handleGetProject(req, res) {
  return res.status(501).json({ error: 'Not implemented' });
}
async function handleRegisterInterest(req, res) {
  return res.status(501).json({ error: 'Not implemented' });
}
async function handleSubmitOffer(req, res) {
  return res.status(501).json({ error: 'Not implemented' });
}
```

- [ ] **Step 4: Run tests**

```bash
cd ~/deed && npm test -- --testPathPattern=developer-api --verbose 2>&1 | tail -20
```

Expected: register and dashboard test suites pass.

- [ ] **Step 5: Commit**

```bash
git add api/developer-api.js api/__tests__/developer-api.test.js
git commit -m "feat: developer-api register and dashboard actions with tests"
```

---

## Task 4: API — `developer-api.js` (create-project + get-project actions)

**Files:**
- Modify: `api/developer-api.js`
- Modify: `api/__tests__/developer-api.test.js`

- [ ] **Step 1: Add failing tests for `create-project` and `get-project`**

Append to `api/__tests__/developer-api.test.js`:

```javascript
// ── create-project ────────────────────────────────────────────────
describe('action=create-project', () => {
  test('returns 401 with no auth', async () => {
    const res = makeRes();
    await handler(makeReq('POST', { action: 'create-project' }), res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('returns 400 when required fields missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'uid-1' } }, error: null });
    mockSingle.mockResolvedValue({ data: { id: 'dev-1' }, error: null });
    const res = makeRes();
    await handler(makeReq('POST', { action: 'create-project' }, { name: 'Azure' }, { authorization: 'Bearer valid' }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('returns 201 and creates project with slug', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'uid-1' } }, error: null });
    mockSingle
      .mockResolvedValueOnce({ data: { id: 'dev-1' }, error: null }) // developer lookup
      .mockResolvedValueOnce({ data: null, error: null }); // slug collision check
    mockInsert.mockResolvedValue({ data: [{ id: 'proj-1', slug: 'azure-residences' }], error: null });
    const res = makeRes();
    await handler(makeReq('POST', { action: 'create-project' }, {
      name: 'Azure Residences', type: 'otp', suburb: 'Burleigh Heads',
      price_from: 620000, total_units: 24, description: 'Luxury OTP',
    }, { authorization: 'Bearer valid' }), res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ slug: 'azure-residences' }));
  });
});

// ── get-project ───────────────────────────────────────────────────
describe('action=get-project', () => {
  test('returns 400 when no slug provided', async () => {
    const res = makeRes();
    await handler(makeReq('GET', { action: 'get-project' }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('returns 404 when project not found', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: 'not found' } });
    const res = makeRes();
    await handler(makeReq('GET', { action: 'get-project', slug: 'missing-project' }), res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('returns 200 with project + units + interest count', async () => {
    mockSingle.mockResolvedValue({ data: { id: 'proj-1', slug: 'azure-residences', type: 'otp', name: 'Azure Residences' }, error: null });
    // units and interest_count selects
    mockFrom
      .mockReturnValueOnce({ select: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ data: [], error: null }) }) }) // units
      .mockReturnValueOnce({ select: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ count: 7, error: null }) }) }); // interest count
    const res = makeRes();
    await handler(makeReq('GET', { action: 'get-project', slug: 'azure-residences' }), res);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
```

- [ ] **Step 2: Run to confirm new tests fail**

```bash
cd ~/deed && npm test -- --testPathPattern=developer-api --verbose 2>&1 | grep -E "(PASS|FAIL|✓|✗|×)"
```

Expected: create-project and get-project suites FAIL with "Not implemented".

- [ ] **Step 3: Implement `handleCreateProject` and `handleGetProject` in `api/developer-api.js`**

Replace the `handleCreateProject` placeholder:

```javascript
async function handleCreateProject(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

  const { data: developer } = await supabase
    .from('developers')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();
  if (!developer) return res.status(401).json({ error: 'Unauthorized' });

  const { name, type, suburb, price_from, total_units, description, completion_date, units: unitList } = req.body || {};
  if (!name || !type || !suburb || !price_from || !total_units) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Generate collision-safe slug
  const baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  let slug = baseSlug;
  let suffix = 2;
  while (true) {
    const { data: existing } = await supabase.from('projects').select('id').eq('slug', slug).single();
    if (!existing) break;
    slug = `${baseSlug}-${suffix++}`;
  }

  const { data: project, error } = await supabase.from('projects').insert([{
    developer_id: developer.id,
    slug, name, type, suburb,
    price_from: parseInt(price_from),
    total_units: parseInt(total_units),
    units_available: parseInt(total_units),
    description: description || null,
    completion_date: completion_date || null,
  }]).select().single();

  if (error) {
    console.error('Project insert error:', error);
    return res.status(500).json({ error: 'Failed to create project' });
  }

  // Insert units for completed stock
  if (type === 'completed' && Array.isArray(unitList) && unitList.length > 0) {
    const unitRows = unitList.map(u => ({
      project_id: project.id,
      unit_number: u.unit_number,
      beds: u.beds || null,
      baths: u.baths || null,
      car_spaces: u.car_spaces || null,
      size_sqm: u.size_sqm || null,
      price: parseInt(u.price),
    }));
    await supabase.from('units').insert(unitRows);
  }

  return res.status(201).json({ slug, id: project.id });
}
```

Replace the `handleGetProject` placeholder:

```javascript
async function handleGetProject(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { slug } = req.query;
  if (!slug) return res.status(400).json({ error: 'Slug required' });

  const { data: project, error } = await supabase
    .from('projects')
    .select('*, developers(name, company)')
    .eq('slug', slug)
    .single();

  if (error || !project) return res.status(404).json({ error: 'Project not found' });

  // Fetch units (completed stock) or interest count (OTP)
  const [unitsResult, interestResult] = await Promise.all([
    supabase.from('units').select('*').eq('project_id', project.id),
    supabase.from('project_interests').select('id', { count: 'exact' }).eq('project_id', project.id),
  ]);

  return res.status(200).json({
    ...project,
    units: unitsResult.data || [],
    interest_count: interestResult.count || 0,
  });
}
```

- [ ] **Step 4: Run all tests**

```bash
cd ~/deed && npm test -- --testPathPattern=developer-api --verbose 2>&1 | tail -20
```

Expected: all suites pass.

- [ ] **Step 5: Commit**

```bash
git add api/developer-api.js api/__tests__/developer-api.test.js
git commit -m "feat: developer-api create-project and get-project actions with tests"
```

---

## Task 5: API — `developer-api.js` (register-interest + submit-offer actions)

**Files:**
- Modify: `api/developer-api.js`
- Modify: `api/__tests__/developer-api.test.js`

- [ ] **Step 1: Add failing tests**

Append to `api/__tests__/developer-api.test.js`:

```javascript
// ── register-interest ─────────────────────────────────────────────
describe('action=register-interest', () => {
  test('returns 405 for non-POST', async () => {
    const res = makeRes();
    await handler(makeReq('GET', { action: 'register-interest' }), res);
    expect(res.status).toHaveBeenCalledWith(405);
  });

  test('returns 400 when required fields missing', async () => {
    const res = makeRes();
    await handler(makeReq('POST', { action: 'register-interest' }, { name: 'Bob' }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('returns 201 on success', async () => {
    mockInsert.mockResolvedValue({ error: null });
    const res = makeRes();
    await handler(makeReq('POST', { action: 'register-interest' }, {
      project_id: 'proj-1', name: 'Bob Smith', email: 'bob@example.com', phone: '0411111111',
    }), res);
    expect(res.status).toHaveBeenCalledWith(201);
  });
});

// ── submit-offer ──────────────────────────────────────────────────
describe('action=submit-offer', () => {
  test('returns 405 for non-POST', async () => {
    const res = makeRes();
    await handler(makeReq('GET', { action: 'submit-offer' }), res);
    expect(res.status).toHaveBeenCalledWith(405);
  });

  test('returns 400 when required fields missing', async () => {
    const res = makeRes();
    await handler(makeReq('POST', { action: 'submit-offer' }, { unit_id: 'u-1' }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('returns 201 on success', async () => {
    mockInsert.mockResolvedValue({ error: null });
    const res = makeRes();
    await handler(makeReq('POST', { action: 'submit-offer' }, {
      unit_id: 'u-1', project_id: 'proj-1',
      buyer_name: 'Jane Doe', buyer_email: 'jane@example.com',
      offer_price: 650000, settlement_days: 30, deposit_percent: 10,
    }), res);
    expect(res.status).toHaveBeenCalledWith(201);
  });
});
```

- [ ] **Step 2: Verify new tests fail**

```bash
cd ~/deed && npm test -- --testPathPattern=developer-api --verbose 2>&1 | grep -E "(register-interest|submit-offer)" | head -10
```

- [ ] **Step 3: Implement both handlers in `api/developer-api.js`**

Replace `handleRegisterInterest` placeholder:

```javascript
async function handleRegisterInterest(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { project_id, name, email, phone } = req.body || {};
  if (!project_id || !name || !email) return res.status(400).json({ error: 'Missing required fields' });

  const { error } = await supabase.from('project_interests').insert([{
    project_id, name, email, phone: phone || null,
  }]);

  if (error) {
    console.error('Interest insert error:', error);
    return res.status(500).json({ error: 'Registration failed' });
  }

  return res.status(201).json({ success: true });
}
```

Replace `handleSubmitOffer` placeholder:

```javascript
async function handleSubmitOffer(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { unit_id, project_id, buyer_name, buyer_email, offer_price, settlement_days, deposit_percent, message } = req.body || {};
  if (!unit_id || !project_id || !buyer_name || !buyer_email || !offer_price) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const { error } = await supabase.from('unit_offers').insert([{
    unit_id, project_id, buyer_name, buyer_email,
    offer_price: parseInt(offer_price),
    settlement_days: settlement_days ? parseInt(settlement_days) : null,
    deposit_percent: deposit_percent ? parseFloat(deposit_percent) : null,
    message: message || null,
  }]);

  if (error) {
    console.error('Unit offer insert error:', error);
    return res.status(500).json({ error: 'Failed to submit offer' });
  }

  // Update unit status to under_offer
  await supabase.from('units').update({ status: 'under_offer' }).eq('id', unit_id);

  return res.status(201).json({ success: true });
}
```

- [ ] **Step 4: Run full test suite**

```bash
cd ~/deed && npm test -- --testPathPattern=developer-api --verbose 2>&1 | tail -30
```

Expected: all 12+ tests pass across all action suites.

- [ ] **Step 5: Commit**

```bash
git add api/developer-api.js api/__tests__/developer-api.test.js
git commit -m "feat: developer-api register-interest and submit-offer actions with tests"
```

---

## Task 6: `project.html` — Project Landing Page

**Files:**
- Create: `project.html`

This is the public-facing project page. Rendered at `/projects/[slug]`. Reads slug from URL, fetches data via `api/developer-api.js?action=get-project&slug=[slug]`. Renders OTP flow (EOI form) or completed stock flow (unit grid + offer form) based on `project.type`.

- [ ] **Step 1: Create `project.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>DEED — Project</title>
  <link rel="stylesheet" href="/deed-ui.css" />
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js"></script>
  <style>
    :root {
      --blue: #2563EB; --blue-hover: #1d4ed8;
      --border: #e5e7eb; --text: #111827; --muted: #6b7280; --dim: #9ca3af;
      --page-bg: #ffffff; --section-bg: #f7f8fa;
    }
    * { box-sizing: border-box; }
    body { background: var(--page-bg); font-family: var(--font-body, 'DM Sans', sans-serif); color: var(--text); margin: 0; }

    /* NAV */
    .nav { background: #fff; border-bottom: 1px solid var(--border); position: sticky; top: 0; z-index: 100;
      padding: 0 1.5rem; height: 64px; display: flex; align-items: center; justify-content: space-between; }
    .nav-logo { font-family: var(--font-display, 'Bebas Neue', sans-serif); font-size: 1.6rem; letter-spacing: 0.06em; color: var(--text); text-decoration: none; }

    /* HERO */
    .hero { position: relative; height: 420px; overflow: hidden; background: #1a1a1a; }
    @media (max-width: 768px) { .hero { height: 280px; } }
    .hero-img { width: 100%; height: 100%; object-fit: cover; opacity: 0.75; }
    .hero-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%); }
    .hero-content { position: absolute; bottom: 2rem; left: 2rem; right: 2rem; color: #fff; }
    @media (max-width: 768px) { .hero-content { bottom: 1.25rem; left: 1.25rem; right: 1.25rem; } }
    .hero-badge { display: inline-block; background: var(--blue); color: #fff; font-size: 0.7rem;
      font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; padding: 3px 10px; border-radius: 4px; margin-bottom: 0.75rem; }
    .hero-title { font-family: var(--font-display, 'Bebas Neue', sans-serif); font-size: 3rem; line-height: 1; margin: 0 0 0.25rem; letter-spacing: 0.04em; }
    @media (max-width: 768px) { .hero-title { font-size: 2rem; } }
    .hero-sub { font-size: 1rem; opacity: 0.85; margin: 0 0 1rem; }
    .hero-meta { display: flex; gap: 1.5rem; flex-wrap: wrap; font-size: 0.9rem; opacity: 0.9; }
    .hero-ctas { display: flex; gap: 0.75rem; flex-wrap: wrap; margin-top: 1.25rem; }
    @media (max-width: 768px) { .hero-ctas { flex-direction: column; } }
    .btn-primary { display: inline-flex; align-items: center; gap: 0.4rem; background: var(--blue); color: #fff;
      font-size: 0.9rem; font-weight: 600; padding: 0.75rem 1.5rem; border-radius: 8px; text-decoration: none;
      border: none; cursor: pointer; min-height: 44px; }
    .btn-primary:hover { background: var(--blue-hover); }
    .btn-secondary { display: inline-flex; align-items: center; background: rgba(255,255,255,0.15);
      color: #fff; font-size: 0.9rem; font-weight: 600; padding: 0.75rem 1.5rem; border-radius: 8px;
      border: 1px solid rgba(255,255,255,0.3); cursor: pointer; min-height: 44px; }

    /* CONTENT */
    .container { max-width: 900px; margin: 0 auto; padding: 2.5rem 1.5rem; }
    @media (max-width: 768px) { .container { padding: 1.5rem 1rem; } }
    .section-label { font-size: 0.75rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
      color: var(--blue); margin-bottom: 1rem; }
    .overview-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 2.5rem; }
    @media (max-width: 768px) { .overview-grid { grid-template-columns: 1fr 1fr; } }
    .stat-card { background: var(--section-bg); border: 1px solid var(--border); border-radius: 10px; padding: 1rem; }
    .stat-label { font-size: 0.75rem; color: var(--muted); margin-bottom: 0.25rem; }
    .stat-value { font-size: 1.3rem; font-weight: 700; color: var(--text); }
    .description { font-size: 1rem; line-height: 1.7; color: var(--text); margin-bottom: 2.5rem; }
    .interest-badge { display: inline-flex; align-items: center; gap: 0.4rem; background: #f0fdf4;
      color: #166534; border: 1px solid #bbf7d0; border-radius: 20px; font-size: 0.8rem;
      font-weight: 600; padding: 4px 12px; margin-bottom: 1.5rem; }

    /* EOI FORM */
    .eoi-section { background: var(--section-bg); border: 1px solid var(--border); border-radius: 12px; padding: 2rem; margin-bottom: 2.5rem; }
    @media (max-width: 768px) { .eoi-section { padding: 1.25rem; } }
    .eoi-title { font-size: 1.2rem; font-weight: 700; margin: 0 0 0.5rem; }
    .eoi-sub { font-size: 0.875rem; color: var(--muted); margin: 0 0 1.5rem; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 0.75rem; }
    @media (max-width: 768px) { .form-row { grid-template-columns: 1fr; } }
    .form-group { display: flex; flex-direction: column; gap: 0.35rem; }
    .form-group label { font-size: 0.8rem; font-weight: 600; color: var(--text); }
    .form-group input { border: 1px solid var(--border); border-radius: 8px; padding: 0.65rem 0.875rem;
      font-size: 0.9rem; font-family: inherit; outline: none; min-height: 44px; }
    .form-group input:focus { border-color: var(--blue); box-shadow: 0 0 0 3px rgba(37,99,235,0.1); }
    .form-submit { width: 100%; min-height: 48px; font-size: 1rem; font-weight: 700; margin-top: 1rem; }
    .success-msg { display: none; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px;
      padding: 1rem 1.25rem; color: #166534; font-size: 0.9rem; margin-top: 1rem; }

    /* UNIT GRID */
    .units-section { margin-bottom: 2.5rem; }
    .units-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1rem; }
    @media (max-width: 768px) { .units-grid { grid-template-columns: 1fr; } }
    .unit-card { background: #fff; border: 1px solid var(--border); border-radius: 10px; padding: 1.25rem; }
    .unit-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem; }
    .unit-number { font-weight: 700; font-size: 1rem; }
    .unit-status { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em;
      padding: 2px 8px; border-radius: 4px; }
    .unit-status.available { background: #f0fdf4; color: #166534; }
    .unit-status.under_offer { background: #fefce8; color: #854d0e; }
    .unit-status.sold { background: #f3f4f6; color: var(--muted); }
    .unit-specs { font-size: 0.825rem; color: var(--muted); margin-bottom: 0.5rem; }
    .unit-price { font-size: 1.1rem; font-weight: 700; margin-bottom: 1rem; }
    .btn-offer { width: 100%; min-height: 44px; background: var(--blue); color: #fff; font-size: 0.875rem;
      font-weight: 600; border: none; border-radius: 8px; cursor: pointer; }
    .btn-offer:hover { background: var(--blue-hover); }
    .btn-offer:disabled { background: var(--dim); cursor: not-allowed; }

    /* OFFER MODAL */
    .modal-backdrop { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 200; overflow-y: auto; }
    .modal-backdrop.open { display: flex; align-items: flex-start; justify-content: center; padding: 2rem 1rem; }
    .modal { background: #fff; border-radius: 12px; padding: 2rem; width: 100%; max-width: 480px; margin: auto; }
    @media (max-width: 768px) { .modal { padding: 1.25rem; } }
    .modal-title { font-size: 1.1rem; font-weight: 700; margin: 0 0 1.25rem; }
    .modal-close { float: right; background: none; border: none; font-size: 1.25rem; cursor: pointer; color: var(--muted); margin-top: -4px; }

    /* RENDERS */
    .renders-strip { display: flex; gap: 0.75rem; overflow-x: auto; padding-bottom: 0.5rem; margin-bottom: 2.5rem; }
    .renders-strip img { height: 180px; width: auto; border-radius: 8px; flex-shrink: 0; }
    @media (max-width: 768px) { .renders-strip img { height: 140px; } }

    /* LOADING */
    .loading { text-align: center; padding: 4rem 1rem; color: var(--muted); }
    .error-state { text-align: center; padding: 4rem 1rem; }
  </style>
</head>
<body>

<nav class="nav">
  <a href="/" class="nav-logo">DEED</a>
  <a href="/browse.html" style="font-size:0.875rem; color: var(--muted); text-decoration:none;">Browse listings</a>
</nav>

<div id="project-loading" class="loading">Loading project…</div>
<div id="project-error" class="error-state" style="display:none;">
  <p style="color:var(--muted);">Project not found.</p>
  <a href="/browse.html" class="btn-primary" style="display:inline-flex; margin-top:1rem;">Browse listings</a>
</div>

<div id="project-content" style="display:none;">
  <!-- HERO -->
  <div class="hero">
    <img id="hero-img" src="" alt="" class="hero-img" />
    <div class="hero-overlay"></div>
    <div class="hero-content">
      <div class="hero-badge" id="project-type-badge">New Development</div>
      <h1 class="hero-title" id="project-name"></h1>
      <p class="hero-sub" id="project-sub"></p>
      <div class="hero-meta" id="project-meta"></div>
      <div class="hero-ctas" id="project-ctas"></div>
    </div>
  </div>

  <!-- MAIN CONTENT -->
  <div class="container">
    <div class="interest-badge" id="interest-badge" style="display:none;">
      <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
      <span id="interest-count-text"></span>
    </div>

    <div class="section-label">Project Overview</div>
    <div class="overview-grid" id="overview-grid"></div>
    <div class="description" id="project-description"></div>

    <!-- RENDERS -->
    <div id="renders-section" style="display:none;">
      <div class="section-label">Gallery</div>
      <div class="renders-strip" id="renders-strip"></div>
    </div>

    <!-- OTP EOI SECTION -->
    <div id="eoi-section" class="eoi-section" style="display:none;">
      <h2 class="eoi-title">Register your interest</h2>
      <p class="eoi-sub">No obligation. We'll notify you when units open for offer.</p>
      <form id="eoi-form">
        <div class="form-row">
          <div class="form-group">
            <label>Full name</label>
            <input type="text" id="eoi-name" placeholder="Jane Smith" required />
          </div>
          <div class="form-group">
            <label>Email</label>
            <input type="email" id="eoi-email" placeholder="jane@example.com" required />
          </div>
        </div>
        <div class="form-group" style="margin-bottom:0;">
          <label>Phone (optional)</label>
          <input type="tel" id="eoi-phone" placeholder="0400 000 000" />
        </div>
        <button type="submit" class="btn-primary form-submit" id="eoi-submit">Register interest</button>
        <div class="success-msg" id="eoi-success">
          You're registered. We'll be in touch when units open for offer.
        </div>
      </form>
    </div>

    <!-- COMPLETED STOCK UNITS SECTION -->
    <div id="units-section" class="units-section" style="display:none;">
      <div class="section-label">Available Units</div>
      <div class="units-grid" id="units-grid"></div>
    </div>
  </div>
</div>

<!-- OFFER MODAL (completed stock) -->
<div class="modal-backdrop" id="offer-modal">
  <div class="modal">
    <button class="modal-close" onclick="closeOfferModal()">×</button>
    <h3 class="modal-title" id="modal-title">Make an offer</h3>
    <form id="offer-form">
      <input type="hidden" id="offer-unit-id" />
      <input type="hidden" id="offer-project-id" />
      <div class="form-group" style="margin-bottom:0.75rem;">
        <label>Your name</label>
        <input type="text" id="offer-name" required />
      </div>
      <div class="form-group" style="margin-bottom:0.75rem;">
        <label>Email</label>
        <input type="email" id="offer-email" required />
      </div>
      <div class="form-group" style="margin-bottom:0.75rem;">
        <label>Offer price ($)</label>
        <input type="number" id="offer-price" required />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Settlement (days)</label>
          <input type="number" id="offer-settlement" placeholder="30" />
        </div>
        <div class="form-group">
          <label>Deposit (%)</label>
          <input type="number" id="offer-deposit" placeholder="10" />
        </div>
      </div>
      <div class="form-group" style="margin-bottom:0.75rem;">
        <label>Message (optional)</label>
        <input type="text" id="offer-message" placeholder="Any notes for the developer" />
      </div>
      <button type="submit" class="btn-primary form-submit" id="offer-submit">Submit offer</button>
      <div class="success-msg" id="offer-success">Offer submitted. The developer will be in touch.</div>
    </form>
  </div>
</div>

<script>
  let currentProject = null;

  // Extract slug from URL path: /projects/azure-residences → azure-residences
  function getSlug() {
    const parts = window.location.pathname.split('/');
    return parts[parts.length - 1] || parts[parts.length - 2];
  }

  function formatPrice(p) {
    return '$' + parseInt(p).toLocaleString('en-AU');
  }

  async function loadProject() {
    const slug = getSlug();
    if (!slug) { showError(); return; }

    try {
      const res = await fetch(`/api/developer-api?action=get-project&slug=${encodeURIComponent(slug)}`);
      if (!res.ok) { showError(); return; }
      const project = await res.json();
      currentProject = project;
      renderProject(project);
    } catch (e) {
      showError();
    }
  }

  function showError() {
    document.getElementById('project-loading').style.display = 'none';
    document.getElementById('project-error').style.display = 'block';
  }

  function renderProject(p) {
    document.title = `DEED — ${p.name}`;

    // Hero
    if (p.renders && p.renders.length > 0) {
      document.getElementById('hero-img').src = p.renders[0];
      document.getElementById('hero-img').alt = p.name;
    } else {
      document.querySelector('.hero').style.background = '#1e3a5f';
    }
    document.getElementById('project-type-badge').textContent = p.type === 'otp' ? 'Off the Plan' : 'New Development';
    document.getElementById('project-name').textContent = p.name;
    document.getElementById('project-sub').textContent = `${p.suburb} · ${p.developers?.company || ''}`;
    document.getElementById('project-meta').innerHTML = `
      <span>From ${formatPrice(p.price_from)}</span>
      <span>${p.total_units} residences</span>
      ${p.completion_date ? `<span>Est. ${p.completion_date}</span>` : ''}
    `;

    // CTAs
    const ctaContainer = document.getElementById('project-ctas');
    if (p.type === 'otp') {
      ctaContainer.innerHTML = `<button class="btn-primary" onclick="document.getElementById('eoi-section').scrollIntoView({behavior:'smooth'})">Register interest</button>`;
    } else {
      ctaContainer.innerHTML = `<button class="btn-primary" onclick="document.getElementById('units-section').scrollIntoView({behavior:'smooth'})">View available units</button>`;
    }

    // Interest badge
    if (p.interest_count > 0) {
      const badge = document.getElementById('interest-badge');
      badge.style.display = 'inline-flex';
      const label = p.type === 'otp'
        ? `${p.interest_count} ${p.interest_count === 1 ? 'person' : 'people'} registered interest`
        : `${p.interest_count} verified buyers in the queue`;
      document.getElementById('interest-count-text').textContent = label;
    }

    // Overview stats
    const grid = document.getElementById('overview-grid');
    const stats = [
      { label: 'Starting from', value: formatPrice(p.price_from) },
      { label: 'Total residences', value: p.total_units },
      { label: p.type === 'otp' ? 'Est. completion' : 'Available now', value: p.type === 'otp' ? (p.completion_date || 'TBA') : p.units_available },
    ];
    grid.innerHTML = stats.map(s => `
      <div class="stat-card">
        <div class="stat-label">${s.label}</div>
        <div class="stat-value">${s.value}</div>
      </div>
    `).join('');

    // Description
    document.getElementById('project-description').textContent = p.description || '';

    // Renders gallery
    if (p.renders && p.renders.length > 1) {
      const strip = document.getElementById('renders-strip');
      strip.innerHTML = p.renders.map(r => `<img src="${r}" alt="${p.name}" />`).join('');
      document.getElementById('renders-section').style.display = 'block';
    }

    // OTP EOI form
    if (p.type === 'otp') {
      document.getElementById('eoi-section').style.display = 'block';
    }

    // Completed stock unit grid
    if (p.type === 'completed' && p.units && p.units.length > 0) {
      const grid = document.getElementById('units-grid');
      grid.innerHTML = p.units.map(u => `
        <div class="unit-card">
          <div class="unit-header">
            <div class="unit-number">Unit ${u.unit_number}</div>
            <div class="unit-status ${u.status}">${u.status === 'under_offer' ? 'Under offer' : u.status.charAt(0).toUpperCase() + u.status.slice(1)}</div>
          </div>
          <div class="unit-specs">${[u.beds && `${u.beds}bd`, u.baths && `${u.baths}ba`, u.car_spaces && `${u.car_spaces} car`, u.size_sqm && `${u.size_sqm}m²`].filter(Boolean).join(' · ')}</div>
          <div class="unit-price">${formatPrice(u.price)}</div>
          <button class="btn-offer" onclick="openOfferModal('${u.id}', '${u.unit_number}', '${p.id}')"
            ${u.status !== 'available' ? 'disabled' : ''}>
            ${u.status === 'available' ? 'Make offer' : u.status === 'under_offer' ? 'Under offer' : 'Sold'}
          </button>
        </div>
      `).join('');
      document.getElementById('units-section').style.display = 'block';
    }

    // Show content
    document.getElementById('project-loading').style.display = 'none';
    document.getElementById('project-content').style.display = 'block';
  }

  // EOI form submission
  document.getElementById('eoi-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('eoi-submit');
    btn.disabled = true; btn.textContent = 'Registering…';

    const res = await fetch('/api/developer-api?action=register-interest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: currentProject.id,
        name: document.getElementById('eoi-name').value,
        email: document.getElementById('eoi-email').value,
        phone: document.getElementById('eoi-phone').value,
      }),
    });

    if (res.ok) {
      document.getElementById('eoi-form').querySelector('.form-row').style.display = 'none';
      document.getElementById('eoi-form').querySelectorAll('.form-group').forEach(el => el.style.display = 'none');
      btn.style.display = 'none';
      document.getElementById('eoi-success').style.display = 'block';
    } else {
      btn.disabled = false; btn.textContent = 'Register interest';
      alert('Something went wrong. Please try again.');
    }
  });

  // Offer modal
  function openOfferModal(unitId, unitNumber, projectId) {
    document.getElementById('offer-unit-id').value = unitId;
    document.getElementById('offer-project-id').value = projectId;
    document.getElementById('modal-title').textContent = `Make an offer — Unit ${unitNumber}`;
    document.getElementById('offer-modal').classList.add('open');
  }
  function closeOfferModal() {
    document.getElementById('offer-modal').classList.remove('open');
  }
  document.getElementById('offer-modal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeOfferModal();
  });

  document.getElementById('offer-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('offer-submit');
    btn.disabled = true; btn.textContent = 'Submitting…';

    const res = await fetch('/api/developer-api?action=submit-offer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        unit_id: document.getElementById('offer-unit-id').value,
        project_id: document.getElementById('offer-project-id').value,
        buyer_name: document.getElementById('offer-name').value,
        buyer_email: document.getElementById('offer-email').value,
        offer_price: document.getElementById('offer-price').value,
        settlement_days: document.getElementById('offer-settlement').value || null,
        deposit_percent: document.getElementById('offer-deposit').value || null,
        message: document.getElementById('offer-message').value || null,
      }),
    });

    if (res.ok) {
      document.getElementById('offer-form').querySelectorAll('.form-group, .form-row').forEach(el => el.style.display = 'none');
      btn.style.display = 'none';
      document.getElementById('offer-success').style.display = 'block';
    } else {
      btn.disabled = false; btn.textContent = 'Submit offer';
      alert('Something went wrong. Please try again.');
    }
  });

  loadProject();
</script>
</body>
</html>
```

- [ ] **Step 2: Deploy and test with a real slug**

```bash
cd ~/deed && vercel --prod --yes
```

Visit `https://deed-sooty.vercel.app/projects/test-project` — should show the loading state then project-error state (expected — no data yet).

- [ ] **Step 3: Commit**

```bash
git add project.html
git commit -m "feat: project landing page template with OTP EOI and completed stock offer flows"
```

---

## Task 7: `developer.html` — Developer Registration + Dashboard

**Files:**
- Create: `developer.html`

- [ ] **Step 1: Create `developer.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>DEED — Developer Portal</title>
  <link rel="stylesheet" href="/deed-ui.css" />
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js"></script>
  <style>
    :root {
      --blue: #2563EB; --blue-hover: #1d4ed8; --blue-pale: #eff6ff;
      --border: #e5e7eb; --text: #111827; --muted: #6b7280; --dim: #9ca3af;
      --page-bg: #ffffff; --section-bg: #f7f8fa;
    }
    * { box-sizing: border-box; }
    body { background: var(--page-bg); font-family: var(--font-body, 'DM Sans', sans-serif); color: var(--text); margin: 0; }

    /* NAV */
    .nav { background: #fff; border-bottom: 1px solid var(--border); position: sticky; top: 0; z-index: 100;
      padding: 0 1.5rem; height: 64px; display: flex; align-items: center; justify-content: space-between; }
    .nav-logo { font-family: var(--font-display, 'Bebas Neue', sans-serif); font-size: 1.6rem; letter-spacing: 0.06em; color: var(--text); text-decoration: none; }
    .nav-actions { display: flex; gap: 0.75rem; align-items: center; }
    .btn-text { background: none; border: none; font-size: 0.875rem; color: var(--muted); cursor: pointer; padding: 0.5rem; min-height: 44px; }
    .btn-text:hover { color: var(--text); }

    /* LAYOUT */
    .container { max-width: 800px; margin: 0 auto; padding: 3rem 1.5rem; }
    @media (max-width: 768px) { .container { padding: 2rem 1rem; } }

    /* REGISTRATION PANEL */
    .reg-panel { max-width: 480px; margin: 0 auto; }
    .page-title { font-family: var(--font-display, 'Bebas Neue', sans-serif); font-size: 2.5rem; letter-spacing: 0.04em; margin: 0 0 0.5rem; }
    .page-sub { font-size: 1rem; color: var(--muted); margin: 0 0 2.5rem; line-height: 1.6; }
    .card { background: #fff; border: 1px solid var(--border); border-radius: 12px; padding: 2rem; }
    @media (max-width: 768px) { .card { padding: 1.25rem; } }
    .card-title { font-size: 1rem; font-weight: 700; margin: 0 0 1.5rem; }
    .form-group { display: flex; flex-direction: column; gap: 0.35rem; margin-bottom: 0.875rem; }
    .form-group label { font-size: 0.8rem; font-weight: 600; }
    .form-group input, .form-group select { border: 1px solid var(--border); border-radius: 8px;
      padding: 0.65rem 0.875rem; font-size: 0.9rem; font-family: inherit; outline: none; min-height: 44px; }
    .form-group input:focus, .form-group select:focus { border-color: var(--blue); box-shadow: 0 0 0 3px rgba(37,99,235,0.1); }
    .btn-primary { display: inline-flex; align-items: center; justify-content: center; background: var(--blue);
      color: #fff; font-size: 0.9rem; font-weight: 600; padding: 0.75rem 1.5rem; border-radius: 8px;
      border: none; cursor: pointer; width: 100%; min-height: 48px; }
    .btn-primary:hover { background: var(--blue-hover); }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
    .success-msg { display: none; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px;
      padding: 1rem 1.25rem; color: #166534; font-size: 0.9rem; margin-top: 1rem; }
    .error-msg { display: none; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px;
      padding: 0.875rem 1.25rem; color: #dc2626; font-size: 0.875rem; margin-top: 0.75rem; }

    /* DASHBOARD */
    .dash-header { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem; margin-bottom: 2rem; }
    .dash-title { font-family: var(--font-display, 'Bebas Neue', sans-serif); font-size: 2rem; letter-spacing: 0.04em; margin: 0; }
    .dash-sub { font-size: 0.875rem; color: var(--muted); margin: 0.25rem 0 0; }
    .status-badge { display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.75rem;
      font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; padding: 4px 12px; border-radius: 20px; }
    .status-active { background: #f0fdf4; color: #166534; }
    .status-pending { background: #fefce8; color: #854d0e; }
    .section-label { font-size: 0.75rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
      color: var(--blue); margin-bottom: 1rem; }
    .project-grid { display: grid; gap: 1rem; margin-bottom: 2.5rem; }
    .project-card { background: #fff; border: 1px solid var(--border); border-radius: 10px; padding: 1.25rem; }
    .project-card-header { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1rem; }
    .project-card-title { font-size: 1rem; font-weight: 700; margin: 0; }
    .project-card-sub { font-size: 0.825rem; color: var(--muted); margin: 0.2rem 0 0; }
    .badges { display: flex; gap: 0.4rem; flex-wrap: wrap; }
    .badge { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; padding: 2px 8px; border-radius: 4px; }
    .badge-otp { background: #eff6ff; color: #1d4ed8; }
    .badge-completed { background: #f0fdf4; color: #166534; }
    .badge-draft { background: #f3f4f6; color: var(--muted); }
    .badge-live { background: #f0fdf4; color: #166534; }
    .badge-sold-out { background: #fef2f2; color: #dc2626; }
    .project-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; margin-bottom: 1rem; }
    @media (max-width: 480px) { .project-stats { grid-template-columns: 1fr 1fr; } }
    .project-stat { text-align: center; }
    .project-stat-value { font-size: 1.2rem; font-weight: 700; }
    .project-stat-label { font-size: 0.7rem; color: var(--muted); margin-top: 2px; }
    .project-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .btn-sm { font-size: 0.8rem; font-weight: 600; padding: 0.5rem 1rem; border-radius: 6px; min-height: 36px;
      border: 1px solid var(--border); background: #fff; cursor: pointer; color: var(--text); }
    .btn-sm:hover { background: var(--section-bg); }
    .btn-sm-primary { background: var(--blue); color: #fff; border-color: var(--blue); }
    .btn-sm-primary:hover { background: var(--blue-hover); }
    .units-note { font-size: 0.75rem; color: var(--muted); font-style: italic; margin-top: 0.5rem; }
    .add-project-btn { width: 100%; min-height: 48px; margin-bottom: 2.5rem; }

    /* ADD PROJECT FORM */
    .add-project-form { display: none; background: var(--section-bg); border: 1px solid var(--border); border-radius: 12px; padding: 1.5rem; margin-bottom: 2rem; }
    @media (max-width: 768px) { .add-project-form { padding: 1.25rem; } }
    .add-form-title { font-size: 1rem; font-weight: 700; margin: 0 0 1.25rem; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
    @media (max-width: 480px) { .form-row { grid-template-columns: 1fr; } }
    .empty-state { text-align: center; padding: 3rem 1rem; color: var(--muted); border: 1px dashed var(--border); border-radius: 10px; }
    .empty-state p { margin: 0 0 1.5rem; }

    /* LOADING */
    .loading { text-align: center; padding: 4rem 1rem; color: var(--muted); }
  </style>
</head>
<body>

<nav class="nav">
  <a href="/" class="nav-logo">DEED</a>
  <div class="nav-actions">
    <button class="btn-text" id="logout-btn" style="display:none;" onclick="logout()">Sign out</button>
  </div>
</nav>

<!-- LOADING STATE -->
<div id="app-loading" class="loading">Loading…</div>

<!-- REGISTRATION VIEW -->
<div id="reg-view" style="display:none;">
  <div class="container">
    <div class="reg-panel">
      <h1 class="page-title">Developer Portal</h1>
      <p class="page-sub">List your developments on DEED. Zero upfront cost — platform fee on settlement only.</p>
      <div class="card">
        <div class="card-title">Apply for access</div>
        <form id="reg-form">
          <div class="form-group">
            <label>Full name</label>
            <input type="text" id="reg-name" placeholder="Jane Smith" required />
          </div>
          <div class="form-group">
            <label>Company name</label>
            <input type="text" id="reg-company" placeholder="Smith Developments Pty Ltd" required />
          </div>
          <div class="form-group">
            <label>Email</label>
            <input type="email" id="reg-email" placeholder="jane@smithdev.com.au" required />
          </div>
          <div class="form-group">
            <label>Phone (optional)</label>
            <input type="tel" id="reg-phone" placeholder="0400 000 000" />
          </div>
          <div class="form-group">
            <label>Project types</label>
            <select id="reg-types">
              <option value="completed">Completed stock only</option>
              <option value="otp">Off-the-plan only</option>
              <option value="both">Both</option>
            </select>
          </div>
          <button type="submit" class="btn-primary" id="reg-submit" style="margin-top:0.5rem;">Apply for access</button>
          <div class="success-msg" id="reg-success">
            Application received. We'll review your details and be in touch within 24 hours.
          </div>
          <div class="error-msg" id="reg-error"></div>
        </form>
      </div>
    </div>
  </div>
</div>

<!-- DASHBOARD VIEW -->
<div id="dash-view" style="display:none;">
  <div class="container">
    <div class="dash-header">
      <div>
        <h1 class="dash-title" id="dash-name">Developer Portal</h1>
        <p class="dash-sub" id="dash-company"></p>
      </div>
      <span class="status-badge" id="dash-status-badge"></span>
    </div>

    <button class="btn-primary add-project-btn" onclick="toggleAddForm()">+ Add project</button>

    <!-- ADD PROJECT FORM -->
    <div class="add-project-form" id="add-project-form">
      <div class="add-form-title">New project</div>
      <form id="new-project-form">
        <div class="form-group">
          <label>Project name</label>
          <input type="text" id="np-name" placeholder="Azure Residences" required />
        </div>
        <div class="form-row" style="margin-bottom:0.875rem;">
          <div class="form-group" style="margin-bottom:0;">
            <label>Type</label>
            <select id="np-type" onchange="toggleOTPFields()">
              <option value="completed">Completed stock</option>
              <option value="otp">Off-the-plan</option>
            </select>
          </div>
          <div class="form-group" style="margin-bottom:0;">
            <label>Suburb</label>
            <input type="text" id="np-suburb" placeholder="Burleigh Heads" required />
          </div>
        </div>
        <div class="form-row" style="margin-bottom:0.875rem;">
          <div class="form-group" style="margin-bottom:0;">
            <label>Price from ($)</label>
            <input type="number" id="np-price" placeholder="620000" required />
          </div>
          <div class="form-group" style="margin-bottom:0;">
            <label>Total units</label>
            <input type="number" id="np-units" placeholder="24" required />
          </div>
        </div>
        <div class="form-group" id="otp-date-field" style="display:none;">
          <label>Est. completion</label>
          <input type="text" id="np-completion" placeholder="Q4 2027" />
        </div>
        <div class="form-group">
          <label>Description</label>
          <input type="text" id="np-description" placeholder="Brief project description" />
        </div>
        <div style="display:flex; gap:0.75rem; flex-wrap:wrap; margin-top:0.5rem;">
          <button type="submit" class="btn-sm btn-sm-primary" id="np-submit" style="min-height:44px; min-width:140px;">Create project</button>
          <button type="button" class="btn-sm" onclick="toggleAddForm()" style="min-height:44px;">Cancel</button>
        </div>
        <div class="error-msg" id="np-error"></div>
      </form>
    </div>

    <!-- PROJECT LIST -->
    <div class="section-label">Your Projects</div>
    <div id="project-list" class="project-grid">
      <div class="loading" style="padding:2rem;">Loading projects…</div>
    </div>
  </div>
</div>

<script>
  const SUPABASE_URL = 'https://jtpykhrdjkzhcbswrhzo.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0cHlraHJkamt6aGNic3dyaHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MTYxMjAsImV4cCI6MjA4OTQ5MjEyMH0.U3q_ktH3vN7loxEgUg-oJw9mXYYwhMC0aL6bK9YBVRI';
  const { createClient } = supabase;
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  let session = null;
  let developer = null;

  async function init() {
    const { data: { session: s } } = await sb.auth.getSession();
    session = s;

    if (session) {
      await loadDashboard();
    } else {
      document.getElementById('app-loading').style.display = 'none';
      document.getElementById('reg-view').style.display = 'block';
    }

    // Handle auth state changes (magic link redirect)
    sb.auth.onAuthStateChange(async (event, s) => {
      if (event === 'SIGNED_IN' && s) {
        session = s;
        document.getElementById('reg-view').style.display = 'none';
        await loadDashboard();
      }
    });
  }

  async function loadDashboard() {
    document.getElementById('app-loading').style.display = 'block';
    document.getElementById('dash-view').style.display = 'none';
    document.getElementById('logout-btn').style.display = 'block';

    const res = await fetch('/api/developer-api?action=dashboard', {
      headers: { 'Authorization': `Bearer ${session.access_token}` },
    });

    document.getElementById('app-loading').style.display = 'none';

    if (!res.ok) {
      document.getElementById('reg-view').style.display = 'block';
      return;
    }

    const data = await res.json();
    developer = data.developer;

    document.getElementById('dash-name').textContent = developer.name;
    document.getElementById('dash-company').textContent = developer.company;
    const badge = document.getElementById('dash-status-badge');
    badge.textContent = developer.status.charAt(0).toUpperCase() + developer.status.slice(1);
    badge.className = `status-badge status-${developer.status === 'approved' || developer.status === 'active' ? 'active' : 'pending'}`;

    renderProjects(data.projects || []);
    document.getElementById('dash-view').style.display = 'block';
  }

  function renderProjects(projects) {
    const list = document.getElementById('project-list');
    if (!projects.length) {
      list.innerHTML = `<div class="empty-state"><p>No projects yet. Add your first development above.</p></div>`;
      return;
    }
    list.innerHTML = projects.map(p => `
      <div class="project-card">
        <div class="project-card-header">
          <div>
            <div class="project-card-title">${p.name}</div>
            <div class="project-card-sub">${p.suburb}</div>
          </div>
          <div class="badges">
            <span class="badge badge-${p.type}">${p.type === 'otp' ? 'Off-the-plan' : 'Completed stock'}</span>
            <span class="badge badge-${p.status.replace('_','-')}">${p.status.charAt(0).toUpperCase() + p.status.slice(1).replace('_',' ')}</span>
          </div>
        </div>
        <div class="project-stats">
          <div class="project-stat">
            <div class="project-stat-value">${p.units_available}</div>
            <div class="project-stat-label">Units available*</div>
          </div>
          <div class="project-stat">
            <div class="project-stat-value">—</div>
            <div class="project-stat-label">EOIs / Offers</div>
          </div>
          <div class="project-stat">
            <div class="project-stat-value">—</div>
            <div class="project-stat-label">Settled</div>
          </div>
        </div>
        <div class="project-actions">
          ${p.status === 'live' ? `<a href="/projects/${p.slug}" class="btn-sm btn-sm-primary" target="_blank">View project page</a>` : ''}
          ${p.status === 'draft' ? `<button class="btn-sm btn-sm-primary" onclick="submitForReview('${p.id}', '${p.name}')">Submit for review</button>` : ''}
        </div>
        <div class="units-note">* Units available is manually updated. Edit your project to update this number.</div>
      </div>
    `).join('');
  }

  function toggleAddForm() {
    const form = document.getElementById('add-project-form');
    form.style.display = form.style.display === 'none' ? 'block' : 'none';
  }

  function toggleOTPFields() {
    const type = document.getElementById('np-type').value;
    document.getElementById('otp-date-field').style.display = type === 'otp' ? 'block' : 'none';
  }

  function submitForReview(projectId, projectName) {
    alert(`To go live: email deed@deed-sooty.vercel.app with your project name (${projectName}) and we'll review and activate it within 24 hours.`);
  }

  document.getElementById('reg-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('reg-submit');
    const errEl = document.getElementById('reg-error');
    btn.disabled = true; btn.textContent = 'Submitting…';
    errEl.style.display = 'none';

    const res = await fetch('/api/developer-api?action=register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: document.getElementById('reg-name').value,
        company: document.getElementById('reg-company').value,
        email: document.getElementById('reg-email').value,
        phone: document.getElementById('reg-phone').value,
        project_types: [document.getElementById('reg-types').value],
      }),
    });

    if (res.ok) {
      document.getElementById('reg-form').querySelectorAll('.form-group, .card-title').forEach(el => el.style.display = 'none');
      btn.style.display = 'none';
      document.getElementById('reg-success').style.display = 'block';
    } else {
      const data = await res.json();
      errEl.textContent = data.error === 'Email already registered' ? 'That email is already registered.' : 'Something went wrong. Please try again.';
      errEl.style.display = 'block';
      btn.disabled = false; btn.textContent = 'Apply for access';
    }
  });

  document.getElementById('new-project-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('np-submit');
    const errEl = document.getElementById('np-error');
    btn.disabled = true; btn.textContent = 'Creating…';
    errEl.style.display = 'none';

    const res = await fetch('/api/developer-api?action=create-project', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        name: document.getElementById('np-name').value,
        type: document.getElementById('np-type').value,
        suburb: document.getElementById('np-suburb').value,
        price_from: document.getElementById('np-price').value,
        total_units: document.getElementById('np-units').value,
        description: document.getElementById('np-description').value,
        completion_date: document.getElementById('np-completion').value || null,
      }),
    });

    btn.disabled = false; btn.textContent = 'Create project';

    if (res.ok) {
      document.getElementById('new-project-form').reset();
      toggleAddForm();
      await loadDashboard();
    } else {
      const data = await res.json();
      errEl.textContent = data.error || 'Failed to create project.';
      errEl.style.display = 'block';
    }
  });

  async function logout() {
    await sb.auth.signOut();
    session = null;
    developer = null;
    document.getElementById('dash-view').style.display = 'none';
    document.getElementById('logout-btn').style.display = 'none';
    document.getElementById('reg-view').style.display = 'block';
  }

  init();
</script>
</body>
</html>
```

- [ ] **Step 2: Deploy and verify**

```bash
cd ~/deed && vercel --prod --yes
```

Visit `https://deed-sooty.vercel.app/developer.html` — should show registration form on desktop and mobile.

- [ ] **Step 3: Commit**

```bash
git add developer.html
git commit -m "feat: developer portal registration and dashboard UI"
```

---

## Task 8: `browse.html` — Add Developer Project Cards

**Files:**
- Modify: `browse.html`

The goal is to add project cards from the `projects` table (status = 'live') into the browse listing grid alongside private seller listings.

- [ ] **Step 1: Add project fetching to browse.html**

In `browse.html`, find where listings are fetched from Supabase (search for `supabase.from('listings')`). Add a parallel fetch for projects.

In the JS section, locate the existing listings fetch and add:

```javascript
// Fetch live developer projects
async function loadProjects() {
  const { data: projects } = await sb
    .from('projects')
    .select('id, slug, name, suburb, type, price_from, units_available, renders, status')
    .eq('status', 'live')
    .order('created_at', { ascending: false });
  return projects || [];
}
```

- [ ] **Step 2: Add project card rendering**

Find the function that renders listing cards (look for `innerHTML` or `.card` HTML construction) and add a `renderProjectCard` function alongside it:

```javascript
function renderProjectCard(project) {
  return `
    <a href="/projects/${project.slug}" class="listing-card" style="text-decoration:none;">
      <div class="listing-img-wrap" style="position:relative;">
        <img src="${project.renders && project.renders[0] ? project.renders[0] : 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600'}"
          alt="${project.name}" style="width:100%;height:220px;object-fit:cover;display:block;" />
        <div style="position:absolute;top:10px;left:10px;background:#2563EB;color:#fff;font-size:0.65rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;padding:3px 9px;border-radius:4px;">
          New Development
        </div>
      </div>
      <div class="listing-body" style="padding:1rem;">
        <div style="font-weight:700;font-size:1rem;margin-bottom:0.25rem;">${project.name}</div>
        <div style="font-size:0.825rem;color:#6b7280;margin-bottom:0.5rem;">${project.suburb}</div>
        <div style="font-size:1.1rem;font-weight:700;color:#111827;">From $${parseInt(project.price_from).toLocaleString('en-AU')}</div>
        <div style="font-size:0.75rem;color:#6b7280;margin-top:0.25rem;">${project.units_available} units available</div>
      </div>
    </a>
  `;
}
```

- [ ] **Step 3: Merge projects into the listings grid**

In the main data loading function, call `loadProjects()` in parallel with listings and prepend project cards to the grid:

```javascript
// In the main load function, alongside your existing listings fetch:
const [listings, projects] = await Promise.all([
  loadListings(),   // your existing function
  loadProjects(),
]);

// Prepend project cards to the grid
const projectCards = projects.map(renderProjectCard).join('');
const listingCards = listings.map(renderListingCard).join(''); // your existing render function
document.getElementById('listings-grid').innerHTML = projectCards + listingCards;
```

Note: The exact function/variable names will differ. Read the existing `browse.html` JS to find the right insertion point — look for where `innerHTML` is set on the listings grid container.

- [ ] **Step 4: Deploy and verify**

```bash
cd ~/deed && vercel --prod --yes
```

Visit `https://deed-sooty.vercel.app/browse.html` — project cards should appear at the top of the grid (none visible until a project is set to `status='live'` in Supabase).

- [ ] **Step 5: Commit**

```bash
git add browse.html
git commit -m "feat: add developer project cards to browse listings grid"
```

---

## Task 9: `sell.html` — Remove Stripe, Add Platform Fee Screen

**Files:**
- Modify: `sell.html`

- [ ] **Step 1: Remove the Stripe CDN script tag**

In `sell.html` line 8, remove:
```html
<script src="https://js.stripe.com/v3/"></script>
```

- [ ] **Step 2: Find and remove all Stripe JS**

Search for all Stripe references:
```bash
grep -n "stripe\|Stripe\|PaymentElement\|confirmPayment\|payment_intent\|checkout" ~/deed/sell.html
```

Remove or comment out all Stripe-related code blocks found. This includes:
- Any `Stripe(...)` constructor calls
- `PaymentElement` mount/unmount
- `confirmPayment(...)` calls
- Any Stripe CSS imports or element containers (`<div id="payment-element">` etc.)
- Any code that calls `api/checkout.js` or `api/create-payment-intent.js`

- [ ] **Step 3: Find the existing final step (payment/checkout step)**

Search for the step that currently shows the payment UI:
```bash
grep -n "step-4\|step4\|checkout\|payment\|Pay now\|List your property" ~/deed/sell.html | head -20
```

Identify the container div for the final step.

- [ ] **Step 4: Replace the checkout step content with platform fee acknowledgement**

Replace the inner content of the final step container with:

```html
<!-- Platform fee confirmation screen -->
<div class="step-content" id="step-confirm">
  <div style="text-align:center; padding: 1rem 0 2rem;">
    <div style="width:56px;height:56px;background:#f0fdf4;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 1.25rem;">
      <svg width="24" height="24" fill="none" stroke="#16a34a" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
    </div>
    <h2 style="font-family:var(--font-display,'Bebas Neue',sans-serif);font-size:2rem;letter-spacing:0.04em;margin:0 0 0.5rem;">Your listing is ready</h2>
    <p style="font-size:1rem;color:var(--muted,#6b7280);margin:0 0 2rem;line-height:1.6;">
      DEED's platform fee is payable on settlement of sale.<br />We'll be in touch when your property sells.
    </p>
  </div>

  <div style="background:#f7f8fa;border:1px solid #e5e7eb;border-radius:10px;padding:1.25rem;margin-bottom:1.5rem;">
    <div style="font-size:0.825rem;color:#6b7280;margin-bottom:0.75rem;font-weight:600;">What happens next</div>
    <div style="display:flex;flex-direction:column;gap:0.75rem;">
      <div style="display:flex;gap:0.75rem;align-items:flex-start;">
        <div style="width:22px;height:22px;background:#2563EB;color:#fff;border-radius:50%;font-size:0.7rem;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;">1</div>
        <div style="font-size:0.875rem;">Your listing goes live and is matched to verified buyers in your suburb.</div>
      </div>
      <div style="display:flex;gap:0.75rem;align-items:flex-start;">
        <div style="width:22px;height:22px;background:#2563EB;color:#fff;border-radius:50%;font-size:0.7rem;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;">2</div>
        <div style="font-size:0.875rem;">Qualified buyers contact you directly — no open homes, no tyre-kickers.</div>
      </div>
      <div style="display:flex;gap:0.75rem;align-items:flex-start;">
        <div style="width:22px;height:22px;background:#2563EB;color:#fff;border-radius:50%;font-size:0.7rem;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;">3</div>
        <div style="font-size:0.875rem;">When your property sells, DEED's platform fee is due on settlement.</div>
      </div>
    </div>
  </div>

  <label style="display:flex;align-items:flex-start;gap:0.75rem;cursor:pointer;margin-bottom:1.5rem;">
    <input type="checkbox" id="fee-acknowledgement" required style="margin-top:3px;width:18px;height:18px;flex-shrink:0;accent-color:#2563EB;" />
    <span style="font-size:0.875rem;line-height:1.5;">I understand that DEED's platform fee is due on settlement of sale.</span>
  </label>

  <button id="go-live-btn" type="button" onclick="goLive()"
    style="width:100%;min-height:52px;background:#2563EB;color:#fff;font-size:1rem;font-weight:700;border:none;border-radius:10px;cursor:pointer;">
    Confirm &amp; Go Live
  </button>
</div>
```

- [ ] **Step 5: Update the `goLive()` function (or add it if the step previously called Stripe)**

In `sell.html` JS, find or add the `goLive()` function:

```javascript
async function goLive() {
  const ack = document.getElementById('fee-acknowledgement');
  if (!ack.checked) {
    ack.reportValidity();
    return;
  }
  const btn = document.getElementById('go-live-btn');
  btn.disabled = true;
  btn.textContent = 'Going live…';

  // The listing was already saved to Supabase in the previous step.
  // This is just the confirmation. Redirect to dashboard.
  setTimeout(() => {
    window.location.href = '/dashboard.html';
  }, 1000);
}
```

Note: Check whether the listing insert to Supabase happens before this step or is triggered here. If Stripe's `confirmPayment` previously triggered the listing insert, move that logic to fire when the user clicks "Confirm & Go Live" instead.

- [ ] **Step 6: Test on mobile viewport**

Open browser dev tools → mobile viewport (390px) → verify:
- All form steps readable
- Buttons minimum 44px tap target
- Confirmation screen text is not cut off

- [ ] **Step 7: Deploy**

```bash
cd ~/deed && vercel --prod --yes
```

Visit `https://deed-sooty.vercel.app/sell.html` → walk through all steps → confirm the final screen shows platform fee acknowledgement with no Stripe UI.

- [ ] **Step 8: Commit**

```bash
git add sell.html
git commit -m "feat: replace Stripe checkout with platform fee acknowledgement screen in sell.html"
```

---

## Task 10: Final Smoke Test + Deploy

- [ ] **Step 1: Run full test suite**

```bash
cd ~/deed && npm test 2>&1 | tail -20
```

Expected: all tests pass (existing broker tests + new developer-api tests).

- [ ] **Step 2: Final deploy**

```bash
cd ~/deed && vercel --prod --yes
```

- [ ] **Step 3: Smoke test checklist**

Test each flow manually at `https://deed-sooty.vercel.app`:

| Flow | Steps | Expected |
|---|---|---|
| Developer registration | `/developer.html` → fill form → submit | "Application received" message |
| Project page (404) | `/projects/nonexistent` | Error state + "Browse listings" link |
| sell.html final step | `/sell.html` → complete all steps | Platform fee screen, no Stripe |
| browse.html | `/browse.html` | Loads without JS errors |
| Existing tests | `npm test` | All pass |

- [ ] **Step 4: Verify function count**

```bash
ls ~/deed/api/*.js | grep -v __tests__ | wc -l
```

Expected: `11`

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore: developer listing portal complete — smoke test passed"
```

---

## Post-Build Manual Steps (Ed)

These require Ed's action after the build is deployed:

1. **Run DB migration** — Paste the SQL from Task 1 into https://supabase.com/dashboard/project/jtpykhrdjkzhcbswrhzo/editor

2. **Add Supabase redirect URL** — In Supabase Auth → URL Configuration, add `https://deed-sooty.vercel.app/developer.html` to redirect URLs

3. **Get QLD property law sign-off** — Before any public launch, have a QLD property solicitor review the "platform fee payable on settlement" language to confirm it doesn't constitute acting as an agent under the *Property Occupations Act 2014*

4. **Test end-to-end** — Register as a developer, get approved in Supabase, send yourself a magic link, create a test project, set it to live
