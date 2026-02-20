const Stripe = require('stripe');
const { supabase } = require('../../lib/supabase');
const { setCors } = require('../../lib/cors');
const { log } = require('../../lib/logger');
const { checkEnv } = require('../../lib/env');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

module.exports = async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { ok, missing } = checkEnv('stripe');
  if (!ok) return res.status(500).json({ error: `Server misconfigured: missing ${missing.join(', ')}` });

  const { sessionId, password } = req.body;
  if (!sessionId || !password) {
    return res.status(400).json({ error: 'sessionId and password are required.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  // 1. Retrieve the Stripe checkout session to verify payment
  let session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch {
    return res.status(400).json({ error: 'Invalid session.' });
  }

  if (session.payment_status !== 'paid') {
    return res.status(400).json({ error: 'Payment not completed.' });
  }

  const email = session.customer_details?.email;
  if (!email) {
    return res.status(400).json({ error: 'No email found on payment session.' });
  }

  const priceType = session.metadata?.priceType;
  const plan = priceType === 'lifetime' ? 'lifetime' : 'active';
  const customerId = session.customer;

  // 2. Try to create a new Supabase account
  //    Skip email verification — they proved ownership by paying with it.
  const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });

  let userId;

  if (createError) {
    // Account with this email already exists — link the payment to it
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();

    if (!profile) {
      return res.status(400).json({
        error: 'An account with this email already exists. Log in to the app to use your plan.'
      });
    }

    userId = profile.id;
  } else {
    userId = newUser.user.id;
  }

  // 3. Update the profile with plan + Stripe customer ID
  const { error: updateErr } = await supabase
    .from('profiles')
    .update({ plan, stripe_customer_id: customerId })
    .eq('id', userId);

  if (updateErr) {
    log.error(`Failed to update profile for user ${userId}:`, updateErr.message);
    return res.status(500).json({ error: 'Failed to update account.' });
  }

  return res.status(200).json({
    success: true,
    email,
    plan
  });
};
