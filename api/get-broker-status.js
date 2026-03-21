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

  const { data: broker, error: brokerError } = await supabase
    .from('brokers')
    .select('id, name, brokerage, status')
    .eq('email', user.email)
    .single();

  if (brokerError || !broker) return res.status(404).json({ error: 'Broker not found' });

  return res.status(200).json(broker);
};
