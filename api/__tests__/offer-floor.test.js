// Mock @anthropic-ai/sdk — returns a fixed reason string for below-floor offers
jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn().mockResolvedValue({
        content: [{ text: 'This offer is 8.6% below the comparable sales floor.' }],
      }),
    },
  }));
});

const { checkBelowFloor } = require('../offer-floor');

beforeEach(() => jest.clearAllMocks());

test('below_floor is true when offer_price is below listing.price_estimate_low', async () => {
  const result = await checkBelowFloor(720000, { price_estimate_low: 787000 });
  expect(result.below_floor).toBe(true);
});

test('below_floor is false when offer_price is at or above listing.price_estimate_low', async () => {
  const result = await checkBelowFloor(800000, { price_estimate_low: 787000 });
  expect(result.below_floor).toBe(false);
});

test('below_floor_reason is a non-empty string when below_floor is true', async () => {
  const result = await checkBelowFloor(720000, { price_estimate_low: 787000 });
  expect(typeof result.below_floor_reason).toBe('string');
  expect(result.below_floor_reason.length).toBeGreaterThan(0);
});

test('below_floor_reason contains the offer price as a dollar amount', async () => {
  const result = await checkBelowFloor(720000, { price_estimate_low: 787000 });
  // Reason should reference the offer price ($720,000 or $720000)
  expect(result.below_floor_reason).toMatch(/720[,.]?000|720000/);
});

test('below_floor_reason contains the floor price as a dollar amount', async () => {
  const result = await checkBelowFloor(720000, { price_estimate_low: 787000 });
  // Reason should reference the floor price ($787,000 or $787000)
  expect(result.below_floor_reason).toMatch(/787[,.]?000|787000/);
});

test('below_floor is false and below_floor_reason is null when listing has no price_estimate_low', async () => {
  const result = await checkBelowFloor(720000, {});
  expect(result.below_floor).toBe(false);
  expect(result.below_floor_reason).toBeNull();
});
