// App frame: sidebar, top bar, the five-phase stepper and each phase's step bar.
import { esc, icon, each, when } from '../dom.js';
import { PHASES } from '../../rules/framework.js';
import { FLOW, gates, canOpen, phaseStates, summary } from '../../engine/initiative.js';

const NAV = [
  { id: 'dash', label: 'Home', icon: 'home' },
  { id: 'ongoing', label: 'Ongoing Initiatives', icon: 'clock' },
  { id: 'done', label: 'Completed Initiatives', icon: 'check' }
];

export const TITLES = {
  dash: 'Home', ongoing: 'Ongoing Initiatives', done: 'Completed Initiatives', repo: 'Persona Profile',
  needs: 'Business Needs', personas: 'Persona Selection', proficiency: 'Proficiency Level', capability: 'Capability Architecture',
  pathedit: 'Edit Learning Path',
  learning: 'Learning Modes', assess: 'Assessment Modes', evidence: 'Readiness Evidence',
  upload: 'Upload Transactions', classify: 'Content Type and Proficiency', map: 'Map Personas to Transactions', paths: 'Learning Paths',
  handoff: 'Design Document Hand-off'
};

export function sidebar(s) {
  return `<aside class="side" aria-label="Main navigation">
    <div class="brand">
      <button class="brand-name" data-act="go" data-screen="dash" title="Go to Home"><b>CDP</b> Learning Accelerator<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="#66BEFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:-2px;margin-left:8px" aria-hidden="true"><path d="M3 17.5 8.5 11l4 3.2L21 4.5"></path><path d="M15.5 4.5H21v5.5"></path></svg></button>
      <p class="tagline">The learning design tool that turns every CDP initiative into a ready, capable workforce</p>
    </div>
    <nav class="nav">${each(NAV, n => `<button data-act="go" data-screen="${n.id}" ${s.screen === n.id ? 'aria-current="page"' : ''}>${icon(n.icon, 18)}<span>${n.label}</span></button>`)}</nav>
    ${when(s.saveError, `<p class="storage-note"><span style="color:var(--quantum-pale)">${esc(s.saveError)}</span></p>`)}
  </aside>`;
}

export function mobileNav(s) {
  return `<nav class="mobile-nav" aria-label="Main navigation">${each(NAV, n => `<button data-act="go" data-screen="${n.id}" ${s.screen === n.id ? 'aria-current="page"' : ''}>${n.label}</button>`)}</nav>`;
}

export function topbar(s, init) {
  const flow = FLOW.some(f => f.screen === s.screen) || s.screen === 'pathedit';
  const crumb = flow && init ? `${esc(init.needs.name || 'New initiative')} · ${esc(phaseOf(s.screen === 'pathedit' ? 'paths' : s.screen))} · ${esc(TITLES[s.screen] || '')}` : (s.screen === 'dash' ? 'CDP Learning Accelerator · Home' : 'Initiatives');
  return `<header class="topbar">
    <div class="topbar-left">
      ${when(s.screen !== 'dash', `<button class="btn ghost small" data-act="back" aria-label="Back to the previous page">${icon('back', 15)}<span>Back</span></button>`)}
      <div><div class="crumb">${crumb}</div><h1 class="page-title">${esc(flow ? 'New Initiative' : (TITLES[s.screen] || ''))}</h1></div>
    </div>
    <div class="row">
      ${when(flow && init, () => `<span class="progress-chip">Framework progress <b class="tabular">${summary(init).pct}%</b></span>`)}
      <div class="avatar" aria-label="Signed in as KE">KE</div>
    </div>
  </header>`;
}

const phaseOf = screen => {
  const f = FLOW.find(x => x.screen === screen);
  if (!f) return '';
  return PHASES.find(p => p.key === f.phase).label;
};

// The five phases, connected; done phases are green.
export function phaseStepper(init, current, { embedded = false } = {}) {
  const st = init ? phaseStates(init) : { define: 'active', design: 'locked', assess: 'locked', deploy: 'locked', measure: 'locked' };
  const statusText = { done: 'Complete', active: 'In progress', locked: 'Not started' };
  const outputs = { define: 'Capability Architecture', design: 'Learning Modes, then Learning Paths and Design Document', assess: 'Assessment Modes', deploy: 'Deployment Plan', measure: 'Effectiveness Tracking Plan' };
  return `<div class="phases ${embedded ? 'embedded' : ''}" role="list" aria-label="CDP Learning Framework phases">${each(PHASES, (p, i) => {
    const state = st[p.key];
    const prev = i > 0 ? st[PHASES[i - 1].key] : null;
    const line = x => (x === 'done' ? 'var(--done)' : 'rgba(255,255,255,.16)');
    const cur = current === p.key;
    const label = `${p.label}: ${p.locked ? 'locked until its content is supplied' : statusText[state]}. Go to this phase.`;
    return `<button type="button" class="phase ${state} ${cur ? 'current' : ''}" role="listitem" data-act="go-phase" data-phase="${p.key}" title="${esc(label)}" aria-label="${esc(label)}" ${cur ? 'aria-current="step"' : ''}>
      ${when(i > 0, `<span class="track l" style="background:${line(prev)}"></span>`)}
      ${when(i < 4, `<span class="track r" style="background:${line(state)}"></span>`)}
      <span class="dot">${state === 'done' ? '✓' : p.n}</span>
      <span class="pl">${p.label}</span>
      <span class="po">${esc(outputs[p.key])}</span>
      <span class="ps" style="color:${state === 'done' ? 'var(--done)' : (cur || state === 'active' ? 'var(--blue-pale)' : 'var(--faint)')}">${p.locked ? 'Not Started' : statusText[state]}</span>
    </button>`;
  })}</div>`;
}

const PHASE_STEPS = {
  define: ['needs', 'personas', 'proficiency', 'capability'],
  design: ['learning', 'upload', 'classify', 'map', 'paths', 'handoff'],
  assess: ['assess', 'evidence']
};
const STEP_GATE = { needs: 'needs', personas: 'personas', proficiency: 'proficiency', capability: 'capability', learning: 'learning', assess: 'assess', evidence: 'assessConfirmed', upload: 'upload', classify: 'classified', map: 'mapped', paths: 'reviewed', handoff: 'handoff' };
const SHORT = { needs: 'Business Needs', personas: 'Persona Selection', proficiency: 'Proficiency Level', capability: 'Capability Architecture', learning: 'Learning Modes', upload: 'Upload Transactions', classify: 'Classify', map: 'Map Personas', paths: 'Generate and Review Paths', handoff: 'Design Document Hand-off', assess: 'Assessment Modes', evidence: 'Readiness Evidence', handoff: 'Design Document Hand-off' };

export function stepBar(init, screen) {
  const f = FLOW.find(x => x.screen === screen);
  if (!f) return '';
  const phase = f.phase;
  const g = gates(init);
  return `<div class="steps" aria-label="Steps in this phase">${each(PHASE_STEPS[phase], (k, i) => {
    const done = g[STEP_GATE[k]];
    const open = canOpen(init, k);
    return `<button class="step ${done ? 'done' : ''}" data-act="go" data-screen="${k}" ${k === screen ? 'aria-current="step"' : ''} ${open ? '' : 'disabled'}>
      <span class="n">${done ? '✓' : '•'}</span>${esc(SHORT[k])}</button>`;
  })}</div>`;
}

export function flowHeader(init, screen) {
  const f = FLOW.find(x => x.screen === screen);
  return `${phaseStepper(init, f && f.phase)}${stepBar(init, screen)}`;
}
