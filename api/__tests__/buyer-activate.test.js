const mockUpdate = jest.fn();
const mockEmails = { send: jest.fn() };

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      update: mockUpdate,
    })),
  })),
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
  // Build chain mock: .update().eq().eq().gt().select() => { data: [], error: null }
  const mockSelect = jest.fn().mockResolvedValue({ data: [], error: null });
  const mockGt = jest.fn(() => ({ select: mockSelect }));
  const mockEq2 = jest.fn(() => ({ gt: mockGt }));
  const mockEq1 = jest.fn(() => ({ eq: mockEq2 }));
  mockUpdate.mockReturnValue({ eq: mockEq1 });

  const res = makeRes();
  await handler(makeReq({ token: 'bad-token', name: 'Jane', suburbs: ['Burleigh'] }), res);
  expect(res.status).toHaveBeenCalledWith(410);
});
