const { getUser, unauthorized } = require('../../lib/auth');
const { supabase } = require('../../lib/supabase');

// LLM provider configs — uses env vars set on Vercel
function getLLMConfig() {
  const apiKey = process.env.LLM_API_KEY;
  const provider = process.env.LLM_PROVIDER || 'openai';
  const model = process.env.LLM_MODEL;

  const configs = {
    openai: {
      provider: 'openai',
      apiKey,
      model: model || 'gpt-4o-mini',
      endpoint: 'https://api.openai.com/v1/chat/completions'
    },
    anthropic: {
      provider: 'anthropic',
      apiKey,
      model: model || 'claude-sonnet-4-5-20250929',
      endpoint: 'https://api.anthropic.com/v1/messages'
    },
    openrouter: {
      provider: 'openrouter',
      apiKey,
      model: model || 'anthropic/claude-sonnet-4-5',
      endpoint: 'https://openrouter.ai/api/v1/chat/completions'
    }
  };

  return configs[provider] || configs.openai;
}

// Rate limits per plan
const LIMITS = {
  trial: 100,
  active: 500,
  lifetime: 500
};

module.exports = async function handler(req, res) {
  // CORS preflight
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // 1. Authenticate
  const user = await getUser(req);
  if (!user) return unauthorized(res);

  // 2. Check subscription status
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('plan, trial_ends_at')
    .eq('id', user.id)
    .single();

  if (profileErr || !profile) {
    return res.status(403).json({ error: 'Profile not found' });
  }

  // Check if trial has expired
  if (profile.plan === 'trial' && new Date(profile.trial_ends_at) < new Date()) {
    return res.status(403).json({
      error: 'trial_expired',
      message: 'Your free trial has ended. Please subscribe to continue using AI features.'
    });
  }

  if (profile.plan === 'expired') {
    return res.status(403).json({
      error: 'subscription_expired',
      message: 'Your subscription has expired. Please renew to continue using AI features.'
    });
  }

  // 3. Check rate limit
  const today = new Date().toISOString().split('T')[0];
  const limit = LIMITS[profile.plan] || 0;

  // Upsert usage row and increment
  const { data: usage, error: usageErr } = await supabase
    .from('usage')
    .upsert(
      { user_id: user.id, date: today, request_count: 0 },
      { onConflict: 'user_id,date', ignoreDuplicates: true }
    )
    .select()
    .single();

  // Fetch current count
  const { data: currentUsage } = await supabase
    .from('usage')
    .select('request_count')
    .eq('user_id', user.id)
    .eq('date', today)
    .single();

  if (currentUsage && currentUsage.request_count >= limit) {
    return res.status(429).json({
      error: 'rate_limited',
      message: `Daily limit reached (${limit} requests). Resets at midnight UTC.`
    });
  }

  // 4. Call LLM
  const { prompt, options = {} } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Missing prompt' });

  const config = getLLMConfig();
  const model = options.model || config.model;
  const maxTokens = options.maxTokens || 1024;

  try {
    let response;

    if (config.provider === 'anthropic') {
      response = await fetch(config.endpoint, {
        method: 'POST',
        headers: {
          'x-api-key': config.apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          messages: [{ role: 'user', content: prompt }]
        })
      });
    } else {
      response = await fetch(config.endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          messages: [{ role: 'user', content: prompt }]
        })
      });
    }

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`${config.provider} API error:`, response.status, errorBody);
      return res.status(502).json({ error: 'llm_error', message: 'AI provider returned an error' });
    }

    const data = await response.json();
    let content;
    if (config.provider === 'anthropic') {
      content = data.content?.[0]?.text;
    } else {
      content = data.choices?.[0]?.message?.content;
    }

    // 5. Increment usage count
    await supabase
      .from('usage')
      .update({ request_count: (currentUsage?.request_count || 0) + 1 })
      .eq('user_id', user.id)
      .eq('date', today);

    return res.status(200).json({ content });

  } catch (err) {
    console.error('Proxy LLM error:', err.message);
    return res.status(500).json({ error: 'network_error', message: 'Failed to reach AI provider' });
  }
};
