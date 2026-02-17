const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { priceType } = req.body; // 'monthly' or 'lifetime'
  if (!priceType || !['monthly', 'lifetime'].includes(priceType)) {
    return res.status(400).json({ error: 'Invalid priceType. Use "monthly" or "lifetime".' });
  }

  const priceId = priceType === 'monthly'
    ? process.env.STRIPE_PRICE_MONTHLY
    : process.env.STRIPE_PRICE_LIFETIME;

  const successUrl = process.env.STRIPE_SUCCESS_URL || 'https://todomd.app/success';

  const session = await stripe.checkout.sessions.create({
    line_items: [{ price: priceId, quantity: 1 }],
    mode: priceType === 'monthly' ? 'subscription' : 'payment',
    success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: process.env.STRIPE_CANCEL_URL || 'https://todomd.app/cancel',
    metadata: { priceType }
  });

  return res.status(200).json({ url: session.url });
};
