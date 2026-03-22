// DEED — Disclosure statement PDF generator
// LEGAL-04: Generates a pre-filled QLD disclosure summary PDF from a saved disclosure_statements row
// POST /api/generate-disclosure — requires listing_id in body

const pdfmake = require('pdfmake/build/pdfmake');
const pdfFonts = require('pdfmake/build/vfs_fonts');
const { createClient } = require('@supabase/supabase-js');

pdfmake.vfs = pdfFonts.pdfMake.vfs;

const SUPABASE_URL = 'https://jtpykhrdjkzhcbswrhzo.supabase.co';

// Pool status labels
const POOL_LABELS = {
  no_pool: 'No pool on property',
  compliant: 'Pool present — Form 36 certificate of non-compliance not required',
  non_compliant: 'Pool present — Form 36 certificate issued, notice will be provided to buyer',
  no_certificate: 'Pool present — Form 36: no certificate, notice will be provided to buyer',
};

function yesNo(val) {
  return val ? 'Yes' : 'No';
}

function buildDocDefinition(d) {
  const listing = d.listings || {};
  const address = [listing.address, listing.suburb, listing.state, listing.postcode]
    .filter(Boolean).join(', ');
  const completedDate = d.completed_at
    ? new Date(d.completed_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'Not recorded';

  const content = [];

  // Header
  content.push({ text: 'QLD Property Disclosure Summary', style: 'h1' });
  content.push({ text: 'Property Law Act 2023 — Seller Self-Disclosure', style: 'subtitle' });
  content.push({ text: `Property: ${address || 'Not recorded'}`, style: 'field' });
  content.push({
    text: `Completed: ${completedDate}${d.completed_by ? '  |  Seller: ' + d.completed_by : ''}`,
    style: 'field',
  });

  // Disclaimer
  content.push({
    text: 'This disclosure summary was completed by the seller. DEED is not a law firm and cannot provide legal advice. This document is the seller\'s record — a QLD-licensed solicitor must prepare the contract of sale.',
    style: 'disclaimer',
  });

  // Divider
  content.push({ canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: '#d1d5db' }], margin: [0, 0, 0, 16] });

  // Part 1 — Property Details
  content.push({ text: 'Part 1 — Property Details', style: 'h2' });
  content.push({ text: `Lot number: ${d.lot_number || 'Not provided'}`, style: 'field' });
  content.push({ text: `Plan number: ${d.plan_number || 'Not provided'}`, style: 'field' });
  content.push({ text: `Scheme type: ${d.scheme_type || 'Not provided'}`, style: 'field' });

  // Part 2 — Encumbrances & Tenancy
  content.push({ text: 'Part 2 — Encumbrances & Tenancy', style: 'h2' });
  content.push({ text: `Unregistered encumbrances: ${yesNo(d.has_unregistered_encumbrances)}`, style: 'field' });
  if (d.has_unregistered_encumbrances && d.encumbrance_details) {
    content.push({ text: `Encumbrance details: ${d.encumbrance_details}`, style: 'field' });
  }
  content.push({ text: `Tenancy in place: ${yesNo(d.has_tenancy)}`, style: 'field' });
  if (d.has_tenancy && d.tenancy_details) {
    content.push({ text: `Tenancy details: ${d.tenancy_details}`, style: 'field' });
  }

  // Part 3 — Planning & Environment
  content.push({ text: 'Part 3 — Planning & Environment', style: 'h2' });
  content.push({ text: `Zoning: ${d.zoning || 'Not provided'}`, style: 'field' });
  content.push({ text: `Transport corridor notice: ${yesNo(d.has_transport_notice)}`, style: 'field' });
  content.push({ text: `Contamination or environmental notice: ${yesNo(d.has_contamination_notice)}`, style: 'field' });
  content.push({ text: `Heritage listing: ${yesNo(d.has_heritage_listing)}`, style: 'field' });
  content.push({ text: `Resumption notice: ${yesNo(d.has_resumption_notice)}`, style: 'field' });
  content.push({ text: `Tree dispute notice: ${yesNo(d.has_tree_dispute)}`, style: 'field' });

  // Part 4 — Buildings
  content.push({ text: 'Part 4 — Buildings', style: 'h2' });
  content.push({ text: `Pool on property: ${yesNo(d.has_pool)}${d.has_pool ? ` — ${POOL_LABELS[d.pool_status] || d.pool_status}` : ''}`, style: 'field' });
  content.push({ text: `Building notices or orders: ${yesNo(d.has_building_notices)}`, style: 'field' });
  if (d.has_building_notices && d.building_notice_details) {
    content.push({ text: `Building notice details: ${d.building_notice_details}`, style: 'field' });
  }
  content.push({ text: `Community title scheme: ${yesNo(d.has_community_title)}`, style: 'field' });
  if (d.has_community_title && d.body_corp_cert_status) {
    content.push({ text: `Body corporate certificate status: ${d.body_corp_cert_status}`, style: 'field' });
  }

  // Part 5 — Rates
  content.push({ text: 'Part 5 — Rates', style: 'h2' });
  content.push({
    text: `Council rates: ${d.council_rates_amount != null ? '$' + Number(d.council_rates_amount).toLocaleString('en-AU') + ' per year' : 'Not provided'}`,
    style: 'field',
  });
  content.push({
    text: `Water rates: ${d.water_rates_amount != null ? '$' + Number(d.water_rates_amount).toLocaleString('en-AU') + ' per year' : 'Not provided'}`,
    style: 'field',
  });

  // Part 6 — ATO Clearance
  content.push({ text: 'Part 6 — ATO Clearance', style: 'h2' });
  content.push({ text: `ATO clearance certificate obtained: ${yesNo(d.ato_clearance_obtained)}`, style: 'field' });
  if (!d.ato_clearance_obtained) {
    content.push({
      text: 'Warning: If no ATO clearance certificate is provided at settlement, the buyer is required by law to withhold 15% of the purchase price and remit it to the ATO. The seller should obtain clearance before settlement to avoid this withholding.',
      style: 'disclaimer',
    });
  }

  // Footer
  content.push({
    text: 'Generated by DEED — deed-sooty.vercel.app — Not a substitute for legal advice',
    style: 'footer',
  });

  return {
    content,
    defaultStyle: { font: 'Roboto' },
    styles: {
      h1: { fontSize: 20, bold: true, margin: [0, 0, 0, 4] },
      h2: { fontSize: 13, bold: true, margin: [0, 16, 0, 6], color: '#1e3a5f' },
      subtitle: { fontSize: 10, color: '#6b7280', margin: [0, 0, 0, 4] },
      disclaimer: { fontSize: 8.5, color: '#9ca3af', italics: true, margin: [0, 8, 0, 16] },
      field: { fontSize: 10, margin: [0, 2, 0, 2] },
      footer: { fontSize: 8, color: '#9ca3af', alignment: 'center', margin: [0, 24, 0, 0] },
    },
    pageMargins: [40, 40, 40, 40],
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { listing_id } = req.body || {};
  if (!listing_id) return res.status(400).json({ error: 'listing_id required' });

  const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  const { data: disclosure, error } = await supabase
    .from('disclosure_statements')
    .select('*, listings(address, suburb, seller_name)')
    .eq('listing_id', listing_id)
    .single();

  if (!disclosure || error) return res.status(404).json({ error: 'Disclosure not found' });

  const docDefinition = buildDocDefinition(disclosure);

  return new Promise((resolve) => {
    pdfmake.createPdf(docDefinition).getBuffer((buffer) => {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="disclosure-statement.pdf"');
      res.send(Buffer.from(buffer));
      resolve();
    });
  });
};
