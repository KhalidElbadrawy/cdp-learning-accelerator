// The Initiative Design Document as data: every section the vendor hand-off shows, built from the
// initiative. The view layer only lays this out.
import { LEVELS, DOMAINS } from '../rules/framework.js';
import { PROFILES } from '../rules/personas.js';
import { MODES, modeDeviations, assessDeviations, ASSESS_INFO, modeLevel } from './modes.js';
import { gates, profiledPersonas, modesOf, assessOf, pathContext, processList } from './initiative.js';
import { generatePath, formatMinutes, formatDate } from './paths.js';
import { levelConflicts } from './mapping.js';

export const MODE_FAMILIES = [
  { name: 'Performance support', short: 'Support', modes: ['In-app guidance', 'DAP workflows', 'Support agent'] },
  { name: 'Self-paced practice', short: 'Self-paced', modes: ['Scenario-based learning', 'Practice environment', 'Interactive eLearning', 'Case study learning', 'System Microlearning'] },
  { name: 'Live learning', short: 'Live', modes: ['Virtual training', 'Instructor-led workshop', 'Coaching'] },
  { name: 'Social learning', short: 'Social', modes: ['Peer learning', 'Community of practice'] }
];

export function successMeasure(outcome) {
  const list = processList(outcome).map(o => o.replace(/[.\s]+$/, '').replace(/^([A-Z])(?=[a-z])/, c => c.toLowerCase()));
  if (!list.length) return '';
  if (list.length === 1) return `Evidence that the business outcome is achieved: ${list[0]}. KPIs, baselines and targets are set in the Measure phase.`;
  return `Evidence that each business outcome is achieved: ${list.map((o, i) => `(${i + 1}) ${o}`).join('; ')}. KPIs, baselines and targets are set in the Measure phase.`;
}

const an = w => `${/^[AEIOU]/i.test(w) ? 'An' : 'A'} ${w}`;

export const deviationKey = d => [d.persona, d.kind, d.item].join('|');

export function buildDocument(init, now = new Date()) {
  const g = gates(init);
  const people = profiledPersonas(init);
  const fmt = d => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  // Deviation register: learning modes, assessment modes and accepted above-level transactions.
  const devs = [];
  people.forEach(p => {
    modeDeviations(p.prof, modesOf(init, p.persona, p.prof)).forEach(d => devs.push({ persona: p.title, kind: 'Learning mode', item: d.mode, position: `Not part of the learning mode set for ${p.prof} proficiency.` }));
    assessDeviations(p.prof, assessOf(init, p.persona, p.prof)).forEach(d => devs.push({ persona: p.title, kind: 'Assessment mode', item: d.mode, position: `${an(d.key.split('|')[0])} assessment mode, above the ${p.prof} proficiency set.` }));
    levelConflicts(init.paths, p.persona, p.prof).filter(c => c.decision === 'accept').forEach(c => devs.push({ persona: p.title, kind: 'Activity', item: c.tx.name, position: `${an(c.txLevel)} activity mapped to ${an(p.prof).toLowerCase().replace(p.prof.toLowerCase(), p.prof)} persona; taught with ${c.txLevel} modes.` }));
  });
  const decisions = init.handoff?.decisions || {};
  devs.forEach((d, i) => {
    d.id = 'D-' + String(i + 1).padStart(2, '0');
    d.key = deviationKey(d);
    const x = decisions[d.key] || {};
    d.rationale = (x.rationale || '').trim(); d.approver = (x.approver || '').trim(); d.date = x.date || '';
    d.decided = !!(d.rationale && d.approver);
  });
  const devId = (title, kind, item) => (devs.find(d => d.persona === title && d.kind === kind && d.item === item) || {}).id;

  const learning = people.map(p => {
    const list = modesOf(init, p.persona, p.prof), dev = modeDeviations(p.prof, list).map(d => d.mode);
    return {
      persona: p.title, prof: p.prof, modes: list, count: list.length,
      families: MODE_FAMILIES.map(f => ({ name: f.short, n: f.modes.filter(m => list.includes(m)).length, of: f.modes.length })),
      cells: MODES.map(m => ({ mode: m, on: list.includes(m), dev: dev.includes(m), devId: dev.includes(m) ? devId(p.title, 'Learning mode', m) : null }))
    };
  });

  const assessKeys = [];
  people.forEach(p => assessOf(init, p.persona, p.prof).forEach(k => { if (!assessKeys.includes(k)) assessKeys.push(k); }));
  assessKeys.sort((a, b) => LEVELS.indexOf(a.split('|')[0]) - LEVELS.indexOf(b.split('|')[0]));

  const paths = g.generated ? people.map(p => generatePath(init.paths, pathContext(init, p.persona), { durations: init.paths.durations?.[p.persona] })) : [];

  const titled = paths.map(p => ({ ...p, title: (PROFILES[p.persona] || {}).title || p.persona, total: formatMinutes(p.totalMinutes) }));
  const measure = init.handoff?.measure || {};
  const outcomes = processList(init.needs.outcome), processes = processList(init.needs.processes);

  // Things still missing before the document can go for approval. Shown once, on the summary page.
  const openItems = [];
  if (!outcomes.length) openItems.push('Add at least one business outcome (Business Needs).');
  if (!init.needs.goLive) openItems.push('Set the planned go-live date (Business Needs).');
  if (!g.handoff) openItems.push('Review and confirm every persona\'s learning path.');
  devs.filter(d => !d.decided).forEach(d => openItems.push(`Record the rationale and approver for ${d.id} (${d.persona}: ${d.item}).`));
  if (!(measure.owner || '').trim()) openItems.push('Name the owner of the Effectiveness Tracking Plan (Measurement hand-off).');

  // What the vendor builds: every asset across all personas' paths, with who takes it.
  const assetMap = new Map();
  titled.forEach(p => p.steps.forEach(st => st.items.forEach(it => {
    const k = it.kind + '|' + it.label;
    if (!assetMap.has(k)) assetMap.set(k, { name: it.label, kind: it.kind, step: st.n, stepTitle: st.title, where: it.where || it.source || '', level: it.level || '', personas: [], tx: new Set(), minutes: [], range: it.range, ongoing: !!it.ongoing });
    const a = assetMap.get(k);
    a.personas.push(p.title);
    const txs = it.kind === 'fixed' ? p.plan : it.kind === 'assessment' ? p.plan.filter(x => x.assess.includes(it.key)) : p.plan.filter(x => x.modes.includes(it.label));
    txs.forEach(x => a.tx.add(x.tx.id));
    if (it.kind !== 'fixed' && !it.ongoing) a.minutes.push(Number(it.minutes) || 0);
  })));
  const assets = [...assetMap.values()].sort((a, b) => a.step - b.step || a.name.localeCompare(b.name)).map(a => ({
    name: a.name, kind: a.kind, step: a.step, stepTitle: a.stepTitle, where: a.where, level: a.level, personas: a.personas, activities: a.tx.size,
    time: a.kind === 'fixed' ? `${a.range[0]}–${a.range[1]} min` : a.ongoing ? 'On demand' : (Math.min(...a.minutes) === Math.max(...a.minutes) ? formatMinutes(a.minutes[0]) : `${formatMinutes(Math.min(...a.minutes))} to ${formatMinutes(Math.max(...a.minutes))}`)
  }));
  const times = titled.map(p => p.totalMinutes);

  return {
    final: !openItems.length,
    openItems,
    assets,
    outcomes, processes,
    goLive: formatDate(init.needs.goLive),
    learningTime: times.length ? (Math.min(...times) === Math.max(...times) ? formatMinutes(times[0]) : `${formatMinutes(Math.min(...times))} to ${formatMinutes(Math.max(...times))}`) : '',
    measure: { owner: (measure.owner || '').trim(), baseline: formatDate(measure.baseline), review: formatDate(measure.review) },
    version: '0.1, ' + fmt(now),
    personaRows: people.map(p => {
      const path = titled.find(x => x.persona === p.persona);
      return { title: p.title, prof: p.prof, activities: path ? path.plan.length : 0, time: path ? path.total : '', assess: assessOf(init, p.persona, p.prof).length, recognition: path ? path.recognition : '' };
    }),
    platform: init.needs.name || 'Platform',
    ref: 'IDD-' + String(init.id).replace(/[^0-9a-z]/gi, '').slice(-4).toUpperCase().padStart(3, '0'),
    meta: [
      ['Initiative started', init.started || '[DD / MM / YYYY]'],
      ['Planned go-live', formatDate(init.needs.goLive) || '[DD / MM / YYYY]'],
      ['Prepared for', 'Platform vendor'],
      ['Document status', g.handoff ? 'Draft for approval' : 'Work in progress'],
      ['Version and date', '0.1, ' + fmt(now)]
    ],
    cycle: [
      ['01 Define', g.capability ? 'Complete' : 'Current'],
      ['02 Design', g.handoff ? 'Complete, hand-off point' : (g.reviewed ? 'Complete' : (g.capability ? 'Current' : 'Upcoming'))],
      ['03 Assess', g.assessConfirmed ? 'Complete' : (g.learning ? 'Current' : 'Upcoming')],
      ['04 Deploy', 'Upcoming'], ['05 Measure', 'Upcoming']
    ],
    summary: {
      personas: people.length,
      modesAssigned: `${people.filter(p => modesOf(init, p.persona, p.prof).length).length} of ${people.length}`,
      assessModes: assessKeys.length,
      assignments: people.reduce((a, p) => a + assessOf(init, p.persona, p.prof).length, 0),
      paths: paths.length, transactions: (init.paths.transactions || []).length,
      deviations: devs.length
    },
    needs: [
      ['Platform name', init.needs.name],
      ['Business outcome(s)', processList(init.needs.outcome).map((p, i) => `${i + 1}. ${p}`).join('\n')],
      ['Success measure', successMeasure(init.needs.outcome)],
      ['Critical processes', processList(init.needs.processes).map((p, i) => `${i + 1}. ${p}`).join('\n')]
    ],
    capability: init.rows.map((r, i) => ({
      num: String(i + 1).padStart(2, '0'), persona: (PROFILES[r.persona] || {}).title || r.persona, summary: (PROFILES[r.persona] || {}).summary || '',
      levels: DOMAINS.map(d => r.levels[d.key] || 'Pending'), overall: r.prof || 'Pending'
    })),
    deviations: devs,
    learning,
    families: MODE_FAMILIES,
    assessment: assessKeys.map(k => {
      const a = ASSESS_INFO[k] || { mode: k.split('|')[1], level: k.split('|')[0], evidence: '', source: '' };
      return { ...a, marks: people.map(p => assessOf(init, p.persona, p.prof).includes(k)) };
    }),
    assessTotals: people.map(p => assessOf(init, p.persona, p.prof).length),
    personas: people.map(p => ({ title: p.title, prof: p.prof })),
    paths: titled,
    modeLevel
  };
}
