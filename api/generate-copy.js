const Anthropic = require('@anthropic-ai/sdk');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { address, suburb, postcode, type, beds, baths, cars, land_size, house_size, features, price } = req.body || {};

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const specs = [
    beds && `${beds} bedroom`,
    baths && `${baths} bathroom`,
    cars && `${cars} car space`,
    land_size && `${land_size}m² land`,
    house_size && `${house_size}m² home`,
  ].filter(Boolean).join(', ');

  const featureList = Array.isArray(features) ? features.join(', ') : features;
  const priceStr = price ? `$${parseInt(price).toLocaleString('en-AU')}` : '';

  const prompt = `Write a compelling property listing description for a Queensland private sale.

Property details:
- Address: ${address || ''}, ${suburb || ''} QLD ${postcode || ''}
- Type: ${type || 'house'}
- Specs: ${specs}
- Key features: ${featureList || 'not specified'}
- Asking price: ${priceStr || 'not specified'}

Requirements:
- 3–4 sentences maximum
- Start with the strongest lifestyle or emotional hook — not a generic opener
- Be specific to the features listed, not generic filler
- Mention suburb and lifestyle context where relevant (QLD coastal/suburban lifestyle)
- No clichés: no "stunning", "nestled", "boasting", "rare opportunity", "dream home"
- No agent language: no "contact us today", "enquire now", "don't miss out"
- Write as if explaining to a smart buyer who will see through fluff
- End with one concrete practical fact (proximity, size, condition, or price point)
- Plain text only, no markdown`;

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    });

    const copy = message.content[0].text.trim();
    res.status(200).json({ copy });
  } catch (err) {
    console.error('Copy generation error:', err.message);
    res.status(500).json({ error: err.message });
  }
};
