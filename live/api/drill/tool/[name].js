'use strict';
// Stateless ElevenLabs tool webhook. Validates the shared secret and call token;
// returns success so the agent can say goodbye and call end_call.
const crypto = require('crypto');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex');
  if (req.method !== 'POST') { res.status(405).json({ result: 'POST only.' }); return; }

  const name = String(req.query.name || '');
  if (!['report', 'decision', 'acknowledge'].includes(name)) {
    res.status(404).json({ result: 'Unknown tool name.' }); return;
  }

  const sharedKey = process.env.VOICE_SHARED_KEY || '';
  const secret = sharedKey
    ? crypto.createHash('sha256').update('insiyab-tool:' + sharedKey).digest('hex').slice(0, 40)
    : '';
  const given = String(req.headers['x-insiyab-tool'] || '');
  const ok = secret && given.length === secret.length &&
    crypto.timingSafeEqual(Buffer.from(given), Buffer.from(secret));
  if (!ok) { res.status(403).json({ result: 'Forbidden.' }); return; }

  const body = req.body || {};
  const callToken = String(body.call_token || '');
  if (!/^[0-9a-f]{48}$/.test(callToken)) {
    res.status(400).json({ result: 'Invalid call token format. No change was recorded.' }); return;
  }

  res.status(200).json({ result: 'Logged. Say goodbye once and call end_call now.' });
};
