const mockGetUser = jest.fn();
const mockInsert = jest.fn();
const mockSelectBroker = jest.fn();
const mockSelectBuyer = jest.fn();
const mockEmails = { send: jest.fn() };

const mockSupabase = {
  auth: { getUser: mockGetUser },
  from: jest.fn((table) => {
    if (table === 'brokers') return { select: jest.fn(() => ({ eq: jest.fn(() => ({ eq: jest.fn(() => ({ single: mockSelectBroker })) })) })) };
    if (table === 'buyers') return {
      select: jest.fn(() => ({ eq: jest.fn(() => ({ single: mockSelectBuyer })) })),
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
