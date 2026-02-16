const Stripe = require('stripe');
const { getUser, unauthorized } = require('../../lib/auth');
const { supabase } = require('../../lib/supabase');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = await getUser(req);
  if (!user) return unauthorized(res);

  const { priceType } = req.body; // 'monthly' or 'lifetime'
  if (!priceType || !['monthly', 'lifetime'].includes(priceType)) {
    return res.status(400).json({ error: 'Invalid priceType. Use "monthly" or "lifetime".' });
  }

  // Get or create Stripe customer
  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id, email')
    .eq('id', user.id)
    .single();

  let customerId = profile?.stripe_customer_id;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: profile?.email || user.email,
      metadata: { supabase_user_id: user.id }
    });
    customerId = customer.id;
    await supabase
      .from('profiles')
      .update({ stripe_customer_id: customerId })
      .eq('id', user.id);
  }

  // Map to Stripe Price IDs (set these in Vercel env vars)
  const priceId = priceType === 'monthly'
    ? process.env.STRIPE_PRICE_MONTHLY
    : process.env.STRIPE_PRICE_LIFETIME;

  const sessionParams = {
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    mode: priceType === 'monthly' ? 'subscription' : 'payment',
    success_url: process.env.STRIPE_SUCCESS_URL || 'https://todomd.app/success',
    cancel_url: process.env.STRIPE_CANCEL_URL || 'https://todomd.app/cancel',
    metadata: { supabase_user_id: user.id, priceType }
  };

  const session = await stripe.checkout.sessions.create(sessionParams);

  return res.status(200).json({ url: session.url });
};
