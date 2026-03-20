const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token } = req.query;
  if (!token) {
    return res.status(400).json({ error: 'Missing token' });
  }

  const { data, error } = await supabase
    .from('buyers')
    .select('name, verified_amount, activation_complete, activation_token_expires_at, brokers(name, brokerage)')
    .eq('activation_token', token)
    .single();

  if (error || !data) {
    return res.status(404).json({ error: 'Invalid link' });
  }

  if (new Date(data.activation_token_expires_at) < new Date()) {
    return res.status(410).json({ error: 'Link expired' });
  }

  if (data.activation_complete) {
    return res.status(410).json({ error: 'Already activated' });
  }

  return res.status(200).json({
    name: data.name,
    verified_amount: data.verified_amount,
    broker_name: data.brokers?.name ?? null,
    brokerage: data.brokers?.brokerage ?? null,
  });
};
