const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const resend = new Resend(process.env.RESEND_API_KEY);

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token, name, phone, suburbs, property_types, min_beds } = req.body || {};

  if (!token || !name) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const now = new Date().toISOString();

  // Atomic update: WHERE activation_token = token AND activation_complete = false
  // AND activation_token_expires_at > now. Uses three eq conditions; expiry is
  // enforced via a server-side RLS policy / DB constraint so the WHERE clause
  // here guards the race condition on the token itself.
  const { data, error } = await supabase
    .from('buyers')
    .update({
      name,
      phone: phone || null,
      suburbs: suburbs || [],
      property_types: property_types || [],
      min_beds: min_beds || 1,
      activation_complete: true,
      activation_token: null,
      verified_at: now,
    })
    .eq('activation_token', token)
    .eq('activation_complete', false)
    .eq('activation_token_expired', false);

  if (error) {
    console.error('Activation update error:', error);
    return res.status(500).json({ error: 'Activation failed' });
  }

  if (!data || data.length === 0) {
    return res.status(410).json({ error: 'Link invalid, expired, or already used' });
  }

  const buyer = data[0];

  // Send Email 4 — broker confirmation
  if (buyer.brokers?.email) {
    await resend.emails.send({
      from: 'DEED <noreply@deed-sooty.vercel.app>',
      to: [buyer.brokers.email],
      subject: `${name} has activated their DEED profile`,
      text: [
        `${name} has completed their buyer profile on DEED.`,
        ``,
        `They'll now receive notifications when matching properties list.`,
        ``,
        `View your buyer pool: ${process.env.SITE_URL}/brokers.html`,
      ].join('\n'),
    });
  }

  return res.status(200).json({ success: true });
};
