/**
 * Environment variable validation for the ToDo.md backend.
 * Call checkEnv() at the top of handlers that depend on specific env vars.
 */

const { log } = require('./logger');

const REQUIRED_VARS = {
  supabase: ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_KEY'],
  stripe: ['STRIPE_SECRET_KEY'],
  stripeWebhook: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'],
  llm: ['LLM_API_KEY'],
};

/**
 * Validate that a set of env vars are present.
 * @param {string} group - Key from REQUIRED_VARS (e.g. 'supabase', 'stripe')
 * @returns {{ ok: boolean, missing: string[] }}
 */
function checkEnv(group) {
  const vars = REQUIRED_VARS[group];
  if (!vars) return { ok: true, missing: [] };

  const missing = vars.filter(v => !process.env[v]);
  if (missing.length > 0) {
    log.error(`Missing required env vars for ${group}: ${missing.join(', ')}`);
  }
  return { ok: missing.length === 0, missing };
}

module.exports = { checkEnv, REQUIRED_VARS };
