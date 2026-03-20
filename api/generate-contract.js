// DEED — AI contract generation
// Drafts an REIQ-style contract of sale from accepted offer terms using Claude Haiku
// Requires ANTHROPIC_API_KEY in Vercel env vars

const Anthropic = require('@anthropic-ai/sdk');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { offer, listing } = req.body || {};
  if (!offer || !listing) return res.status(400).json({ error: 'Missing offer or listing' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  const client = new Anthropic({ apiKey });

  const today = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
  const settlementDate = new Date(Date.now() + (offer.settlement_days || 30) * 86400000)
    .toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });

  const offerPrice = '$' + Number(offer.offer_price).toLocaleString('en-AU');
  const deposit = offer.deposit_amount
    ? '$' + Number(offer.deposit_amount).toLocaleString('en-AU')
    : 'To be confirmed';

  const conditions = [];
  if (offer.finance_condition) conditions.push(`Finance condition: ${offer.finance_days || 14} business days from contract date`);
  if (offer.building_pest_condition) conditions.push(`Building and pest inspection: ${offer.building_pest_days || 14} business days from contract date`);

  const prompt = `Draft a professional Queensland property contract of sale summary based on the following agreed terms. Format it as a clean, structured document with clear sections. Use formal legal language appropriate for a Queensland residential property transaction. Include all standard REIQ-style clauses and disclosures relevant to Queensland law.

PROPERTY DETAILS:
- Address: ${listing.address}, ${listing.suburb} QLD ${listing.postcode || ''}
- Property type: ${listing.property_type || 'Residential house'}
- Bedrooms: ${listing.bedrooms || '—'} | Bathrooms: ${listing.bathrooms || '—'}
- Land size: ${listing.land_size ? listing.land_size + 'm²' : 'To be confirmed from title'}

PARTIES:
- Seller: ${listing.seller_name || 'Vendor (name to be confirmed)'}
- Buyer: ${offer.buyer_name || 'Purchaser (name to be confirmed)'}
- Buyer email: ${offer.buyer_email || '—'}

AGREED TERMS:
- Purchase price: ${offerPrice}
- Deposit: ${deposit} (payable within 2 business days of contract execution)
- Settlement date: ${settlementDate} (${offer.settlement_days || 30} days from contract)
- Contract date: ${today}
${conditions.length > 0 ? '- Conditions:\n' + conditions.map(c => '  · ' + c).join('\n') : '- Contract type: Unconditional'}
${offer.cover_note ? '- Buyer notes: ' + offer.cover_note : ''}

Draft the contract summary with these sections:
1. CONTRACT HEADER (date, parties, property)
2. PURCHASE PRICE AND DEPOSIT
3. SETTLEMENT
4. CONDITIONS (if any, or state "Unconditional")
5. INCLUSIONS AND EXCLUSIONS (standard Queensland residential inclusions)
6. SELLER DISCLOSURE (standard QLD Form 2 and sustainability declaration note)
7. STANDARD CONDITIONS (reference to REIQ standard conditions)
8. EXECUTION (signature blocks for both parties)

Add a clear header note that this is an AI-drafted summary for review by a licensed Queensland conveyancer before execution. Keep it professional and thorough.`;

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2500,
      messages: [{ role: 'user', content: prompt }],
    });

    return res.status(200).json({ contract: message.content[0].text });
  } catch (err) {
    console.error('Contract generation error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
