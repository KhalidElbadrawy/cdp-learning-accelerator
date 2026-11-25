// The initiative: everything one platform initiative records as it moves through the framework,
// plus the derived status used by Home, the stepper and the gating between screens.
import { PROFILES } from '../rules/personas.js';
import { deriveRow } from './proficiency.js';
import { defaultModes, defaultAssess, assessComplete } from './modes.js';
import { emptyPaths, mappingIssues } from './mapping.js';
import { txNeedsReview } from './transactions.js';
import { classifyTransaction } from './classify.js';

export const SCHEMA = 2;

// Business outcomes and critical processes are kept as one string, one process per line, so older data still reads.
export const processList = s => String(s || '').split('\n').map(x => x.trim()).filter(Boolean);

export function newInitiative(id) {
  return {
    schema: SCHEMA, id: id || 'init-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    created: false, started: '', due: '',
    needs: { name: '', outcome: '', processes: '', goLive: '' },
    rows: [], capConfirmed: false,
    modes: {}, modesProf: {}, amodes: {}, amodesProf: {}, assessConfirmed: false,
    paths: emptyPaths(), reviewed: {}, pathsConfirmed: false,
    handoff: { vendorEmail: '', subject: null, body: null, qc: null, decisions: {}, measure: {} }
  };
}

// Brings any stored initiative up to the current shape. Unknown or broken input returns null.
export function normalizeInitiative(x) {
  if (!x || typeof x !== 'object' || !x.id) return null;
  const base = newInitiative(x.id);
  const out = { ...base, ...x, schema: SCHEMA };
  out.needs = { ...base.needs, ...(x.needs || {}) };
  out.rows = (Array.isArray(x.rows) ? x.rows : []).filter(r => r && r.persona && PROFILES[r.persona]).map(deriveRow);
  ['modes', 'modesProf', 'amodes', 'amodesProf', 'reviewed'].forEach(k => { out[k] = x[k] && typeof x[k] === 'object' ? x[k] : {}; });
  out.paths = { ...emptyPaths(), ...(x.paths || {}) };
  out.paths.transactions = Array.isArray(out.paths.transactions) ? out.paths.transactions.filter(t => t && t.id && t.name && t.auto) : [];
  // Re-read every transaction with the current classification rules (the user's overrides are kept).
  out.paths.transactions = out.paths.transactions.map(t => ({ ...t, auto: classifyTransaction(t.name, { role: t.role, workflow: t.workflow }) }));
  delete out.paths.ai;
  out.handoff = { ...base.handoff, ...(x.handoff || {}) };
  return out;
}

export const personaTitle = key => (PROFILES[key] || {}).title || key;

// The learning modes in force for a persona: the user's picks for its current level, otherwise the defaults.
export function modesOf(init, persona, prof) {
  return init.modes[persona] && init.modesProf[persona] === prof ? init.modes[persona] : defaultModes(prof);
}
export function assessOf(init, persona, prof) {
  return init.amodes[persona] && init.amodesProf[persona] === prof ? init.amodes[persona] : defaultAssess(prof);
}

// Personas with a confirmed proficiency, in selection order.
export function profiledPersonas(init) {
  return init.rows.filter(r => r.prof).map(r => ({ persona: r.persona, title: personaTitle(r.persona), prof: r.prof, row: r }));
}

export function pathContext(init, persona) {
  const r = init.rows.find(x => x.persona === persona);
  if (!r || !r.prof) return null;
  return { persona, title: personaTitle(persona), prof: r.prof, modes: modesOf(init, persona, r.prof), assess: assessOf(init, persona, r.prof) };
}

// Gates, in flow order. Each later gate implies the earlier ones.
export function gates(init) {
  const n = init.needs;
  const g = {};
  g.needs = !!(n.name && processList(n.outcome).length && processList(n.processes).length && n.goLive);
  g.personas = g.needs && init.rows.length > 0;
  g.proficiency = g.personas && init.rows.every(r => r.prof);
  g.capability = g.proficiency && !!init.capConfirmed;
  const people = profiledPersonas(init);
  g.learning = g.capability && people.every(p => modesOf(init, p.persona, p.prof).length > 0);
  g.assess = g.learning && people.every(p => assessComplete(p.prof, assessOf(init, p.persona, p.prof)));
  g.assessConfirmed = g.assess && !!init.assessConfirmed;
  const tx = init.paths.transactions || [];
  g.upload = g.assessConfirmed && tx.length > 0;
  g.classified = g.upload && !tx.some(txNeedsReview);
  g.mapped = g.classified && mappingIssues(init.paths, people).length === 0;
  g.generated = g.mapped && !!init.paths.generatedAt;
  g.reviewed = g.generated && people.every(p => init.reviewed[p.persona]);
  g.handoff = g.reviewed && !!init.pathsConfirmed;
  return g;
}

// Screens in flow order, with the phase each belongs to and the gate that opens it.
export const FLOW = [
  { screen: 'needs', phase: 'define', label: 'Business Needs', opens: null },
  { screen: 'personas', phase: 'define', label: 'Persona Selection', opens: 'needs' },
  { screen: 'proficiency', phase: 'define', label: 'Proficiency Level', opens: 'personas' },
  { screen: 'capability', phase: 'define', label: 'Capability Architecture', opens: 'proficiency' },
  { screen: 'learning', phase: 'design', label: 'Learning Modes', opens: 'capability' },
  { screen: 'assess', phase: 'assess', label: 'Assessment Modes', opens: 'learning' },
  { screen: 'evidence', phase: 'assess', label: 'Readiness Evidence', opens: 'assess' },
  { screen: 'upload', phase: 'design', label: 'Upload Transactions', opens: 'assessConfirmed' },
  { screen: 'classify', phase: 'design', label: 'Content Type and Proficiency', opens: 'upload' },
  { screen: 'map', phase: 'design', label: 'Map Personas', opens: 'classified' },
  { screen: 'paths', phase: 'design', label: 'Learning Paths', opens: 'mapped' },
  { screen: 'handoff', phase: 'design', label: 'Design Document Hand-off', opens: 'reviewed' }
];

export function canOpen(init, screen) {
  const step = FLOW.find(f => f.screen === screen);
  if (!step || !step.opens) return true;
  return !!gates(init)[step.opens];
}

// The first screen whose work is not finished.
export function nextScreen(init) {
  const g = gates(init);
  const order = [['needs', 'needs'], ['personas', 'personas'], ['proficiency', 'proficiency'], ['capability', 'capability'], ['learning', 'learning'], ['assess', 'assess'], ['evidence', 'assessConfirmed'], ['upload', 'upload'], ['classify', 'classified'], ['map', 'mapped'], ['paths', 'reviewed'], ['handoff', 'handoff']];
  for (const [screen, gate] of order) if (!g[gate]) return screen;
  return 'handoff';
}

const COUNTED = ['needs', 'personas', 'proficiency', 'capability', 'learning', 'assess', 'assessConfirmed', 'upload', 'classified', 'mapped', 'generated', 'reviewed', 'handoff'];

export function summary(init, now = Date.now()) {
  const g = gates(init);
  const done = COUNTED.filter(k => g[k]).length;
  // Deploy and Measure are part of the cycle but locked, so a finished hand-off reads 13 of 15.
  const pct = Math.round(done / (COUNTED.length + 2) * 100);
  const screen = nextScreen(init);
  const phase = g.handoff ? 'handoff' : (FLOW.find(f => f.screen === screen) || {}).phase || 'define';
  const due = Date.parse(init.due || '');
  return {
    pct, done: g.handoff, gates: g, screen,
    stage: g.handoff ? 'Hand-off' : ({ define: 'Define', design: 'Design', assess: 'Assess', handoff: 'Hand-off' })[phase],
    status: g.handoff ? 'Ready for hand-off' : 'In Progress',
    nextAction: (FLOW.find(f => f.screen === screen) || {}).label || '',
    atRisk: !g.handoff && !isNaN(due) && due < now - 864e5
  };
}

// Phase states for the five-phase stepper.
export function phaseStates(init) {
  const g = gates(init);
  const designOpen = g.capability, assessOpen = g.learning;
  return {
    define: g.capability ? 'done' : 'active',
    // Design covers learning modes and, after Assess, learning paths.
    design: g.reviewed ? 'done' : (designOpen ? 'active' : 'locked'),
    assess: g.assessConfirmed ? 'done' : (assessOpen ? 'active' : 'locked'),
    deploy: 'locked', measure: 'locked'
  };
}
