const { getUser, unauthorized } = require('../../lib/auth');
const { supabase } = require('../../lib/supabase');

const LIMITS = { trial: 100, active: 500, lifetime: 500 };

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const user = await getUser(req);
  if (!user) return unauthorized(res);

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('plan, trial_ends_at, email, created_at')
    .eq('id', user.id)
    .single();

  if (error || !profile) {
    return res.status(404).json({ error: 'Profile not found' });
  }

  // Check if trial has expired but plan hasn't been updated yet
  let plan = profile.plan;
  if (plan === 'trial' && new Date(profile.trial_ends_at) < new Date()) {
    plan = 'expired';
    await supabase.from('profiles').update({ plan: 'expired' }).eq('id', user.id);
  }

  // Get today's usage
  const today = new Date().toISOString().split('T')[0];
  const { data: usage } = await supabase
    .from('usage')
    .select('request_count')
    .eq('user_id', user.id)
    .eq('date', today)
    .single();

  const limit = LIMITS[plan] || 0;
  const trialDaysLeft = plan === 'trial'
    ? Math.max(0, Math.ceil((new Date(profile.trial_ends_at) - new Date()) / 86400000))
    : 0;

  return res.status(200).json({
    email: profile.email,
    plan,
    trialEndsAt: profile.trial_ends_at,
    trialDaysLeft,
    usage: {
      today: usage?.request_count || 0,
      limit
    }
  });
};
