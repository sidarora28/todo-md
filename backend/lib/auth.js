const { createClient } = require('@supabase/supabase-js');

/**
 * Verify the Supabase JWT from the Authorization header.
 * Returns the user object or null.
 */
async function getUser(req) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;

  const token = header.slice(7);

  // Use the anon key to verify the JWT (not the service key)
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

/**
 * Helper: send a JSON error response.
 */
function unauthorized(res, message = 'Unauthorized') {
  res.status(401).json({ error: message });
}

module.exports = { getUser, unauthorized };
