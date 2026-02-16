const Stripe = require('stripe');
const { getUser, unauthorized } = require('../../lib/auth');
const { supabase } = require('../../lib/supabase');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = await getUser(req);
  if (!user) return unauthorized(res);

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single();

  if (!profile?.stripe_customer_id) {
    return res.status(400).json({ error: 'No billing account found. Subscribe first.' });
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: process.env.STRIPE_RETURN_URL || 'https://todomd.app'
  });

  return res.status(200).json({ url: session.url });
};
