const { XMLBuilder } = require('fast-xml-parser');
const SftpClient = require('ssh2-sftp-client');
const { createClient } = require('@supabase/supabase-js');

function buildReaXml(listing) {
  const builder = new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    format: true,
  });

  const residential = {
    '@_status': 'current',
    '@_type': 'residential',
    agentID: process.env.REA_AGENCY_ID || '',
    uniqueID: `deed-${listing.id}`,
    authority: { '@_value': 'exclusive' },
    underOffer: { '@_value': 'no' },
    isHomeLandPackage: { '@_value': 'no' },
    headline: listing.address,
    description: listing.description || '',
    price: {
      '@_display': 'yes',
      '#text': listing.asking_price,
    },
    priceView: `Offers over $${listing.asking_price.toLocaleString()}`,
    address: {
      street: listing.address,
      suburb: listing.suburb,
      state: listing.state || 'QLD',
      postcode: listing.postcode,
      country: 'Australia',
    },
    features: {
      bedrooms: listing.bedrooms,
      bathrooms: listing.bathrooms,
      garages: listing.car_spaces || 0,
      ...(listing.land_size ? { landSize: listing.land_size } : {}),
    },
    listingAgent: {
      name: 'DEED Property',
      email: process.env.DEED_LISTINGS_EMAIL || 'listings@deed.com.au',
    },
  };

  // Build images block only if photos exist
  if (listing.photos && listing.photos.length > 0) {
    residential.images = {
      img: listing.photos.map((url, idx) => ({
        '@_id': idx === 0 ? 'm' : String(idx),
        '@_url': url,
      })),
    };
  }

  const xmlObj = {
    '?xml': {
      '@_version': '1.0',
      '@_encoding': 'UTF-8',
    },
    propertyList: {
      residential,
    },
  };

  return builder.build(xmlObj);
}

async function submitViaSftp(xmlContent, filename) {
  const sftp = new SftpClient();
  try {
    await sftp.connect({
      host: process.env.REA_SFTP_HOST,
      username: process.env.REA_SFTP_USER,
      password: process.env.REA_SFTP_PASS,
    });
    await sftp.put(Buffer.from(xmlContent, 'utf8'), `/listings/${filename}`);
  } finally {
    await sftp.end();
  }
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { listing_id } = req.body || {};
  if (!listing_id) {
    return res.status(400).json({ error: 'listing_id is required' });
  }

  const sb = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  // Fetch listing
  const { data: listing, error: fetchError } = await sb
    .from('listings')
    .select('*')
    .eq('id', listing_id)
    .single();

  if (fetchError || !listing) {
    return res.status(404).json({ error: 'Listing not found' });
  }

  const hasCredentials = !!process.env.REA_SFTP_HOST;

  if (!hasCredentials) {
    await sb
      .from('listings')
      .update({ rea_status: 'not_submitted' })
      .eq('id', listing_id);
    return res.json({ ok: true, mode: 'dev_skipped' });
  }

  // Submit via SFTP
  try {
    const xmlContent = buildReaXml(listing);
    const filename = `deed-${listing_id}-${Date.now()}.xml`;
    await submitViaSftp(xmlContent, filename);

    await sb
      .from('listings')
      .update({
        rea_status: 'pending',
        portal_submitted_at: new Date().toISOString(),
      })
      .eq('id', listing_id);

    return res.json({ ok: true, mode: 'submitted' });
  } catch (err) {
    await sb
      .from('listings')
      .update({ portal_error: err.message })
      .eq('id', listing_id);
    return res.status(500).json({ error: err.message });
  }
}

module.exports = handler;
module.exports.buildReaXml = buildReaXml;
module.exports.default = handler;
