// LEGAL-02: Prescribed certificate checklist — pass/fail derivation
// TDD RED: All tests fail with "Cannot find module '../../helpers/disclosure-checklist'"
// until Plan 02-03 creates api/helpers/disclosure-checklist.js. That is the correct Wave 0 state.

const deriveChecklist = require('../../helpers/disclosure-checklist');

function findItem(items, keyFragment) {
  return items.find(i => i.label && i.label.toLowerCase().includes(keyFragment.toLowerCase()));
}

test('pool: pass when pool_status is compliant', () => {
  const result = deriveChecklist({ has_pool: true, pool_status: 'compliant' });
  const item = findItem(result, 'pool');
  expect(item).toBeDefined();
  expect(item.status).toBe('pass');
});

test('pool: warning when pool_status is non_compliant_form36', () => {
  const result = deriveChecklist({ has_pool: true, pool_status: 'non_compliant_form36' });
  const item = findItem(result, 'pool');
  expect(item).toBeDefined();
  expect(item.status).toBe('warning');
  expect(item.note).toMatch(/Form 36/i);
});

test('pool: pass when no pool', () => {
  const result = deriveChecklist({ has_pool: false, pool_status: 'no_pool' });
  const item = findItem(result, 'pool');
  expect(item).toBeDefined();
  expect(item.status).toBe('pass');
});

test('body corp: pass when not community title', () => {
  const result = deriveChecklist({ has_community_title: false });
  const item = findItem(result, 'body corp');
  expect(item).toBeDefined();
  expect(item.status).toBe('pass');
});

test('body corp: warning when pending', () => {
  const result = deriveChecklist({ has_community_title: true, body_corp_cert_status: 'pending' });
  const item = findItem(result, 'body corp');
  expect(item).toBeDefined();
  expect(item.status).toBe('warning');
  expect(item.note).toMatch(/5 business days/i);
});

test('ATO clearance: warning when not obtained', () => {
  const result = deriveChecklist({ ato_clearance_obtained: false });
  const item = findItem(result, 'ato');
  expect(item).toBeDefined();
  expect(item.status).toBe('warning');
  expect(item.note).toMatch(/15%/i);
});

test('ATO clearance: pass when obtained', () => {
  const result = deriveChecklist({ ato_clearance_obtained: true });
  const item = findItem(result, 'ato');
  expect(item).toBeDefined();
  expect(item.status).toBe('pass');
});

test('building notices: fail when present', () => {
  const result = deriveChecklist({ has_building_notices: true });
  const item = findItem(result, 'building');
  expect(item).toBeDefined();
  expect(item.status).toBe('fail');
});

test('returns array of 8 items for complete disclosure', () => {
  const full = {
    has_pool: true,
    pool_status: 'compliant',
    has_community_title: false,
    body_corp_cert_status: null,
    ato_clearance_obtained: true,
    has_building_notices: false,
    owner_name: 'Jane Smith',
    property_description: 'Lot 1 on RP123456',
  };
  const result = deriveChecklist(full);
  expect(Array.isArray(result)).toBe(true);
  expect(result).toHaveLength(8);
  result.forEach(item => {
    expect(item).toHaveProperty('label');
    expect(item).toHaveProperty('status');
  });
});
