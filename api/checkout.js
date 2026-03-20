const Stripe = require('stripe');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  const { name, email, phone, address, asking_price, listing_id } = req.body || {};

  const origin = req.headers.origin || 'https://deed-sooty.vercel.app';

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'aud',
            product_data: {
              name: 'DEED Private Listing',
              description: address
                ? `Private sale listing — ${address}`
                : 'Queensland private property listing. No agent. No commission.',
            },
            unit_amount: 149900, // $1,499.00 AUD in cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: listing_id
        ? `${origin}/dashboard.html?listing_id=${listing_id}&session_id={CHECKOUT_SESSION_ID}`
        : `${origin}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/sell.html`,
      customer_email: email || undefined,
      metadata: {
        seller_name:      name         || '',
        seller_phone:     phone        || '',
        property_address: address      || '',
        asking_price:     asking_price || '',
      },
    });

    res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Stripe checkout error:', err.message);
    res.status(500).json({ error: err.message });
  }
};
