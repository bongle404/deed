// DEED — Open home inspection booking handler
// POST /api/book-inspection
// Requires: SUPABASE_SERVICE_KEY, RESEND_API_KEY, SELLER_EMAIL env vars

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://jtpykhrdjkzhcbswrhzo.supabase.co';
const RESEND_API   = 'https://api.resend.com/emails';
const PROPERTY_ADDRESS = '14 Headland Drive, Burleigh Heads QLD 4220'; // hardcoded for demo

// ─── Validation ──────────────────────────────────────────────────────────────

function validateInput({ listing_id, slot_id, slot_label, name, email, phone }) {
  if (!listing_id || !slot_id || !slot_label || !name || !email || !phone) {
    return 'All fields are required.';
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'Please enter a valid email address.';
  }
  const cleanPhone = phone.replace(/[\s\-]/g, '');
  if (!/^(0\d{9}|\+61\d{9})$/.test(cleanPhone)) {
    return 'Please enter a valid Australian mobile number (e.g. 0412 345 678).';
  }
  return null; // valid
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── Email helpers ───────────────────────────────────────────────────────────

async function sendEmail({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('RESEND_API_KEY not set — email skipped');
    return;
  }
  const from = process.env.DEED_FROM_EMAIL || 'DEED <onboarding@resend.dev>';
  // Route to dev override email until domain is verified (matches pattern in api/notify.js)
  const devOverride = process.env.DEED_DEV_EMAIL || 'ed@noys.co';
  const recipient   = process.env.DEED_DOMAIN_VERIFIED ? to : devOverride;

  const res = await fetch(RESEND_API, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: recipient, subject, html }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Resend error');
}

function buyerEmail({ name, email, slot_label }) {
  return {
    to: email,
    subject: `You're booked in · 14 Headland Drive, Burleigh Heads`,
    html: `
<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f8f7f5;font-family:Arial,sans-serif;">
  <div style="max-width:520px;margin:2rem auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
    <div style="background:#0b0b0b;padding:1.5rem 2rem;">
      <span style="font-family:Georgia,serif;font-size:1.3rem;letter-spacing:0.14em;color:#ede8df;">DEED</span>
    </div>
    <div style="padding:2rem;">
      <h2 style="margin:0 0 0.5rem;font-size:1.3rem;color:#0b0b0b;">You're booked in, ${escHtml(name.split(' ')[0])}.</h2>
      <p style="margin:0 0 1.5rem;color:#666;font-size:0.9rem;">Here are your inspection details.</p>

      <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:1.25rem 1.5rem;margin-bottom:1.5rem;">
        <p style="margin:0 0 0.25rem;font-size:0.7rem;letter-spacing:0.12em;text-transform:uppercase;color:#92400e;">Your inspection</p>
        <p style="margin:0;font-size:1rem;font-weight:600;color:#78350f;">📅 ${escHtml(slot_label)}</p>
      </div>

      <table style="width:100%;border-collapse:collapse;margin-bottom:1.5rem;">
        <tr><td style="padding:0.6rem 0;border-bottom:1px solid #f0ece6;color:#999;font-size:0.85rem;width:40%;">Property</td><td style="padding:0.6rem 0;border-bottom:1px solid #f0ece6;font-size:0.85rem;color:#0b0b0b;">${PROPERTY_ADDRESS}</td></tr>
        <tr><td style="padding:0.6rem 0;color:#999;font-size:0.85rem;">Parking</td><td style="padding:0.6rem 0;font-size:0.85rem;color:#0b0b0b;">Street parking on Headland Drive</td></tr>
      </table>

      <p style="font-size:0.82rem;color:#666;line-height:1.6;margin:0;">We'll send you the seller's contact details the morning of your inspection. If you have any questions, reply to this email.</p>
    </div>
    <div style="padding:1rem 2rem;border-top:1px solid #f0ece6;font-size:0.75rem;color:#999;">No agent. No commission. Private sale via DEED.</div>
  </div>
</body></html>`,
  };
}

function sellerEmail({ name, email, phone, slot_label }) {
  const sellerTo = process.env.SELLER_EMAIL || process.env.DEED_DEV_EMAIL || 'ed@noys.co';
  return {
    to: sellerTo,
    subject: `New inspection booking · ${slot_label}`,
    html: `
<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f8f7f5;font-family:Arial,sans-serif;">
  <div style="max-width:520px;margin:2rem auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
    <div style="background:#0b0b0b;padding:1.5rem 2rem;">
      <span style="font-family:Georgia,serif;font-size:1.3rem;letter-spacing:0.14em;color:#ede8df;">DEED</span>
    </div>
    <div style="padding:2rem;">
      <h2 style="margin:0 0 0.5rem;font-size:1.2rem;color:#0b0b0b;">New inspection booking</h2>
      <p style="margin:0 0 1.5rem;color:#666;font-size:0.9rem;">A buyer has registered for your open home.</p>

      <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:1.25rem 1.5rem;margin-bottom:1.5rem;">
        <p style="margin:0 0 0.25rem;font-size:0.7rem;letter-spacing:0.12em;text-transform:uppercase;color:#92400e;">Slot</p>
        <p style="margin:0;font-size:1rem;font-weight:600;color:#78350f;">📅 ${escHtml(slot_label)}</p>
      </div>

      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:0.6rem 0;border-bottom:1px solid #f0ece6;color:#999;font-size:0.85rem;width:30%;">Name</td><td style="padding:0.6rem 0;border-bottom:1px solid #f0ece6;font-size:0.85rem;color:#0b0b0b;">${escHtml(name)}</td></tr>
        <tr><td style="padding:0.6rem 0;border-bottom:1px solid #f0ece6;color:#999;font-size:0.85rem;">Email</td><td style="padding:0.6rem 0;border-bottom:1px solid #f0ece6;font-size:0.85rem;color:#0b0b0b;"><a href="mailto:${escHtml(email)}" style="color:#b45309;">${escHtml(email)}</a></td></tr>
        <tr><td style="padding:0.6rem 0;color:#999;font-size:0.85rem;">Mobile</td><td style="padding:0.6rem 0;font-size:0.85rem;color:#0b0b0b;"><a href="tel:${escHtml(phone)}" style="color:#b45309;">${escHtml(phone)}</a></td></tr>
      </table>
    </div>
  </div>
</body></html>`,
  };
}

// ─── Handler ─────────────────────────────────────────────────────────────────

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!process.env.SUPABASE_SERVICE_KEY) {
    console.error('SUPABASE_SERVICE_KEY not set');
    return res.status(500).json({ error: 'Server configuration error.' });
  }

  const { listing_id, slot_id, slot_label, name, email, phone } = req.body || {};

  const validationError = validateInput({ listing_id, slot_id, slot_label, name, email, phone });
  if (validationError) return res.status(400).json({ error: validationError });

  try {
    // 1. Write booking to Supabase
    const sb = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    const { error: dbError } = await sb
      .from('open_home_bookings')
      .insert({ listing_id, slot_id, slot_label, name, email, phone });

    if (dbError) {
      console.error('Supabase insert error:', dbError.message);
      return res.status(500).json({ error: 'Booking failed. Please try again.' });
    }

    // 2. Send emails (failures are logged but do not block the 200 response)
    try {
      await Promise.all([
        sendEmail(buyerEmail({ name, email, slot_label })),
        sendEmail(sellerEmail({ name, email, phone, slot_label })),
      ]);
    } catch (emailError) {
      console.error('Email send error:', emailError.message);
      // Booking is saved — email failure is non-fatal for demo
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('book-inspection error:', err.message);
    return res.status(500).json({ error: 'Booking failed. Please try again.' });
  }
};
