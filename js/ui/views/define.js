// Define phase: Business Needs (with go-live date), Persona Selection, Proficiency Level,
// Capability Architecture, and the Persona Repository profile page.
import { esc, icon, each, when, initials, levelChip, plural } from '../dom.js';
import { PERSONAS, PROFILES } from '../../rules/personas.js';
import { DOMAINS, LEVEL_QUESTIONS } from '../../rules/framework.js';
import { gates, personaTitle, processList } from '../../engine/initiative.js';
import { flowHeader } from './shell.js';
import { rafiqCard, renderNeeds, renderPersonas, renderProficiency } from './rafiq.js';

export function needsView(s, init) {
  const n = init.needs, g = gates(init);
  const field = (id, label, hint, value, area) => `<div class="field">
    <label for="${id}">${label}</label>
    ${area ? `<textarea class="textarea" id="${id}" rows="3" data-inp="need" data-key="${id.replace('need-', '')}" placeholder="${esc(hint)}">${esc(value)}</textarea>`
      : `<input class="input" id="${id}" data-inp="need" data-key="${id.replace('need-', '')}" value="${esc(value)}" placeholder="${esc(hint)}">`}
  </div>`;
  return `${flowHeader(init, 'needs')}
  <section class="card">
    <div class="stack" style="gap:6px"><h2 class="h2">Business Needs</h2>
      <p class="lead">Capture what the platform is, what it must change and when it goes live. These inputs feed every later phase, and the go-live date anchors each learning path's timeline.</p></div>
    <div class="grid-auto" style="grid-template-columns:repeat(auto-fit,minmax(280px,1fr))">
      ${field('need-name', 'Platform name', 'For example, Website Hub', n.name)}
      <div class="field"><label for="need-goLive">Go-live date</label>
        <div class="date-pick">
          <input class="input" type="date" id="need-goLive" data-inp="need" data-key="goLive" data-act="open-calendar" min="${new Date().toISOString().slice(0, 10)}" value="${esc(n.goLive)}">
          <button type="button" class="date-btn" data-act="open-calendar" data-target="need-goLive" aria-label="Open calendar">${icon('calendar', 18)}</button>
        </div>
        <span class="tiny">${n.goLive ? 'Click the field to pick a different date.' : 'Click the field to pick a date from the calendar.'}</span></div>
    </div>
    ${listField('outcome', 'Business outcome(s)', 'Outcome', 'A change in entity performance this platform must deliver', 'Another business outcome', n.outcome)}
    ${listField('processes', 'Critical process(es)', 'Process', 'An end-to-end process the platform supports, for example Content request and approval', 'Another end-to-end process', n.processes)}
    ${(() => rafiqCard(s, 'needs', { heading: 'Sharpen the business needs', intro: 'Rafeeq can make each outcome measurable and suggest critical processes you may have missed.', cta: 'Suggest with Rafeeq', render: renderNeeds('needs'), isEmpty: d => !d.outcomes.length && !d.processes.length }))()}
    <hr class="divider">
    <div class="row between">
      <span class="small">${g.needs ? 'All four inputs are complete.' : 'All four inputs are required before Persona Selection opens.'}</span>
      <button class="btn" data-act="save-needs" ${g.needs ? '' : 'disabled'}>Save and continue ${icon('arrow', 15)}</button>
    </div>
  </section>`;
}

// Numbered list field (business outcomes, critical processes): one entry to start, add as many as needed.
// Stored as one string with one entry per line.
function listField(key, label, noun, firstHint, moreHint, value) {
  const rows = String(value || '').split('\n');
  return `<div class="field"><span class="label" id="${key}-label">${label}</span>
    <div class="stack" style="gap:8px" role="list" aria-labelledby="${key}-label">${each(rows, (p, i) => `<div class="proc-row" role="listitem">
      <span class="proc-n" aria-hidden="true">${i + 1}</span>
      <input class="input" id="need-${key}-${i}" data-inp="list" data-key="${key}" data-idx="${i}" value="${esc(p)}" placeholder="${esc(i ? moreHint : firstHint)}" aria-label="${esc(noun)} ${i + 1}">
      ${when(rows.length > 1, `<button type="button" class="btn small ghost" data-act="list-remove" data-key="${key}" data-idx="${i}" aria-label="Remove ${esc(noun.toLowerCase())} ${i + 1}">${icon('trash', 14)}</button>`)}
    </div>`)}</div>
    <button type="button" class="link" style="align-self:flex-start" data-act="list-add" data-key="${key}">+ Add another ${esc(noun.toLowerCase())}</button></div>`;
}

export function personasView(s, init) {
  const selected = init.rows.map(r => r.persona);
  return `${flowHeader(init, 'personas')}
  <section class="card">
    <div class="card-head">
      <div class="stack" style="gap:6px"><h2 class="h2">Persona Selection</h2>
        <p class="lead">Select every persona group this platform affects. Open a profile from the Persona Repository to review it before confirming.</p></div>
      <button class="btn ghost small" data-act="select-all">${selected.length === PERSONAS.length ? 'Clear selection' : 'Select all'}</button>
    </div>
    <div class="grid-auto">${each(PERSONAS, p => {
      const pr = PROFILES[p], on = selected.includes(p);
      return `<div class="pcard ${on ? 'on' : ''}">
        <label><input type="checkbox" class="check" data-chg="toggle-persona" data-persona="${esc(p)}" ${on ? 'checked' : ''} aria-label="Select ${esc(pr.title)}">
          <span class="initials">${initials(pr.title)}</span>
          <span class="stack" style="gap:2px"><b style="font-size:14.5px;font-weight:500">${esc(pr.title)}</b><span class="tiny">${esc(pr.archetype || '')}</span></span></label>
        <p class="small" style="flex:1">${esc(pr.summary)}</p>
        <button class="btn ghost small" style="align-self:flex-start" data-act="open-repo" data-persona="${esc(p)}">View persona profile ${icon('arrow', 13)}</button>
      </div>`;
    })}</div>
    ${rafiqCard(s, 'personas', { heading: 'Which personas does this platform affect?', intro: 'Rafeeq reads the platform name, outcomes and processes and suggests the personas to select.', cta: 'Suggest personas', render: renderPersonas('personas'), isEmpty: d => !d.personas.length })}
    <hr class="divider">
    <div class="row between">
      <span class="small">${selected.length ? `${selected.length} of ${PERSONAS.length} personas selected` : 'No personas selected'}</span>
      <button class="btn" data-act="go-next" data-screen="proficiency" ${selected.length ? '' : 'disabled'}>Confirm Persona Selection ${icon('arrow', 15)}</button>
    </div>
  </section>`;
}

export function proficiencyView(s, init) {
  if (!init.rows.length) return `${flowHeader(init, 'proficiency')}<section class="card"><p>Select personas first.</p></section>`;
  const idx = Math.min(s.ui.profActive || 0, init.rows.length - 1);
  const row = init.rows[idx];
  const remaining = init.rows.findIndex((r, i) => i !== idx && !r.prof);
  const allDone = init.rows.every(r => r.prof);
  return `${flowHeader(init, 'proficiency')}
  <section class="card">
    <div class="stack" style="gap:6px"><h2 class="h2">Proficiency Level</h2>
      <p class="lead">Answer three questions for each capability domain. The first "No" sets the domain's level; all "Yes" gives Advanced. The persona's overall level is its highest domain level, and it governs its learning and assessment modes.</p></div>
    <div class="notice">${icon('info', 18, '#66BEFF')}<span>All four capability domains apply to every selected persona: Platform usage, Role knowledge, End-to-end process knowledge and Supporting others.</span></div>
    <div class="tabs" role="tablist">${each(init.rows, (r, i) => `<button class="tab" role="tab" aria-selected="${i === idx}" data-act="ui" data-key="profActive" data-val="${i}" data-num="1">
      ${r.prof ? '<span class="tick">✓</span>' : ''}${esc(personaTitle(r.persona))}${r.prof ? ` · ${r.prof}` : ''}</button>`)}</div>
    <div class="row between">
      <div class="row"><span class="initials sm">${initials(personaTitle(row.persona))}</span><b style="font-size:16px;font-weight:500">${esc(personaTitle(row.persona))}</b>${row.prof ? levelChip(row.prof, 'Overall: ') : '<span class="chip soft">In progress</span>'}</div>
      <div class="row">${(() => {
        const def = PROFILES[row.persona]?.prof;
        if (!def) return '';
        const atDefault = DOMAINS.every(d => row.levels[d.key] === def);
        return atDefault ? `<span class="chip soft">Default level: ${esc(def)}</span>`
          : `<button class="btn small ghost" data-act="prof-default" data-idx="${idx}" title="Answer every domain to match this persona's default level">${icon('reset', 14)} Set to default proficiency level (${esc(def)})</button>`;
      })()}
        <button class="link" data-act="open-repo" data-persona="${esc(row.persona)}">View persona profile →</button></div>
    </div>
    ${rafiqCard(s, 'prof:' + row.persona, { heading: `Recommended levels for ${personaTitle(row.persona)}`, intro: 'Rafeeq recommends a level for each domain for this platform, with a reason, so you can compare it with your answers.', cta: 'Recommend levels', render: renderProficiency('prof:' + row.persona), isEmpty: d => !Object.keys(d.domains).length })}
    <div class="grid-auto" style="grid-template-columns:repeat(auto-fit,minmax(360px,1fr))">${each(DOMAINS, d => {
      const a = row.answers[d.key] || [];
      const level = row.levels[d.key];
      return `<div class="domain">
        <div class="row between"><b style="font-weight:500">${esc(d.name)}</b>${level ? levelChip(level) : '<span class="chip soft">Pending</span>'}</div>
        ${each(LEVEL_QUESTIONS, (q, qi) => {
          const reachable = qi === 0 || a.slice(0, qi).every(x => x === true);
          return `<div class="q ${reachable ? '' : 'off'}"><p>${esc(q)}</p>
            <span class="yn" role="group" aria-label="Answer for: ${esc(q)}">
              <button class="yes" aria-pressed="${a[qi] === true}" ${reachable ? '' : 'disabled'} data-act="answer" data-domain="${d.key}" data-q="${qi}" data-v="1">Yes</button>
              <button class="no" aria-pressed="${a[qi] === false}" ${reachable ? '' : 'disabled'} data-act="answer" data-domain="${d.key}" data-q="${qi}" data-v="0">No</button>
            </span></div>`;
        })}</div>`;
    })}</div>
    <hr class="divider">
    <div class="row between">
      <span class="small">${allDone ? 'Every persona has a proficiency level.' : `${plural(init.rows.filter(r => !r.prof).length, 'persona')} still to determine.`}</span>
      <div class="row">
        ${when(remaining > -1, `<button class="btn ghost" data-act="ui" data-key="profActive" data-val="${remaining}" data-num="1">Next persona ${icon('arrow', 14)}</button>`)}
        <button class="btn" data-act="go-next" data-screen="capability" ${allDone ? '' : 'disabled'}>Continue to Capability Architecture ${icon('arrow', 15)}</button>
      </div>
    </div>
  </section>`;
}

export function capabilityView(s, init) {
  const g = gates(init);
  return `${flowHeader(init, 'capability')}
  <section class="card">
    <div class="card-head">
      <div class="stack" style="gap:6px"><span class="eyebrow">Define phase output</span><h2 class="h2">Capability Architecture</h2>
        <p class="lead">The proficiency matrix for every selected persona across the four capability domains. Confirming it closes the Define phase and opens Design.</p></div>
      ${g.capability ? '<span class="chip done">Confirmed</span>' : `<span class="chip soft">${g.proficiency ? 'Ready to confirm' : 'In progress'}</span>`}
    </div>
    <div class="table-wrap"><table class="data" style="min-width:820px">
      <thead><tr><th>Persona</th>${each(DOMAINS, d => `<th>${esc(d.header)}</th>`)}<th>Overall</th></tr></thead>
      <tbody>${each(init.rows, r => `<tr><td><span class="row" style="flex-wrap:nowrap"><span class="initials sm">${initials(personaTitle(r.persona))}</span><b style="font-weight:500">${esc(personaTitle(r.persona))}</b></span></td>
        ${each(DOMAINS, d => `<td>${levelChip(r.levels[d.key])}</td>`)}<td>${levelChip(r.prof)}</td></tr>`)}</tbody></table></div>
    <p class="tiny">Overall = the persona's highest domain level. It sets the persona's learning and assessment modes.</p>
    <hr class="divider">
    <div class="row between">
      <button class="btn ghost" data-act="go" data-screen="proficiency">Back to proficiency level</button>
      <button class="btn" data-act="confirm-capability" ${g.proficiency ? '' : 'disabled'}>${g.capability ? 'Continue to Design' : 'Confirm Capability Architecture'} ${icon('arrow', 15)}</button>
    </div>
  </section>`;
}

export function repoView(s) {
  const key = PROFILES[s.ui.repoPersona] ? s.ui.repoPersona : PERSONAS[0];
  const p = PROFILES[key];
  const list = (title, items) => `<div class="card tight"><b style="font-weight:500">${esc(title)}</b><ul style="margin:0;padding-left:18px;display:flex;flex-direction:column;gap:5px" class="small">${each(items, x => `<li>${esc(x)}</li>`)}</ul></div>`;
  return `<section class="stack" style="gap:18px">
    <div class="card" style="background-image:radial-gradient(80% 140% at 100% 0%, rgba(0,149,255,.18), rgba(13,15,16,0) 70%)">
      <div class="row" style="gap:18px;align-items:flex-start">
        <span class="initials" style="width:72px;height:72px;font-size:22px">${initials(p.title)}</span>
        <div class="stack" style="gap:6px;flex:1;min-width:0">
          <span class="eyebrow">Persona Repository</span>
          <h2 style="font-size:26px">${esc(p.title)}</h2>
          <div class="row">${each(p.tags, t => `<span class="chip soft">${esc(t)}</span>`)}${levelChip(p.prof, 'Reference level: ')}</div>
          <p class="lead">${esc(p.definition || p.summary)}</p>
        </div>
      </div>
      <p class="small" style="font-style:italic">“${esc(p.quote)}”</p>
      <p class="tiny">Typical roles: ${esc(p.roles)}</p>
    </div>
    <div class="grid-auto">${each(p.frame, f => `<div class="card tight"><span class="tiny">${esc(f[0])}</span><b style="font-weight:500">${esc(f[1])}</b></div>`)}</div>
    <h3 class="h3">Capability domains</h3>
    <div class="grid-auto" style="grid-template-columns:repeat(auto-fit,minmax(300px,1fr))">${each(DOMAINS, d => list(d.name, (p.domains || {})[d.key] || []))}</div>
    <div class="grid-auto">${list('Drivers', p.drivers)}${list('Behaviours', p.behaviors)}${list('What they care about', p.cares)}${list('What success looks like', p.success)}</div>
    <div class="row"><button class="btn ghost" data-act="back">${icon('back', 15)} Back</button></div>
  </section>`;
}
