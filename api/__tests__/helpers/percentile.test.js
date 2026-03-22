const { percentile, calcEstimate } = require('../../helpers/percentile');

// percentile(sortedArr, p) — nearest-rank percentile
describe('percentile', () => {
  test('returns 100 at p25 for [100,200,300,400]', () => {
    expect(percentile([100, 200, 300, 400], 25)).toBe(100);
  });

  test('returns 200 at p50 for [100,200,300,400]', () => {
    expect(percentile([100, 200, 300, 400], 50)).toBe(200);
  });

  test('returns 300 at p75 for [100,200,300,400]', () => {
    expect(percentile([100, 200, 300, 400], 75)).toBe(300);
  });

  test('returns null for empty array', () => {
    expect(percentile([], 50)).toBeNull();
  });
});

// calcEstimate(comparables) — takes array with price field, returns { low, mid, high, confidence }
describe('calcEstimate', () => {
  const p1 = { price: 800000 };
  const p2 = { price: 850000 };
  const p3 = { price: 900000 };
  const p4 = { price: 950000 };
  const p5 = { price: 1000000 };

  test('returns { low: null, mid: null, high: null, confidence: "LOW" } for empty array', () => {
    expect(calcEstimate([])).toEqual({ low: null, mid: null, high: null, confidence: 'LOW' });
  });

  test('returns confidence "HIGH" when 5+ items', () => {
    const result = calcEstimate([p1, p2, p3, p4, p5]);
    expect(result.confidence).toBe('HIGH');
  });

  test('returns confidence "MEDIUM" when 3-4 items', () => {
    const result = calcEstimate([p1, p2, p3]);
    expect(result.confidence).toBe('MEDIUM');
  });

  test('returns confidence "LOW" when 1-2 items', () => {
    const result = calcEstimate([p1]);
    expect(result.confidence).toBe('LOW');
  });
});
