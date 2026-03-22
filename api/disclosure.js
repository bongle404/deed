const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://jtpykhrdjkzhcbswrhzo.supabase.co';

const supabase = createClient(
  SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { listing_id, _action, seller_email, ...disclosureFields } = req.body || {};

  if (!listing_id) {
    return res.status(400).json({ error: 'listing_id is required' });
  }

  // canPublish gate — check if disclosure has been completed for this listing
  if (_action === 'canPublish') {
    const { data } = await supabase
      .from('disclosure_statements')
      .select('completed_at')
      .eq('listing_id', listing_id)
      .single();

    if (data?.completed_at != null) {
      return res.status(200).json({ published: true });
    }
    return res.status(200).json({ published: false, reason: 'disclosure_incomplete' });
  }

  // Save / upsert disclosure fields
  const { error } = await supabase
    .from('disclosure_statements')
    .upsert({
      listing_id,
      ...disclosureFields,
      completed_at: new Date().toISOString(),
      completed_by: seller_email || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'listing_id' });

  if (error) {
    console.error('Disclosure upsert error:', error);
    return res.status(500).json({ error: 'Failed to save disclosure' });
  }

  return res.status(200).json({ ok: true });
};
