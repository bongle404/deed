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

  // Validate JWT
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

  // Look up approved broker by email
  const { data: broker, error: brokerError } = await supabase
    .from('brokers')
    .select('id, name, brokerage')
    .eq('email', user.email)
    .eq('status', 'approved')
    .single();

  if (brokerError || !broker) return res.status(401).json({ error: 'Broker not found or not approved' });

  const { client_name, client_email, verified_amount, lender, expiry_date } = req.body || {};

  if (!client_name || !client_email || !verified_amount) {
    return res.status(400).json({ error: 'Missing required fields: client_name, client_email, verified_amount' });
  }

  // Check for duplicate buyer email
  const { data: existing } = await supabase
    .from('buyers')
    .select('id')
    .eq('email', client_email)
    .single();

  if (existing) {
    return res.status(409).json({ error: 'This buyer is already registered on DEED' });
  }

  // Generate activation token
  const activationToken = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { error: insertError } = await supabase
    .from('buyers')
    .insert([{
      name: client_name,
      email: client_email,
      verified: true,
      verification_method: 'broker_preapproval',
      verified_amount: verified_amount,
      max_price: verified_amount,
      broker_id: broker.id,
      activation_token: activationToken,
      activation_token_expires_at: expiresAt,
      activation_complete: false,
    }]);

  if (insertError) {
    console.error('Buyer insert error:', insertError);
    return res.status(500).json({ error: 'Failed to register buyer' });
  }

  // Send activation email (Email 3)
  const activationLink = `${process.env.SITE_URL}/activate.html#token=${activationToken}`;
  const formattedAmount = `$${parseInt(verified_amount).toLocaleString('en-AU')}`;

  await resend.emails.send({
    from: 'DEED <noreply@deed-sooty.vercel.app>',
    to: [client_email],
    subject: `${broker.name} has registered you as a verified buyer on DEED`,
    text: [
      `${broker.name} at ${broker.brokerage} has confirmed your borrowing capacity and registered you on DEED.`,
      ``,
      `DEED is a private property platform where sellers list directly — no agents, flat $999 fee. You get access to properties before they go anywhere else.`,
      ``,
      `Your pre-approval of ${formattedAmount} is on file.`,
      ``,
      `Activate your profile and set your property preferences:`,
      activationLink,
      ``,
      `This link expires in 7 days.`,
    ].join('\n'),
  });

  return res.status(201).json({ success: true });
};
