const { supabase } = require('../../lib/supabase');
const { setCors } = require('../../lib/cors');
const { log } = require('../../lib/logger');

module.exports = async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  // Basic email format check
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  // Create a Supabase user with auto-confirmed email (no verification email sent).
  // The Supabase trigger `handle_new_user` automatically creates a profile row
  // with plan='trial' and trial_ends_at = now + 14 days.
  const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });

  if (createError) {
    // Most likely: account already exists
    if (createError.message?.includes('already') || createError.status === 422) {
      return res.status(409).json({
        error: 'An account with this email already exists. Please sign in instead.'
      });
    }
    log.error('Signup error:', createError.message);
    return res.status(500).json({ error: 'Could not create account. Please try again.' });
  }

  return res.status(200).json({
    success: true,
    email: newUser.user.email
  });
};
