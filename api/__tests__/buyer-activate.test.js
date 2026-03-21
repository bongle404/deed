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
