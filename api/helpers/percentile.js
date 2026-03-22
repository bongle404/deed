/**
 * Nearest-rank percentile and price estimate calculator.
 * Pure module — no imports, no side effects.
 */

/**
 * Returns the nearest-rank percentile value from a sorted ascending array.
 * @param {number[]} sortedArr - Array sorted in ascending order
 * @param {number} p - Percentile (0-100)
 * @returns {number|null} The value at the given percentile, or null for empty arrays
 */
function percentile(sortedArr, p) {
  if (sortedArr.length === 0) return null;
  const index = Math.ceil((p / 100) * sortedArr.length) - 1;
  return sortedArr[Math.max(0, index)];
}

/**
 * Takes an array of comparable objects with a .price field (unsorted OK).
 * Returns { low, mid, high, confidence } where low=p25, mid=p50, high=p75.
 * @param {Array<{price: number}>} comparables
 * @returns {{ low: number|null, mid: number|null, high: number|null, confidence: 'HIGH'|'MEDIUM'|'LOW' }}
 */
function calcEstimate(comparables) {
  const prices = comparables.map(c => c.price).sort((a, b) => a - b);
  const n = prices.length;
  return {
    low: percentile(prices, 25),
    mid: percentile(prices, 50),
    high: percentile(prices, 75),
    confidence: n >= 5 ? 'HIGH' : n >= 3 ? 'MEDIUM' : 'LOW',
  };
}

module.exports = { percentile, calcEstimate };
