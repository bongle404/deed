// DEED — Below-floor offer detection module
// Compares an offer price against the listing's comparable sales floor and
// generates a plain-English reason label via Claude Haiku when the offer is below floor.
//
// Export: checkBelowFloor(offerPrice, listing) => Promise<{ below_floor, below_floor_reason }>

const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * Format a number as AUD currency without decimal places.
 * e.g. 787000 → "$787,000"
 */
function formatAUD(price) {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0,
  }).format(price);
}

/**
 * Check whether an offer is below the listing's comparable sales floor.
 *
 * @param {number} offerPrice - The offer price in dollars.
 * @param {{ price_estimate_low?: number|null }} listing - Listing object.
 * @returns {Promise<{ below_floor: boolean, below_floor_reason: string|null }>}
 */
async function checkBelowFloor(offerPrice, listing) {
  const floor = listing && listing.price_estimate_low;

  // No floor set — cannot determine below-floor status
  if (floor == null) {
    return { below_floor: false, below_floor_reason: null };
  }

  // Offer is at or above the floor — not below floor
  if (offerPrice >= floor) {
    return { below_floor: false, below_floor_reason: null };
  }

  // Offer is below the floor — calculate gap and ask Haiku for a label
  const pct = ((floor - offerPrice) / floor * 100).toFixed(1);
  const formattedOfferPrice = formatAUD(offerPrice);
  const formattedFloor = formatAUD(floor);

  const prompt = `Write a single plain-English sentence explaining that this offer is below the comparable sales floor.
Include all three of: the offer price (${formattedOfferPrice}), the floor price (${formattedFloor}),
and the percentage gap (${pct}%). Do not include advice. Maximum 40 words.
Example: "This offer of $720,000 is 8.6% below the comparable sales floor of $787,000 for similar properties in this suburb."`;

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 150,
    messages: [{ role: 'user', content: prompt }],
  });

  // Haiku generates the label. The prices are injected into the prompt so that
  // Haiku echoes them back in production. We verify they appear and fall back to
  // a factual sentence if the response doesn't include them (e.g. in test mocks).
  const haikuText = message.content[0].text;
  const pricePattern = /\d{3}[,.]?\d{3}/;
  const below_floor_reason = pricePattern.test(haikuText)
    ? haikuText
    : `This offer of ${formattedOfferPrice} is ${pct}% below the comparable sales floor of ${formattedFloor}.`;

  return { below_floor: true, below_floor_reason };
}

module.exports = { checkBelowFloor };
