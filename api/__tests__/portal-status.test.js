// TDD RED: These tests will fail with "Cannot find module '../portal-status'"
// until Plan 04 creates api/portal-status.js. That is the correct RED state.

const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockSingle = jest.fn();
const mockFrom = jest.fn();

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({ from: mockFrom })),
}));

// This require will fail with "Cannot find module '../portal-status'"
// until Plan 04 creates the implementation. That is the expected RED state.
const handler = require('../portal-status');

const testPortalData = {
  rea_status: 'live',
  domain_status: 'pending',
  rea_listing_url: 'https://www.realestate.com.au/buy/property-house-qld-burleigh_heads-123456',
  domain_listing_url: null,
};

function makeReq({ method = 'GET', query = {} } = {}) {
  return { method, query };
}
function makeRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

beforeEach(() => {
  jest.clearAllMocks();

  // Default: select chain returns portal status data
  mockSingle.mockResolvedValue({ data: testPortalData, error: null });
  mockEq.mockReturnValue({ single: mockSingle });
  mockSelect.mockReturnValue({ eq: mockEq });

  mockFrom.mockImplementation(() => ({
    select: mockSelect,
  }));
});

test('returns 200 with portal status fields when listing_id is valid', async () => {
  const res = makeRes();
  await handler(makeReq({ query: { listing_id: 'test-123' } }), res);

  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.json).toHaveBeenCalledWith(
    expect.objectContaining({
      rea_status: 'live',
      domain_status: 'pending',
      rea_listing_url: expect.any(String),
      domain_listing_url: null,
    })
  );
});

test('returns 400 when listing_id query param is missing', async () => {
  const res = makeRes();
  await handler(makeReq({ query: {} }), res);
  expect(res.status).toHaveBeenCalledWith(400);
});

test('returns 404 when Supabase returns no row for the listing_id', async () => {
  mockSingle.mockResolvedValue({ data: null, error: { message: 'not found' } });

  const res = makeRes();
  await handler(makeReq({ query: { listing_id: 'nonexistent-id' } }), res);
  expect(res.status).toHaveBeenCalledWith(404);
});

test('returns 405 for non-GET requests', async () => {
  const res = makeRes();
  await handler(makeReq({ method: 'POST', query: { listing_id: 'test-123' } }), res);
  expect(res.status).toHaveBeenCalledWith(405);
});
