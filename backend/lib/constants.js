/**
 * Shared constants for the ToDo.md backend.
 */

// Rate limits per subscription plan (daily AI requests)
const PLAN_LIMITS = {
  trial: 100,
  active: 500,
  lifetime: 500,
};

// LLM token limits
const MAX_TOKENS_DEFAULT = 1024;
const MAX_TOKENS_HARD_CAP = 4096;

// Time
const MS_PER_DAY = 86400000;

module.exports = {
  PLAN_LIMITS,
  MAX_TOKENS_DEFAULT,
  MAX_TOKENS_HARD_CAP,
  MS_PER_DAY,
};
