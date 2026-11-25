// Talks to Claude for Rafeeq. On a hosted copy (server.mjs, e.g. on Render) it uses the Anthropic API
// through the server's /api/rafeeq endpoints, so the API key never reaches the browser. When the
// page has no such server (the claude.ai artifact), it falls back to the claude.ai `sample`
// capability. With neither, Rafeeq is simply hidden.
import { capability } from './platform.js';

const CODE_KEY = 'cdp-learning-accelerator:rafeeq-code';
let backendPromise = null;

function serverStatus() {
  if (typeof fetch !== 'function' || typeof location === 'undefined' || !/^https?:$/.test(location.protocol)) return Promise.resolve(null);
  return fetch('/api/rafeeq/status', { cache: 'no-store' })
    .then(r => (r.ok ? r.json() : null))
    .then(s => (s && s.available ? s : null))
    .catch(() => null);
}

// Resolves to { kind: 'api', needsCode } or { kind: 'sample', s } or null.
function backend() {
  if (!backendPromise) {
    backendPromise = (async () => {
      const st = await serverStatus();
      if (st) return { kind: 'api', needsCode: !!st.needsCode };
      const s = await capability('sample');
      return typeof s === 'function' ? { kind: 'sample', s } : null;
    })();
  }
  return backendPromise;
}

export async function rafiqAvailable() {
  return !!(await backend());
}

const MESSAGES = {
  not_granted: 'Rafeeq needs the access code. Ask the person who shared this tool for it and try again.',
  rate_limited: 'Rafeeq is busy right now. Please wait a minute and try again.',
  invalid_json: 'Rafeeq\'s answer could not be read. Please try again.',
  refused: 'Rafeeq could not help with that request. Try rewording it.',
  not_configured: 'Rafeeq is not set up on this server yet.',
  server_key: 'Rafeeq\'s connection to Claude is not working. Ask the person who runs this tool to check the API key.',
  too_large: 'This initiative is too large for Rafeeq to read in one go.'
};
function fail(code) {
  const err = new Error(MESSAGES[code] || 'Rafeeq could not answer just now. Please try again.');
  err.code = code;
  return err;
}

// ---- Access code (only when the server asks for one) ----
function storedCode() { try { return localStorage.getItem(CODE_KEY) || ''; } catch (e) { return ''; } }
function saveCode(c) { try { if (c) localStorage.setItem(CODE_KEY, c); else localStorage.removeItem(CODE_KEY); } catch (e) { /* this browser blocks storage */ } }
function askCode() {
  const c = typeof prompt === 'function' ? prompt('Enter the Rafeeq access code') : '';
  return (c || '').trim();
}

async function post(path, body, signal) {
  const b = await backend();
  let code = b.needsCode ? storedCode() || askCode() : '';
  if (b.needsCode && !code) throw fail('not_granted');
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(path, {
      method: 'POST', signal,
      headers: { 'content-type': 'application/json', ...(code ? { 'x-access-code': code } : {}) },
      body: JSON.stringify(body)
    }).catch(e => { if (e && e.name === 'AbortError') throw e; throw fail('unavailable'); });
    if (res.status === 401 && b.needsCode) {
      saveCode('');
      if (attempt === 0) { code = askCode(); if (code) continue; }
      throw fail('not_granted');
    }
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw fail(e.error);
    }
    if (code) saveCode(code);
    return res;
  }
  throw fail('not_granted');
}

function wrapSample(e) { return fail(e && e.code); }

export async function askJson(prompt, opts = {}) {
  const b = await backend();
  if (!b) throw new Error('Rafeeq is not available here.');
  if (b.kind === 'sample') {
    try { return await b.s.json(prompt, { modelTier: 'default', ...opts }); } catch (e) { throw wrapSample(e); }
  }
  const res = await post('/api/rafeeq/json', { prompt }, opts.signal);
  const out = await res.json();
  return out.data;
}

// Streams a chat answer; onText receives the whole answer so far.
export async function askChat(messages, onText, signal) {
  const b = await backend();
  if (!b) throw new Error('Rafeeq is not available here.');
  if (b.kind === 'sample') {
    try {
      const r = await b.s(messages, { modelTier: 'default', cache: false, signal, onText: u => onText && onText(u.text || '') });
      return r.text || '';
    } catch (e) { throw wrapSample(e); }
  }
  const res = await post('/api/rafeeq/chat', { messages }, signal);
  const reader = res.body.getReader(), dec = new TextDecoder();
  let text = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    text += dec.decode(value, { stream: true });
    if (onText) onText(text);
  }
  return text + dec.decode();
}

export function _resetRafiqBackend() { backendPromise = null; }
