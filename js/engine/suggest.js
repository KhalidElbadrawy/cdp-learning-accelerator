// Built-in suggestions, all rule-based (no external services):
//   suggestMapping  which personas perform each platform role (and role-less transaction)
//   pathInsights    a narrative, learning units and gaps for one persona's path
//   readinessCheck  a score and fix list for the Design Document before hand-off
// All three are deterministic rules over the initiative's own data.
import { LEVELS } from '../rules/framework.js';
import { PERSONA_ROLE_WORDS } from '../rules/workbook.js';
import { PROFILES } from '../rules/personas.js';
import { txLevel, rolesOf } from './transactions.js';
import { formatMinutes, parseDate } from './paths.js';
import { MODE_RULES } from '../rules/durations.js';

const escape = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const re = w => new RegExp(`(^|[^a-z0-9])${escape(w.trim())}${/\s$/.test(w) ? '(?![a-z])' : ''}`);
const matches = (words, text) => (words || []).filter(w => re(w).test(text));

// ---- Persona mapping ----
// Scores each selected persona against a role's name (strong) and its transactions (weaker).
// A persona is suggested when the role name points to it, or its transaction words clearly do.
// Super users also cover the roles of the people they support (end users and specialists).
function scoreRole(persona, roleName, txNames) {
  const rules = PERSONA_ROLE_WORDS[persona] || { role: [], tx: [] };
  const r = matches(rules.role, roleName.toLowerCase());
  const t = matches(rules.tx, txNames.join(' | ').toLowerCase());
  return { score: r.length * 3 + Math.min(t.length, 3), roleWords: r, txWords: t };
}

export function suggestMapping(paths, people) {
  const tx = paths.transactions || [];
  const keys = people.map(p => p.persona);
  const title = k => (PROFILES[k] || {}).title || k;
  const roles = rolesOf(tx).map(role => {
    const names = tx.filter(t => t.role === role).map(t => t.name);
    const scored = keys.map(k => ({ k, ...scoreRole(k, role, names) })).filter(x => x.score >= 2);
    let personas = scored.map(x => x.k);
    // Super users support the roles of end users and specialists.
    if (keys.includes('Super users') && !personas.includes('Super users') && personas.some(k => k === 'End users' || k === 'Specialist')) personas.push('Super users');
    const top = scored.sort((a, b) => b.score - a.score)[0];
    const reason = top
      ? (top.roleWords.length ? `"${role}" matches ${title(top.k)} ("${top.roleWords[0]}")` : `Its transactions match ${title(top.k)} ("${top.txWords[0]}")`) + (personas.includes('Super users') && top.k !== 'Super users' ? '; super users support this role.' : '.')
      : '';
    // Flag executive leaders on purely routine roles: they rarely perform transactional work.
    const remove = keys.filter(k => k === 'Executive Leader' && paths.roleMap?.[k]?.[role] && !personas.includes(k) && tx.filter(t => t.role === role).every(t => txLevel(t) === 'Essential'));
    return { role, personas, remove, reason: remove.length && !reason ? 'Executive leaders rarely perform routine transactions.' : reason, confidence: top && top.roleWords.length ? 'high' : 'medium' };
  }).filter(r => r.personas.length || r.remove.length);
  const transactions = tx.filter(t => !t.role).map(t => {
    const scored = keys.map(k => ({ k, ...scoreRole(k, '', [t.name]) })).filter(x => x.txWords.length);
    return { id: t.id, personas: scored.map(x => x.k), reason: scored.length ? `"${scored[0].txWords[0]}" fits ${title(scored[0].k)}.` : '' };
  }).filter(t => t.personas.length);
  return { roles, transactions };
}

// ---- Path insights ----
const STEP_LIMIT = 240; // minutes; a longer step is worth splitting

export function pathInsights(path) {
  const plan = path.plan || [];
  const byLevel = LEVELS.map(l => [l, plan.filter(p => p.level === l).length]).filter(([, n]) => n);
  const main = byLevel.slice().sort((a, b) => b[1] - a[1])[0];
  const step = k => path.steps.find(s => s.key === k) || { items: [] };
  const names = k => step(k).items.map(i => i.label);
  const join = list => (list.length > 1 ? `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}` : list[0] || '');
  const narrative = plan.length
    ? `${path.title} learns ${plan.length} activit${plan.length === 1 ? 'y' : 'ies'} across ${path.workflows} process${path.workflows === 1 ? '' : 'es'}, mostly at ${main ? main[0] : path.prof} level. ` +
      `They build proficiency through ${join(names('build')) || 'the selected modes'}, gain confidence with ${join(names('confidence')) || 'guided practice'}, ` +
      `and prove readiness through ${join(names('prove')) || 'the selected assessments'} before go-live, earning a ${path.recognition.toLowerCase()}. ` +
      `Total learning time is about ${formatMinutes(path.totalMinutes)}.`
    : `${path.title} has no activities mapped yet.`;

  // Learning units: one per workflow, simplest first (Essential before Advanced), then by size.
  const wf = new Map();
  plan.forEach(p => { const k = p.tx.workflow || 'Other activities'; if (!wf.has(k)) wf.set(k, []); wf.get(k).push(p); });
  const units = [...wf.entries()].map(([k, list]) => ({
    title: k, transactions: list.sort((a, b) => LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level)).map(p => p.tx.name),
    top: Math.max(...list.map(p => LEVELS.indexOf(p.level))), n: list.length
  })).sort((a, b) => a.top - b.top || b.n - a.n).slice(0, 6)
    .map(u => ({ kind: 'activities', title: u.title, transactions: u.transactions, why: `${u.n} activit${u.n === 1 ? 'y' : 'ies'}, up to ${LEVELS[u.top]} level.` }));
  // The journey's fixed assets (awareness and role microlearning) come first: every persona takes them.
  const fixedUnits = plan.length ? path.steps.flatMap(s => s.items.filter(i => i.kind === 'fixed').map(i => ({
    kind: 'fixed', title: i.label, transactions: [], detail: `“${s.voice}”`,
    why: `Step ${s.n}, ${s.title}: ${i.range[0]}–${i.range[1]} min, ${i.where}.`
  }))) : [];
  units.unshift(...fixedUnits);

  const gaps = [];
  path.steps.forEach(s => { if (s.minutes > STEP_LIMIT) gaps.push(`${s.title} takes ${formatMinutes(s.minutes)}; consider splitting it into shorter sessions.`); });
  const practice = ['Practice environment', 'Scenario-based learning', 'Instructor-led workshop', 'Case study learning', 'Coaching'];
  const advanced = plan.filter(p => p.level === 'Advanced');
  if (advanced.length && !advanced.some(p => p.modes.some(m => practice.includes(m)))) gaps.push(`${advanced.length} Advanced activit${advanced.length === 1 ? 'y has' : 'ies have'} no live or sandbox practice.`);
  const proveLevels = new Set(step('prove').items.map(i => i.level));
  LEVELS.forEach(l => { if (plan.some(p => p.level === l) && !proveLevels.has(l)) gaps.push(`No assessment covers the ${l} activities.`); });
  if (path.gaps?.length) gaps.push(`${path.gaps.length} activit${path.gaps.length === 1 ? 'y uses' : 'ies use'} framework default modes because no selected mode fits its level.`);
  if (path.unusedModes?.length) gaps.push(`${join(path.unusedModes)} ${path.unusedModes.length === 1 ? 'is' : 'are'} selected but no mapped activity uses ${path.unusedModes.length === 1 ? 'it' : 'them'}.`);
  if (!step('build').items.length) gaps.push('No learning mode builds proficiency for this persona.');
  return { narrative, units, gaps: gaps.slice(0, 5) };
}

// ---- Readiness check (Design Document) ----
const WEEKS_NEEDED = { Essential: 3, Proficient: 4, Advanced: 6 };

export function readinessCheck(doc, init, now = Date.now()) {
  const issues = [];
  const add = (severity, section, issue, fix) => issues.push({ severity, section, issue, fix });
  doc.deviations.forEach(d => add('high', 'Deviation register', `${d.id} (${d.persona}, ${d.kind.toLowerCase()} "${d.item}") has no rationale or decision yet.`, 'Record the rationale and the decision with the approver before hand-off.'));
  if (!doc.paths.length) add('high', 'Learning paths', 'Learning paths have not been generated.', 'Generate and review the learning paths.');
  if (!init.pathsConfirmed) add('medium', 'Learning paths', 'The learning paths are not confirmed yet.', 'Review every persona\'s path and confirm them.');
  doc.paths.forEach(p => {
    if (p.totalMinutes > 20 * 60) add('medium', 'Learning paths', `${p.title}'s path is ${p.total}, which is long for ${p.plan.length} transactions.`, 'Check the minutes on its longest steps.');
    if (p.gaps?.length) add('low', 'Learning paths', `${p.title}: ${p.gaps.length} transaction(s) fall back to default modes.`, 'Select a learning mode for that level on the path.');
  });
  const goLive = parseDate(init.needs.goLive);
  if (goLive) {
    const weeks = (goLive.getTime() - now) / (7 * 864e5);
    doc.personas.forEach(p => {
      const need = WEEKS_NEEDED[p.prof] || 3;
      if (weeks < need) add('high', 'Timeline', `Go-live is ${weeks < 0 ? 'in the past' : `${Math.max(0, Math.floor(weeks))} week(s) away`}, but the ${p.prof} path for ${p.title} starts ${need} weeks before go-live.`, 'Move the go-live date or shorten the pre-go-live steps.');
    });
  }
  const assessed = new Set(doc.assessment.map(a => a.level));
  doc.personas.forEach((p, i) => { if (!doc.assessTotals[i]) add('high', 'Assessment', `${p.title} has no assessment modes.`, 'Select assessment modes for this persona.'); });
  if (!assessed.size) add('high', 'Assessment', 'No assessment modes are selected.', 'Select assessment modes in the Assess phase.');
  const order = { high: 0, medium: 1, low: 2 };
  issues.sort((a, b) => order[a.severity] - order[b.severity]);
  const score = Math.max(0, 100 - issues.reduce((s, x) => s + (x.severity === 'high' ? 12 : x.severity === 'medium' ? 6 : 3), 0));
  const verdict = !issues.length ? 'Ready for the vendor: no open issues.'
    : issues.some(x => x.severity === 'high') ? `Not ready yet: ${issues.filter(x => x.severity === 'high').length} high-priority item(s) to resolve before hand-off.`
    : 'Nearly ready: a few improvements are recommended before hand-off.';
  return { score, verdict, issues: issues.slice(0, 10) };
}

export const _modeRules = MODE_RULES;
