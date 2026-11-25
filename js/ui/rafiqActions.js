// What Rafeeq's buttons do: run a suggestion task, accept or dismiss suggestions, and the chat panel.
// Accepting goes through update() like any other edit, so it saves and can be changed afterwards.
import { state, active, update, render, say } from './store.js';
import { processList, profiledPersonas, pathContext } from '../engine/initiative.js';
import { newRow, deriveRow } from '../engine/proficiency.js';
import { setOverride } from '../engine/transactions.js';
import { toggleRole } from '../engine/mapping.js';
import { generatePath } from '../engine/paths.js';
import { pathInsights } from '../engine/suggest.js';
import { PROFILES } from '../rules/personas.js';
import { DOMAINS } from '../rules/framework.js';
import * as R from '../engine/rafiq.js';
import { askJson, askChat } from '../services/rafiq.js';

const unreview = (init, persona) => ({ ...init, reviewed: persona ? { ...init.reviewed, [persona]: false } : {}, pathsConfirmed: false });
const setResult = (task, value) => { state.rafiq = { ...state.rafiq, results: { ...state.rafiq.results, [task]: value } }; render(); };
const clearResult = task => { const results = { ...state.rafiq.results }; delete results[task]; state.rafiq = { ...state.rafiq, results }; render(); };
const title = k => (PROFILES[k] || {}).title || k;

function pathFor(init, persona) {
  const ctx = pathContext(init, persona);
  const path = { ...generatePath(init.paths, ctx, { durations: init.paths.durations?.[persona] }), title: title(persona) };
  return { path, insights: pathInsights(path) };
}

// task -> { prompt, check } built from the open initiative
function buildTask(task, init) {
  const [kind, persona] = task.split(':');
  if (kind === 'needs' && (!init.needs.name || !processList(init.needs.outcome).length)) return { error: 'Add the platform name and at least one business outcome first.' };
  if (kind === 'personas' && !init.needs.name) return { error: 'Add the platform name in Business Needs first.' };
  if (kind === 'needs') return { prompt: R.needsPrompt(init), check: a => R.checkNeeds(a, init) };
  if (kind === 'personas') return { prompt: R.personasPrompt(init), check: a => R.checkPersonas(a, init) };
  if (kind === 'prof') return { prompt: R.proficiencyPrompt(init, persona), check: a => R.checkProficiency(a) };
  if (kind === 'classify') {
    const txs = (init.paths.transactions || []).filter(R.needsSecondOpinion);
    if (!txs.length) return { empty: { items: [] } };
    return { prompt: R.classifyPrompt(txs), check: a => R.checkClassify(a, txs) };
  }
  if (kind === 'map') { const people = profiledPersonas(init); return { prompt: R.mappingPrompt(init.paths, people), check: a => R.checkMapping(a, init.paths, people) }; }
  if (kind === 'lessons') { const { path, insights } = pathFor(init, persona); const specs = R.unitSpecs(path, insights); return { prompt: R.lessonPlanPrompt(path, specs), check: a => ({ ...R.checkLessonPlan(a, specs), base: R.lessonBase(specs) }) }; }
  if (kind === 'path') { const { path, insights } = pathFor(init, persona); return { prompt: R.pathPrompt(path, insights), check: a => ({ ...R.checkPath(a, insights), base: insights.narrative }) }; }
  return null;
}

// Removes accepted suggestion `idx` from list `key`; clears the card when nothing is left.
function consume(task, key, idx) {
  const r = state.rafiq.results[task];
  if (!r || r.status !== 'done') return;
  const data = { ...r.data, [key]: r.data[key].filter((x, i) => i !== idx) };
  const left = Object.values(data).some(v => Array.isArray(v) && v.length);
  if (left) setResult(task, { ...r, data }); else clearResult(task);
}

const ACCEPT = {
  needs(kind, idx, d) {
    const apply = (i, o) => { const rows = processList(i.needs.outcome); rows[o.index] = o.text; return { ...i, needs: { ...i.needs, outcome: rows.join('\n') } }; };
    const add = (i, p) => ({ ...i, needs: { ...i.needs, processes: [...processList(i.needs.processes), p.text].join('\n') } });
    if (kind === 'outcome') { update(i => apply(i, d.outcomes[idx])); return ['outcomes', idx]; }
    if (kind === 'process') { update(i => add(i, d.processes[idx])); return ['processes', idx]; }
    update(i => d.processes.reduce(add, d.outcomes.reduce(apply, i)));
    return 'all';
  },
  personas(kind, idx, d) {
    const pick = kind === 'all' ? d.personas : [d.personas[idx]];
    update(i => unreview({ ...i, capConfirmed: false, rows: [...i.rows, ...pick.filter(p => !i.rows.some(r => r.persona === p.key)).map(p => newRow(p.key))] }));
    return kind === 'all' ? 'all' : ['personas', idx];
  },
  prof(kind, idx, d, persona) {
    const answers = Object.fromEntries(DOMAINS.map(dm => [dm.key, R.answersForLevel(d.domains[dm.key].level)]));
    update(i => unreview({ ...i, capConfirmed: false, rows: i.rows.map(r => (r.persona === persona ? deriveRow({ ...r, answers }) : r)) }));
    return 'all';
  },
  classify(kind, idx, d) {
    const pick = kind === 'all' ? d.items : [d.items[idx]];
    update(i => unreview({ ...i, paths: { ...i.paths, generatedAt: null, transactions: i.paths.transactions.map(t => { const x = pick.find(p => p.id === t.id); return x ? { ...setOverride({ ...t, levelOverride: null }, { type: x.type }), rafiq: x.why } : t; }) } }));
    return kind === 'all' ? 'all' : ['items', idx];
  },
  map(kind, idx, d) {
    const pick = kind === 'all' ? d.roles : [d.roles[idx]];
    update(i => { let p = i.paths; pick.forEach(r => r.personas.forEach(k => { p = toggleRole(p, k, r.role, true); })); return unreview({ ...i, paths: p }); });
    return kind === 'all' ? 'all' : ['roles', idx];
  },
  lessons(kind, idx, d, persona) {
    update(i => ({ ...i, paths: { ...i.paths, lessons: { ...(i.paths.lessons || {}), [persona]: { base: d.base, units: d.units, savedAt: new Date().toISOString() } } } }));
    return 'all';
  },
  path(kind, idx, d, persona) {
    update(i => ({ ...i, paths: { ...i.paths, polish: { ...(i.paths.polish || {}), [persona]: { base: d.base, narrative: d.narrative, units: Object.fromEntries(d.units.map(u => [u.from, u.title])) } } } }));
    return 'all';
  }
};

export const rafiqClicks = {
  'rafiq-run': async el => {
    const task = el.dataset.task, init = active();
    const t = init && buildTask(task, init);
    if (!t) return;
    if (t.empty) { setResult(task, { status: 'done', data: t.empty }); return; }
    if (t.error) { setResult(task, { status: 'error', error: t.error }); return; }
    setResult(task, { status: 'loading' });
    try {
      const data = t.check(await askJson(t.prompt));
      if (state.rafiq.results[task]?.status === 'loading') setResult(task, { status: 'done', data });
    } catch (e) {
      if (state.rafiq.results[task]?.status === 'loading') setResult(task, { status: 'error', error: e.message });
    }
  },
  'rafiq-accept': el => {
    const task = el.dataset.task, r = state.rafiq.results[task];
    if (!r || r.status !== 'done') return;
    const [kind, persona] = task.split(':');
    const res = ACCEPT[kind] && ACCEPT[kind](el.dataset.kind, Number(el.dataset.idx), r.data, persona);
    if (res === 'all') { clearResult(task); say(kind === 'lessons' ? 'Lesson plan saved. It goes into the Design Document.' : 'Rafeeq\'s suggestions applied. You can still change anything.'); }
    else if (res) consume(task, res[0], res[1]);
  },
  'rafiq-dismiss': el => clearResult(el.dataset.task),
  'lessons-remove': el => update(i => { const lessons = { ...(i.paths.lessons || {}) }; delete lessons[el.dataset.persona]; return { ...i, paths: { ...i.paths, lessons } }; }),
  'lesson-toggle': el => {
    const all = { ...(state.ui.lessonOpen || {}) }, k = el.dataset.key, i = Number(el.dataset.idx);
    const cur = { ...(all[k] || {}) }; const was = cur[i] != null ? cur[i] : i === 0;
    cur[i] = !was; all[k] = cur; state.ui = { ...state.ui, lessonOpen: all }; render();
  },
  'rafiq-revert-path': el => update(i => { const polish = { ...(i.paths.polish || {}) }; delete polish[el.dataset.persona]; return { ...i, paths: { ...i.paths, polish } }; }),
  'rafiq-open': () => { state.rafiq = { ...state.rafiq, open: true }; render(); document.getElementById('rafiq-input')?.focus(); },
  'rafiq-close': () => { state.rafiq = { ...state.rafiq, open: false }; render(); },
  'rafiq-starter': el => { state.rafiq = { ...state.rafiq, draft: el.dataset.q }; rafiqClicks['rafiq-send'](); },
  'rafiq-send': async () => {
    const r = state.rafiq, q = (r.draft || '').trim();
    if (!q || r.busy) return;
    const history = r.chat;
    state.rafiq = { ...r, chat: [...history, { role: 'user', content: q }], draft: '', busy: true, partial: '', chatError: null };
    render();
    const ctrl = new AbortController();
    try {
      const text = await askChat(R.askMessages(active(), state.screen, history, q), t => {
        state.rafiq.partial = t;
        const el = document.getElementById('rafiq-stream');
        if (el) { el.textContent = t; const log = document.getElementById('rafiq-log'); if (log) log.scrollTop = log.scrollHeight; }
      }, ctrl.signal);
      state.rafiq = { ...state.rafiq, chat: [...state.rafiq.chat, { role: 'assistant', content: text || '…' }], busy: false, partial: '' };
    } catch (e) {
      state.rafiq = { ...state.rafiq, busy: false, partial: '', chatError: e.message };
    }
    render();
  }
};

export const rafiqInputs = {
  // Typing in the chat box is kept without redrawing the page.
  'rafiq-draft': el => { state.rafiq.draft = el.value; }
};
