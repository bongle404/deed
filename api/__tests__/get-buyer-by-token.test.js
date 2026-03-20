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
