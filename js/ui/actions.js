// Everything a click, tick or edit does. Each handler changes state through the store; views
// never mutate state themselves.
import { state, active, update, go, back, say, setUi, render, startDraft, removeInitiative, saveNow } from './store.js';
import { PERSONAS } from '../rules/personas.js';
import { newRow, answerQuestion, baselineAnswers, deriveRow } from '../engine/proficiency.js';
import { gates, canOpen, nextScreen, profiledPersonas, pathContext, modesOf, assessOf, newInitiative } from '../engine/initiative.js';
import { parseTransactionRows, mergeTransactions, setOverride, rolesOf, txLevel } from '../engine/transactions.js';
import { toggleTx, toggleRole, resolveConflict, emptyPaths, mappingChanges, applyMappingChange } from '../engine/mapping.js';
import { PROFILES } from '../rules/personas.js';
import { PERSONA_PLAN } from '../rules/workbook.js';
import { generatePath } from '../engine/paths.js';
import { buildDocument } from '../engine/document.js';
import { currentEmail, mailtoUrl, shortEmailBody } from '../engine/email.js';
import { readSpreadsheet, downloadTemplate, saveFile } from '../services/files.js';
import { suggestMapping } from '../engine/suggest.js';
import { documentFile } from './views/document.js';
import { rafiqClicks, rafiqInputs } from './rafiqActions.js';

const fmt = d => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
const PHASE_SCREENS = {
  define: ['needs', 'personas', 'proficiency', 'capability'],
  design: ['learning', 'upload', 'classify', 'map', 'paths', 'handoff'],
  assess: ['assess', 'evidence']
};
const SCREEN_GATE = { needs: 'needs', personas: 'personas', proficiency: 'proficiency', capability: 'capability', learning: 'learning', assess: 'assess', evidence: 'assessConfirmed', upload: 'upload', classify: 'classified', map: 'mapped', paths: 'reviewed', handoff: 'handoff' };
const inFlow = screen => !['dash', 'ongoing', 'done', 'repo'].includes(screen);

// Changing anything a path depends on clears that persona's review (or everyone's).
const unreview = (init, persona) => ({ ...init, reviewed: persona ? { ...init.reviewed, [persona]: false } : {}, pathsConfirmed: false });

function guardedGo(screen) {
  const init = active();
  if (inFlow(screen) && (!init || !canOpen(init, screen))) { say('Finish the earlier steps first.'); return; }
  go(screen);
}

export const clicks = {
  go: el => {
    const screen = el.dataset.screen;
    if (inFlow(screen) && !active()) { clicks['start-new'](); return; }
    guardedGo(screen);
  },
  back: () => back(),
  ui: el => setUi({ [el.dataset.key]: el.dataset.num ? Number(el.dataset.val) : (el.dataset.val || null) }),
  'ui-toggle': el => setUi({ [el.dataset.key]: !state.ui[el.dataset.key] }),
  'go-next': el => guardedGo(el.dataset.screen),
  // Clicking a phase opens its next unfinished step (or its last step when the phase is done).
  'go-phase': el => {
    const phase = el.dataset.phase, i = active();
    if (phase === 'deploy' || phase === 'measure') { say(`${phase === 'deploy' ? 'Deploy' : 'Measure'} opens once its content is supplied.`); return; }
    if (!i) { clicks['start-new'](); return; }
    const steps = PHASE_SCREENS[phase];
    const g = gates(i);
    const open = steps.filter(sc => canOpen(i, sc));
    if (!open.length) { say(phase === 'design' ? 'Design opens once the Capability Architecture is confirmed.' : 'Assess opens once every persona has learning modes.'); return; }
    const next = open.find(sc => !g[SCREEN_GATE[sc]]) || open[open.length - 1];
    go(next);
  },

  'start-new': () => { startDraft(); go('needs'); say('New initiative started. Begin with Business Needs in the Define phase.'); },
  continue: () => { const i = active(); if (i) go(nextScreen(i)); },
  open: el => {
    const i = state.inits.find(x => x.id === el.dataset.id);
    if (!i) return;
    state.draft = null; state.activeId = i.id; state.ui = {};
    go(nextScreen(i));
  },
  'delete-init': async el => {
    const gone = await removeInitiative(el.dataset.id);
    state.ui = { ...state.ui, confirmDelete: null };
    say(`"${(gone && gone.needs.name) || 'Initiative'}" deleted.`);
  },
  'reset-progress': () => {
    update(i => ({ ...newInitiative(i.id), created: true, started: i.started, due: i.due, needs: { ...i.needs } }));
    setUi({ confirmReset: false });
    say('Progress reset. Business Needs are kept.');
  },
  // Opens the browser's calendar for a date field (clicking anywhere in it, or its calendar button).
  'open-calendar': el => {
    const input = el.tagName === 'INPUT' ? el : document.getElementById(el.dataset.target);
    if (!input) return;
    input.focus();
    try { input.showPicker(); } catch (e) { /* older browsers open it from the field's own icon */ }
  },
  'list-add': el => {
    const key = el.dataset.key, rows = String(active().needs[key] || '').split('\n');
    update(i => ({ ...i, needs: { ...i.needs, [key]: [...rows, ''].join('\n') } }));
    document.getElementById(`need-${key}-${rows.length}`)?.focus();
  },
  'list-remove': el => {
    const key = el.dataset.key, rows = String(active().needs[key] || '').split('\n').filter((x, k) => k !== Number(el.dataset.idx));
    update(i => ({ ...i, needs: { ...i.needs, [key]: rows.join('\n') } }));
  },
  'open-repo': el => { setUi({ repoPersona: el.dataset.persona }); go('repo'); },

  'save-needs': () => {
    const i = active();
    if (!gates(i).needs) { say('All four inputs are required.'); return; }
    if (!i.created) {
      // The start date is captured when the initiative is registered; due is three weeks later.
      const now = new Date(), due = new Date(Date.now() + 21 * 864e5);
      update(x => ({ ...x, created: true, started: fmt(now), due: fmt(due) }));
      say(`"${i.needs.name}" saved. It is now your current initiative on Home.`);
    }
    go('personas');
  },
  'select-all': () => update(i => {
    const all = i.rows.length === PERSONAS.length;
    return unreview({ ...i, rows: all ? [] : [...i.rows, ...PERSONAS.filter(p => !i.rows.some(r => r.persona === p)).map(p => newRow(p))], capConfirmed: false });
  }),
  answer: el => {
    const idx = Math.min(state.ui.profActive || 0, active().rows.length - 1);
    update(i => unreview({ ...i, capConfirmed: false, rows: i.rows.map((r, k) => (k === idx ? answerQuestion(r, el.dataset.domain, Number(el.dataset.q), el.dataset.v === '1') : r)) }));
  },
  // Applies the persona's default level from the persona library to all four domains.
  'prof-default': el => {
    const idx = Number(el.dataset.idx), row = active().rows[idx], level = PROFILES[row.persona]?.prof;
    if (!level) return;
    update(i => unreview({ ...i, capConfirmed: false, rows: i.rows.map((r, k) => (k === idx ? deriveRow({ ...r, answers: baselineAnswers(level) }) : r)) }));
    say(`${PROFILES[row.persona].title || row.persona} set to its default level: ${level}.`);
  },
  'confirm-capability': () => {
    if (!gates(active()).proficiency) return;
    if (!active().capConfirmed) { update(i => ({ ...i, capConfirmed: true })); say('Capability Architecture confirmed. Define is complete and Design is open.'); }
    go('learning');
  },
  'confirm-assess': () => {
    if (!gates(active()).assess) return;
    if (!active().assessConfirmed) { update(i => ({ ...i, assessConfirmed: true })); say('Assessment modes confirmed. Back to Design to create the learning paths.'); }
    go('upload');
  },

  'download-template': async () => {
    const r = await downloadTemplate();
    say(r === 'saved' ? 'Template saved. Share it with the platform vendor to fill in.' : (r === 'declined' ? 'Download cancelled.' : 'Downloads are not available in this view.'));
  },
  resolve: el => {
    const p = el.dataset.persona, ctx = pathContext(active(), p);
    update(i => unreview({ ...i, paths: resolveConflict(i.paths, p, el.dataset.id, el.dataset.how || null, ctx.prof) }, p));
  },
  generate: () => {
    const i = active();
    if (!gates(i).mapped) { say('Finish the mapping first.'); return; }
    update(x => ({ ...x, paths: { ...x.paths, generatedAt: Date.now() }, reviewed: {}, pathsConfirmed: false }));
    go('paths');
    say('Learning paths generated. Review each persona\'s path.');
  },
  'reset-duration': el => update(i => {
    const d = { ...(i.paths.durations?.[el.dataset.persona] || {}) };
    delete d[el.dataset.key];
    return unreview({ ...i, paths: { ...i.paths, durations: { ...i.paths.durations, [el.dataset.persona]: d } } }, el.dataset.persona);
  }),
  'confirm-paths': () => {
    if (!gates(active()).reviewed) return;
    if (!active().pathsConfirmed) { update(i => ({ ...i, pathsConfirmed: true })); say('Learning paths confirmed. The Design Document is ready for hand-off.'); }
    go('handoff');
  },

  'download-doc': async () => {
    const i = active();
    const r = await saveFile(`${i.needs.name || 'Initiative'} Design Document.html`, documentFile(buildDocument(i), i));
    say(r === 'saved' ? 'Design Document saved. Open the file to print it or save it as PDF.' : (r === 'declined' ? 'Download cancelled.' : 'Downloads are not available in this view.'));
  },
  'email-reset': () => update(i => ({ ...i, handoff: { ...i.handoff, subject: null, body: null } })),
  'copy-email': () => {
    const m = currentEmail(active());
    const text = `Subject: ${m.subject}\n\n${m.body}`;
    try { navigator.clipboard.writeText(text).then(() => say('Email text copied.'), () => say('Copy is not available here. Select the message text and copy it.')); }
    catch (e) { say('Copy is not available here. Select the message text and copy it.'); }
  },
  // The link's address is rebuilt at click time so it carries the latest typed message.
  'mail-opened': el => {
    const i = active(), m = currentEmail(i);
    el.href = mailtoUrl(i.handoff.vendorEmail || '', m.subject, m.body, i.handoff.body == null ? shortEmailBody(i) : null);
    say('Opening the draft in your email app. Attach the Design Document before sending.');
  },

  // ---- Suggested mapping (built-in rules) ----
  'map-apply': el => {
    const i = active(), people = profiledPersonas(i);
    const dismissed = new Set(i.paths.mappingDismissed || []);
    const changes = mappingChanges(i.paths, suggestMapping(i.paths, people)).filter(c => !dismissed.has(`${c.kind}:${c.key}`));
    const picked = el.dataset.key ? changes.filter(c => c.kind === el.dataset.kind && c.key === el.dataset.key) : changes;
    update(x => { let p = x.paths; picked.forEach(c => { p = applyMappingChange(p, c); }); return unreview({ ...x, paths: p }); });
    say(picked.length > 1 ? `${picked.length} suggestions applied.` : 'Suggestion applied.');
  },
  'map-dismiss': el => update(i => ({ ...i, paths: { ...i.paths, mappingDismissed: [...new Set([...(i.paths.mappingDismissed || []), `${el.dataset.kind}:${el.dataset.key}`])] } }))
};

export const changes = {
  'toggle-persona': el => update(i => {
    const p = el.dataset.persona;
    const rows = el.checked ? (i.rows.some(r => r.persona === p) ? i.rows : [...i.rows, newRow(p)]) : i.rows.filter(r => r.persona !== p);
    return unreview({ ...i, rows, capConfirmed: false });
  }),
  'toggle-mode': el => update(i => {
    const p = el.dataset.persona, prof = i.rows.find(r => r.persona === p)?.prof;
    const cur = modesOf(i, p, prof), m = el.dataset.value;
    const next = el.checked ? [...new Set([...cur, m])] : cur.filter(x => x !== m);
    return unreview({ ...i, modes: { ...i.modes, [p]: next }, modesProf: { ...i.modesProf, [p]: prof } }, p);
  }),
  'toggle-assess': el => update(i => {
    const p = el.dataset.persona, prof = i.rows.find(r => r.persona === p)?.prof;
    const cur = assessOf(i, p, prof), k = el.dataset.value;
    const next = el.checked ? [...new Set([...cur, k])] : cur.filter(x => x !== k);
    return unreview({ ...i, amodes: { ...i.amodes, [p]: next }, amodesProf: { ...i.amodesProf, [p]: prof }, assessConfirmed: i.assessConfirmed && next.length > 0 }, p);
  }),
  'upload-file': async el => {
    const file = el.files && el.files[0];
    if (file) await handleUpload(file);
    el.value = '';
  },
  'tx-type': el => update(i => unreview({ ...i, paths: { ...i.paths, generatedAt: null, transactions: i.paths.transactions.map(t => (t.id === el.dataset.id ? setOverride({ ...t, levelOverride: null }, { type: el.value }) : t)) } })),
  'tx-level': el => update(i => unreview({ ...i, paths: { ...i.paths, generatedAt: null, transactions: i.paths.transactions.map(t => (t.id === el.dataset.id ? setOverride(t, { level: el.value }) : t)) } })),
  'map-role': el => update(i => unreview({ ...i, paths: toggleRole(i.paths, el.dataset.persona, el.dataset.role, el.checked) })),
  'map-tx': el => update(i => unreview({ ...i, paths: toggleTx(i.paths, el.dataset.persona, el.dataset.id, el.checked) })),
  duration: el => {
    const v = Math.max(0, Math.round(Number(el.value)));
    if (!isFinite(v)) return;
    update(i => unreview({ ...i, paths: { ...i.paths, durations: { ...i.paths.durations, [el.dataset.persona]: { ...(i.paths.durations?.[el.dataset.persona] || {}), [el.dataset.key]: v } } } }, el.dataset.persona));
  },
  // Hand-off fields redraw on change (leaving the field) so the open items and preview catch up.
  'handoff-refresh': () => render(),
  'mark-reviewed': el => update(i => ({ ...i, reviewed: { ...i.reviewed, [el.dataset.persona]: el.checked }, pathsConfirmed: el.checked ? i.pathsConfirmed : false }))
};

// Saves a keystroke without redrawing the page, unless it opens or closes the Business Needs gate
// (so "Save and continue" enables at once). Redrawing on every key made the page flicker.
function typed(fn) {
  const before = gates(active()).needs;
  update(fn, { silent: true });
  if (gates(active()).needs !== before) render();
}

// Text inputs: saved as you type.
export const inputs = {
  need: el => typed(i => ({ ...i, needs: { ...i.needs, [el.dataset.key]: el.value } })),
  list: el => typed(i => {
    const key = el.dataset.key, rows = String(i.needs[key] || '').split('\n');
    rows[Number(el.dataset.idx)] = el.value.replace(/\n/g, ' ');
    return { ...i, needs: { ...i.needs, [key]: rows.join('\n') } };
  }),
  // The email link is rebuilt when clicked, so typing never needs a re-render here.
  'email-field': el => update(i => ({ ...i, handoff: { ...i.handoff, [el.dataset.key]: el.value } }), { silent: true }),
  // Deviation decisions and measurement hand-off, captured here so the document needs no blanks.
  decision: el => update(i => {
    const all = i.handoff.decisions || {}, k = el.dataset.dev;
    return { ...i, handoff: { ...i.handoff, decisions: { ...all, [k]: { ...(all[k] || {}), [el.dataset.key]: el.value } } } };
  }, { silent: true }),
  measure: el => update(i => ({ ...i, handoff: { ...i.handoff, measure: { ...(i.handoff.measure || {}), [el.dataset.key]: el.value } } }), { silent: true })
};

Object.assign(clicks, rafiqClicks);
Object.assign(inputs, rafiqInputs);

export async function handleUpload(file) {
  setUi({ uploading: true, uploadReport: null });
  try {
    const rows = await readSpreadsheet(file);
    const res = parseTransactionRows(rows);
    if (res.errors.length) { setUi({ uploading: false, uploadReport: { errors: res.errors } }); return; }
    const before = active().paths.transactions || [];
    const merged = mergeTransactions(before, res.transactions);
    const kept = merged.filter(t => before.some(b => b.id === t.id)).length;
    update(i => unreview({ ...i, paths: { ...(i.paths || emptyPaths()), transactions: merged, generatedAt: null } }));
    setUi({ uploading: false, uploadReport: { ok: true, file: file.name, count: merged.length, kept, warnings: res.warnings } });
  } catch (e) {
    setUi({ uploading: false, uploadReport: { errors: [e.message || 'The file could not be read.'] } });
  }
}

export const _private = { unreview, profiledPersonas, saveNow, render };
