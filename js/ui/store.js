// App state and persistence. Initiatives live in the repository; the open initiative is edited
// through update(), which saves it (debounced) and re-renders. UI-only state (open panels, tabs,
// filters) lives in `ui` and is never saved.
import { newInitiative, normalizeInitiative } from '../engine/initiative.js';

const listeners = new Set();
export const state = {
  ready: false, repo: null, repoKind: 'local',
  inits: [], activeId: null, draft: null,
  screen: 'dash', hist: [], ui: {}, toast: null, saving: false, saveError: null,
  // Rafeeq (AI assistant): on only when Claude is reachable here; results and chat are never saved.
  rafiq: { on: false, results: {}, chat: [], open: false, busy: false, draft: '', partial: '', chatError: null }
};

export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export function render() { listeners.forEach(fn => fn(state)); }

// The open initiative: a saved one, or an unsaved draft until Business Needs are saved.
export function active() {
  if (state.draft && state.draft.id === state.activeId) return state.draft;
  return state.inits.find(i => i.id === state.activeId) || null;
}

let toastTimer = null;
export function say(msg) {
  state.toast = msg; render();
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { state.toast = null; render(); }, 3400);
}

export function setUi(patch) { state.ui = { ...state.ui, ...patch }; render(); }

export function go(screen, { push = true } = {}) {
  if (push && state.screen !== screen) state.hist = [...state.hist.slice(-30), state.screen];
  state.screen = screen;
  state.ui = { ...state.ui, confirmDelete: null, confirmReset: false };
  render();
  if (typeof window !== 'undefined') window.scrollTo?.(0, 0);
}
export function back() {
  const prev = state.hist[state.hist.length - 1];
  state.hist = state.hist.slice(0, -1);
  go(prev || 'dash', { push: false });
}

// Applies fn to the open initiative. Drafts stay unsaved until they are registered (created: true).
export function update(fn, { silent = false } = {}) {
  const cur = active();
  if (!cur) return;
  const next = { ...fn(cur), updatedAt: new Date().toISOString() };
  if (state.draft && state.draft.id === next.id && !next.created) state.draft = next;
  else {
    state.draft = null;
    const i = state.inits.findIndex(x => x.id === next.id);
    state.inits = i > -1 ? state.inits.map(x => (x.id === next.id ? next : x)) : [...state.inits, next];
    scheduleSave(next.id);
  }
  if (!silent) render();
}

const timers = new Map();
function scheduleSave(id) {
  clearTimeout(timers.get(id));
  timers.set(id, setTimeout(() => saveNow(id), 600));
}
// Saves anything still waiting when the page is closed or reloaded.
if (typeof window !== 'undefined') window.addEventListener('pagehide', () => { [...timers.keys()].forEach(id => saveNow(id)); });

export async function saveNow(id) {
  timers.delete(id);
  const init = state.inits.find(x => x.id === id);
  if (!init || !state.repo) return;
  try { await state.repo.save(init); if (state.saveError) { state.saveError = null; render(); } }
  catch (e) { state.saveError = e.message || 'Saving failed.'; render(); }
}

export function startDraft() {
  const d = newInitiative();
  state.draft = d; state.activeId = d.id;
  state.ui = {};
  return d;
}

export async function removeInitiative(id) {
  const gone = state.inits.find(x => x.id === id);
  state.inits = state.inits.filter(x => x.id !== id);
  clearTimeout(timers.get(id));
  if (state.activeId === id) {
    const latest = [...state.inits].sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))[0];
    state.activeId = latest ? latest.id : null;
  }
  try { await state.repo?.remove(id); } catch (e) { state.saveError = 'The initiative was removed here but could not be removed from storage.'; }
  return gone;
}

export async function boot(repo) {
  state.repo = repo; state.repoKind = repo.kind;
  try { state.inits = (await repo.list()).filter(i => i.created); } catch (e) { state.inits = []; }
  const latest = [...state.inits].sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))[0];
  state.activeId = latest ? latest.id : null;
  state.ready = true;
  // Other viewers' changes arrive here; the open initiative keeps this viewer's edits.
  repo.subscribe(list => {
    const mine = active();
    state.inits = list.filter(i => i.created).map(i => (mine && i.id === mine.id ? mine : i));
    if (mine && mine.created && !state.inits.some(i => i.id === mine.id)) state.activeId = null;
    render();
  });
  render();
}

export const _normalize = normalizeInitiative;
