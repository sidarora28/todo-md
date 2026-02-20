/**
 * CORS helper for Vercel API routes.
 * Allows requests from the Vercel-hosted frontend (same origin)
 * and from the Electron desktop app (localhost:*).
 */

const ALLOWED_ORIGINS = [
  /^https?:\/\/localhost(:\d+)?$/,
  /^https?:\/\/todo-md-desktop\.vercel\.app$/,
  /^https?:\/\/todomd\.app$/
];

function setCors(req, res) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.some(pattern => pattern.test(origin))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
}

module.exports = { setCors };
