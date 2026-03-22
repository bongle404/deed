// TDD RED: These tests will fail with "Cannot find module '../submit-to-portals'"
// until Plan 03 creates api/submit-to-portals.js. That is the correct RED state.
//
// Note: ssh2-sftp-client mock is declared here so jest.mock() hoisting registers
// it before the implementation require. Once the implementation is added, this
// prevents real SFTP connections during tests. The mock itself is a factory
// (no import of the real module) so it does not require the package to be installed.

const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockSingle = jest.fn();
const mockUpdate = jest.fn();
const mockUpdateEq = jest.fn();
const mockFrom = jest.fn();

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({ from: mockFrom })),
}));

jest.mock('ssh2-sftp-client', () => {
  return jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue(),
    put: jest.fn().mockResolvedValue(),
    end: jest.fn().mockResolvedValue(),
  }));
}, { virtual: true });

// This require will fail with "Cannot find module '../submit-to-portals'"
// until Plan 03 creates the implementation. That is the expected RED state.
const { buildReaXml, default: handler } = require('../submit-to-portals');

const testListing = {
  id: 'test-123',
  address: '42 Example St',
  suburb: 'Burleigh Heads',
  postcode: '4220',
  state: 'QLD',
  bedrooms: 3,
  bathrooms: 2,
  car_spaces: 1,
  asking_price: 850000,
  description: 'A lovely home',
  photos: ['https://example.com/photo1.jpg'],
};

function makeReq(body = {}) {
  return { method: 'POST', body };
}
function makeRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

beforeEach(() => {
  jest.clearAllMocks();

  // Default: select chain returns testListing
  mockSingle.mockResolvedValue({ data: testListing, error: null });
  mockEq.mockReturnValue({ single: mockSingle });
  mockSelect.mockReturnValue({ eq: mockEq });

  // Default: update chain succeeds
  mockUpdateEq.mockResolvedValue({ error: null });
  mockUpdate.mockReturnValue({ eq: mockUpdateEq });

  mockFrom.mockImplementation(() => ({
    select: mockSelect,
    update: mockUpdate,
  }));
});

test('buildReaXml returns a string containing all mandatory REAXML fields', () => {
  const xml = buildReaXml(testListing);
  expect(typeof xml).toBe('string');
  expect(xml).toContain('<agentID>');
  expect(xml).toContain('<uniqueID>deed-test-123</uniqueID>');
  expect(xml).toContain('<suburb>Burleigh Heads</suburb>');
  expect(xml).toContain('<bedrooms>3</bedrooms>');
  expect(xml).toContain('<listingAgent>');
});

test('handler returns { ok: true, mode: "dev_skipped" } and does not throw when REA_SFTP_HOST is absent', async () => {
  const originalHost = process.env.REA_SFTP_HOST;
  process.env.REA_SFTP_HOST = '';

  const res = makeRes();
  await handler(makeReq({ listing_id: 'test-123' }), res);

  expect(res.json).toHaveBeenCalledWith(
    expect.objectContaining({ ok: true, mode: 'dev_skipped' })
  );

  process.env.REA_SFTP_HOST = originalHost !== undefined ? originalHost : '';
});

test('handler calls supabase update with { rea_status: "pending" } when credentials are present', async () => {
  const origHost = process.env.REA_SFTP_HOST;
  const origUser = process.env.REA_SFTP_USER;
  const origPass = process.env.REA_SFTP_PASS;

  process.env.REA_SFTP_HOST = 'sftp.rea.example.com';
  process.env.REA_SFTP_USER = 'testuser';
  process.env.REA_SFTP_PASS = 'testpass';

  const res = makeRes();
  await handler(makeReq({ listing_id: 'test-123' }), res);

  expect(mockUpdate).toHaveBeenCalledWith(
    expect.objectContaining({ rea_status: 'pending' })
  );

  process.env.REA_SFTP_HOST = origHost !== undefined ? origHost : '';
  process.env.REA_SFTP_USER = origUser !== undefined ? origUser : '';
  process.env.REA_SFTP_PASS = origPass !== undefined ? origPass : '';
});

test('handler returns 400 when listing_id is missing from req.body', async () => {
  const res = makeRes();
  await handler(makeReq({}), res);
  expect(res.status).toHaveBeenCalledWith(400);
});

test('handler returns 404 when Supabase returns no listing for the given listing_id', async () => {
  mockSingle.mockResolvedValue({ data: null, error: { message: 'not found' } });

  const res = makeRes();
  await handler(makeReq({ listing_id: 'nonexistent-id' }), res);
  expect(res.status).toHaveBeenCalledWith(404);
});
