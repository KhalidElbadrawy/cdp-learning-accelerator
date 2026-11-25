// Design: Learning Modes. Assess: Assessment Modes and Readiness Evidence.
// A persona sees its own level's panel; lower levels are pre-selected behind a note, higher levels
// behind a toggle. Only picks above the persona's level are flagged.
import { esc, icon, each, when, levelChip, plural } from '../dom.js';
import { LEVELS, MODE_GROUPS, ASSESS_GROUPS, ASSESS_DEFAULT } from '../../rules/framework.js';
import { gates, profiledPersonas, modesOf, assessOf } from '../../engine/initiative.js';
import { modeDeviations, assessDeviations, assessComplete, NON_COMPLIANT, ASSESS_MAX_ADVISED } from '../../engine/modes.js';
import { flowHeader } from './shell.js';

const ASSESS_SHOW = 5;

function panel(level, items, { persona, prof, kind, open }) {
  const above = LEVELS.indexOf(level) > LEVELS.indexOf(prof);
  return `<div class="mode-panel ${above ? 'above' : ''}">
    <div class="ph"><div class="row between"><b style="font-size:13px;font-weight:500">${level}</b>${when(above, '<span class="chip warn" style="padding:2px 8px;font-size:10.5px">Above required level</span>')}</div>
      <span class="tiny">${esc(kind === 'mode' ? (MODE_GROUPS.find(g => g.level === level) || {}).note : `${items.filter(i => i.on).length} selected · advised up to ${ASSESS_MAX_ADVISED}`)}</span></div>
    <div class="pb">${each(items, it => `<label class="opt ${it.on ? 'on' : ''}">
      <input type="checkbox" class="check" ${it.on ? 'checked' : ''} data-chg="${kind === 'mode' ? 'toggle-mode' : 'toggle-assess'}" data-persona="${esc(persona)}" data-value="${esc(it.value)}">
      <span style="flex:1;min-width:0">${esc(it.label)}${when(it.meta, `<span class="meta">${esc(it.meta)}</span>`)}</span>
      ${when(it.flag, `<span class="flag" title="${esc(NON_COMPLIANT)}">${icon('alert', 13)} Not compliant</span>`)}
    </label>`)}
    ${when(open, open)}</div>
  </div>`;
}

export function learningView(s, init) {
  const people = profiledPersonas(init), g = gates(init);
  return `${flowHeader(init, 'learning')}
  <section class="card">
    <div class="stack" style="gap:6px"><h2 class="h2">Assign Learning Modes</h2>
      <p class="lead">The learning mode inventory by proficiency governs how each persona will learn its system transactions. Each level includes the modes of the levels below it, which are pre-selected. Unticking a suggested mode is fine; picking a mode above the persona's level is flagged "${NON_COMPLIANT}".</p></div>
    ${each(people, p => {
      const list = modesOf(init, p.persona, p.prof), devs = modeDeviations(p.prof, list);
      const top = LEVELS.indexOf(p.prof);
      const showLower = s.ui['lower:' + p.persona], showAbove = s.ui['above:' + p.persona];
      const groupItems = gr => gr.modes.map(([m]) => ({ value: m, label: m, on: list.includes(m), flag: devs.some(d => d.mode === m) }));
      const lowerCount = MODE_GROUPS.slice(0, top).reduce((a, gr) => a + gr.modes.filter(([m]) => list.includes(m)).length, 0);
      const visible = MODE_GROUPS.filter((gr, gi) => gi === top || (gi < top && showLower) || (gi > top && showAbove));
      return `<div class="card tight" style="background:rgba(255,255,255,.03);${devs.length ? 'border-color:rgba(233,67,233,.5)' : ''}">
        <div class="row between"><div class="row"><b style="font-size:15px;font-weight:500">${esc(p.title)}</b>${levelChip(p.prof, 'Required: ')}</div><span class="small">${plural(list.length, 'mode')} selected</span></div>
        ${when(top > 0, `<div class="notice" style="padding:10px 14px">${icon('info', 16, '#66BEFF')}<span>This persona is set at ${p.prof} proficiency. Modes covering lower levels are pre-selected for you (${lowerCount} selected). Choose the ${p.prof} modes to add.
          <button class="link" style="padding:0 0 0 6px" data-act="ui-toggle" data-key="lower:${esc(p.persona)}">${showLower ? 'Hide' : 'Review'} lower-level modes</button></span></div>`)}
        <div class="mode-grid">${each(visible, gr => panel(gr.level, groupItems(gr), { persona: p.persona, prof: p.prof, kind: 'mode' }))}</div>
        ${when(top < 2, `<button class="link" style="align-self:flex-start" data-act="ui-toggle" data-key="above:${esc(p.persona)}">${showAbove ? 'Hide' : 'Show'} higher-level modes</button>`)}
        ${when(devs.length, `<div class="notice warn" role="alert">${icon('alert', 16, '#F5A3F5')}<span><b>${NON_COMPLIANT}</b><br>${each(devs, d => `${esc(d.text)} `)}Flagged in the Design Document.</span></div>`)}
      </div>`;
    })}
    <hr class="divider">
    <div class="row between">
      <span class="small">${g.learning ? 'Every persona has learning modes.' : 'Each persona needs at least one learning mode.'}</span>
      <button class="btn" data-act="go-next" data-screen="assess" ${g.learning ? '' : 'disabled'}>Continue to Assess ${icon('arrow', 15)}</button>
    </div>
  </section>`;
}

export function assessView(s, init) {
  const people = profiledPersonas(init), g = gates(init);
  return `${flowHeader(init, 'assess')}
  <section class="card">
    <div class="stack" style="gap:6px"><h2 class="h2">Select Assessment Modes</h2>
      <p class="lead">The assessment mode inventory by proficiency governs how each persona's readiness and proficiency are assessed. Each level the persona covers needs at least one mode; up to ${ASSESS_MAX_ADVISED} per level is advised. The evidence and source follow from the Assessment Standards by Proficiency.</p></div>
    ${each(people, p => {
      const keys = assessOf(init, p.persona, p.prof), devs = assessDeviations(p.prof, keys);
      const top = LEVELS.indexOf(p.prof);
      const showLower = s.ui['alower:' + p.persona], showAbove = s.ui['aabove:' + p.persona];
      const visible = ASSESS_GROUPS.filter((gr, gi) => gi === top || (gi < top && showLower) || (gi > top && showAbove));
      const complete = assessComplete(p.prof, keys);
      return `<div class="card tight" style="background:rgba(255,255,255,.03);${devs.length ? 'border-color:rgba(233,67,233,.5)' : ''}">
        <div class="row between"><div class="row"><b style="font-size:15px;font-weight:500">${esc(p.title)}</b>${levelChip(p.prof, 'Required: ')}</div>
          <span class="small" style="${complete ? '' : 'color:var(--quantum-pale)'}">${complete ? plural(keys.length, 'assessment mode') + ' selected' : 'Pick at least one mode for each level'}</span></div>
        ${when(top > 0, `<div class="notice" style="padding:10px 14px">${icon('info', 16, '#66BEFF')}<span>This persona is set at ${p.prof} proficiency. Suggested modes for lower levels are pre-selected (${keys.filter(k => LEVELS.indexOf(k.split('|')[0]) < top).length} selected). Choose the ${p.prof} modes to add.
          <button class="link" style="padding:0 0 0 6px" data-act="ui-toggle" data-key="alower:${esc(p.persona)}">${showLower ? 'Hide' : 'Review'} lower-level modes</button></span></div>`)}
        <div class="mode-grid">${each(visible, gr => {
          const moreKey = `amore:${p.persona}:${gr.level}`;
          const suggested = ASSESS_DEFAULT[gr.level] || [];
          const ordered = [...gr.modes].sort((a, b) => (suggested.includes(b[0]) - suggested.includes(a[0])));
          const shown = s.ui[moreKey] ? ordered : ordered.filter((m, i) => i < ASSESS_SHOW || keys.includes(`${gr.level}|${m[0]}`));
          const items = shown.map(([m, ev, src]) => ({ value: `${gr.level}|${m}`, label: m, meta: `${ev} · ${src}`, on: keys.includes(`${gr.level}|${m}`), flag: devs.some(d => d.key === `${gr.level}|${m}`) }));
          const more = ordered.length - shown.length;
          const count = keys.filter(k => k.startsWith(gr.level + '|')).length;
          const open = `${when(more > 0 || s.ui[moreKey], `<button class="link" style="align-self:flex-start;font-size:12px" data-act="ui-toggle" data-key="${esc(moreKey)}">${s.ui[moreKey] ? 'Show fewer' : `Browse ${more} more assessment modes`}</button>`)}
            ${when(count > ASSESS_MAX_ADVISED, `<span class="tiny" style="color:var(--quantum-pale)">It is advised to limit your selection to ${ASSESS_MAX_ADVISED}.</span>`)}`;
          return panel(gr.level, items, { persona: p.persona, prof: p.prof, kind: 'assess', open });
        })}</div>
        ${when(top < 2, `<button class="link" style="align-self:flex-start" data-act="ui-toggle" data-key="aabove:${esc(p.persona)}">${showAbove ? 'Hide' : 'Show'} higher-level modes</button>`)}
        ${when(devs.length, `<div class="notice warn" role="alert">${icon('alert', 16, '#F5A3F5')}<span><b>${NON_COMPLIANT}</b><br>${each(devs, d => `${esc(d.text)} `)}Flagged in the Design Document.</span></div>`)}
      </div>`;
    })}
    <hr class="divider">
    <div class="row between">
      <span class="small">${g.assess ? 'Every persona has assessment modes for each of its levels.' : 'Some personas still need an assessment mode for a level.'}</span>
      <button class="btn" data-act="go-next" data-screen="evidence" ${g.assess ? '' : 'disabled'}>Review readiness evidence ${icon('arrow', 15)}</button>
    </div>
  </section>`;
}

export function evidenceView(s, init) {
  const people = profiledPersonas(init), g = gates(init);
  return `${flowHeader(init, 'evidence')}
  <section class="card">
    <div class="card-head">
      <div class="stack" style="gap:6px"><span class="eyebrow">Assess phase output</span><h2 class="h2">Assessment Modes and Readiness Evidence</h2>
        <p class="lead">The evidence to look for per persona and where it comes from. These measures feed the Effectiveness Tracking Plan in the Measure phase. Confirming them sends you back to Design to create the learning paths.</p></div>
      ${g.assessConfirmed ? '<span class="chip done">Confirmed</span>' : '<span class="chip soft">Ready to confirm</span>'}
    </div>
    ${each(people, p => {
      const keys = assessOf(init, p.persona, p.prof);
      return `<div class="stack" style="gap:8px"><div class="row"><b style="font-weight:500">${esc(p.title)}</b>${levelChip(p.prof)}</div>
        <div class="table-wrap"><table class="data" style="min-width:640px"><thead><tr><th>Assessment mode</th><th>Level</th><th>Readiness evidence</th><th>Evidence source</th></tr></thead>
        <tbody>${each(keys.map(k => k.split('|')).sort((a, b) => LEVELS.indexOf(a[0]) - LEVELS.indexOf(b[0])), ([l, m]) => {
          const row = (ASSESS_GROUPS.find(gr => gr.level === l) || { modes: [] }).modes.find(x => x[0] === m) || [m, '', ''];
          return `<tr><td>${esc(m)}</td><td>${levelChip(l)}</td><td>${esc(row[1])}</td><td>${esc(row[2])}</td></tr>`;
        })}</tbody></table></div></div>`;
    })}
    <hr class="divider">
    <div class="row between">
      <button class="btn ghost" data-act="go" data-screen="assess">Back to assessment modes</button>
      <button class="btn" data-act="confirm-assess">${g.assessConfirmed ? 'Continue to Learning Paths' : 'Confirm and create learning paths'} ${icon('arrow', 15)}</button>
    </div>
  </section>`;
}
