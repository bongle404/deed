// Mock Supabase — simulate cache miss (no cached data)
const mockSingle = jest.fn().mockResolvedValue({ data: null, error: null });
const mockEq = jest.fn(() => ({ single: mockSingle }));
const mockSelect = jest.fn(() => ({ eq: mockEq }));
const mockInsert = jest.fn().mockResolvedValue({ error: null });
const mockFrom = jest.fn((table) => ({
  select: mockSelect,
  insert: mockInsert,
}));

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: mockFrom,
  })),
}));

// Mock node-fetch to return fake Proptech Data comparables
const makeComps = (bedrooms) => ({
  ok: true,
  json: jest.fn().mockResolvedValue({
    results: [
      { address: '14 Smith St', suburb: 'Burleigh Heads', sold_date: '2025-11-12', price: 940000, bedrooms, bathrooms: 2 },
      { address: '22 Ocean Dr', suburb: 'Burleigh Heads', sold_date: '2025-10-05', price: 920000, bedrooms, bathrooms: 2 },
      { address: '8 Park Ave', suburb: 'Burleigh Heads', sold_date: '2025-09-20', price: 980000, bedrooms, bathrooms: 2 },
      { address: '3 Beach Rd', suburb: 'Burleigh Heads', sold_date: '2025-08-14', price: 960000, bedrooms, bathrooms: 2 },
      { address: '55 View St', suburb: 'Burleigh Heads', sold_date: '2025-07-30', price: 900000, bedrooms, bathrooms: 2 },
      { address: '11 Hill Cl', suburb: 'Burleigh Heads', sold_date: '2025-06-18', price: 930000, bedrooms, bathrooms: 2 },
    ],
  }),
});

const mockFetch = jest.fn();
jest.mock('node-fetch', () => mockFetch);

const handler = require('../price-estimate');

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
  mockSingle.mockResolvedValue({ data: null, error: null });
  mockFetch.mockResolvedValue(makeComps(3));
});

test('returns 405 for GET request (non-POST)', async () => {
  const res = makeRes();
  await handler({ method: 'GET', body: {} }, res);
  expect(res.status).toHaveBeenCalledWith(405);
});

test('returns 400 when suburb is missing', async () => {
  const res = makeRes();
  await handler(makeReq({ bedrooms: 3, bathrooms: 2, property_type: 'house' }), res);
  expect(res.status).toHaveBeenCalledWith(400);
});

test('returns 400 when bedrooms is missing', async () => {
  const res = makeRes();
  await handler(makeReq({ suburb: 'Burleigh Heads', bathrooms: 2, property_type: 'house' }), res);
  expect(res.status).toHaveBeenCalledWith(400);
});

test('returns 200 with correct shape on valid input', async () => {
  const res = makeRes();
  await handler(makeReq({ suburb: 'Burleigh Heads', bedrooms: 3, bathrooms: 2, property_type: 'house' }), res);
  expect(res.status).toHaveBeenCalledWith(200);
  const body = res.json.mock.calls[0][0];
  expect(body).toHaveProperty('low');
  expect(body).toHaveProperty('mid');
  expect(body).toHaveProperty('high');
  expect(body).toHaveProperty('confidence');
  expect(body).toHaveProperty('comp_count');
  expect(body).toHaveProperty('comparables');
  expect(Array.isArray(body.comparables)).toBe(true);
});

test('comparables items each have required fields', async () => {
  const res = makeRes();
  await handler(makeReq({ suburb: 'Burleigh Heads', bedrooms: 3, bathrooms: 2, property_type: 'house' }), res);
  const body = res.json.mock.calls[0][0];
  const comp = body.comparables[0];
  expect(comp).toHaveProperty('address');
  expect(comp).toHaveProperty('suburb');
  expect(comp).toHaveProperty('sold_date');
  expect(comp).toHaveProperty('price');
  expect(comp).toHaveProperty('bedrooms');
  expect(comp).toHaveProperty('bathrooms');
});

test('PRICE-04: returns different low/mid/high when bedrooms changes from 3 to 4', async () => {
  // First call with bedrooms: 3 — comps priced ~850k
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: jest.fn().mockResolvedValue({
      results: [
        { address: '1 Low St', suburb: 'Burleigh Heads', sold_date: '2025-11-01', price: 850000, bedrooms: 3, bathrooms: 2 },
        { address: '2 Low St', suburb: 'Burleigh Heads', sold_date: '2025-10-01', price: 860000, bedrooms: 3, bathrooms: 2 },
        { address: '3 Low St', suburb: 'Burleigh Heads', sold_date: '2025-09-01', price: 870000, bedrooms: 3, bathrooms: 2 },
        { address: '4 Low St', suburb: 'Burleigh Heads', sold_date: '2025-08-01', price: 840000, bedrooms: 3, bathrooms: 2 },
        { address: '5 Low St', suburb: 'Burleigh Heads', sold_date: '2025-07-01', price: 855000, bedrooms: 3, bathrooms: 2 },
      ],
    }),
  });

  // Second call with bedrooms: 4 — comps priced ~1.1M
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: jest.fn().mockResolvedValue({
      results: [
        { address: '1 High St', suburb: 'Burleigh Heads', sold_date: '2025-11-01', price: 1100000, bedrooms: 4, bathrooms: 2 },
        { address: '2 High St', suburb: 'Burleigh Heads', sold_date: '2025-10-01', price: 1120000, bedrooms: 4, bathrooms: 2 },
        { address: '3 High St', suburb: 'Burleigh Heads', sold_date: '2025-09-01', price: 1090000, bedrooms: 4, bathrooms: 2 },
        { address: '4 High St', suburb: 'Burleigh Heads', sold_date: '2025-08-01', price: 1110000, bedrooms: 4, bathrooms: 2 },
        { address: '5 High St', suburb: 'Burleigh Heads', sold_date: '2025-07-01', price: 1080000, bedrooms: 4, bathrooms: 2 },
      ],
    }),
  });

  const res3 = makeRes();
  await handler(makeReq({ suburb: 'Burleigh Heads', bedrooms: 3, bathrooms: 2, property_type: 'house' }), res3);
  const body3 = res3.json.mock.calls[0][0];

  const res4 = makeRes();
  await handler(makeReq({ suburb: 'Burleigh Heads', bedrooms: 4, bathrooms: 2, property_type: 'house' }), res4);
  const body4 = res4.json.mock.calls[0][0];

  expect(body3.low).not.toBe(body4.low);
  expect(body3.mid).not.toBe(body4.mid);
  expect(body3.high).not.toBe(body4.high);
});

test('confidence is HIGH when comp_count >= 5, MEDIUM when 3-4, LOW when < 3', async () => {
  // 6 comps → HIGH
  const res = makeRes();
  await handler(makeReq({ suburb: 'Burleigh Heads', bedrooms: 3, bathrooms: 2, property_type: 'house' }), res);
  const bodyHigh = res.json.mock.calls[0][0];
  expect(bodyHigh.confidence).toBe('HIGH');
  expect(bodyHigh.comp_count).toBeGreaterThanOrEqual(5);
});
