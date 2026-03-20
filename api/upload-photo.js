const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://jtpykhrdjkzhcbswrhzo.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { image, filename, listing_id } = req.body;
    if (!image || !filename) return res.status(400).json({ error: 'Missing image or filename' });

    // Decode base64 image
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    const ext = filename.split('.').pop().toLowerCase() || 'jpg';
    const safeName = `${listing_id || 'tmp'}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data, error } = await sb.storage
      .from('listing-photos')
      .upload(safeName, buffer, {
        contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
        upsert: false,
      });

    if (error) throw error;

    const { data: { publicUrl } } = sb.storage.from('listing-photos').getPublicUrl(safeName);
    res.status(200).json({ url: publicUrl });
  } catch (err) {
    console.error('Upload error:', err.message);
    res.status(500).json({ error: err.message });
  }
};
