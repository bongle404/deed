const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Combines get-broker-status (?data=status) and get-broker-buyers (?data=buyers)
// to stay within Vercel Hobby plan's 12 function limit.
module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: 'Unauthorized' });

  const { data } = req.query;

  if (data === 'buyers') {
    const { data: broker } = await supabase
      .from('brokers')
      .select('id')
      .eq('email', user.email)
      .eq('status', 'approved')
      .single();

    if (!broker) return res.status(401).json({ error: 'Unauthorized' });

    const { data: buyers, error: buyersError } = await supabase
      .from('buyers')
      .select('id, name, email, verified_amount, activation_complete, created_at')
      .eq('broker_id', broker.id)
      .order('created_at', { ascending: false });

    if (buyersError) return res.status(500).json({ error: 'Failed to load buyers' });
    return res.status(200).json(buyers || []);
  }

  // Default: return broker status
  const { data: broker, error: brokerError } = await supabase
    .from('brokers')
    .select('id, name, brokerage, status')
    .eq('email', user.email)
    .single();

  if (brokerError || !broker) return res.status(404).json({ error: 'Broker not found' });
  return res.status(200).json(broker);
};
