// Web server for hosting outside claude.ai (e.g. Render): serves the built app and gives Rafeeq
// access to Claude through the Anthropic API. The API key stays on the server; the browser never
// sees it.
//
// Environment:
//   ANTHROPIC_API_KEY   required for Rafeeq (without it the app runs and Rafeeq stays hidden)
//   ACCESS_CODE         optional; when set, visitors must enter it before Rafeeq answers
//   RAFEEQ_MODEL        optional; defaults to claude-opus-5-5
//   RATE_LIMIT          optional; Rafeeq requests per visitor IP per 10 minutes (default 40)
//   PORT                set by Render
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;
const MODEL = process.env.RAFEEQ_MODEL || 'claude-opus-5-5';
const ACCESS_CODE = process.env.ACCESS_CODE || '';
const RATE_LIMIT = Number(process.env.RATE_LIMIT) || 40;
const WINDOW_MS = 10 * 60 * 1000;
const MAX_BODY = 256 * 1024;

const client = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null;

// ---- Claude ----
const SYSTEM = 'You are Rafeeq, the learning design assistant in the CDP Learning Accelerator. Follow the instructions in each request exactly.';
const JSON_SYSTEM = SYSTEM + ' When a request asks for JSON, reply with that JSON only: no prose and no code fences.';

function streamRequest(messages, system, maxTokens) {
  return client.beta.messages.stream({
    model: MODEL,
    max_tokens: maxTokens,
    system,
    messages,
    output_config: { effort: 'medium' },
    // If Claude declines on a safety-classifier false positive, the API retries on a fallback model.
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default'
  });
}

const textOf = msg => msg.content.filter(b => b.type === 'text').map(b => b.text).join('');

function parseJson(text) {
  const t = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try { return JSON.parse(t); } catch (e) { /* fall through */ }
  const start = t.search(/[{[]/), end = Math.max(t.lastIndexOf('}'), t.lastIndexOf(']'));
  if (start >= 0 && end > start) { try { return JSON.parse(t.slice(start, end + 1)); } catch (e) { /* fall through */ } }
  const err = new Error('invalid_json'); err.code = 'invalid_json'; throw err;
}

function apiErrorCode(e) {
  if (e && e.code) return e.code;
  if (e instanceof Anthropic.RateLimitError) return 'rate_limited';
  if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) return 'server_key';
  if (e instanceof Anthropic.APIError && e.status === 529) return 'rate_limited';
  return 'unavailable';
}

// ---- Guards ----
const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter(t => now - t < WINDOW_MS);
  list.push(now); hits.set(ip, list);
  return list.length > RATE_LIMIT;
}
setInterval(() => { const now = Date.now(); for (const [ip, l] of hits) if (!l.some(t => now - t < WINDOW_MS)) hits.delete(ip); }, WINDOW_MS).unref();

const sameCode = given => {
  const a = Buffer.from(String(given || '')), b = Buffer.from(ACCESS_CODE);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

function validMessages(m) {
  return Array.isArray(m) && m.length > 0 && m.length <= 30 && m[0].role === 'user' &&
    m.every(x => x && (x.role === 'user' || x.role === 'assistant') && typeof x.content === 'string' && x.content.length <= 60000);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => { size += c.length; if (size > MAX_BODY) { reject(Object.assign(new Error('too_large'), { code: 'too_large' })); req.destroy(); } else chunks.push(c); });
    req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); } catch (e) { reject(Object.assign(new Error('bad_request'), { code: 'bad_request' })); } });
    req.on('error', reject);
  });
}

const sendJson = (res, status, body) => { res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' }); res.end(JSON.stringify(body)); };

// ---- API routes ----
async function handleApi(req, res, url) {
  if (url.pathname === '/api/rafeeq/status' && req.method === 'GET') {
    return sendJson(res, 200, { available: !!client, needsCode: !!ACCESS_CODE });
  }
  if (req.method !== 'POST' || !['/api/rafeeq/json', '/api/rafeeq/chat'].includes(url.pathname)) return sendJson(res, 404, { error: 'not_found' });
  if (!client) return sendJson(res, 503, { error: 'not_configured' });
  if (ACCESS_CODE && !sameCode(req.headers['x-access-code'])) return sendJson(res, 401, { error: 'not_granted' });
  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  if (rateLimited(ip)) return sendJson(res, 429, { error: 'rate_limited' });

  let body;
  try { body = await readBody(req); } catch (e) { return sendJson(res, 400, { error: e.code || 'bad_request' }); }

  if (url.pathname === '/api/rafeeq/json') {
    const prompt = body.prompt;
    if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 60000) return sendJson(res, 400, { error: 'bad_request' });
    try {
      const msg = await streamRequest([{ role: 'user', content: prompt }], JSON_SYSTEM, 16000).finalMessage();
      if (msg.stop_reason === 'refusal') return sendJson(res, 422, { error: 'refused' });
      return sendJson(res, 200, { data: parseJson(textOf(msg)) });
    } catch (e) {
      console.error('rafeeq/json', e.status || '', e.message);
      const code = apiErrorCode(e);
      return sendJson(res, code === 'rate_limited' ? 429 : 502, { error: code });
    }
  }

  // Chat: streams plain text; the client appends chunks as they arrive.
  if (!validMessages(body.messages)) return sendJson(res, 400, { error: 'bad_request' });
  const stream = streamRequest(body.messages, SYSTEM, 4000);
  req.on('close', () => { if (!res.writableEnded) stream.abort(); });
  let started = false;
  const start = () => { if (!started) { started = true; res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store', 'x-accel-buffering': 'no' }); } };
  stream.on('text', t => { start(); res.write(t); });
  try {
    const msg = await stream.finalMessage();
    if (msg.stop_reason === 'refusal' && !started) return sendJson(res, 422, { error: 'refused' });
    start(); res.end();
  } catch (e) {
    if (stream.aborted || req.destroyed) return;
    console.error('rafeeq/chat', e.status || '', e.message);
    if (!started) { const code = apiErrorCode(e); return sendJson(res, code === 'rate_limited' ? 429 : 502, { error: code }); }
    res.end();
  }
}

// ---- Static files ----
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.json': 'application/json' };
// Only the app itself is served: never server code, tests, package files or node_modules.
const PUBLIC = /^\/(index\.html|dev\.html|css\/[\w.-]+\.css|js\/[\w/.-]+\.js|assets\/[\w/.-]+\.(svg|woff2))$/;

function serveStatic(req, res, url) {
  let p = decodeURIComponent(url.pathname);
  if (p === '/') p = '/index.html';
  if (!PUBLIC.test(p) || p.includes('..')) { res.writeHead(404, { 'content-type': 'text/plain' }); return res.end('Not found'); }
  const file = path.join(ROOT, p);
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404, { 'content-type': 'text/plain' }); return res.end('Not found'); }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'cache-control': p.endsWith('.html') ? 'no-cache' : 'public, max-age=3600', 'x-content-type-options': 'nosniff', 'x-frame-options': 'SAMEORIGIN' });
    res.end(data);
  });
}

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname.startsWith('/api/')) handleApi(req, res, url).catch(e => { console.error(e); if (!res.headersSent) sendJson(res, 500, { error: 'unavailable' }); });
  else if (req.method === 'GET' || req.method === 'HEAD') serveStatic(req, res, url);
  else { res.writeHead(405); res.end(); }
}).listen(PORT, () => console.log(`CDP Learning Accelerator on port ${PORT}. Rafeeq: ${client ? `on (${MODEL})` : 'off (no ANTHROPIC_API_KEY)'}${ACCESS_CODE ? ', access code required' : ''}`));
