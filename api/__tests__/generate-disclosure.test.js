// LEGAL-04: Generate disclosure statement PDF
// TDD RED: All tests fail with "Cannot find module '../generate-disclosure'"
// until Plan 02-04 creates api/generate-disclosure.js. That is the correct Wave 0 state.

const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockSingle = jest.fn();
const mockFrom = jest.fn();

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({ from: mockFrom })),
}));

jest.mock('pdfmake/build/pdfmake', () => ({
  vfs: {},
  createPdf: jest.fn(() => ({
    getBuffer: jest.fn(fn => fn(Buffer.from('PDF'))),
  })),
}), { virtual: true });

jest.mock('pdfmake/build/vfs_fonts', () => ({
  pdfMake: { vfs: {} },
}), { virtual: true });

const handler = require('../generate-disclosure');

function makeReq(method = 'POST', body = {}) {
  return { method, body };
}

function makeRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  res.send = jest.fn(() => res);
  res.setHeader = jest.fn(() => res);
  return res;
}

const fullDisclosureRow = {
  listing_id: 'listing-abc',
  owner_name: 'Jane Smith',
  owner_address: '1 Main St, Brisbane QLD 4000',
  property_description: 'Lot 1 on RP123456',
  has_pool: false,
  pool_status: 'no_pool',
  has_community_title: false,
  ato_clearance_obtained: true,
  has_building_notices: false,
  completed_at: new Date().toISOString(),
  listings: {
    address: '1 Main St',
    suburb: 'Brisbane',
    state: 'QLD',
    postcode: '4000',
  },
};

beforeEach(() => {
  jest.clearAllMocks();
  mockSingle.mockResolvedValue({ data: null, error: null });
  mockEq.mockReturnValue({ single: mockSingle });
  mockSelect.mockReturnValue({ eq: mockEq });
  mockFrom.mockReturnValue({ select: mockSelect });
});

test('returns 405 for GET', async () => {
  const res = makeRes();
  await handler(makeReq('GET'), res);
  expect(res.status).toHaveBeenCalledWith(405);
});

test('returns 400 if listing_id missing', async () => {
  const res = makeRes();
  await handler(makeReq('POST', {}), res);
  expect(res.status).toHaveBeenCalledWith(400);
});

test('returns 404 if no disclosure record found', async () => {
  mockSingle.mockResolvedValue({ data: null, error: null });
  const res = makeRes();
  await handler(makeReq('POST', { listing_id: 'listing-abc' }), res);
  expect(res.status).toHaveBeenCalledWith(404);
});

test('returns PDF buffer for valid listing_id', async () => {
  mockSingle.mockResolvedValue({ data: fullDisclosureRow, error: null });
  const res = makeRes();
  await handler(makeReq('POST', { listing_id: 'listing-abc' }), res);
  expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
  expect(res.send).toHaveBeenCalledWith(expect.any(Buffer));
});

test('PDF response has correct Content-Disposition header', async () => {
  mockSingle.mockResolvedValue({ data: fullDisclosureRow, error: null });
  const res = makeRes();
  await handler(makeReq('POST', { listing_id: 'listing-abc' }), res);
  const dispositionCall = res.setHeader.mock.calls.find(c => c[0] === 'Content-Disposition');
  expect(dispositionCall).toBeDefined();
  expect(dispositionCall[1]).toContain('disclosure-statement.pdf');
});
