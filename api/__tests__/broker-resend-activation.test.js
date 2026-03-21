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
  // activation_token_expires_at set to 8 days from now so issuedAt is 1 day ago (> 10 min)
  mockSelectBuyer.mockResolvedValue({ data: { broker_id: 'broker-uuid', activation_complete: false, email: 'jane@buyer.com', name: 'Jane', verified_amount: 750000, activation_token_expires_at: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString() }, error: null });
  mockUpdateBuyer.mockResolvedValue({ error: null });
  mockEmails.send.mockResolvedValue({ id: 'email-id' });
  const res = makeRes();
  await handler(makeReq({ buyer_id: 'buyer-uuid' }), res);
  expect(res.status).toHaveBeenCalledWith(200);
  expect(mockEmails.send).toHaveBeenCalledTimes(1);
});
