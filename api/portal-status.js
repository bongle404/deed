const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method not allowed' });

  const listing_id = req.query?.listing_id;
  if (!listing_id) return res.status(400).json({ error: 'listing_id required' });

  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  const { data, error } = await sb
    .from('listings')
    .select('portal_opted_in, rea_status, domain_status, rea_listing_url, domain_listing_url')
    .eq('id', listing_id)
    .single();

  if (error || !data) return res.status(404).json({ error: 'listing not found' });

  return res.status(200).json({
    portal_opted_in: data.portal_opted_in,
    rea_status: data.rea_status,
    domain_status: data.domain_status,
    rea_listing_url: data.rea_listing_url || null,
    domain_listing_url: data.domain_listing_url || null,
  });
};
