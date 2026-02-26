const { createClient } = require('@supabase/supabase-js');

// Service-role client — has full DB access, used server-side only.
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = { supabase };
