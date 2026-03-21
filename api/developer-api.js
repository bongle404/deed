const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const resend = new Resend(process.env.RESEND_API_KEY);

module.exports = async function handler(req, res) {
  const { action } = req.query;

  switch (action) {
    case 'register':          return handleRegister(req, res);
    case 'dashboard':         return handleDashboard(req, res);
    case 'create-project':    return handleCreateProject(req, res);
    case 'get-project':       return handleGetProject(req, res);
    case 'register-interest': return handleRegisterInterest(req, res);
    case 'submit-offer':      return handleSubmitOffer(req, res);
    default:                  return res.status(400).json({ error: 'Invalid action' });
  }
};

// ── REGISTER ─────────────────────────────────────────────────────
async function handleRegister(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, company, email, phone, project_types } = req.body || {};
  if (!name || !company || !email) return res.status(400).json({ error: 'Missing required fields' });

  // Create Supabase auth user via invite (returns user.id immediately)
  const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email);
  if (inviteError && inviteError.message !== 'User already registered') {
    console.error('Invite error:', inviteError);
    return res.status(500).json({ error: 'Failed to create account' });
  }

  let authUserId = inviteData?.user?.id || null;

  // If the user already exists in Auth, look up their ID so the row is not inserted with null
  if (!authUserId && inviteError?.message === 'User already registered') {
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const existing = users?.find(u => u.email === email);
    authUserId = existing?.id || null;
  }

  const { error } = await supabase.from('developers').insert([{
    name,
    company,
    email,
    phone: phone || null,
    project_types: project_types || [],
    auth_user_id: authUserId,
  }]);

  if (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Email already registered' });
    console.error('Developer insert error:', error);
    return res.status(500).json({ error: 'Registration failed' });
  }

  await resend.emails.send({
    from: 'DEED <noreply@deed-sooty.vercel.app>',
    to: [process.env.ED_EMAIL],
    subject: `New developer application — ${name}, ${company}`,
    text: [
      `New developer portal application.`,
      ``,
      `Name: ${name}`,
      `Company: ${company}`,
      `Email: ${email}`,
      phone ? `Phone: ${phone}` : '',
      `Project types: ${(project_types || []).join(', ')}`,
      ``,
      !authUserId ? `⚠️ WARNING: This email is already in Supabase Auth. auth_user_id was set from existing user lookup. Verify the developers table has a valid auth_user_id before sending magic link.` : '',
      `Approve in Supabase (set status = 'approved'):`,
      `https://supabase.com/dashboard/project/jtpykhrdjkzhcbswrhzo/editor`,
      ``,
      `After approving, send magic link from Supabase Auth → Users → ${email} → Send magic link`,
    ].filter(Boolean).join('\n'),
  });

  return res.status(201).json({ success: true });
}

// ── DASHBOARD ─────────────────────────────────────────────────────
async function handleDashboard(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

  const { data: developer, error: devError } = await supabase
    .from('developers')
    .select('id, name, company, status')
    .eq('auth_user_id', user.id)
    .single();

  if (devError || !developer) return res.status(404).json({ error: 'Developer not found' });

  const { data: projects } = await supabase
    .from('projects')
    .select('id, slug, name, type, suburb, price_from, units_available, status, created_at')
    .eq('developer_id', developer.id)
    .order('created_at', { ascending: false });

  return res.status(200).json({ developer, projects: projects || [] });
}

// ── CREATE PROJECT ────────────────────────────────────────────────
async function handleCreateProject(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

  const { data: developer } = await supabase
    .from('developers')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();
  if (!developer) return res.status(401).json({ error: 'Unauthorized' });

  const { name, type, suburb, price_from, total_units, description, completion_date, units: unitList } = req.body || {};
  if (!name || !type || !suburb || !price_from || !total_units) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Generate collision-safe slug
  const baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (!baseSlug) {
    return res.status(400).json({ error: 'Project name must contain at least one letter or number' });
  }
  let slug = baseSlug;
  let suffix = 2;
  let attempts = 0;
  while (attempts < 10) {
    const { data: existing } = await supabase.from('projects').select('id').eq('slug', slug).single();
    if (!existing) break;
    slug = `${baseSlug}-${suffix++}`;
    attempts++;
  }
  if (attempts >= 10) {
    return res.status(409).json({ error: 'Could not generate unique slug. Try a different project name.' });
  }

  const { data: projectData, error } = await supabase.from('projects').insert([{
    developer_id: developer.id,
    slug, name, type, suburb,
    price_from: parseInt(price_from) || 0,
    total_units: parseInt(total_units) || 1,
    units_available: parseInt(total_units) || 1,
    description: description || null,
    completion_date: completion_date || null,
  }]).select().single();

  if (error) {
    console.error('Project insert error:', error);
    return res.status(500).json({ error: 'Failed to create project' });
  }

  // Insert units for completed stock
  if (type === 'completed' && Array.isArray(unitList) && unitList.length > 0) {
    const unitRows = unitList.map(u => ({
      project_id: projectData.id,
      unit_number: u.unit_number,
      beds: u.beds || null,
      baths: u.baths || null,
      car_spaces: u.car_spaces || null,
      size_sqm: u.size_sqm || null,
      price: parseInt(u.price) || 0,
    }));
    const { error: unitError } = await supabase.from('units').insert(unitRows);
    if (unitError) {
      console.error('Unit insert error:', unitError);
      return res.status(500).json({ error: 'Project created but failed to save units. Contact support.' });
    }
  }

  return res.status(201).json({ slug: projectData.slug, id: projectData.id });
}

// ── GET PROJECT ───────────────────────────────────────────────────
async function handleGetProject(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { slug } = req.query;
  if (!slug) return res.status(400).json({ error: 'Slug required' });

  const { data: project, error } = await supabase
    .from('projects')
    .select('*, developers(name, company)')
    .eq('slug', slug)
    .single();

  if (error || !project) return res.status(404).json({ error: 'Project not found' });

  // Fetch units (completed stock) or interest count (OTP) in parallel
  const [unitsResult, interestResult] = await Promise.all([
    supabase.from('units').select('*').eq('project_id', project.id),
    supabase.from('project_interests').select('id', { count: 'exact' }).eq('project_id', project.id),
  ]);

  return res.status(200).json({
    ...project,
    units: unitsResult.data || [],
    interest_count: interestResult.count || 0,
  });
}
async function handleRegisterInterest(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { project_id, name, email, phone } = req.body || {};
  if (!project_id || !name || !email) return res.status(400).json({ error: 'Missing required fields' });

  const { error } = await supabase.from('project_interests').insert([{
    project_id, name, email, phone: phone || null,
  }]);

  if (error) {
    console.error('Interest insert error:', error);
    return res.status(500).json({ error: 'Registration failed' });
  }

  return res.status(201).json({ success: true });
}

async function handleSubmitOffer(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { unit_id, project_id, buyer_name, buyer_email, offer_price, settlement_days, deposit_percent, message } = req.body || {};
  if (!unit_id || !project_id || !buyer_name || !buyer_email || !offer_price) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const { error } = await supabase.from('unit_offers').insert([{
    unit_id, project_id, buyer_name, buyer_email,
    offer_price: parseInt(offer_price),
    settlement_days: settlement_days ? parseInt(settlement_days) : null,
    deposit_percent: deposit_percent ? parseFloat(deposit_percent) : null,
    message: message || null,
  }]);

  if (error) {
    console.error('Unit offer insert error:', error);
    return res.status(500).json({ error: 'Failed to submit offer' });
  }

  // Update unit status to under_offer
  await supabase.from('units').update({ status: 'under_offer' }).eq('id', unit_id);

  return res.status(201).json({ success: true });
}
