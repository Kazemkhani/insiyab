// One address for the six calls: /api/room/join, state, answer, phase, call, reset. The rules are in ../_room.js.
'use strict';
const { handle, storeFromEnv } = require('../_room.js');

module.exports = async (req, res) => {
  let body = req.body;
  if (typeof body === 'string') { try { body = body ? JSON.parse(body) : {}; } catch { body = null; } }
  if (body === undefined) body = {};
  const out = await handle(storeFromEnv(), { method: req.method, action: String(req.query.action || ''), body, code: req.headers['x-presenter-code'], presenterCode: process.env.PRESENTER_CODE });
  res.setHeader('cache-control', 'no-store'); res.setHeader('x-robots-tag', 'noindex');
  res.status(out.status).json(out.json);
};
