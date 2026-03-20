// DEED — Email notification handler
// Uses Resend (resend.com) — set RESEND_API_KEY in Vercel env vars
// Also requires DEED_NOTIFY_EMAIL — the seller notification inbox (e.g. hello@deed.com.au)

const RESEND_API = 'https://api.resend.com/emails';

// Until a verified domain is configured, all emails route to this address
const DEV_OVERRIDE_EMAIL = process.env.DEED_DEV_EMAIL || 'ed@noys.co';

async function sendEmail({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('RESEND_API_KEY not set — email skipped');
    return { skipped: true };
  }

  const from = process.env.DEED_FROM_EMAIL || 'DEED <onboarding@resend.dev>';
  // Override recipient until domain is verified
  const recipient = process.env.DEED_DOMAIN_VERIFIED ? to : DEV_OVERRIDE_EMAIL;

  const res = await fetch(RESEND_API, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to: recipient, subject, html }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Resend error');
  return data;
}

// ─── Email templates ──────────────────────────────────────────────────────

function sellerOfferEmail({ offer, listing, dashboardUrl }) {
  const price = '$' + Number(offer.offer_price).toLocaleString('en-AU');
  const conditions = [];
  if (!offer.finance_condition && !offer.building_pest_condition) conditions.push('Unconditional');
  if (offer.finance_condition) conditions.push(`Finance (${offer.finance_days || 14} days)`);
  if (offer.building_pest_condition) conditions.push(`Building & Pest (${offer.building_pest_days || 14} days)`);
  const condStr = conditions.join(' · ') || 'Unconditional';
  const score = offer.strength_score || '—';
  const deposit = offer.deposit_amount
    ? '$' + Number(offer.deposit_amount).toLocaleString('en-AU')
    : 'Not specified';

  return {
    subject: `New offer received — ${price} for ${listing.address || 'your property'}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8f7f5;font-family:'DM Sans',Arial,sans-serif;">
  <div style="max-width:560px;margin:2rem auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">

    <!-- Header -->
    <div style="background:#0b0b0b;padding:1.5rem 2rem;display:flex;align-items:center;justify-content:space-between;">
      <span style="font-family:Georgia,serif;font-size:1.4rem;letter-spacing:0.14em;color:#ede8df;">DEED</span>
      <span style="font-size:0.7rem;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:#888;background:#1a1a1a;padding:0.3rem 0.75rem;border-radius:4px;">New Offer</span>
    </div>

    <!-- Body -->
    <div style="padding:2rem;">
      <p style="font-size:0.78rem;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:#999;margin:0 0 0.5rem;">You have a new offer on</p>
      <h1 style="font-size:1.3rem;color:#1a1a1a;margin:0 0 0.25rem;">${listing.address || 'Your property'}</h1>
      <p style="color:#666;font-size:0.84rem;margin:0 0 2rem;">${[listing.suburb, listing.state, listing.postcode].filter(Boolean).join(' ')}</p>

      <!-- Offer highlight -->
      <div style="background:#f8f7f5;border-radius:8px;padding:1.5rem;margin-bottom:1.5rem;border-left:3px solid #c8922a;">
        <div style="font-size:2rem;font-weight:700;color:#1a1a1a;margin-bottom:0.25rem;">${price}</div>
        <div style="font-size:0.84rem;color:#666;">${condStr}</div>
      </div>

      <!-- Offer details -->
      <table style="width:100%;border-collapse:collapse;margin-bottom:1.5rem;">
        <tr>
          <td style="padding:0.6rem 0;border-bottom:1px solid #eee;font-size:0.78rem;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#999;width:40%;">Buyer</td>
          <td style="padding:0.6rem 0;border-bottom:1px solid #eee;font-size:0.84rem;color:#1a1a1a;">${offer.buyer_name || '—'}</td>
        </tr>
        <tr>
          <td style="padding:0.6rem 0;border-bottom:1px solid #eee;font-size:0.78rem;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#999;">Deposit</td>
          <td style="padding:0.6rem 0;border-bottom:1px solid #eee;font-size:0.84rem;color:#1a1a1a;">${deposit}</td>
        </tr>
        <tr>
          <td style="padding:0.6rem 0;border-bottom:1px solid #eee;font-size:0.78rem;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#999;">Settlement</td>
          <td style="padding:0.6rem 0;border-bottom:1px solid #eee;font-size:0.84rem;color:#1a1a1a;">${offer.settlement_days || 30} days</td>
        </tr>
        <tr>
          <td style="padding:0.6rem 0;font-size:0.78rem;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#999;">Strength score</td>
          <td style="padding:0.6rem 0;font-size:0.84rem;color:#1a1a1a;font-weight:600;">${score}/100</td>
        </tr>
      </table>

      ${offer.cover_note ? `<div style="background:#fffbf0;border:1px solid #f5e6c8;border-radius:6px;padding:1rem;margin-bottom:1.5rem;"><p style="font-size:0.72rem;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#999;margin:0 0 0.5rem;">Buyer's note</p><p style="font-size:0.84rem;color:#444;line-height:1.6;margin:0;">"${offer.cover_note}"</p></div>` : ''}

      <!-- CTA -->
      <div style="text-align:center;margin-top:1.5rem;">
        <a href="${dashboardUrl}" style="display:inline-block;background:#c8922a;color:#fff;text-decoration:none;padding:0.85rem 2rem;border-radius:6px;font-size:0.86rem;font-weight:600;letter-spacing:0.04em;">View offer in dashboard →</a>
      </div>
    </div>

    <!-- Footer -->
    <div style="background:#f8f7f5;padding:1rem 2rem;text-align:center;border-top:1px solid #eee;">
      <p style="font-size:0.72rem;color:#aaa;margin:0;">DEED Private Property Sales · Queensland · <a href="https://deed-sooty.vercel.app" style="color:#aaa;">deed-sooty.vercel.app</a></p>
    </div>
  </div>
</body>
</html>`,
  };
}

function buyerOfferConfirmEmail({ offer, listing }) {
  const price = '$' + Number(offer.offer_price).toLocaleString('en-AU');
  const conditions = [];
  if (!offer.finance_condition && !offer.building_pest_condition) conditions.push('Unconditional');
  if (offer.finance_condition) conditions.push(`Finance condition (${offer.finance_days || 14} days)`);
  if (offer.building_pest_condition) conditions.push(`Building & pest (${offer.building_pest_days || 14} days)`);
  const condStr = conditions.join(', ') || 'Unconditional';

  return {
    subject: `Your offer has been submitted — ${listing.address || 'DEED listing'}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8f7f5;font-family:'DM Sans',Arial,sans-serif;">
  <div style="max-width:560px;margin:2rem auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">

    <div style="background:#0b0b0b;padding:1.5rem 2rem;">
      <span style="font-family:Georgia,serif;font-size:1.4rem;letter-spacing:0.14em;color:#ede8df;">DEED</span>
    </div>

    <div style="padding:2rem;">
      <p style="font-size:0.78rem;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:#22c55e;margin:0 0 0.5rem;">Offer submitted</p>
      <h1 style="font-size:1.3rem;color:#1a1a1a;margin:0 0 1.5rem;">Your offer is with the seller</h1>

      <div style="background:#f8f7f5;border-radius:8px;padding:1.25rem;margin-bottom:1.5rem;">
        <p style="font-size:0.72rem;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#999;margin:0 0 0.25rem;">Property</p>
        <p style="font-size:0.9rem;font-weight:600;color:#1a1a1a;margin:0 0 1rem;">${listing.address || '—'}</p>
        <p style="font-size:0.72rem;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#999;margin:0 0 0.25rem;">Your offer</p>
        <p style="font-size:1.5rem;font-weight:700;color:#1a1a1a;margin:0 0 0.25rem;">${price}</p>
        <p style="font-size:0.84rem;color:#666;margin:0;">${condStr} · ${offer.settlement_days || 30}-day settlement</p>
      </div>

      <p style="font-size:0.84rem;color:#555;line-height:1.7;margin-bottom:0.75rem;">The seller has been notified and will respond before the offer deadline. DEED will email you when the seller accepts, counters, or declines.</p>
      <p style="font-size:0.84rem;color:#555;line-height:1.7;margin:0;">No agent commission applies. If accepted, DEED connects both parties with a partner conveyancer to prepare the REIQ contract of sale.</p>
    </div>

    <div style="background:#f8f7f5;padding:1rem 2rem;text-align:center;border-top:1px solid #eee;">
      <p style="font-size:0.72rem;color:#aaa;margin:0;">DEED Private Property Sales · Queensland</p>
    </div>
  </div>
</body>
</html>`,
  };
}

function sellerListingConfirmEmail({ listing, dashboardUrl }) {
  const price = '$' + Number(listing.asking_price).toLocaleString('en-AU');
  return {
    subject: `Your DEED listing is live — ${listing.address || 'your property'}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8f7f5;font-family:'DM Sans',Arial,sans-serif;">
  <div style="max-width:560px;margin:2rem auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">

    <div style="background:#0b0b0b;padding:1.5rem 2rem;">
      <span style="font-family:Georgia,serif;font-size:1.4rem;letter-spacing:0.14em;color:#ede8df;">DEED</span>
    </div>

    <div style="padding:2rem;">
      <p style="font-size:0.78rem;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:#22c55e;margin:0 0 0.5rem;">Listing live</p>
      <h1 style="font-size:1.3rem;color:#1a1a1a;margin:0 0 0.5rem;">Your property is now listed on DEED</h1>
      <p style="font-size:0.9rem;color:#666;margin:0 0 2rem;">${listing.address || '—'} · ${price}</p>

      <p style="font-size:0.84rem;color:#555;line-height:1.7;margin-bottom:1rem;">DEED has notified all verified buyers in your suburb who match your property's price range. You'll receive an email the moment an offer is submitted.</p>

      <p style="font-size:0.84rem;color:#555;line-height:1.7;margin-bottom:1.5rem;">Your seller dashboard shows offer activity, buyer interest, and AI-powered analysis in real time.</p>

      <div style="text-align:center;">
        <a href="${dashboardUrl}" style="display:inline-block;background:#c8922a;color:#fff;text-decoration:none;padding:0.85rem 2rem;border-radius:6px;font-size:0.86rem;font-weight:600;letter-spacing:0.04em;">Open your dashboard →</a>
      </div>
    </div>

    <div style="background:#f8f7f5;padding:1rem 2rem;text-align:center;border-top:1px solid #eee;">
      <p style="font-size:0.72rem;color:#aaa;margin:0;">DEED Private Property Sales · Queensland · No agent. No commission.</p>
    </div>
  </div>
</body>
</html>`,
  };
}

function offerAcceptedSellerEmail({ offer, listing, dashboardUrl }) {
  const price = '$' + Number(offer.offer_price).toLocaleString('en-AU');
  return {
    subject: `Offer accepted — next steps for ${listing.address}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8f7f5;font-family:'DM Sans',Arial,sans-serif;">
  <div style="max-width:560px;margin:2rem auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
    <div style="background:#0b0b0b;padding:1.5rem 2rem;display:flex;align-items:center;justify-content:space-between;">
      <span style="font-family:Georgia,serif;font-size:1.4rem;letter-spacing:0.14em;color:#ede8df;">DEED</span>
      <span style="font-size:0.7rem;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:#22c55e;background:#1a1a1a;padding:0.3rem 0.75rem;border-radius:4px;">Offer Accepted</span>
    </div>
    <div style="padding:2rem;">
      <p style="font-size:0.78rem;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:#22c55e;margin:0 0 0.5rem;">Congratulations</p>
      <h1 style="font-size:1.3rem;color:#1a1a1a;margin:0 0 0.5rem;">You've accepted ${price} for ${listing.address}</h1>
      <p style="font-size:0.84rem;color:#666;margin:0 0 2rem;">Here are your next steps to get to settlement.</p>

      <div style="display:flex;flex-direction:column;gap:0.75rem;margin-bottom:2rem;">
        <div style="border:1px solid #e5e7eb;border-radius:8px;padding:1rem 1.25rem;">
          <p style="font-size:0.72rem;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#c8922a;margin:0 0 0.2rem;">Step 1 — Conveyancing</p>
          <p style="font-size:0.86rem;color:#1a1a1a;font-weight:600;margin:0 0 0.2rem;">Book a conveyancer</p>
          <p style="font-size:0.8rem;color:#555;margin:0;">A licensed Queensland conveyancer prepares and reviews the contract of sale. DEED partner conveyancers offer a flat $895 fee. <a href="https://deed-sooty.vercel.app" style="color:#c8922a;">Book via DEED →</a></p>
        </div>
        <div style="border:1px solid #e5e7eb;border-radius:8px;padding:1rem 1.25rem;">
          <p style="font-size:0.72rem;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#c8922a;margin:0 0 0.2rem;">Step 2 — Deposit</p>
          <p style="font-size:0.86rem;color:#1a1a1a;font-weight:600;margin:0 0 0.2rem;">Receive the deposit</p>
          <p style="font-size:0.8rem;color:#555;margin:0;">The buyer's deposit (${offer.deposit_amount ? '$' + Number(offer.deposit_amount).toLocaleString('en-AU') : 'agreed amount'}) is due within 2 business days of contract execution, held in trust by your conveyancer.</p>
        </div>
        <div style="border:1px solid #e5e7eb;border-radius:8px;padding:1rem 1.25rem;">
          <p style="font-size:0.72rem;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#c8922a;margin:0 0 0.2rem;">Step 3 — Settlement</p>
          <p style="font-size:0.86rem;color:#1a1a1a;font-weight:600;margin:0 0 0.2rem;">Settlement in ${offer.settlement_days || 30} days</p>
          <p style="font-size:0.8rem;color:#555;margin:0;">Your conveyancer handles all settlement paperwork. DEED will send reminders at 14 days, 7 days, and 48 hours before settlement.</p>
        </div>
      </div>

      <div style="text-align:center;">
        <a href="${dashboardUrl}" style="display:inline-block;background:#c8922a;color:#fff;text-decoration:none;padding:0.85rem 2rem;border-radius:6px;font-size:0.86rem;font-weight:600;letter-spacing:0.04em;">View dashboard →</a>
      </div>
    </div>
    <div style="background:#f8f7f5;padding:1rem 2rem;text-align:center;border-top:1px solid #eee;">
      <p style="font-size:0.72rem;color:#aaa;margin:0;">DEED saved you approximately $${Math.round((listing.asking_price * 0.0275) - 999).toLocaleString('en-AU')} in agent commission on this transaction.</p>
    </div>
  </div>
</body>
</html>`,
  };
}

function offerAcceptedBuyerEmail({ offer, listing, offerUrl }) {
  const price = '$' + Number(offer.offer_price).toLocaleString('en-AU');
  return {
    subject: `Your offer was accepted — ${listing.address}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8f7f5;font-family:'DM Sans',Arial,sans-serif;">
  <div style="max-width:560px;margin:2rem auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
    <div style="background:#0b0b0b;padding:1.5rem 2rem;">
      <span style="font-family:Georgia,serif;font-size:1.4rem;letter-spacing:0.14em;color:#ede8df;">DEED</span>
    </div>
    <div style="padding:2rem;">
      <p style="font-size:0.78rem;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:#22c55e;margin:0 0 0.5rem;">Offer accepted</p>
      <h1 style="font-size:1.3rem;color:#1a1a1a;margin:0 0 0.5rem;">Congratulations — ${listing.address} is yours</h1>
      <p style="font-size:0.84rem;color:#666;margin:0 0 1.5rem;">The seller has accepted your offer of <strong>${price}</strong>. Here's what happens next.</p>

      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:1.25rem;margin-bottom:1.5rem;">
        <p style="font-size:0.72rem;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#166534;margin:0 0 0.5rem;">Your deposit is due within 2 business days</p>
        <p style="font-size:1rem;font-weight:700;color:#1a1a1a;margin:0;">${offer.deposit_amount ? '$' + Number(offer.deposit_amount).toLocaleString('en-AU') : 'Agreed deposit'} — held in trust by conveyancer</p>
      </div>

      <p style="font-size:0.84rem;color:#555;line-height:1.7;margin-bottom:1rem;">Your conveyancer will prepare the contract documentation. DEED partner conveyancers offer flat-fee settlement at $895 including all Queensland regulatory requirements.</p>
      <p style="font-size:0.84rem;color:#555;line-height:1.7;margin-bottom:1.5rem;">Settlement is scheduled in <strong>${offer.settlement_days || 30} days</strong>. No agent involved at any stage.</p>

      <div style="text-align:center;">
        <a href="https://deed-sooty.vercel.app" style="display:inline-block;background:#c8922a;color:#fff;text-decoration:none;padding:0.85rem 2rem;border-radius:6px;font-size:0.86rem;font-weight:600;letter-spacing:0.04em;">View your purchase on DEED →</a>
      </div>
    </div>
    <div style="background:#f8f7f5;padding:1rem 2rem;text-align:center;border-top:1px solid #eee;">
      <p style="font-size:0.72rem;color:#aaa;margin:0;">DEED Private Property Sales · Queensland · No agent. No commission.</p>
    </div>
  </div>
</body>
</html>`,
  };
}

function buyerMatchEmail({ buyer, listing, listingUrl, matchCount }) {
  const price = '$' + Number(listing.asking_price).toLocaleString('en-AU');
  const beds = listing.bedrooms ? `${listing.bedrooms} bed` : '';
  const baths = listing.bathrooms ? `${listing.bathrooms} bath` : '';
  const specs = [beds, baths].filter(Boolean).join(', ');

  return {
    subject: `A property matching your criteria just listed privately — ${listing.suburb}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8f7f5;font-family:'DM Sans',Arial,sans-serif;">
  <div style="max-width:560px;margin:2rem auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">

    <div style="background:#0b0b0b;padding:1.5rem 2rem;display:flex;align-items:center;justify-content:space-between;">
      <span style="font-family:Georgia,serif;font-size:1.4rem;letter-spacing:0.14em;color:#ede8df;">DEED</span>
      <span style="font-size:0.7rem;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:#c8922a;background:#1a1a1a;padding:0.3rem 0.75rem;border-radius:4px;">Pre-Market Match</span>
    </div>

    <div style="padding:2rem;">
      <p style="font-size:0.78rem;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:#22c55e;margin:0 0 0.5rem;">Property match found</p>
      <h1 style="font-size:1.25rem;color:#1a1a1a;margin:0 0 0.5rem;">Hi ${buyer.name?.split(' ')[0] || 'there'} — a property just listed in ${listing.suburb}</h1>
      <p style="font-size:0.84rem;color:#666;margin:0 0 1.75rem;">You're one of <strong>${matchCount}</strong> verified DEED buyer${matchCount !== 1 ? 's' : ''} who match this property. It's available before it hits REA or Domain.</p>

      <div style="background:#f8f7f5;border-radius:8px;padding:1.5rem;margin-bottom:1.5rem;border-left:3px solid #c8922a;">
        <p style="font-size:0.72rem;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#999;margin:0 0 0.25rem;">Private listing</p>
        <p style="font-size:1.1rem;font-weight:600;color:#1a1a1a;margin:0 0 0.25rem;">${listing.address}</p>
        <p style="font-size:0.84rem;color:#666;margin:0 0 1rem;">${listing.suburb} · ${specs}</p>
        <p style="font-size:1.75rem;font-weight:700;color:#1a1a1a;margin:0;">${price}</p>
      </div>

      <p style="font-size:0.84rem;color:#555;line-height:1.7;margin-bottom:1.5rem;">No agent. No commission markups on this deal. View the full listing, inspect the property details, and submit an offer directly — all through DEED.</p>

      <div style="text-align:center;">
        <a href="${listingUrl}" style="display:inline-block;background:#c8922a;color:#fff;text-decoration:none;padding:0.85rem 2rem;border-radius:6px;font-size:0.86rem;font-weight:600;letter-spacing:0.04em;">View listing →</a>
      </div>
    </div>

    <div style="background:#f8f7f5;padding:1rem 2rem;text-align:center;border-top:1px solid #eee;">
      <p style="font-size:0.72rem;color:#aaa;margin:0;">You're receiving this because you pre-qualified as a buyer on DEED · <a href="https://deed-sooty.vercel.app" style="color:#aaa;">deed-sooty.vercel.app</a></p>
    </div>
  </div>
</body>
</html>`,
  };
}

function offerRoundEmail({ buyer, listing, offerUrl, deadline }) {
  const price = '$' + Number(listing.asking_price).toLocaleString('en-AU');
  const deadlineDate = new Date(deadline);
  const opts = { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short', timeZone: 'Australia/Brisbane' };
  const deadlineStr = deadlineDate.toLocaleString('en-AU', opts) + ' AEST';

  return {
    subject: `Final offer round open — ${listing.address} closes in 24 hours`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8f7f5;font-family:'DM Sans',Arial,sans-serif;">
  <div style="max-width:560px;margin:2rem auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">

    <div style="background:#1a0800;padding:1.5rem 2rem;display:flex;align-items:center;justify-content:space-between;">
      <span style="font-family:Georgia,serif;font-size:1.4rem;letter-spacing:0.14em;color:#ede8df;">DEED</span>
      <span style="font-size:0.7rem;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:#ef4444;background:#2a0a00;padding:0.3rem 0.75rem;border-radius:4px;">Final Round</span>
    </div>

    <div style="padding:2rem;">
      <p style="font-size:0.78rem;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:#ef4444;margin:0 0 0.5rem;">24-hour final round</p>
      <h1 style="font-size:1.25rem;color:#1a1a1a;margin:0 0 0.5rem;">Hi ${buyer.name?.split(' ')[0] || 'there'} — submit your best and final offer now</h1>
      <p style="font-size:0.84rem;color:#666;margin:0 0 1.75rem;">The seller has opened a final offer round on <strong>${listing.address}</strong>. All buyers receive this notification simultaneously — no one has an advantage.</p>

      <div style="background:#fff5f5;border:1px solid #fecaca;border-radius:8px;padding:1.25rem;margin-bottom:1.5rem;display:flex;align-items:center;justify-content:space-between;gap:1rem;">
        <div>
          <p style="font-size:0.72rem;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#999;margin:0 0 0.25rem;">Round closes</p>
          <p style="font-size:1.1rem;font-weight:700;color:#ef4444;margin:0;">${deadlineStr}</p>
        </div>
        <div style="text-align:right;">
          <p style="font-size:0.72rem;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#999;margin:0 0 0.25rem;">Asking price</p>
          <p style="font-size:1.1rem;font-weight:700;color:#1a1a1a;margin:0;">${price}</p>
        </div>
      </div>

      <p style="font-size:0.84rem;color:#555;line-height:1.7;margin-bottom:1.5rem;">After the round closes, the seller reviews all offers simultaneously and makes a single decision. Unconditional offers are weighted significantly — no agent markups, no hidden fees.</p>

      <div style="text-align:center;">
        <a href="${offerUrl}" style="display:inline-block;background:#ef4444;color:#fff;text-decoration:none;padding:0.85rem 2rem;border-radius:6px;font-size:0.86rem;font-weight:600;letter-spacing:0.04em;">Submit your best offer →</a>
      </div>
    </div>

    <div style="background:#f8f7f5;padding:1rem 2rem;text-align:center;border-top:1px solid #eee;">
      <p style="font-size:0.72rem;color:#aaa;margin:0;">DEED Private Property Sales · Queensland · No agent. No commission.</p>
    </div>
  </div>
</body>
</html>`,
  };
}

async function findMatchingBuyers({ suburb, asking_price, bedrooms }) {
  const SUPABASE_URL = 'https://jtpykhrdjkzhcbswrhzo.supabase.co';
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!serviceKey) return [];

  // Query buyers where:
  //   suburbs array contains this suburb
  //   max_price >= asking_price (buyer can afford it)
  //   min_beds <= bedrooms (property has enough beds)
  const params = new URLSearchParams({
    'suburbs': `cs.{"${suburb}"}`,
    'max_price': `gte.${asking_price}`,
  });
  if (bedrooms) params.append('min_beds', `lte.${bedrooms}`);

  const res = await fetch(`${SUPABASE_URL}/rest/v1/buyers?${params}&select=id,name,email,max_price,min_beds`, {
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
    },
  });
  if (!res.ok) return [];
  return res.json();
}

// ─── Handler ──────────────────────────────────────────────────────────────

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { type, offer, listing, listing_id } = req.body || {};
  const origin = req.headers.origin || 'https://deed-sooty.vercel.app';

  try {
    if (type === 'new_offer') {
      if (!offer || !listing) return res.status(400).json({ error: 'Missing offer or listing' });

      const dashboardUrl = `${origin}/dashboard.html?listing_id=${listing_id || listing.id}`;

      // Email seller
      const sellerEmail = listing.seller_email;
      if (sellerEmail) {
        const { subject, html } = sellerOfferEmail({ offer, listing, dashboardUrl });
        await sendEmail({ to: sellerEmail, subject, html });
      }

      // Email buyer confirmation
      const buyerEmail = offer.buyer_email;
      if (buyerEmail) {
        const { subject, html } = buyerOfferConfirmEmail({ offer, listing });
        await sendEmail({ to: buyerEmail, subject, html });
      }

      return res.status(200).json({ ok: true });
    }

    if (type === 'listing_confirmed') {
      if (!listing) return res.status(400).json({ error: 'Missing listing' });

      const dashboardUrl = `${origin}/dashboard.html?listing_id=${listing_id || listing.id}`;
      const sellerEmail = listing.seller_email;
      if (sellerEmail) {
        const { subject, html } = sellerListingConfirmEmail({ listing, dashboardUrl });
        await sendEmail({ to: sellerEmail, subject, html });
      }

      return res.status(200).json({ ok: true });
    }

    if (type === 'offer_accepted') {
      if (!offer || !listing) return res.status(400).json({ error: 'Missing offer or listing' });

      const dashboardUrl = `${origin}/dashboard.html?listing_id=${listing_id || listing.id}`;

      if (listing.seller_email) {
        const { subject, html } = offerAcceptedSellerEmail({ offer, listing, dashboardUrl });
        await sendEmail({ to: listing.seller_email, subject, html });
      }
      if (offer.buyer_email) {
        const { subject, html } = offerAcceptedBuyerEmail({ offer, listing });
        await sendEmail({ to: offer.buyer_email, subject, html });
      }

      return res.status(200).json({ ok: true });
    }

    if (type === 'offer_round') {
      if (!listing) return res.status(400).json({ error: 'Missing listing' });
      const serviceKey = process.env.SUPABASE_SERVICE_KEY;
      if (!serviceKey) return res.status(200).json({ ok: true, warning: 'No service key — skipped' });

      const SUPABASE_URL = 'https://jtpykhrdjkzhcbswrhzo.supabase.co';
      const watcherRes = await fetch(
        `${SUPABASE_URL}/rest/v1/watchers?listing_id=eq.${listing_id || listing.id}&select=buyer_id,buyers(name,email)`,
        { headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` } }
      );
      const watchers = watcherRes.ok ? await watcherRes.json() : [];

      const deadline = req.body.deadline || new Date(Date.now() + 24 * 3600 * 1000).toISOString();
      const offerUrl = `${origin}/offer.html?listing_id=${listing_id || listing.id}`;

      let sent = 0;
      for (const w of watchers) {
        const buyer = w.buyers;
        if (!buyer?.email) continue;
        try {
          const { subject, html } = offerRoundEmail({ buyer, listing, offerUrl, deadline });
          await sendEmail({ to: buyer.email, subject, html });
          sent++;
        } catch (e) {
          console.warn(`Offer round email failed for ${buyer.email}:`, e.message);
        }
      }
      return res.status(200).json({ ok: true, notified: watchers.length, sent });
    }

    if (type === 'buyer_match') {
      if (!listing) return res.status(400).json({ error: 'Missing listing' });

      const buyers = await findMatchingBuyers({
        suburb: listing.suburb,
        asking_price: listing.asking_price,
        bedrooms: listing.bedrooms,
      });

      if (buyers.length === 0) return res.status(200).json({ ok: true, matched: 0 });

      const origin = req.headers.origin || 'https://deed-sooty.vercel.app';
      const listingUrl = `${origin}/listing.html?id=${listing_id || listing.id}`;

      let sent = 0;
      for (const buyer of buyers) {
        if (!buyer.email) continue;
        try {
          const { subject, html } = buyerMatchEmail({ buyer, listing, listingUrl, matchCount: buyers.length });
          await sendEmail({ to: buyer.email, subject, html });
          sent++;
        } catch (e) {
          console.warn(`Buyer match email failed for ${buyer.email}:`, e.message);
        }
      }

      return res.status(200).json({ ok: true, matched: buyers.length, sent });
    }

    return res.status(400).json({ error: `Unknown type: ${type}` });
  } catch (err) {
    console.error('notify error:', err.message);
    // Don't fail the caller — email is best-effort
    return res.status(200).json({ ok: true, warning: err.message });
  }
};
