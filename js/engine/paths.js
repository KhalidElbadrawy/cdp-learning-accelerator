// Learning path generation. Every path follows the common journey; the persona's learning and
// assessment modes fill steps 3 to 6, and each transaction is taught through the modes that fit
// the transaction's own level:
//   - a transaction at or below the persona's level uses the persona's selected modes up to that level;
//   - an accepted above-level transaction uses the framework's default modes for its level
//     (flagged as a deviation, as elsewhere in the tool).
import { LEVELS } from '../rules/framework.js';
import { JOURNEY, TIMELINE, PERSONA_PLAN } from '../rules/workbook.js';
import { MODE_RULES, ASSESS_MINUTES, DEFAULT_MODE_RULE } from '../rules/durations.js';
import { modesUpToLevel, defaultModes, assessUpToLevel, defaultAssess, ASSESS_INFO, modeLevel } from './modes.js';
import { personaTransactions, levelConflicts } from './mapping.js';
import { txLevel } from './transactions.js';

const ruleFor = mode => MODE_RULES[mode] || DEFAULT_MODE_RULE;
const wf = t => t.workflow || '(No process)';

// Minutes for one mode given the transactions it teaches.
export function modeMinutes(mode, txs) {
  const r = ruleFor(mode);
  if (r.ongoing || !txs.length) return 0;
  const workflows = new Set(txs.map(wf)).size;
  let m = (r.perTx || 0) * txs.length + (r.perWorkflow || 0) * workflows + (r.fixed || 0);
  if (r.session) m += r.session * Math.max(1, Math.ceil(workflows / (r.perSessions || 1)));
  return Math.round(m);
}

// How each mapped transaction is taught and assessed for this persona.
export function transactionPlan(paths, ctx) {
  const { persona, prof, modes, assess } = ctx;
  const accepted = new Set(levelConflicts(paths, persona, prof).filter(c => c.decision === 'accept').map(c => c.tx.id));
  return personaTransactions(paths, persona).map(t => {
    const level = LEVELS.includes(txLevel(t)) ? txLevel(t) : prof;
    const above = LEVELS.indexOf(level) > LEVELS.indexOf(prof);
    let txModes, txAssess, gap = false;
    if (above) {
      txModes = defaultModes(level);
      txAssess = defaultAssess(level);
    } else {
      txModes = modesUpToLevel(modes, level);
      txAssess = assessUpToLevel(assess, level);
      // The persona unticked every mode for this level: fall back to the framework's defaults.
      if (!txModes.length) { txModes = defaultModes(level); gap = true; }
    }
    return { tx: t, level, above, accepted: accepted.has(t.id), modes: txModes, assess: txAssess, gap };
  });
}

function weeksFor(prof, stepKey) {
  return (TIMELINE[prof] || TIMELINE.Essential)[stepKey] || null;
}

// Builds the persona's path. `edits` = { durations: {mode: minutes} } from the user's review.
export function generatePath(paths, ctx, edits = {}) {
  const { persona, prof } = ctx;
  const plan = transactionPlan(paths, ctx);
  const durations = edits.durations || {};
  const modeTx = new Map();
  plan.forEach(p => p.modes.forEach(m => { if (!modeTx.has(m)) modeTx.set(m, []); modeTx.get(m).push(p.tx); }));

  const steps = JOURNEY.map(j => {
    const step = { n: j.n, key: j.key, title: j.title, voice: j.voice, weeks: weeksFor(prof, j.key), items: [], indicative: [] };
    if (j.source === 'fixed') {
      step.items.push({ kind: 'fixed', label: j.fixed.asset, where: j.fixed.where, minutes: j.fixed.minutes[1], range: j.fixed.minutes, txCount: 0 });
    } else if (j.source === 'modes') {
      [...modeTx.keys()].filter(m => ruleFor(m).step === j.key).forEach(m => {
        const txs = modeTx.get(m);
        const auto = modeMinutes(m, txs);
        const minutes = durations[m] != null ? Number(durations[m]) : auto;
        step.items.push({ kind: 'mode', label: m, where: ruleFor(m).where, minutes, auto, edited: durations[m] != null,
          ongoing: !!ruleFor(m).ongoing, txCount: txs.length, workflows: new Set(txs.map(wf)).size, level: modeLevel(m) });
      });
    } else if (j.source === 'assessment') {
      const keys = [...new Set(plan.flatMap(p => p.assess))];
      keys.map(k => ASSESS_INFO[k]).filter(Boolean)
        .sort((a, b) => LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level))
        .forEach(a => {
          const txCount = plan.filter(p => p.assess.includes(a.key)).length;
          const auto = ASSESS_MINUTES[a.level] || 15;
          const minutes = durations[a.key] != null ? Number(durations[a.key]) : auto;
          step.items.push({ kind: 'assessment', key: a.key, label: a.mode, level: a.level, evidence: a.evidence, source: a.source, minutes, auto, edited: durations[a.key] != null, txCount });
        });
    }
    if (j.indicative) {
      LEVELS.slice(0, LEVELS.indexOf(prof) + 1).forEach(l => { if (j.indicative[l]) step.indicative.push({ level: l, asset: j.indicative[l][0], where: j.indicative[l][1] }); });
    }
    step.minutes = step.items.filter(i => !i.ongoing).reduce((a, i) => a + (Number(i.minutes) || 0), 0);
    return step;
  });

  const totalMinutes = steps.reduce((a, s) => a + s.minutes, 0);
  const workflows = new Set(plan.map(p => wf(p.tx))).size;
  return {
    persona, prof,
    objective: PERSONA_PLAN[persona]?.objective || '',
    recognition: PERSONA_PLAN[persona]?.recognition || (prof === 'Advanced' ? 'Certification' : 'Persona badge'),
    steps, plan, totalMinutes, workflows,
    counts: LEVELS.reduce((o, l) => ({ ...o, [l]: plan.filter(p => p.level === l).length }), {}),
    deviations: plan.filter(p => p.above).map(p => ({ tx: p.tx.name, level: p.level, accepted: p.accepted })),
    gaps: plan.filter(p => p.gap).map(p => p.tx.name),
    // Selected modes no mapped transaction uses (e.g. a Proficient mode when every transaction is Essential).
    unusedModes: (ctx.modes || []).filter(m => !modeTx.has(m))
  };
}

// A time range such as 3–5 min or 3–6 h.
export function formatRange([a, b]) {
  if (b < 60) return `${a}–${b} min`;
  if (a % 60 === 0 && b % 60 === 0) return `${a / 60}–${b / 60} h`;
  return `${formatMinutes(a)} to ${formatMinutes(b)}`;
}

// How long one journey item takes, as shown everywhere: a range, on demand, or minutes.
export function itemTime(it) {
  if (it.ongoing) return 'on demand';
  if (it.range) return formatRange(it.range);
  return formatMinutes(it.minutes);
}

export function formatMinutes(m) {
  m = Math.round(Number(m) || 0);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60), r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}

// Dates for the timeline: week N before go-live starts 7×N days earlier; week 1 starts on go-live.
export function weekStart(goLive, week) {
  const d = parseDate(goLive);
  if (!d) return null;
  const offset = week < 0 ? week * 7 : (week - 1) * 7;
  return new Date(d.getTime() + offset * 864e5);
}

export function formatDate(s) {
  const d = parseDate(s);
  return d ? d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '';
}

export function parseDate(s) {
  if (!s) return null;
  if (s instanceof Date) return isNaN(s) ? null : s;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s));
  if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  const d = new Date(s);
  return isNaN(d) ? null : d;
}
