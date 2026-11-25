// The Design Document, rendered from buildDocument(). The same HTML is shown in the hand-off preview
// and saved as the downloadable file (which opens the print dialog when opened).
// Layout, by reader: a one-page summary (sponsor), Part A learning design (L&D and approver),
// Part B vendor build brief (vendor), then an appendix with the full matrices and sign-off.
// The document shows decisions only: anything still missing is listed once, in "Open items".
import { esc, each, when } from '../dom.js';
import { LEVELS, DOMAINS } from '../../rules/framework.js';
import { TIMELINE_WEEKS } from '../../rules/workbook.js';
import { formatMinutes, itemTime } from '../../engine/paths.js';
import { pathInsights } from '../../engine/suggest.js';
import { applyPolish, unitSpecs, lessonBase } from '../../engine/rafiq.js';

const CHIP = { Essential: ['#E3EAF1', '#33445A'], Proficient: ['#DDF0FF', '#0068B3'], Advanced: ['#FBE1FB', '#A02B93'] };
const chip = l => { const c = CHIP[l] || ['#EEF1F5', '#5B6878']; return `<span class="c" style="background:${c[0]};color:${c[1]}">${esc(l || 'Pending')}</span>`; };
const pill = (text, tone) => `<span class="pill ${tone}">${esc(text)}</span>`;
const notSet = '<span class="ns">Not set</span>';
const sec = (n, title, intro, body, cls = '') => `<section class="sec ${cls}"><h2>${n ? `<span>${n}</span>` : ''}${esc(title)}</h2>${intro ? `<p class="intro">${esc(intro)}</p>` : ''}${body}</section>`;
const part = (label, title, reader) => `<div class="part"><span>${esc(label)}</span><b>${esc(title)}</b><em>${esc(reader)}</em></div>`;
const STEP_COLOR = { understand: '#9AA6B4', role: '#9AA6B4', build: '#0095FF', confidence: '#6C63FF', prove: '#A02B93', sustain: '#10213A' };

export const DOC_CSS = `
.idd{font-family:'Noto Kufi Arabic','Segoe UI',system-ui,sans-serif;color:#14202E;font-size:9.5pt;line-height:1.5;background:#fff}
.idd *{box-sizing:border-box}
.idd p{margin:0}
.idd .cover{position:relative;border-radius:5mm;overflow:hidden;background:#10213A;color:#fff;padding:9mm 9mm 10mm}
.idd .cover .top{display:flex;justify-content:space-between;align-items:flex-start;gap:16px}
.idd .cover .ttl{margin-top:6mm;font-size:24pt;font-weight:700;line-height:1.15}
.idd .cover .ttl span{color:#3DAEFF}
.idd .cover p{margin-top:4mm;font-size:9pt;color:rgba(255,255,255,.85);max-width:150mm}
.idd .cover .bar{position:absolute;left:0;right:0;bottom:0;height:1.4mm;background:#0095FF}
.idd .facts{margin-top:5mm;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:3mm}
.idd .facts div{display:flex;flex-direction:column;gap:1mm;padding:3mm;border-radius:2.5mm;background:#F4F7FA}
.idd .k{font-size:7.5pt;color:#5B6878}
.idd .v{font-size:10.5pt;font-weight:700}
.idd .ns{color:#8A96A4;font-style:italic;font-weight:400}
.idd .pill{display:inline-block;padding:.5mm 2.4mm;border-radius:99px;font-size:7.5pt;font-weight:700;white-space:nowrap}
.idd .pill.ok{background:#E3F5E5;color:#1E7A35}
.idd .pill.wait{background:#FFF1DB;color:#9A5B00}
.idd .pill.dev{background:#FBE1FB;color:#A02B93}
.idd .pill.dark{background:rgba(255,255,255,.14);color:#fff}
.idd .open{margin-top:5mm;border-left:1.2mm solid #E8A23A;background:#FFF8EC;border-radius:0 2.5mm 2.5mm 0;padding:3.5mm 4mm}
.idd .open b{font-size:9.5pt}
.idd .open ol{margin:1.5mm 0 0;padding-left:5mm;font-size:8.5pt;color:#4C3A1A}
.idd .cols{display:grid;grid-template-columns:1fr 1fr;gap:6mm}
.idd .list{margin:1.5mm 0 0;padding-left:5mm}
.idd .list li{margin:.6mm 0}
.idd .part{margin-top:9mm;display:flex;align-items:baseline;gap:3mm;padding:3mm 4mm;border-radius:2.5mm;background:#10213A;color:#fff;break-after:avoid}
.idd .part span{font-size:8pt;color:#66BEFF;font-weight:700;letter-spacing:.04em;text-transform:uppercase}
.idd .part b{font-size:12pt}
.idd .part em{margin-left:auto;font-style:normal;font-size:8pt;color:rgba(255,255,255,.7)}
.idd .sec{margin-top:6mm}
.idd h2{margin:0;font-size:13pt;font-weight:700;break-after:avoid}
.idd h2 span{color:#0095FF;margin-right:2.5mm}
.idd .intro{margin:1mm 0 3mm;font-size:8.5pt;color:#5B6878}
.idd table{width:100%;border-collapse:collapse;font-size:8.2pt}
.idd th{text-align:left;font-size:7.5pt;font-weight:700;color:#5B6878;border-bottom:1px solid #C9D2DC;padding:1.8mm 2mm}
.idd td{padding:2mm;border-bottom:1px solid #EDF1F5;vertical-align:top}
.idd tr.grp td{padding-top:3mm;font-size:7.5pt;font-weight:700;color:#0068B3;border-bottom:none}
.idd .c{display:inline-block;padding:.4mm 2.2mm;border-radius:99px;font-size:7.5pt;white-space:nowrap}
.idd .muted{color:#5B6878;font-size:8pt}
.idd .pgrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:3mm}
.idd .pcard{padding:3.5mm;border:1px solid #E1E7EE;border-radius:3mm;display:flex;flex-direction:column;gap:2mm}
.idd .ph{display:flex;gap:2mm;align-items:center;flex-wrap:wrap}
.idd .tags{display:flex;flex-wrap:wrap;gap:1.2mm}
.idd .tag{padding:.5mm 2.2mm;border-radius:1.5mm;background:#F1F4F8;font-size:7.5pt}
.idd .tag.dev{background:#fff;border:1px dashed #C04BC0;color:#A02B93}
.idd .path{margin-top:5mm;border:1px solid #E1E7EE;border-radius:3mm;padding:4mm}
.idd .pstats{margin-left:auto;display:flex;gap:4mm}
.idd .pstats div{display:flex;flex-direction:column;text-align:right}
.idd .pstats b{font-size:10.5pt}
.idd .gantt{margin-top:3.5mm;border-top:1px solid #E1E7EE}
.idd .grow{display:grid;grid-template-columns:58mm repeat(11,minmax(0,1fr));align-items:stretch;border-bottom:1px solid #EDF1F5;break-inside:avoid}
.idd .grow>*{grid-row:1}
.idd .ghead{border-bottom:1px solid #C9D2DC}
.idd .gh{font-size:6.5pt;color:#5B6878;text-align:center;padding:1.2mm 0}
.idd .gh.go{color:#1E7A35;font-weight:700}
.idd .gl{padding:2mm 3mm 2mm 0;display:flex;flex-direction:column;gap:.8mm;font-size:7.5pt}
.idd .gl b{font-size:8pt;display:flex;align-items:center;gap:1.5mm}
.idd .gl b i{width:2.2mm;height:2.2mm;border-radius:50%;flex:none}
.idd .ga{color:#14202E;line-height:1.45}
.idd .gm{color:#5B6878}
.idd .gc{border-left:1px dashed #EDF1F5}
.idd .gc.go{border-left:1.5px solid #4EA72E}
.idd .gb{align-self:center;height:5.5mm;border-radius:1.5mm;margin:0 .5mm;color:#fff;font-size:6.8pt;font-weight:700;display:flex;align-items:center;justify-content:center;white-space:nowrap;overflow:hidden;z-index:1}
.idd .units{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:2mm;margin-top:3mm}
.idd .unit{padding:2.5mm;border-radius:2mm;background:#F4F7FA;font-size:7.5pt;display:flex;flex-direction:column;gap:.5mm}
.idd .unit b{font-size:8pt}
.idd .lp{margin-top:2.5mm;padding:3mm;border:1px solid #E1E7EE;border-radius:2.5mm}
.idd .lpn{display:inline-flex;width:5mm;height:5mm;border-radius:50%;align-items:center;justify-content:center;background:#0095FF;color:#fff;font-size:7pt;font-weight:700}
.idd .sign{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:2.5mm}
.idd .sign div{padding:3.5mm;border:1px solid #E1E7EE;border-radius:3mm;display:flex;flex-direction:column;gap:1.5mm}
.idd .sign span{height:6mm;border-bottom:1px solid #9AA6B4;display:block}
.idd .mk{display:inline-flex;width:4.2mm;height:4.2mm;border-radius:50%;align-items:center;justify-content:center;font-size:7pt;font-weight:700}
.idd .foot{margin-top:7mm;padding-top:2mm;border-top:.6mm solid #0095FF;display:flex;justify-content:space-between;font-size:7.5pt;color:#5B6878}
@media print{.idd .avoid,.idd tr,.idd .pcard,.idd .unit{break-inside:avoid}.idd .path{break-before:page}.idd .part{break-before:page}}
`;

const wkLabel = w => (w === 5 ? 'ongoing' : w === 1 ? 'go-live' : (w < 0 ? 'W' + w : 'W+' + w));
const weeksText = w => (w ? (w[0] === w[1] ? wkLabel(w[0]) : `${wkLabel(w[0])} to ${wkLabel(w[1])}`) : '');

// Gantt chart for one persona's path: a row per journey step, with its assets and learning time on
// the left and a bar across the weeks (counted from go-live) on the right.
function gantt(p) {
  const cols = TIMELINE_WEEKS.length, goIdx = TIMELINE_WEEKS.indexOf(1);
  const head = each(TIMELINE_WEEKS, (w, i) => `<span class="gh ${i === goIdx ? 'go' : ''}" style="grid-column:${i + 2}">${w === 5 ? 'Ongoing' : (w === 1 ? 'Go-live' : (w < 0 ? 'W' + w : 'W+' + w))}</span>`);
  const row = st => {
    const s0 = st.weeks ? TIMELINE_WEEKS.indexOf(st.weeks[0]) : -1, s1 = st.weeks ? TIMELINE_WEEKS.indexOf(st.weeks[1]) : -1;
    const assets = st.items.length ? st.items.map(it => `${esc(it.label)} <span class="gm">${itemTime(it)}</span>`).join('<br>') : '<span class="ns">No mode selected</span>';
    const total = st.minutes ? formatMinutes(st.minutes) : (st.key === 'sustain' ? 'Ongoing' : '');
    return `<div class="grow">
      <div class="gl" style="grid-column:1"><b><i style="background:${STEP_COLOR[st.key]}"></i>${st.n} ${esc(st.title)}</b><span class="ga">${assets}</span></div>
      ${each(TIMELINE_WEEKS, (w, i) => `<span class="gc ${i === goIdx ? 'go' : ''}" style="grid-column:${i + 2}"></span>`)}
      ${s0 > -1 ? `<span class="gb" style="grid-column:${s0 + 2} / ${s1 + 3};background:${STEP_COLOR[st.key]}">${esc(total)}</span>` : ''}
    </div>`;
  };
  return `<div class="gantt"><div class="grow ghead"><span class="gl" style="grid-column:1"></span>${head}</div>${each(p.steps, row)}</div>`;
}

// The saved lesson plan for a persona, if it was made for the path as it is now.
function lessonPlan(p, init) {
  const saved = init?.paths?.lessons?.[p.persona];
  if (!saved || saved.base !== lessonBase(unitSpecs(p, pathInsights(p)))) return '';
  const m = n => (n >= 60 ? `${Math.floor(n / 60)} h${n % 60 ? ` ${n % 60} min` : ''}` : `${n} min`);
  return `<div style="margin-top:4mm"><b style="font-size:9pt">Lesson plan</b>
    ${each(saved.units, (u, i) => `<div class="lp avoid">
      <div class="ph"><span class="lpn">${i + 1}</span><b>${esc(u.title)}</b><span class="muted" style="margin-left:auto">${u.lessons.length} lessons · ${m(u.lessons.reduce((a, l) => a + l.minutes, 0))}</span></div>
      ${u.outcomes.length ? `<p class="muted" style="margin-top:1mm"><b style="color:#14202E">Outcomes:</b> ${esc(u.outcomes.join('; '))}</p>` : ''}
      <table style="margin-top:1.5mm"><thead><tr><th style="width:38%">Lesson</th><th>Format</th><th>Learning mode</th><th style="text-align:right">Time</th></tr></thead><tbody>
      ${each(u.lessons, (l, k) => `<tr><td><b>${k + 1}. ${esc(l.title)}</b>${l.description ? `<br><span class="muted">${esc(l.description)}</span>` : ''}</td><td>${esc(l.type)}</td><td>${esc(l.mode || '—')}</td><td style="text-align:right">${m(l.minutes)}</td></tr>`)}</tbody></table>
      ${u.assessment ? `<p class="muted" style="margin-top:1.5mm"><b style="color:#14202E">Assessment (${esc(u.assessment.mode)}):</b> ${esc(u.assessment.task)}${u.assessment.evidence ? ` Evidence: ${esc(u.assessment.evidence)}` : ''}</p>` : ''}
    </div>`)}</div>`;
}

export function documentHtml(d, init) {
  const devN = d.deviations.length, decidedN = d.deviations.filter(x => x.decided).length;
  const insights = Object.fromEntries(d.paths.map(p => [p.persona, applyPolish(pathInsights(p), init?.paths?.polish?.[p.persona])]));
  const fact = (k, v) => `<div><span class="k">${esc(k)}</span><span class="v">${v ? esc(v) : notSet}</span></div>`;
  const stepOrder = [...new Set(d.assets.map(a => a.step))];

  return `<div class="idd">
  <div class="cover avoid">
    <div class="top"><b style="font-size:9pt">Common Digital Platforms</b>
      <div style="text-align:right;display:flex;flex-direction:column;gap:1.5mm;align-items:flex-end">${d.final ? pill('Final for approval', 'ok') : pill('Draft', 'dark')}<span style="font-size:8pt;color:rgba(255,255,255,.75)">${esc(d.ref)} · Version ${esc(d.version)}</span></div></div>
    <div style="margin-top:6mm;font-size:8.5pt;color:#66BEFF">CDP Learning Accelerator</div>
    <div class="ttl"><span>${esc(d.platform)}</span><br>Design Document</div>
    <p>Defines the learning solution for this initiative: who is affected, the proficiency each persona needs, how each persona learns and proves readiness, and exactly what the vendor builds.</p>
    <span class="bar"></span>
  </div>

  <div class="facts avoid">
    ${fact('Planned go-live', d.goLive)}
    ${fact('Personas', String(d.personaRows.length))}
    ${fact('Activities in scope', String(d.summary.transactions))}
    ${fact('Learning time per learner', d.learningTime)}
    <div><span class="k">Framework deviations</span><span class="v">${devN ? `${devN} <span style="font-size:8pt;font-weight:400;color:#5B6878">(${decidedN} decided)</span>` : 'None'}</span></div>
  </div>


  ${sec('', 'At a glance', '', `<div class="cols avoid">
      <div><b style="font-size:9pt">Business outcomes</b>${d.outcomes.length ? `<ol class="list">${each(d.outcomes, o => `<li>${esc(o)}</li>`)}</ol>` : `<p style="margin-top:1.5mm">${notSet}</p>`}
        ${when(d.outcomes.length, `<p class="muted" style="margin-top:1.5mm">Success is evidenced against these outcomes; KPIs, baselines and targets are set in the Measure phase.</p>`)}</div>
      <div><b style="font-size:9pt">Critical processes</b>${d.processes.length ? `<ol class="list">${each(d.processes, o => `<li>${esc(o)}</li>`)}</ol>` : `<p style="margin-top:1.5mm">${notSet}</p>`}</div>
    </div>
    <table style="margin-top:4mm"><thead><tr><th>Persona</th><th>Level</th><th style="text-align:right">Activities</th><th style="text-align:right">Learning time</th><th style="text-align:right">Assessments</th><th>Recognition</th></tr></thead><tbody>
    ${each(d.personaRows, r => `<tr><td><b>${esc(r.title)}</b></td><td>${chip(r.prof)}</td><td style="text-align:right">${r.activities}</td><td style="text-align:right">${r.time ? esc(r.time) : '<span class="ns">Path not generated</span>'}</td><td style="text-align:right">${r.assess}</td><td>${esc(r.recognition || '—')}</td></tr>`)}</tbody></table>`, 'avoid')}

  ${part('Part A', 'Learning design', 'For the learning team and approver')}

  ${sec('01', 'Capability architecture', 'The proficiency each persona needs in each domain after go-live. The overall level sets their learning and assessment modes.',
    `<table><thead><tr><th style="width:30%">Persona</th>${each(DOMAINS, x => `<th>${esc(x.header)}</th>`)}<th>Overall</th></tr></thead><tbody>
    ${each(d.capability, r => `<tr><td><b>${esc(r.persona)}</b></td>${each(r.levels, l => `<td>${chip(l)}</td>`)}<td>${chip(r.overall)}</td></tr>`)}</tbody></table>`)}

  ${sec('02', 'How each persona learns and proves readiness', 'Learning modes are grouped by type. A dashed outline marks a mode outside the framework for that level; its decision is in the deviation register (A1).',
    `<div class="pgrid">${each(d.learning, l => {
      const assess = d.assessment.filter(a => a.marks[d.personas.findIndex(p => p.title === l.persona)]);
      return `<div class="pcard"><div class="ph"><b style="font-size:10pt">${esc(l.persona)}</b>${chip(l.prof)}<span class="muted" style="margin-left:auto">${l.count} learning modes</span></div>
        ${each(d.families.filter(f => f.modes.some(m => l.modes.includes(m))), f => `<div><span class="k">${esc(f.name)}</span><div class="tags">${each(f.modes.filter(m => l.modes.includes(m)), m => { const c = l.cells.find(x => x.mode === m); return `<span class="tag ${c && c.dev ? 'dev' : ''}">${esc(m)}${c && c.dev ? ` · ${esc(c.devId)}` : ''}</span>`; })}</div></div>`)}
        <div><span class="k">Assessment</span><div class="tags">${assess.length ? each(assess, a => `<span class="tag">${esc(a.mode)}</span>`) : '<span class="ns">None selected</span>'}</div></div>
      </div>`;
    })}</div>`)}

  ${part('Part B', 'Vendor build brief', 'For the vendor')}

  ${sec('03', 'Assets to build', 'Every learning and assessment asset across all personas, in journey order. Build each once; "Personas" shows who takes it and "Activities" how many system activities it covers.',
    d.assets.length ? `<table><thead><tr><th style="width:30%">Asset</th><th>Delivery</th><th>Personas</th><th style="text-align:right">Activities</th><th style="text-align:right">Time per learner</th></tr></thead><tbody>
    ${each(stepOrder, n => { const list = d.assets.filter(a => a.step === n); return `<tr class="grp"><td colspan="5">Step ${n} · ${esc(list[0].stepTitle)}</td></tr>${each(list, a => `<tr><td><b>${esc(a.name)}</b><br><span class="muted">${a.kind === 'assessment' ? `Assessment · ${esc(a.level)}` : a.kind === 'fixed' ? 'Journey asset · every persona' : 'Learning mode'}</span></td><td>${esc(a.where || '—')}</td><td>${esc(a.personas.join(', '))}</td><td style="text-align:right">${a.activities || '—'}</td><td style="text-align:right">${esc(a.time)}</td></tr>`)}`; })}</tbody></table>`
    : '<p class="muted">Generate the learning paths to list the assets.</p>')}

  ${d.paths.length ? each(d.paths, (p, i) => `<div class="path">
      <div class="ph"><span style="color:#0095FF;font-weight:700;font-size:11pt">${String(i + 4).padStart(2, '0')}</span><b style="font-size:12pt">${esc(p.title)}</b>${chip(p.prof)}${pill(p.recognition, 'dev')}
        <div class="pstats"><div><span class="k">Activities</span><b>${p.plan.length}</b></div><div><span class="k">Processes</span><b>${p.workflows}</b></div><div><span class="k">Learning time</span><b>${esc(p.total)}</b></div></div></div>
      <p class="muted" style="margin-top:2mm">${esc(p.objective)}. ${esc(insights[p.persona].narrative)}</p>
      ${gantt(p)}
      ${insights[p.persona].units.length ? `<div class="units">${each(insights[p.persona].units, (u, k) => `<div class="unit"><span class="k">Unit ${k + 1}</span><b>${esc(u.title)}</b><span class="muted">${esc(u.kind === 'fixed' ? u.why : u.transactions.join(', '))}</span></div>`)}</div>` : ''}
      ${lessonPlan(p, init)}
      <table style="margin-top:3mm"><thead><tr><th>Activity</th><th>Process</th><th>Level</th><th>Taught with</th><th>Assessed with</th></tr></thead><tbody>
      ${each(p.plan, x => `<tr><td>${esc(x.tx.name)}${x.above ? `<br>${pill('Above persona level, see A1', 'dev')}` : ''}</td><td>${esc(x.tx.workflow || '—')}</td><td>${chip(x.level)}</td><td>${esc(x.modes.join(', '))}</td><td>${esc(x.assess.map(k => k.split('|')[1]).join(', '))}</td></tr>`)}</tbody></table>
    </div>`) : ''}

  ${part('Appendix', 'Reference and sign-off', 'Full detail behind Parts A and B')}

  ${sec('A1', 'Deviation register', 'Every departure from the CDP Learning Framework, with its rationale and decision.',
    devN ? `<table><thead><tr><th>ID</th><th style="width:24%">Persona and item</th><th style="width:22%">Framework position</th><th style="width:28%">Rationale</th><th>Decision</th></tr></thead><tbody>
    ${each(d.deviations, x => `<tr><td>${pill(x.id, 'dev')}</td><td><b>${esc(x.persona)}</b><br>${esc(x.kind)}: ${esc(x.item)}</td><td class="muted">${esc(x.position)}</td><td>${x.rationale ? esc(x.rationale) : notSet}</td>
      <td>${x.decided ? `${pill('Accepted', 'ok')}<br><span class="muted">${esc(x.approver)}${x.date ? ', ' + esc(new Date(x.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })) : ''}</span>` : pill('Decision pending', 'wait')}</td></tr>`)}</tbody></table>`
    : '<p class="muted">No deviations: every learning mode, assessment mode and activity fits each persona\'s proficiency.</p>')}

  ${sec('A2', 'Learning mode matrix', '', `<table><thead><tr><th>Learning mode</th>${each(d.learning, l => `<th style="text-align:center">${esc(l.persona)}</th>`)}</tr></thead><tbody>
    ${each(d.families, f => `<tr class="grp"><td colspan="${d.learning.length + 1}">${esc(f.name)}</td></tr>${each(f.modes, m => `<tr><td>${esc(m)}</td>${each(d.learning, l => { const c = l.cells.find(x => x.mode === m) || {};
      return `<td style="text-align:center">${c.dev ? `<span class="mk" style="background:#FBE1FB;color:#A02B93">!</span>` : (c.on ? '<span class="mk" style="background:#10213A;color:#fff">✓</span>' : '<span style="color:#C5CED8">–</span>')}</td>`; })}</tr>`)}`)}</tbody></table>`)}

  ${sec('A3', 'Assessment and readiness evidence', 'Levels are cumulative: a persona at a higher level also completes the modes below it.',
    `<table><thead><tr><th>Assessment mode</th><th>Level</th><th style="width:30%">Readiness evidence</th><th>Source</th>${each(d.personas, p => `<th style="text-align:center">${esc(p.title)}</th>`)}</tr></thead><tbody>
    ${each(d.assessment, a => `<tr><td><b>${esc(a.mode)}</b></td><td>${chip(a.level)}</td><td>${esc(a.evidence)}</td><td class="muted">${esc(a.source)}</td>${each(a.marks, m => `<td style="text-align:center">${m ? '<span class="mk" style="background:#10213A;color:#fff">✓</span>' : '<span style="color:#C5CED8">–</span>'}</td>`)}</tr>`)}</tbody></table>`)}

  ${sec('A4', 'Measurement hand-off', 'The readiness evidence feeds the Effectiveness Tracking Plan in the Measure phase.',
    `<div class="facts" style="grid-template-columns:repeat(3,minmax(0,1fr));margin-top:0">${fact('Tracking owner', d.measure.owner)}${fact('Baseline captured by', d.measure.baseline)}${fact('First readiness review', d.measure.review)}</div>`, 'avoid')}

  ${sec('A5', 'Approval and sign-off', '', `<div class="sign">${each(['Prepared by', 'Reviewed by', 'Approved by', 'Vendor acknowledgement'], k => `<div><b style="font-size:8.5pt">${k}</b><span class="k">Name and role</span><span></span><span class="k">Signature</span><span></span><span class="k">Date</span><span></span></div>`)}</div>`, 'avoid')}

  <div class="foot"><span>Common Digital Platforms · ${esc(d.platform)} Design Document · ${esc(d.ref)}</span><span>Version ${esc(d.version)}</span></div>
</div>`;
}

export function documentFile(d, init) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(d.platform)} Design Document</title>
<style>@page{size:A4;margin:13mm}html,body{margin:0;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}body{max-width:190mm;margin:0 auto;padding:8mm 0}${DOC_CSS}</style></head>
<body>${documentHtml(d, init)}<script>window.addEventListener('load',function(){setTimeout(function(){try{window.print()}catch(e){}},400)});<\/script></body></html>`;
}

export const _levels = LEVELS;
