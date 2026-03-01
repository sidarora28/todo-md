const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

// ─── cors.js ────────────────────────────────────────────────────

describe('cors', () => {
  const { setCors } = require('../lib/cors');

  function makeReqRes(origin) {
    const headers = {};
    return {
      req: { headers: { origin } },
      res: {
        setHeader(k, v) { headers[k] = v; },
        getHeaders() { return headers; },
      },
      headers,
    };
  }

  it('sets origin header for localhost', () => {
    const { req, res, headers } = makeReqRes('http://localhost:3000');
    setCors(req, res);
    assert.equal(headers['Access-Control-Allow-Origin'], 'http://localhost:3000');
  });

  it('sets origin header for production domain', () => {
    const { req, res, headers } = makeReqRes('https://todo-md-desktop.vercel.app');
    setCors(req, res);
    assert.equal(headers['Access-Control-Allow-Origin'], 'https://todo-md-desktop.vercel.app');
  });

  it('does NOT set origin header for unknown domains', () => {
    const { req, res, headers } = makeReqRes('https://evil.com');
    setCors(req, res);
    assert.equal(headers['Access-Control-Allow-Origin'], undefined);
  });

  it('sets origin header for localhost without port', () => {
    const { req, res, headers } = makeReqRes('http://localhost');
    setCors(req, res);
    assert.equal(headers['Access-Control-Allow-Origin'], 'http://localhost');
  });

  it('always sets methods and headers', () => {
    const { req, res, headers } = makeReqRes(null);
    setCors(req, res);
    assert.equal(headers['Access-Control-Allow-Methods'], 'GET,POST,OPTIONS');
    assert.equal(headers['Access-Control-Allow-Headers'], 'Content-Type,Authorization');
  });
});

// ─── constants.js ───────────────────────────────────────────────

describe('constants', () => {
  const { PLAN_LIMITS, MAX_TOKENS_DEFAULT, MAX_TOKENS_HARD_CAP, MS_PER_DAY } = require('../lib/constants');

  it('exports plan limits for all plans', () => {
    assert.equal(typeof PLAN_LIMITS.trial, 'number');
    assert.equal(typeof PLAN_LIMITS.active, 'number');
    assert.equal(typeof PLAN_LIMITS.lifetime, 'number');
    assert.ok(PLAN_LIMITS.trial > 0);
    assert.ok(PLAN_LIMITS.active >= PLAN_LIMITS.trial);
  });

  it('hard cap exceeds default', () => {
    assert.ok(MAX_TOKENS_HARD_CAP > MAX_TOKENS_DEFAULT);
  });

  it('MS_PER_DAY is correct', () => {
    assert.equal(MS_PER_DAY, 1000 * 60 * 60 * 24);
  });
});

// ─── env.js ─────────────────────────────────────────────────────

describe('env validation', () => {
  const { checkEnv } = require('../lib/env');

  it('returns ok for unknown group', () => {
    const result = checkEnv('nonexistent');
    assert.equal(result.ok, true);
    assert.deepEqual(result.missing, []);
  });

  it('detects missing env vars', () => {
    // Save and clear
    const saved = process.env.LLM_API_KEY;
    delete process.env.LLM_API_KEY;

    const result = checkEnv('llm');
    assert.equal(result.ok, false);
    assert.ok(result.missing.includes('LLM_API_KEY'));

    // Restore
    if (saved) process.env.LLM_API_KEY = saved;
  });

  it('returns ok when env vars are set', () => {
    process.env.LLM_API_KEY = 'test-key';
    const result = checkEnv('llm');
    assert.equal(result.ok, true);
    assert.deepEqual(result.missing, []);
    delete process.env.LLM_API_KEY;
  });
});

// ─── logger.js ──────────────────────────────────────────────────

describe('logger', () => {
  const { log } = require('../lib/logger');

  it('has info, warn, and error methods', () => {
    assert.equal(typeof log.info, 'function');
    assert.equal(typeof log.warn, 'function');
    assert.equal(typeof log.error, 'function');
  });
});
