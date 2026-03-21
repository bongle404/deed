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
