// Design: Create Learning Paths. Upload transactions → classify (content type and proficiency) →
// map personas → generate and review one path per persona.
import { esc, icon, each, when, levelChip, plural, lvlClass } from '../dom.js';
import { LEVELS } from '../../rules/framework.js';
import { CONTENT_TYPE_NAMES, MANUAL_REVIEW, TEMPLATE_COLUMNS, TIMELINE_WEEKS } from '../../rules/workbook.js';
import { gates, profiledPersonas, pathContext } from '../../engine/initiative.js';
import { txType, txLevel, txNeedsReview, rolesOf } from '../../engine/transactions.js';
import { isMapped, mappedVia, levelConflicts, mappingIssues, personaTransactions, mappingChanges } from '../../engine/mapping.js';
import { suggestMapping, pathInsights } from '../../engine/suggest.js';
import { generatePath, formatMinutes, weekStart, formatDate, itemTime } from '../../engine/paths.js';
import { MODES, modeDeviations } from '../../engine/modes.js';
import { flowHeader } from './shell.js';
import { rafiqCard, renderClassify, renderMapping, renderPath, rafiqMark, renderSyllabus } from './rafiq.js';
import { applyPolish, unitSpecs, lessonBase } from '../../engine/rafiq.js';

const confChip = c => ({ high: '<span class="chip done" style="padding:2px 8px">High</span>', medium: '<span class="chip info" style="padding:2px 8px">Medium</span>', low: '<span class="chip warn" style="padding:2px 8px">Low</span>', none: '<span class="chip warn" style="padding:2px 8px">None</span>' })[c] || '';

export function uploadView(s, init) {
  const tx = init.paths.transactions || [], rep = s.ui.uploadReport;
  return `${flowHeader(init, 'upload')}
  <section class="card">
    <div class="stack" style="gap:6px"><span class="eyebrow">Create learning paths · Step 1 of 4</span><h2 class="h2">Upload the system transactions or activities</h2>
      <p class="lead">Upload every system transaction or activity in one spreadsheet with four columns: ${TEMPLATE_COLUMNS.join(', ')}. The Transaction column can also be called Activity. Download the template and share it with the platform vendor to fill in.</p></div>
    <div class="row"><button class="btn ghost" data-act="download-template">${icon('download', 15)} Download the template</button><span class="tiny">Excel workbook with an example sheet and filling-in guide</span></div>
    <label class="drop" id="drop" for="tx-file">
      ${icon('upload', 26, '#66BEFF')}
      <b style="font-weight:500">${tx.length ? 'Upload an updated file' : 'Choose a file or drop it here'}</b>
      <span class="small">Excel (.xlsx) or CSV. The first sheet, or a sheet named "Transactions", is read.</span>
      <input type="file" id="tx-file" accept=".xlsx,.xls,.xlsm,.csv" data-chg="upload-file">
    </label>
    ${when(s.ui.uploading, `<div class="notice"><span class="spinner"></span><span>Reading the file…</span></div>`)}
    ${when(rep && rep.errors && rep.errors.length, () => `<div class="notice warn" role="alert">${icon('alert', 16, '#F5A3F5')}<span>${each(rep.errors, e => esc(e) + '<br>')}</span></div>`)}
    ${when(rep && rep.ok, () => `<div class="notice ok">${icon('check', 16, '#4EA72E')}<span><b>${plural(rep.count, 'transaction')} read from ${esc(rep.file)}.</b>${rep.kept ? ` ${rep.kept} kept their earlier content type, proficiency and mapping.` : ''}${each(rep.warnings, w => '<br>' + esc(w))}</span></div>`)}
    ${when(tx.length, () => `<div class="stack" style="gap:8px"><b style="font-weight:500">${plural(tx.length, 'transaction')} loaded</b>
      <div class="table-wrap"><table class="data" style="min-width:640px"><thead><tr>${each(TEMPLATE_COLUMNS, c => `<th>${c}</th>`)}</tr></thead>
      <tbody>${each(tx.slice(0, 8), t => `<tr><td>${esc(t.module)}</td><td>${esc(t.workflow)}</td><td>${esc(t.name)}</td><td>${esc(t.role)}</td></tr>`)}</tbody></table></div>
      ${when(tx.length > 8, `<span class="tiny">Showing 8 of ${tx.length}.</span>`)}</div>`)}
    <hr class="divider">
    <div class="row between"><span class="small">${tx.length ? 'Each transaction is classified automatically in the next step.' : 'No transactions yet.'}</span>
      <button class="btn" data-act="go-next" data-screen="classify" ${tx.length ? '' : 'disabled'}>Classify transactions ${icon('arrow', 15)}</button></div>
  </section>`;
}

export function classifyView(s, init) {
  const tx = init.paths.transactions || [];
  const filter = s.ui.txFilter || 'all';
  const shown = tx.filter(t => filter === 'all' || (filter === 'review' && txNeedsReview(t)) || (filter === 'low' && (t.auto.confidence === 'low' || t.auto.confidence === 'none')) || (filter === 'changed' && (t.typeOverride || t.levelOverride)));
  const review = tx.filter(txNeedsReview).length;
  const byLevel = LEVELS.map(l => [l, tx.filter(t => txLevel(t) === l).length]);
  const conf = k => tx.filter(t => t.auto.confidence === k).length;
  return `${flowHeader(init, 'classify')}
  <section class="card">
    <div class="stack" style="gap:6px"><span class="eyebrow">Create learning paths · Step 2 of 4</span><h2 class="h2">Content type and proficiency</h2>
      <p class="lead">Each transaction is mapped to a content type, and the content type sets its proficiency: Judgement &amp; Governance is Advanced, Practice &amp; Observation is Proficient, Procedures is Essential. Change either where it is wrong.</p></div>
    <div class="row">${each(byLevel, ([l, n]) => `<span class="chip ${lvlClass(l)}">${l}: ${n}</span>`)}${when(review, `<span class="chip warn">Needs review: ${review}</span>`)}</div>
    <div class="notice">${icon('info', 18, '#66BEFF')}<span style="flex:1"><b>How each transaction was classified.</b> The tool reads the workbook's signal words and its own extended lists, checks phrases first, and, when a transaction has no signal word, uses its platform role and process, then its action verb. Each row shows the reason.
      <br><span class="tiny">${conf('high')} high · ${conf('medium')} medium · ${conf('low')} low confidence${conf('none') ? ` · ${conf('none')} need your choice` : ''}. Low confidence rows are worth a quick check.</span></span></div>
    ${rafiqCard(s, 'classify', { heading: 'Second opinion on unsure rows', intro: `Rafeeq reviews the ${tx.filter(t => t.auto.confidence === 'low' || t.auto.type === MANUAL_REVIEW).length} rows the rules are unsure about and suggests a content type for each.`, cta: 'Ask Rafeeq to review', render: renderClassify('classify'), isEmpty: d => !d.items.length })}
    <div class="filters" role="tablist">${each([['all', 'All'], ['review', 'Needs review'], ['low', 'Low confidence'], ['changed', 'Changed by you']], ([k, l]) => `<button class="tab" role="tab" aria-selected="${filter === k}" data-act="ui" data-key="txFilter" data-val="${k}">${l}</button>`)}</div>
    <div class="table-wrap"><table class="data" style="min-width:1000px">
      <thead><tr><th>Transaction</th><th>Process · role</th><th style="width:30%">Why</th><th>Confidence</th><th>Content type</th><th>Proficiency</th></tr></thead>
      <tbody>${each(shown, t => `<tr class="${txNeedsReview(t) ? 'hl' : ''}">
          <td><b style="font-weight:500">${esc(t.name)}</b><br><span class="tiny">${esc(t.module)}</span></td>
          <td class="small">${esc(t.workflow || '—')}<br><span class="tiny">${esc(t.role || 'No role')}</span></td>
          <td class="small">${esc(t.auto.reason || (t.auto.signals.length ? t.auto.signals.join(', ') : 'No signal word'))}</td>
          <td>${confChip(t.auto.confidence)}</td>
          <td><select class="select" data-chg="tx-type" data-id="${esc(t.id)}" aria-label="Content type for ${esc(t.name)}">
            ${each([...CONTENT_TYPE_NAMES, MANUAL_REVIEW], c => `<option ${txType(t) === c ? 'selected' : ''}>${esc(c)}</option>`)}</select>
            ${when(t.typeOverride, '<span class="tiny" style="display:block">Changed by you</span>')}</td>
          <td><select class="select" data-chg="tx-level" data-id="${esc(t.id)}" aria-label="Proficiency for ${esc(t.name)}">
            ${when(!LEVELS.includes(txLevel(t)), '<option selected>To be confirmed</option>')}${each(LEVELS, l => `<option ${txLevel(t) === l ? 'selected' : ''}>${l}</option>`)}</select>
            ${when(t.levelOverride, '<span class="tiny" style="display:block">Changed by you</span>')}</td>
        </tr>`)}</tbody></table></div>
    ${when(!shown.length, '<p class="small">No transactions match this filter.</p>')}
    <hr class="divider">
    <div class="row between"><span class="small">${review ? `${plural(review, 'transaction')} still need a content type and proficiency.` : 'Every transaction has a content type and proficiency.'}</span>
      <button class="btn" data-act="go-next" data-screen="map" ${review ? 'disabled' : ''}>Map personas ${icon('arrow', 15)}</button></div>
  </section>`;
}

// Suggested mapping (built-in rules): only the differences from the current mapping, each with a reason.
function suggestedMappingPanel(s, init, people) {
  const title = k => (people.find(p => p.persona === k) || {}).title || k;
  const dismissed = new Set(init.paths.mappingDismissed || []);
  const changes = mappingChanges(init.paths, suggestMapping(init.paths, people)).filter(c => !dismissed.has(`${c.kind}:${c.key}`));
  const conf = { high: 'done', medium: 'info', low: 'warn' };
  if (!changes.length) return `<div class="notice ok">${icon('check', 16, '#4EA72E')}<span>The mapping matches the tool's suggestions from the persona definitions. Adjust any tick below if your platform differs.</span></div>`;
  return `<div class="notice" style="flex-direction:column;align-items:stretch;gap:10px">
    <div class="row" style="flex-wrap:nowrap;align-items:flex-start">${icon('info', 18, '#66BEFF')}
      <span style="flex:1"><b>Suggested mapping.</b> The tool matches each platform role and its transactions to the persona definitions (for example "Requester" to Operational End User, "Line Manager" to People Manager) and flags mappings that look wrong. Nothing changes until you apply a suggestion.</span>
      ${when(changes.length > 1, '<button class="btn small" data-act="map-apply">Apply all</button>')}</div>
    ${each(changes, c => `<div class="row" style="border-top:1px solid rgba(0,149,255,.25);padding-top:9px;flex-wrap:wrap">
      <span style="flex:1 1 420px;min-width:0" class="small"><b style="color:#fff">${c.kind === 'role' ? 'Role' : 'Transaction'}: ${esc(c.kind === 'role' ? c.key : c.label)}</b>
        ${when(c.add.length, ` · add ${esc(c.add.map(title).join(', '))}`)}${when(c.remove.length, ` · <span style="color:var(--quantum-pale)">remove ${esc(c.remove.map(title).join(', '))}</span>`)}
        <br><span class="tiny">${esc(c.reason)}</span></span>
      <span class="chip ${conf[c.confidence] || 'info'}">${esc(c.confidence)} confidence</span>
      <button class="btn small" data-act="map-apply" data-kind="${c.kind}" data-key="${esc(c.key)}">Apply</button>
      <button class="btn small ghost" data-act="map-dismiss" data-kind="${c.kind}" data-key="${esc(c.key)}">Dismiss</button></div>`)}
  </div>`;
}

export function mapView(s, init) {
  const people = profiledPersonas(init);
  const tx = init.paths.transactions || [];
  const roles = rolesOf(tx);
  const p = init.paths;
  const groups = [];
  tx.forEach(t => { const k = `${t.module || 'No module'} · ${t.workflow || 'No process'}`; let g = groups.find(x => x.k === k); if (!g) groups.push(g = { k, list: [] }); g.list.push(t); });
  const issues = mappingIssues(p, people);
  const conflicts = people.map(x => ({ ...x, list: levelConflicts(p, x.persona, x.prof) })).filter(x => x.list.length);
  const head = `<th>${''}</th>${each(people, x => `<th>${esc(x.title)}<br>${levelChip(x.prof)}</th>`)}`;
  return `${flowHeader(init, 'map')}
  <section class="card">
    <div class="stack" style="gap:6px"><span class="eyebrow">Create learning paths · Step 3 of 4</span><h2 class="h2">Map personas to transactions</h2>
      <p class="lead">Tick which personas perform each platform role or transaction. Ticking a role maps every transaction with that role; untick a single transaction to leave it out. A transaction's own proficiency decides how it is taught. If it is above the persona's level, you decide what happens below.</p></div>
    ${suggestedMappingPanel(s, init, people)}
    ${rafiqCard(s, 'map', { heading: 'Match roles to personas', intro: 'Rafeeq reads each platform role and its activities and suggests which personas perform it, beyond the built-in rules.', cta: 'Suggest with Rafeeq', render: renderMapping('map', k => (people.find(p => p.persona === k) || {}).title || k), isEmpty: d => !d.roles.length })}
    ${when(roles.length, () => `<div class="stack" style="gap:8px"><h3 class="h3">By platform role</h3>
      <div class="table-wrap"><table class="matrix"><thead><tr>${head.replace('<th></th>', '<th>Platform role</th>')}</tr></thead><tbody>
      ${each(roles, r => `<tr><td>${esc(r)} <span class="tiny">${plural(tx.filter(t => t.role === r).length, 'transaction')}</span></td>${each(people, x => `<td><input type="checkbox" class="check" data-chg="map-role" data-persona="${esc(x.persona)}" data-role="${esc(r)}" ${p.roleMap?.[x.persona]?.[r] ? 'checked' : ''} aria-label="${esc(x.title)} performs ${esc(r)}"></td>`)}</tr>`)}
      </tbody></table></div></div>`)}
    <div class="stack" style="gap:8px"><h3 class="h3">By transaction</h3>
      <div class="table-wrap" style="max-height:560px;overflow:auto"><table class="matrix"><thead><tr>${head.replace('<th></th>', '<th>Transaction</th>')}</tr></thead><tbody>
      ${each(groups, g => `<tr class="grp"><td colspan="${people.length + 1}">${esc(g.k)}</td></tr>${each(g.list, t => `<tr><td>${esc(t.name)} ${levelChip(txLevel(t))}<span class="via">${esc(t.role || 'No role')}</span></td>${each(people, x => {
        const on = isMapped(p, x.persona, t), via = mappedVia(p, x.persona, t);
        const above = on && LEVELS.indexOf(txLevel(t)) > LEVELS.indexOf(x.prof);
        return `<td style="${above ? 'box-shadow:inset 0 0 0 2px rgba(233,67,233,.55);border-radius:6px' : ''}"><input type="checkbox" class="check" data-chg="map-tx" data-persona="${esc(x.persona)}" data-id="${esc(t.id)}" ${on ? 'checked' : ''} aria-label="${esc(x.title)} performs ${esc(t.name)}"><span class="via">${via === 'role' ? 'via role' : (via === 'excluded' ? 'left out' : '')}${above ? ' · above level' : ''}</span></td>`;
      })}</tr>`)}`)}
      </tbody></table></div></div>
    ${when(conflicts.length, () => `<div class="stack" style="gap:10px"><h3 class="h3">Transactions above the persona's level</h3>
      ${each(conflicts, x => `<div class="card tight" style="border-color:rgba(233,67,233,.45)"><div class="row"><b style="font-weight:500">${esc(x.title)}</b>${levelChip(x.prof)}</div>
        ${each(x.list, c => `<div class="row between" style="border-top:1px solid var(--line-soft);padding-top:10px">
          <span class="small" style="flex:1 1 300px"><b style="color:#fff;font-weight:500">${esc(c.tx.name)}</b> is ${c.txLevel}, while ${esc(x.title)} is ${x.prof}.${c.decision === 'accept' ? ` <span class="chip warn">Accepted: taught with ${c.txLevel} modes, logged as a deviation</span>` : ''}</span>
          <span class="row">${c.decision === 'accept' ? `<button class="btn small ghost" data-act="resolve" data-persona="${esc(x.persona)}" data-id="${esc(c.tx.id)}" data-how="">Undo</button>`
            : `<button class="btn small ghost" data-act="resolve" data-persona="${esc(x.persona)}" data-id="${esc(c.tx.id)}" data-how="unmap">Remove from persona</button>
               <button class="btn small ghost" data-act="resolve" data-persona="${esc(x.persona)}" data-id="${esc(c.tx.id)}" data-how="lower" title="Changes this transaction's proficiency for every persona">Set transaction to ${x.prof} for everyone</button>
               <button class="btn small" data-act="resolve" data-persona="${esc(x.persona)}" data-id="${esc(c.tx.id)}" data-how="accept">Accept</button>`}</span></div>`)}
      </div>`)}</div>`)}
    <hr class="divider">
    <div class="row between" style="align-items:flex-start">
      <div class="stack" style="gap:4px">${issues.length ? each(issues, i => `<span class="small" style="color:var(--quantum-pale)">${esc(i.text)}</span>`) : `<span class="small">Ready: ${people.map(x => `${esc(x.title)} ${plural(personaTransactions(p, x.persona).length, 'transaction')}`).join(' · ')}</span>`}</div>
      <button class="btn" data-act="generate" ${issues.length ? 'disabled' : ''}>${icon('spark', 15)} Generate learning paths</button></div>
  </section>`;
}

function journey(path, init, s, editable = false) {
  const goLive = init.needs.goLive;
  const weeks = w => (w ? (w[0] === w[1] ? `W${w[0] > 0 ? '+' : ''}${w[0]}` : `W${w[0] > 0 ? '+' : ''}${w[0]} to W${w[1] > 0 ? '+' : ''}${w[1]}`).replace('W+5', 'Ongoing') : '');
  const dates = w => { if (!w || !goLive) return ''; const a = weekStart(goLive, w[0]); return a ? `from ${formatDate(a.toISOString().slice(0, 10))}` : ''; };
  return `<div class="jscroll" data-jscroll>
    <div class="jbar">
      <button type="button" class="jnav" data-jdir="-1" aria-label="Previous steps"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg></button>
      <div class="jtrack" role="scrollbar" aria-label="Scroll the learning path" aria-orientation="horizontal" tabindex="0"><span class="jthumb"></span></div>
      <span class="jcount" aria-live="polite">Steps 1–6 of 6</span>
      <button type="button" class="jnav" data-jdir="1" aria-label="Next steps"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg></button>
    </div>
    <div class="journey"><div class="journey-track"><span class="journey-line"></span>${each(path.steps, st => `<div class="jstep" data-k="${st.key}">
    <span class="jdot">${st.n}</span>
    <div class="jcard"><span class="jt">${esc(st.title)}</span><span class="jv">“${esc(st.voice)}”</span>
      <span class="jweeks">${esc(weeks(st.weeks))} <span class="tiny">${esc(dates(st.weeks))}</span></span>
      ${each(st.items, it => `<div class="jitem ${it.edited ? 'edited' : ''}"><span class="jl">${esc(it.label)}</span><span class="jm">${it.kind === 'fixed' ? `<span class="tiny">${itemTime(it)}</span>` : (it.ongoing ? '<span class="tiny">On demand</span>' : !editable ? `<span class="tiny tabular">${itemTime(it)}</span>` : `<label class="tiny" style="display:flex;align-items:center;gap:4px"><input type="number" min="0" step="5" value="${Math.round(it.minutes)}" data-chg="duration" data-persona="${esc(path.persona)}" data-key="${esc(it.kind === 'assessment' ? it.key : it.label)}" aria-label="Minutes for ${esc(it.label)}">min</label>`)}</span>
        <span class="tiny">${esc(it.where || it.level || '')}${it.txCount ? ` · ${plural(it.txCount, 'transaction')}` : ''}${it.edited && editable ? ` · auto ${it.auto} min <button class="link" style="font-size:10.5px;padding:0" data-act="reset-duration" data-persona="${esc(path.persona)}" data-key="${esc(it.kind === 'assessment' ? it.key : it.label)}">reset</button>` : ''}</span></div>`)}
      ${when(!st.items.length, '<span class="tiny">No selected mode for this step.</span>')}
      ${when(st.indicative.length, `<span class="tiny">Indicative: ${esc(st.indicative.map(i => i.asset).join('; '))}</span>`)}
      ${when(st.key === 'prove', `<span class="chip warn" style="align-self:flex-start">+ ${esc(path.recognition)}</span>`)}
      <span class="jtime">${st.minutes ? formatMinutes(st.minutes) : (st.key === 'sustain' ? 'Ongoing' : '—')}</span></div>
  </div>`)}</div></div></div>`;
}

// Gantt timeline (same as the Design Document): a row per journey step with its assets and time,
// and a bar across the weeks counted from go-live.
function timeline(path, init) {
  const goIdx = TIMELINE_WEEKS.indexOf(1);
  const wk = w => (w === 5 ? 'Ongoing' : (w === 1 ? 'Go-live' : (w < 0 ? 'W' + w : 'W+' + w)));
  const time = itemTime;
  const row = st => {
    const s0 = st.weeks ? TIMELINE_WEEKS.indexOf(st.weeks[0]) : -1, s1 = st.weeks ? TIMELINE_WEEKS.indexOf(st.weeks[1]) : -1;
    const total = st.minutes ? formatMinutes(st.minutes) : (st.key === 'sustain' ? 'Ongoing' : '');
    return `<div class="g-row">
      <div class="g-lbl"><b><i class="k-${st.key}"></i>${st.n} ${esc(st.title)}</b>
        <span class="g-assets">${st.items.length ? each(st.items, it => `<span>${esc(it.label)} <em>${esc(time(it))}</em></span>`) : '<span class="tiny">No mode selected</span>'}</span></div>
      ${each(TIMELINE_WEEKS, (w, i) => `<span class="g-cell ${i === goIdx ? 'go' : ''}" style="grid-column:${i + 2}"></span>`)}
      ${s0 > -1 ? `<span class="g-bar k-${st.key}" style="grid-column:${s0 + 2} / ${s1 + 3}" title="${esc(st.title)}: ${esc(wk(st.weeks[0]))} to ${esc(wk(st.weeks[1]))}">${esc(total)}</span>` : ''}
    </div>`;
  };
  return `<div class="table-wrap"><div class="gantt-app">
    <div class="g-row g-head"><span></span>${each(TIMELINE_WEEKS, (w, i) => `<span class="g-h ${i === goIdx ? 'go' : ''}" style="grid-column:${i + 2}">${wk(w)}</span>`)}</div>
    ${each(path.steps, row)}
  </div></div><span class="tiny">Go-live ${esc(formatDate(init.needs.goLive) || 'date not set')} is the green line. Weeks follow the ${path.prof} path in the CDP Learning Plan Builder.</span>`;
}

export function pathsView(s, init) {
  const people = profiledPersonas(init), g = gates(init);
  if (!g.generated) {
    return `${flowHeader(init, 'paths')}<section class="card"><div class="empty">
      <span class="eyebrow">Create learning paths · Step 4 of 4</span><h2>Ready to generate</h2>
      <p class="small" style="max-width:52ch">${g.mapped ? 'Every persona has its transactions mapped. Generate one learning path per persona on the common six-step journey.' : 'Finish mapping personas to transactions first.'}</p>
      <button class="btn" data-act="${g.mapped ? 'generate' : 'go'}" data-screen="map">${g.mapped ? `${icon('spark', 15)} Generate learning paths` : 'Go to mapping'}</button></div></section>`;
  }
  const cur = people.find(x => x.persona === s.ui.pathTab) || people[0];
  const ctx = pathContext(init, cur.persona);
  const path = { ...generatePath(init.paths, ctx, { durations: init.paths.durations?.[cur.persona] }), title: cur.title };
  const rawIns = pathInsights(path);
  const ins = applyPolish(rawIns, init.paths.polish?.[cur.persona]);
  const reviewed = !!init.reviewed[cur.persona];
  const devs = modeDeviations(cur.prof, ctx.modes);
  return `${flowHeader(init, 'paths')}
  <section class="stack" style="gap:18px">
    <div class="card">
      <div class="card-head"><div class="stack" style="gap:6px"><span class="eyebrow">Create learning paths · Step 4 of 4</span><h2 class="h2">Review the learning paths</h2>
        <p class="lead">Each path follows the common journey. Review every persona's path and mark it reviewed. To change a mode's minutes, the learning modes, the mapping or the assessment modes, use Edit path.</p></div>
        <span class="chip ${g.reviewed ? 'done' : 'soft'}">${people.filter(x => init.reviewed[x.persona]).length} of ${people.length} reviewed</span></div>
      <div class="tabs" role="tablist">${each(people, x => `<button class="tab" role="tab" aria-selected="${x.persona === cur.persona}" data-act="ui" data-key="pathTab" data-val="${esc(x.persona)}">${init.reviewed[x.persona] ? '<span class="tick">✓</span>' : ''}${esc(x.title)}</button>`)}</div>
    </div>

    <div class="card" style="background-image:radial-gradient(80% 120% at 100% 0%, rgba(0,149,255,.14), rgba(13,15,16,0) 70%)">
      <div class="card-head">
        <div class="stack" style="gap:6px"><span class="eyebrow">Learning path</span>
          <div class="row"><h2 style="font-size:24px">${esc(cur.title)}</h2>${levelChip(cur.prof)}<span class="chip warn">${esc(path.recognition)}</span></div>
          <p class="small">${esc(path.objective)}</p></div>
        <div class="row" style="gap:22px">
          <div class="stack" style="gap:0"><span class="tiny">Learning time</span><b class="tabular" style="font-size:22px;font-weight:500">${formatMinutes(path.totalMinutes)}</b></div>
          <div class="stack" style="gap:0"><span class="tiny">Activities</span><b class="tabular" style="font-size:22px;font-weight:500">${path.plan.length}</b></div>
          <div class="stack" style="gap:0"><span class="tiny">Processes</span><b class="tabular" style="font-size:22px;font-weight:500">${path.workflows}</b></div>
          <button class="btn" data-act="go" data-screen="pathedit">${icon('edit', 15)} Edit path</button>
        </div>
      </div>
      <p class="small" style="margin:0">${esc(LEVELS.filter(l => path.counts[l]).map(l => `${path.counts[l]} ${l}`).join(' · '))} ${path.plan.length === 1 ? 'activity' : 'activities'}${path.deviations.length ? ` · ${plural(path.deviations.length, 'above-level activity', 'above-level activities')} accepted` : ''}${path.gaps.length ? ` · ${plural(path.gaps.length, 'activity', 'activities')} on default modes` : ''}</p>
      ${when(path.unusedModes.length, `<div class="notice">${icon('info', 16, '#66BEFF')}<span>Selected but not used: <b>${esc(path.unusedModes.join(', '))}</b>. Each transaction is taught with the modes for its own level, and no transaction mapped to ${esc(cur.title)} is at the level of ${path.unusedModes.length === 1 ? 'this mode' : 'these modes'}.</span></div>`)}
      ${journey(path, init, s)}
      ${timeline(path, init)}
    </div>

    <div class="card">
      <div class="row between"><h3 class="h3">Path insights</h3>${when(ins.polished, `<span class="row" style="gap:8px">${rafiqMark(18)}<span class="tiny">Wording suggested by Rafeeq</span><button class="link" style="font-size:12px;padding:0" data-act="rafiq-revert-path" data-persona="${esc(cur.persona)}">Revert</button></span>`)}</div>
      <p class="small" style="color:var(--text)">${esc(ins.narrative)}</p>
      ${when(ins.units.length, `<div class="grid-auto">${each(ins.units, (u, i) => `<div class="card tight"><span class="tiny">Learning unit ${i + 1}</span><b style="font-weight:500">${esc(u.title)}</b><span class="small">${esc(u.why)}</span><span class="tiny">${esc(u.kind === 'fixed' ? u.detail : u.transactions.join(' · '))}</span></div>`)}</div>`)}
      ${ins.gaps.length ? `<div class="stack" style="gap:4px"><b style="font-weight:500;font-size:13px">Gaps and risks</b>${each(ins.gaps, x => `<span class="small">• ${esc(x)}</span>`)}</div>` : '<span class="small" style="color:#9fdc8a">No gaps found: every level has learning and assessment, and no step is overly long.</span>'}
      <span class="tiny">The first units are the awareness and role microlearning every persona takes; the rest group the activities by process, simplest first. The narrative and units go into the Design Document.</span>
      ${when(!ins.polished, () => rafiqCard(s, 'path:' + cur.persona, { heading: 'Polish the wording', intro: 'Rafeeq rewrites the narrative and gives the learning units clearer titles for the Design Document. Every fact stays the same.', cta: 'Polish with Rafeeq', render: renderPath('path:' + cur.persona), isEmpty: d => !d.narrative && !d.units.length }))}
    </div>

    ${lessonPlanCard(s, init, cur, path, rawIns)}

    <div class="card tight">
      <div class="row between">
        <label class="row" style="cursor:pointer"><input type="checkbox" class="check" data-chg="mark-reviewed" data-persona="${esc(cur.persona)}" ${reviewed ? 'checked' : ''}><span>I have reviewed ${esc(cur.title)}'s learning path</span></label>
        <button class="btn" data-act="confirm-paths" ${g.reviewed ? '' : 'disabled'}>${g.handoff ? 'Go to Design Document hand-off' : 'Confirm learning paths'} ${icon('arrow', 15)}</button>
      </div>
      ${when(!g.reviewed, `<span class="tiny">Mark every persona's path as reviewed to continue. Changing a path's mapping, modes or minutes clears its review.</span>`)}
    </div>
  </section>`;
}

// Edit one persona's path on its own page: minutes per mode, learning modes, mapping and assessment.
export function pathEditView(s, init) {
  if (!gates(init).generated) return pathsView(s, init);
  const people = profiledPersonas(init);
  const cur = people.find(x => x.persona === s.ui.pathTab) || people[0];
  const ctx = pathContext(init, cur.persona);
  const path = { ...generatePath(init.paths, ctx, { durations: init.paths.durations?.[cur.persona] }), title: cur.title };
  const devs = modeDeviations(cur.prof, ctx.modes);
  return `${flowHeader(init, 'paths')}
  <section class="stack" style="gap:18px">
    <div class="card">
      <div class="card-head"><div class="stack" style="gap:6px"><span class="eyebrow">Create learning paths · Edit path</span>
        <div class="row"><h2 class="h2">Edit ${esc(cur.title)}'s learning path</h2>${levelChip(cur.prof)}</div>
        <p class="lead">Change the minutes for any mode on the journey, add or remove learning modes, or revise the mapping and assessment modes. Changes clear this path's review, so check it again on the review page.</p></div>
        <button class="btn ghost" data-act="go" data-screen="paths">${icon('back', 15)} Back to review</button></div>
      <div class="tabs" role="tablist">${each(people, x => `<button class="tab" role="tab" aria-selected="${x.persona === cur.persona}" data-act="ui" data-key="pathTab" data-val="${esc(x.persona)}">${esc(x.title)}</button>`)}</div>
    </div>
    <div class="card">
      <div class="row between"><h3 class="h3">Journey and minutes</h3><span class="tiny">Total learning time <b class="tabular" style="color:var(--text)">${formatMinutes(path.totalMinutes)}</b></span></div>
      ${journey(path, init, s, true)}
    </div>
    <div class="card">
      <div class="row between"><h3 class="h3">Learning modes and activities</h3><div class="row"><button class="btn small ghost" data-act="go" data-screen="map">Revise activity mapping</button><button class="btn small ghost" data-act="go" data-screen="assess">Edit assessment modes</button></div></div>
      <div class="stack" style="gap:8px"><span class="small">Learning modes for ${esc(cur.title)} (changes apply to this persona everywhere):</span>
        <div class="row">${each(MODES, m => { const on = ctx.modes.includes(m), dev = devs.some(d => d.mode === m); return `<label class="opt ${on ? 'on' : ''}" style="border:1px solid ${dev ? 'rgba(233,67,233,.55)' : 'var(--line)'};border-radius:999px;padding:5px 12px"><input type="checkbox" class="check" style="width:15px;height:15px" data-chg="toggle-mode" data-persona="${esc(cur.persona)}" data-value="${esc(m)}" ${on ? 'checked' : ''}>${esc(m)}${dev ? ' ⚠' : ''}</label>`; })}</div>
        ${when(devs.length, `<span class="tiny" style="color:var(--quantum-pale)">⚠ Not Compliant with CDP Learning Framework for ${cur.prof}: ${esc(devs.map(d => d.mode).join(', '))}</span>`)}</div>
      <div class="table-wrap"><table class="data" style="min-width:820px"><thead><tr><th>Activity</th><th>Process</th><th>Level</th><th>Taught with</th><th>Assessed with</th></tr></thead>
        <tbody>${each(path.plan, x => `<tr class="${x.above ? 'hl' : ''}"><td>${esc(x.tx.name)}${x.above ? '<br><span class="tiny" style="color:var(--quantum-pale)">Above persona level, accepted</span>' : ''}${x.gap ? '<br><span class="tiny" style="color:var(--quantum-pale)">No selected mode at this level, framework defaults used</span>' : ''}</td>
          <td class="small">${esc(x.tx.workflow || '—')}</td><td>${levelChip(x.level)}</td><td class="small">${esc(x.modes.join(', '))}</td><td class="small">${esc(x.assess.map(k => k.split('|')[1]).join(', '))}</td></tr>`)}</tbody></table></div>
    </div>

    <div class="row" style="justify-content:flex-end"><button class="btn" data-act="go" data-screen="paths">Done, back to review ${icon('arrow', 15)}</button></div>
  </section>`;
}

// Lesson plan for one persona: Rafeeq drafts it, the user saves it; a saved plan shows as a syllabus
// and goes into the Design Document. A plan made for different units is flagged as out of date.
function lessonPlanCard(s, init, cur, path, rawIns) {
  const task = 'lessons:' + cur.persona;
  const saved = init.paths.lessons?.[cur.persona];
  const stale = saved && saved.base !== lessonBase(unitSpecs(path, rawIns));
  const open = (s.ui.lessonOpen || {});
  const draft = s.rafiq?.results?.[task];
  const intro = 'Rafeeq turns each learning unit into a course-style plan: outcomes, short lessons in varied formats, the activities each lesson covers, the learning mode used and how the unit is assessed.';
  const draftCard = rafiqCard(s, task, { heading: saved ? 'New lesson plan draft' : 'Design the lesson plan', intro, cta: 'Design with Rafeeq',
    render: d => `${renderSyllabus(d.units, open['draft:' + cur.persona], 'draft:' + cur.persona)}<div class="row"><button class="btn small rafiq-btn" data-act="rafiq-accept" data-task="${esc(task)}" data-kind="all">Save lesson plan</button></div>`,
    isEmpty: d => !d.units.length });
  return `<div class="card">
    <div class="row between"><div class="stack" style="gap:4px"><h3 class="h3">Lesson plan</h3><span class="small">How each unit's content and learner experience will look, for the vendor to build.</span></div>
      ${when(saved, `<div class="row">${when(s.rafiq?.on && !draft, `<button class="btn small ghost" data-act="rafiq-run" data-task="${esc(task)}">${rafiqMark(16)} Regenerate</button>`)}<button class="btn small ghost" data-act="lessons-remove" data-persona="${esc(cur.persona)}">Remove</button></div>`)}</div>
    ${when(saved && draft, draftCard)}
    ${saved ? `${when(stale, `<div class="notice warn">${icon('alert', 16, '#F5A3F5')}<span>This path has changed since the lesson plan was made, so the plan is not added to the Design Document. ${s.rafiq?.on ? 'Regenerate it with Rafeeq.' : 'Regenerate it in claude.ai.'}</span></div>`)}
      ${renderSyllabus(saved.units, open[cur.persona], cur.persona)}`
      : (s.rafiq?.on ? draftCard : '<span class="small">Rafeeq drafts lesson plans when the tool is opened in claude.ai.</span>')}
  </div>`;
}
