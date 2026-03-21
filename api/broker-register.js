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

  const { name, email, brokerage, asic_licence, phone } = req.body || {};

  if (!name || !email || !brokerage || !asic_licence) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const { error } = await supabase
    .from('brokers')
    .insert([{ name, email, brokerage, asic_licence, phone: phone || null }]);

  if (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Email already registered' });
    }
    console.error('Broker insert error:', error);
    return res.status(500).json({ error: 'Registration failed' });
  }

  const asicUrl = `https://connectonline.asic.gov.au/RegistrySearch/faces/landing/SearchRegisters.jspx?searchText=${encodeURIComponent(asic_licence)}&searchType=AFS_REP`;
  const supabaseUrl = `https://supabase.com/dashboard/project/jtpykhrdjkzhcbswrhzo/editor`;

  await resend.emails.send({
    from: 'DEED <noreply@deed-sooty.vercel.app>',
    to: [process.env.ED_EMAIL],
    subject: `New broker application — ${name}, ${brokerage}`,
    text: [
      `New broker application received.`,
      ``,
      `Name: ${name}`,
      `Email: ${email}`,
      `Brokerage: ${brokerage}`,
      `ASIC Licence: ${asic_licence}`,
      phone ? `Phone: ${phone}` : '',
      ``,
      `Verify licence: ${asicUrl}`,
      ``,
      `Approve in Supabase (set status = 'approved'):`,
      supabaseUrl,
    ].filter(l => l !== undefined).join('\n'),
  });

  return res.status(201).json({ success: true });
};
