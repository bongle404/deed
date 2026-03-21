const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: 'Unauthorized' });

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
};
