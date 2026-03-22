// LEGAL-01: Form 2 disclosure form — save and publish gate
// TDD RED: All tests fail with "Cannot find module '../disclosure'"
// until Plan 02-02 creates api/disclosure.js. That is the correct Wave 0 state.

const mockUpsert = jest.fn();
const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockSingle = jest.fn();
const mockFrom = jest.fn();

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({ from: mockFrom })),
}));

const handler = require('../disclosure');

function makeReq(method = 'POST', body = {}) {
  return { method, body };
}

function makeRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSingle.mockResolvedValue({ data: null, error: null });
  mockEq.mockReturnValue({ single: mockSingle });
  mockSelect.mockReturnValue({ eq: mockEq });
  mockUpsert.mockResolvedValue({ data: [{ id: 'row-1' }], error: null });
  mockFrom.mockReturnValue({ upsert: mockUpsert, select: mockSelect });
});

test('returns 405 for GET requests', async () => {
  const res = makeRes();
  await handler(makeReq('GET'), res);
  expect(res.status).toHaveBeenCalledWith(405);
});

test('returns 400 if listing_id missing', async () => {
  const res = makeRes();
  await handler(makeReq('POST', {}), res);
  expect(res.status).toHaveBeenCalledWith(400);
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }));
});

test('saves disclosure data and sets completed_at', async () => {
  const res = makeRes();
  const body = {
    listing_id: 'listing-abc',
    owner_name: 'Jane Smith',
    owner_address: '1 Main St, Brisbane QLD 4000',
    property_description: 'Lot 1 on RP123456',
    has_pool: false,
    pool_status: 'no_pool',
    has_community_title: false,
    ato_clearance_obtained: true,
    has_building_notices: false,
  };
  await handler(makeReq('POST', body), res);
  expect(mockUpsert).toHaveBeenCalledTimes(1);
  const upsertArg = mockUpsert.mock.calls[0][0];
  expect(upsertArg.completed_at).not.toBeNull();
  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.json).toHaveBeenCalledWith({ ok: true });
});

test('canPublish returns false when no disclosure record exists', async () => {
  mockSingle.mockResolvedValue({ data: null, error: null });
  const res = makeRes();
  await handler(makeReq('POST', { listing_id: 'listing-abc', _action: 'canPublish' }), res);
  const jsonCall = res.json.mock.calls[0][0];
  expect(jsonCall).toMatchObject({ published: false });
});

test('canPublish returns true when completed_at is set', async () => {
  mockSingle.mockResolvedValue({
    data: { listing_id: 'listing-abc', completed_at: new Date().toISOString() },
    error: null,
  });
  const res = makeRes();
  await handler(makeReq('POST', { listing_id: 'listing-abc', _action: 'canPublish' }), res);
  const jsonCall = res.json.mock.calls[0][0];
  expect(jsonCall).toMatchObject({ published: true });
});
