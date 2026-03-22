// LEGAL-02: QLD 2024 prescribed certificate checklist derivation
// Pure function — no external API calls, derived purely from disclosure_statements row.

'use strict';

function poolItem(d) {
  if (!d.has_pool || d.pool_status === 'no_pool') {
    return { label: 'Pool Safety Certificate', status: 'pass', note: 'No pool on property' };
  }
  if (d.pool_status === 'compliant') {
    return { label: 'Pool Safety Certificate', status: 'pass', note: null };
  }
  if (d.pool_status === 'non_compliant_form36') {
    return { label: 'Pool Safety Certificate', status: 'warning', note: 'Form 36 (notice of no certificate) will be provided to buyer' };
  }
  return { label: 'Pool Safety Certificate', status: 'warning', note: null };
}

function bodyCorpItem(d) {
  if (!d.has_community_title) {
    return { label: 'Body Corporate Certificate', status: 'pass', note: 'Not a community title property' };
  }
  if (d.body_corp_cert_status === 'provided') {
    return { label: 'Body Corporate Certificate', status: 'pass', note: null };
  }
  if (d.body_corp_cert_status === 'pending') {
    return { label: 'Body Corporate Certificate', status: 'warning', note: 'Requested — allow 5 business days' };
  }
  return { label: 'Body Corporate Certificate', status: 'warning', note: 'Not yet obtained' };
}

function titleSearchItem() {
  return {
    label: 'Title Search',
    status: 'info',
    note: 'Obtain from Titles Queensland (~$35). Your conveyancer can arrange this.',
  };
}

function councilRatesItem(d) {
  if (d.council_rates_amount != null && d.council_rates_amount !== '') {
    return { label: 'Council Rates', status: 'pass', note: null };
  }
  return { label: 'Council Rates', status: 'warning', note: 'Amount not provided by seller' };
}

function waterRatesItem(d) {
  if (d.water_rates_amount != null && d.water_rates_amount !== '') {
    return { label: 'Water Rates', status: 'pass', note: null };
  }
  return { label: 'Water Rates', status: 'warning', note: 'Amount not provided by seller' };
}

function buildingNoticesItem(d) {
  if (d.has_building_notices) {
    return { label: 'Building Notices', status: 'fail', note: 'Seller has disclosed outstanding building notices — verify before exchanging contracts' };
  }
  return { label: 'Building Notices', status: 'pass', note: null };
}

function planningContaminationItem(d) {
  if (d.has_contamination_notice || d.has_transport_notice) {
    const flags = [];
    if (d.has_contamination_notice) flags.push('contamination notice');
    if (d.has_transport_notice) flags.push('transport/infrastructure notice');
    return {
      label: 'Planning / Contamination',
      status: 'fail',
      note: `Seller has disclosed: ${flags.join(', ')} — verify with local council before exchanging`,
    };
  }
  return { label: 'Planning / Contamination', status: 'pass', note: null };
}

function atoItem(d) {
  if (d.ato_clearance_obtained) {
    return { label: 'ATO Clearance Certificate', status: 'pass', note: null };
  }
  return {
    label: 'ATO Clearance Certificate',
    status: 'warning',
    note: 'Required for all QLD property sales from 1 Jan 2025. Without it, buyer withholds 15% at settlement. Apply at ato.gov.au.',
  };
}

/**
 * Derive 8-item certificate checklist from a disclosure_statements row.
 *
 * @param {object} disclosure - A disclosure_statements row from Supabase
 * @returns {Array<{label: string, status: 'pass'|'fail'|'warning'|'info', note: string|null}>}
 */
function deriveChecklist(disclosure) {
  const d = disclosure || {};
  return [
    poolItem(d),
    bodyCorpItem(d),
    titleSearchItem(),
    councilRatesItem(d),
    waterRatesItem(d),
    buildingNoticesItem(d),
    planningContaminationItem(d),
    atoItem(d),
  ];
}

module.exports = deriveChecklist;
module.exports.deriveChecklist = deriveChecklist;
