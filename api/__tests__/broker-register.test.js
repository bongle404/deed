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
