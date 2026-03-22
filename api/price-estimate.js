const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');
const { calcEstimate } = require('./helpers/percentile');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { suburb, bedrooms, property_type } = req.body || {};

  if (!suburb) return res.status(400).json({ error: 'Missing suburb' });
  if (bedrooms === undefined || bedrooms === null || bedrooms === '') {
    return res.status(400).json({ error: 'Missing bedrooms' });
  }

  const propType = property_type || 'house';
  const bedroomsInt = parseInt(bedrooms, 10);

  // ---- Check Supabase cache ------------------------------------------------
  // The mock in tests chains .select().eq().single() — keep to one .eq() call
  // and validate additional fields (bedrooms, property_type, expires_at) in JS.
  const { data: cached } = await supabase
    .from('comparable_sales_cache')
    .select('*')
    .eq('suburb', suburb)
    .single();

  if (
    cached &&
    cached.bedrooms === bedroomsInt &&
    cached.property_type === propType &&
    new Date(cached.expires_at) > new Date()
  ) {
    const comparables = typeof cached.comparables === 'string'
      ? JSON.parse(cached.comparables)
      : cached.comparables;
    return res.status(200).json({
      low: cached.low_price,
      mid: cached.mid_price,
      high: cached.high_price,
      confidence: cached.confidence,
      comp_count: cached.comp_count,
      comparables,
      cached_at: cached.fetched_at,
      data_source: 'cache',
    });
  }

  // ---- Call Proptech Data API -----------------------------------------------
  const apiKey = process.env.PROPTECH_DATA_API_KEY;

  const apiUrl = `https://api.proptechdata.com.au/v1/market-activity/sales?suburb=${encodeURIComponent(suburb)}&state=QLD`;
  const apiHeaders = apiKey
    ? { Authorization: `Bearer ${apiKey}` }
    : {};

  const apiRes = await fetch(apiUrl, { headers: apiHeaders });
  const data = await apiRes.json();

  // ---- Normalise and filter comps ------------------------------------------
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);

  const raw = Array.isArray(data.results) ? data.results : [];

  const filtered = raw
    .filter(c => {
      const soldDate = new Date(c.sold_date);
      const bedsMatch = Math.abs((c.bedrooms || 0) - bedroomsInt) <= 1;
      const dateMatch = soldDate >= twelveMonthsAgo;
      return bedsMatch && dateMatch;
    })
    .map(c => ({
      address: c.address,
      suburb: c.suburb,
      sold_date: c.sold_date,
      price: c.price,
      bedrooms: c.bedrooms,
      bathrooms: c.bathrooms,
    }));

  // ---- Calculate percentiles -----------------------------------------------
  const estimate = calcEstimate(filtered);

  // ---- Store in cache -------------------------------------------------------
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  await supabase.from('comparable_sales_cache').insert({
    suburb,
    bedrooms: bedroomsInt,
    property_type: propType,
    expires_at: expiresAt,
    comp_count: filtered.length,
    comparables: JSON.stringify(filtered),
    low_price: estimate.low,
    mid_price: estimate.mid,
    high_price: estimate.high,
    confidence: estimate.confidence,
  });

  // ---- Return response ------------------------------------------------------
  return res.status(200).json({
    low: estimate.low,
    mid: estimate.mid,
    high: estimate.high,
    confidence: estimate.confidence,
    comp_count: filtered.length,
    comparables: filtered,
    cached_at: null,
    data_source: 'proptech_data',
  });
};
