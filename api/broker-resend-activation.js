const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');
const crypto = require('crypto');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const resend = new Resend(process.env.RESEND_API_KEY);

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

  const { data: broker } = await supabase
    .from('brokers')
    .select('id, name, brokerage')
    .eq('email', user.email)
    .eq('status', 'approved')
    .single();

  if (!broker) return res.status(401).json({ error: 'Broker not found or not approved' });

  const { buyer_id } = req.body || {};
  if (!buyer_id) return res.status(400).json({ error: 'Missing buyer_id' });

  const { data: buyer } = await supabase
    .from('buyers')
    .select('id, email, name, verified_amount, broker_id, activation_complete, activation_token_expires_at')
    .eq('id', buyer_id)
    .single();

  if (!buyer) return res.status(404).json({ error: 'Buyer not found' });
  if (buyer.broker_id !== broker.id) return res.status(403).json({ error: 'Forbidden' });
  if (buyer.activation_complete) return res.status(400).json({ error: 'Buyer has already activated their profile' });

  // Rate limit: don't allow resend if token was issued less than 10 minutes ago.
  // Token lifespan is 7 days, so issuedAt = expires - 7 days.
  // Only trigger if issuedAt is in the past AND within the last 10 minutes.
  const now = Date.now();
  const tenMinsAgo = new Date(now - 10 * 60 * 1000);
  const expires = new Date(buyer.activation_token_expires_at);
  const issuedAt = new Date(expires.getTime() - 7 * 24 * 60 * 60 * 1000);
  if (issuedAt <= new Date(now) && issuedAt > tenMinsAgo) {
    return res.status(429).json({ error: 'Please wait before resending' });
  }

  const newToken = crypto.randomUUID();
  const newExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  await supabase
    .from('buyers')
    .update({ activation_token: newToken, activation_token_expires_at: newExpires })
    .eq('id', buyer_id)
    .eq('activation_complete', false);

  const activationLink = `${process.env.SITE_URL}/activate.html#token=${newToken}`;
  const formattedAmount = `$${parseInt(buyer.verified_amount).toLocaleString('en-AU')}`;

  await resend.emails.send({
    from: 'DEED <noreply@deed-sooty.vercel.app>',
    to: [buyer.email],
    subject: `${broker.name} has registered you as a verified buyer on DEED`,
    text: [
      `${broker.name} at ${broker.brokerage} has confirmed your borrowing capacity and registered you on DEED.`,
      ``,
      `Your pre-approval of ${formattedAmount} is on file.`,
      ``,
      `Activate your profile:`,
      activationLink,
      ``,
      `This link expires in 7 days.`,
    ].join('\n'),
  });

  return res.status(200).json({ success: true });
};
