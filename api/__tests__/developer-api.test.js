// Mock setup — must mirror broker-register.test.js pattern
const mockFrom = jest.fn();
const mockInsert = jest.fn();
const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockSingle = jest.fn();
const mockEmails = { send: jest.fn() };
const mockInviteUser = jest.fn();
const mockGetUser = jest.fn();
const mockListUsers = jest.fn();

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: mockFrom,
    auth: {
      getUser: mockGetUser,
      admin: { inviteUserByEmail: mockInviteUser, listUsers: mockListUsers },
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
    expect(res.json).toHaveBeenCalledWith({ success: true });
    expect(mockEmails.send).toHaveBeenCalled();
  });

  test('returns 201 when inviteUserByEmail returns User already registered', async () => {
    mockInviteUser.mockResolvedValue({
      data: null,
      error: { message: 'User already registered' },
    });
    mockListUsers.mockResolvedValue({
      data: { users: [{ id: 'uid-existing', email: 'a@b.com' }] },
    });
    mockInsert.mockResolvedValue({ error: null });
    mockEmails.send.mockResolvedValue({});
    const res = makeRes();
    await handler(makeReq('POST', { action: 'register' }, {
      name: 'Alice', company: 'DevCo', email: 'a@b.com', phone: '0400000000', project_types: ['otp'],
    }), res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ success: true });
    // Verify insert was called with the looked-up auth user id
    expect(mockInsert).toHaveBeenCalledWith([
      expect.objectContaining({ auth_user_id: 'uid-existing' }),
    ]);
  });
});

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
    const projectData = { id: 'proj-1', slug: 'azure-residences', type: 'otp', name: 'Azure Residences' };
    // 1st from() call: project lookup — select → eq → single
    const mockProjSingle = jest.fn().mockResolvedValue({ data: projectData, error: null });
    const mockProjEq = jest.fn().mockReturnValue({ single: mockProjSingle });
    mockFrom.mockReturnValueOnce({ select: jest.fn().mockReturnValue({ eq: mockProjEq }) });
    // 2nd from() call: units — select → eq
    mockFrom.mockReturnValueOnce({ select: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ data: [], error: null }) }) });
    // 3rd from() call: interest count — select → eq
    mockFrom.mockReturnValueOnce({ select: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ count: 7, error: null }) }) });
    const res = makeRes();
    await handler(makeReq('GET', { action: 'get-project', slug: 'azure-residences' }), res);
    expect(res.status).toHaveBeenCalledWith(200);
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
    // 1st from() call: developers query — select → eq → single
    const mockDevSingle = jest.fn().mockResolvedValue({ data: { id: 'dev-1', name: 'Alice', company: 'DevCo', status: 'approved' }, error: null });
    const mockDevEq = jest.fn().mockReturnValue({ single: mockDevSingle });
    mockFrom.mockReturnValueOnce({ select: jest.fn().mockReturnValue({ eq: mockDevEq }) });
    // 2nd from() call: projects query — select → eq → order
    const mockOrder = jest.fn().mockResolvedValue({ data: [], error: null });
    const mockProjEq = jest.fn().mockReturnValue({ order: mockOrder });
    mockFrom.mockReturnValueOnce({ select: jest.fn().mockReturnValue({ eq: mockProjEq }) });
    const res = makeRes();
    await handler(makeReq('GET', { action: 'dashboard' }, {}, { authorization: 'Bearer valid' }), res);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
