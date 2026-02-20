const Stripe = require('stripe');
const { supabase } = require('../../lib/supabase');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Vercel requires raw body for webhook signature verification.
// Disable body parsing so we can access the raw buffer.
module.exports.config = { api: { bodyParser: false } };

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const rawBody = await getRawBody(req);
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  switch (event.type) {
    // ── Checkout completed (subscription or one-time) ──
    // For new purchases from the website, there's no supabase_user_id yet —
    // the /api/auth/create-account endpoint handles account creation + plan
    // linking after the user sets their password on the success page.
    case 'checkout.session.completed': {
      const session = event.data.object;
      const userId = session.metadata?.supabase_user_id;
      const priceType = session.metadata?.priceType;

      if (!userId) {
        console.log('Checkout completed without user ID — account will be created via success page');
        break;
      }

      const plan = priceType === 'lifetime' ? 'lifetime' : 'active';
      const { error: updateErr } = await supabase
        .from('profiles')
        .update({ plan, stripe_customer_id: session.customer })
        .eq('id', userId);

      if (updateErr) {
        console.error(`Failed to upgrade user ${userId}:`, updateErr.message);
        return res.status(500).json({ error: 'Failed to update profile' });
      }
      console.log(`User ${userId} upgraded to ${plan}`);
      break;
    }

    // ── Subscription cancelled or expired ──
    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      const customerId = subscription.customer;

      const { data: profile, error: fetchErr } = await supabase
        .from('profiles')
        .select('id, plan')
        .eq('stripe_customer_id', customerId)
        .single();

      if (fetchErr) {
        console.error(`Failed to find profile for customer ${customerId}:`, fetchErr.message);
        return res.status(500).json({ error: 'Failed to find profile' });
      }

      // Don't downgrade lifetime users
      if (profile && profile.plan !== 'lifetime') {
        const { error: expireErr } = await supabase
          .from('profiles')
          .update({ plan: 'expired' })
          .eq('id', profile.id);

        if (expireErr) {
          console.error(`Failed to expire user ${profile.id}:`, expireErr.message);
          return res.status(500).json({ error: 'Failed to expire subscription' });
        }
        console.log(`User ${profile.id} subscription expired`);
      }
      break;
    }

    // ── Payment failed ──
    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      const customerId = invoice.customer;
      console.warn(`Payment failed for customer ${customerId}`);
      // Stripe handles retries automatically. After final failure,
      // the subscription.deleted event fires and we expire the plan.
      break;
    }

    default:
      // Ignore unhandled event types
      break;
  }

  return res.status(200).json({ received: true });
};
