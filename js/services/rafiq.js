// Talks to Claude through the claude.ai `sample` capability. When it is missing (the page opened
// from a downloaded file, a viewer who declined, a preview), Rafeeq is simply hidden.
import { capability } from './platform.js';

export async function rafiqAvailable() {
  const s = await capability('sample');
  return typeof s === 'function';
}

function friendly(e) {
  const code = e && e.code;
  if (code === 'not_granted') return 'Rafeeq needs your permission to use Claude. Allow it from the artifact\'s permissions menu and try again.';
  if (code === 'rate_limited') return 'Rafeeq is busy right now. Please wait a minute and try again.';
  if (code === 'invalid_json') return 'Rafeeq\'s answer could not be read. Please try again.';
  return 'Rafeeq could not answer just now. Please try again.';
}

export async function askJson(prompt, opts = {}) {
  const s = await capability('sample');
  if (typeof s !== 'function') throw new Error('Rafeeq is not available here.');
  try { return await s.json(prompt, { modelTier: 'default', ...opts }); }
  catch (e) { const err = new Error(friendly(e)); err.code = e && e.code; throw err; }
}

// Streams a chat answer; onText receives the whole answer so far.
export async function askChat(messages, onText, signal) {
  const s = await capability('sample');
  if (typeof s !== 'function') throw new Error('Rafeeq is not available here.');
  try {
    const r = await s(messages, { modelTier: 'default', cache: false, signal, onText: u => onText && onText(u.text || '') });
    return r.text || '';
  } catch (e) { const err = new Error(friendly(e)); err.code = e && e.code; throw err; }
}
