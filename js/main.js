// Entry point: picks the screen view, renders it, and routes DOM events to the actions.
import { state, subscribe, active, render } from './ui/store.js';
import { boot } from './ui/store.js';
import { clicks, changes, inputs, handleUpload } from './ui/actions.js';
import { createRepository } from './services/storage.js';
import { sidebar, mobileNav, topbar } from './ui/views/shell.js';
import { homeView, listView } from './ui/views/home.js';
import { needsView, personasView, proficiencyView, capabilityView, repoView } from './ui/views/define.js';
import { learningView, assessView, evidenceView } from './ui/views/modes.js';
import { uploadView, classifyView, mapView, pathsView, pathEditView } from './ui/views/paths.js';
import { handoffView } from './ui/views/handoff.js';
import { canOpen } from './engine/initiative.js';
import { esc } from './ui/dom.js';
import { wireJourneys } from './ui/journey.js';
import { playHeroIntro, HERO_INTRO_MS } from './ui/heroIntro.js';
import { askPanel, fabMarkup } from './ui/views/rafiq.js';
import { rafiqAvailable } from './services/rafiq.js';

const VIEWS = {
  dash: homeView, ongoing: listView, done: listView, repo: repoView,
  needs: needsView, personas: personasView, proficiency: proficiencyView, capability: capabilityView,
  learning: learningView, assess: assessView, evidence: evidenceView,
  upload: uploadView, classify: classifyView, map: mapView, paths: pathsView, pathedit: pathEditView, handoff: handoffView
};
const FLOW_SCREENS = ['needs', 'personas', 'proficiency', 'capability', 'learning', 'assess', 'evidence', 'upload', 'classify', 'map', 'paths', 'pathedit', 'handoff'];

const root = document.getElementById('app');
let shownScreen = null, enteredAt = 0;

function view(s) {
  const init = active();
  let screen = s.screen;
  // A flow screen needs an open initiative whose earlier steps are done.
  if (FLOW_SCREENS.includes(screen) && (!init || !canOpen(init, screen))) screen = 'dash';
  const fn = VIEWS[screen] || homeView;
  try { return fn({ ...s, screen }, init); }
  catch (e) {
    console.error(e);
    return `<div class="notice warn" role="alert">This page could not be shown (${esc(e.message)}). Go back to Home and try again.</div>`;
  }
}

function paint(s) {
  if (!s.ready) { root.innerHTML = `<div class="empty" style="min-height:60vh;justify-content:center"><span class="spinner"></span><span class="small">Loading your initiatives…</span></div>`; return; }
  // Keep focus and caret position across re-renders.
  const entering = s.screen !== shownScreen;
  shownScreen = s.screen;
  if (entering) enteredAt = performance.now();
  const a = document.activeElement, focusId = a && a.id, sel = focusId && 'selectionStart' in a ? [a.selectionStart, a.selectionEnd] : null;
  const scrollers = [...root.querySelectorAll('.table-wrap, .paper-wrap, .journey')].map(x => x.scrollTop + ':' + x.scrollLeft);
  root.innerHTML = `<div class="app">${sidebar(s)}<div class="main-col">${mobileNav(s)}${topbar(s, active())}<main id="main" class="${entering ? 'enter' : ''}">${view(s)}</main></div></div>
    ${askPanel(s)}
    ${s.toast ? `<div class="toast" role="status">${esc(s.toast)}</div>` : ''}`;
  [...root.querySelectorAll('.table-wrap, .paper-wrap, .journey')].forEach((x, i) => { const v = scrollers[i]; if (v) { const [t, l] = v.split(':'); x.scrollTop = +t; x.scrollLeft = +l; } });
  wireJourneys(root);
  const sinceEnter = performance.now() - enteredAt;
  if (s.screen === 'dash' && sinceEnter < HERO_INTRO_MS) playHeroIntro(root, sinceEnter);
  syncFab(s);
  const log = document.getElementById('rafiq-log');
  if (log) log.scrollTop = log.scrollHeight;
  if (focusId) {
    const el = document.getElementById(focusId);
    if (el) { el.focus({ preventScroll: true }); if (sel && el.setSelectionRange) { try { el.setSelectionRange(sel[0], sel[1]); } catch (e) { /* number and date inputs */ } } }
  }
}

// "Ask Rafeeq" lives outside #app so redraws never restart its entrance animation.
let fab = null, fabShown = false;
function syncFab(s) {
  const show = !!(s.rafiq && s.rafiq.on && !s.rafiq.open);
  if (!fab && show) {
    fab = document.createElement('button');
    fab.className = 'rafiq-fab';
    fab.dataset.act = 'rafiq-open';
    fab.setAttribute('aria-label', 'Ask Rafeeq');
    fab.innerHTML = fabMarkup();
    fab.addEventListener('click', () => clicks['rafiq-open']());
    document.body.appendChild(fab);
  }
  if (!fab) return;
  if (show && !fabShown) { fab.hidden = false; fab.classList.remove('play'); void fab.offsetWidth; fab.classList.add('play'); }
  if (!show) fab.hidden = true;
  fabShown = show;
}

subscribe(paint);

root.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const fn = clicks[el.dataset.act];
  if (!fn) return;
  if (el.tagName === 'BUTTON') e.preventDefault();
  fn(el, e);
});
root.addEventListener('change', e => {
  const el = e.target.closest('[data-chg]');
  if (el && changes[el.dataset.chg]) changes[el.dataset.chg](el, e);
});
root.addEventListener('input', e => {
  const el = e.target.closest('[data-inp]');
  if (el && inputs[el.dataset.inp]) inputs[el.dataset.inp](el, e);
});
// Drag and drop onto the upload zone.
root.addEventListener('dragover', e => { const d = e.target.closest('#drop'); if (d) { e.preventDefault(); d.classList.add('over'); } });
root.addEventListener('dragleave', e => { const d = e.target.closest('#drop'); if (d) d.classList.remove('over'); });
root.addEventListener('drop', e => {
  const d = e.target.closest('#drop');
  if (!d) return;
  e.preventDefault();
  const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
  if (f) handleUpload(f);
});

// Enter sends a message to Rafeeq (Shift+Enter adds a line).
root.addEventListener('keydown', e => {
  if (e.target.id === 'rafiq-input' && e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); clicks['rafiq-send'](); }
});

render();
// Rafeeq appears only where Claude can be reached (not in a downloaded copy).
rafiqAvailable().then(on => { if (on) { state.rafiq = { ...state.rafiq, on: true }; render(); } });
createRepository().then(boot).catch(() => { state.ready = true; render(); });
