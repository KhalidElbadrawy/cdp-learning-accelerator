// Rafeeq, the AI assistant (by CDP L&K). Pure functions only: each task builds a prompt from the
// initiative and checks the answer, so nothing invalid reaches the screen. Rafeeq only suggests;
// the user accepts or dismisses every suggestion. The built-in rules keep working without it.
import { LEVELS, DOMAINS, LEVEL_QUESTIONS } from '../rules/framework.js';
import { PERSONAS, PROFILES } from '../rules/personas.js';
import { CONTENT_TYPES, CONTENT_TYPE_NAMES } from '../rules/workbook.js';
import { processList, profiledPersonas } from './initiative.js';
import { txType, txLevel, rolesOf } from './transactions.js';
import { formatMinutes } from './paths.js';

const ROLE = 'You are Rafeeq, the learning design assistant in the CDP Learning Accelerator used by Common Digital Platforms (CDP) to plan how people learn a new government platform. Write in clear, plain British English. Never invent facts about the platform that the input does not support.';
const clip = (s, n = 400) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);
const json = x => JSON.stringify(x);
const title = key => (PROFILES[key] || {}).title || key;

// ---- 1. Business Needs: measurable outcomes and critical processes ----
export function needsPrompt(init) {
  const n = init.needs;
  return `${ROLE}
Task: improve the Business Needs of a platform initiative.
1. Rewrite each business outcome so it is specific and measurable (a direction and, where sensible, a placeholder target such as "from [X] to [Y] days"). Keep the meaning.
2. Suggest up to 3 additional end-to-end critical processes the platform is likely to support, only if they are plausible from the input. Do not repeat existing ones.
Input: ${json({ platform: clip(n.name, 120), outcomes: processList(n.outcome).map(o => clip(o, 200)), processes: processList(n.processes).map(p => clip(p, 200)) })}
Answer with JSON only: {"outcomes":[{"index":0,"text":"...","why":"..."}],"processes":[{"text":"...","why":"..."}]}. "index" is the position of the outcome you rewrote. Keep each "why" under 20 words.`;
}
export function checkNeeds(ans, init) {
  const outs = processList(init.needs.outcome), procs = processList(init.needs.processes).map(p => p.toLowerCase());
  const outcomes = (Array.isArray(ans?.outcomes) ? ans.outcomes : [])
    .filter(o => Number.isInteger(o.index) && o.index >= 0 && o.index < outs.length && clip(o.text, 300))
    .map(o => ({ index: o.index, text: clip(o.text, 300), why: clip(o.why, 160), from: outs[o.index] }))
    .filter(o => o.text.toLowerCase() !== o.from.toLowerCase());
  const processes = (Array.isArray(ans?.processes) ? ans.processes : [])
    .map(p => ({ text: clip(p.text, 200), why: clip(p.why, 160) }))
    .filter(p => p.text && !procs.includes(p.text.toLowerCase())).slice(0, 3);
  return { outcomes, processes };
}

// ---- 2. Persona Selection ----
export function personasPrompt(init) {
  const n = init.needs;
  return `${ROLE}
Task: suggest which CDP personas this platform affects.
Platform: ${json({ name: clip(n.name, 120), outcomes: processList(n.outcome).map(o => clip(o, 200)), processes: processList(n.processes).map(p => clip(p, 200)) })}
Personas (key: summary): ${json(PERSONAS.map(k => ({ key: k, title: title(k), summary: clip(PROFILES[k].summary, 220) })))}
Already selected: ${json(init.rows.map(r => r.persona))}
Answer with JSON only: {"personas":[{"key":"<exact key>","why":"..."}]}. Suggest only personas that are not already selected and that the platform clearly affects. Keep each "why" under 20 words.`;
}
export function checkPersonas(ans, init) {
  const have = new Set(init.rows.map(r => r.persona));
  const seen = new Set();
  return { personas: (Array.isArray(ans?.personas) ? ans.personas : [])
    .filter(p => PROFILES[p.key] && !have.has(p.key) && !seen.has(p.key) && seen.add(p.key))
    .map(p => ({ key: p.key, title: title(p.key), why: clip(p.why, 160) })) };
}

// ---- 3. Proficiency: a level per domain, with a reason ----
export function proficiencyPrompt(init, persona) {
  const p = PROFILES[persona] || {};
  return `${ROLE}
Task: recommend the proficiency this persona needs after go-live in each of four capability domains, for this platform.
Levels: Essential = routine activities with guidance; Proficient = applies the capability independently in real scenarios; Advanced = uses judgement in complex or non-routine situations.
The questions behind the levels: ${json(LEVEL_QUESTIONS)}
Platform: ${json({ name: clip(init.needs.name, 120), outcomes: processList(init.needs.outcome).map(o => clip(o, 200)), processes: processList(init.needs.processes).map(x => clip(x, 200)) })}
Persona: ${json({ title: p.title, summary: clip(p.summary, 300), libraryDefault: p.prof, roles: clip(p.roles, 200) })}
Domains: ${json(DOMAINS.map(d => ({ key: d.key, name: d.name })))}
Answer with JSON only: {"domains":{"platform":{"level":"Essential|Proficient|Advanced","why":"..."},"role":{...},"process":{...},"support":{...}}}. Keep each "why" under 20 words.`;
}
export function checkProficiency(ans) {
  const out = {};
  DOMAINS.forEach(d => {
    const x = ans?.domains?.[d.key];
    if (x && LEVELS.includes(x.level)) out[d.key] = { level: x.level, why: clip(x.why, 160) };
  });
  return Object.keys(out).length === DOMAINS.length ? { domains: out } : { domains: {} };
}
// Answers that put a domain at a level (the first "No" sets the level; all "Yes" is Advanced).
export function answersForLevel(level) {
  return level === 'Advanced' ? [true, true, true] : (level === 'Proficient' ? [true, true, false] : [true, false, null]);
}

// ---- 4. Classify: second opinion on rows the rules are unsure about ----
export const needsSecondOpinion = t => t.auto.confidence === 'low' || t.auto.type === 'Manual review';
export function classifyPrompt(txs) {
  return `${ROLE}
Task: classify platform activities into one of three content types, which set the proficiency needed.
Content types: ${json(CONTENT_TYPE_NAMES.map(k => ({ type: k, level: CONTENT_TYPES[k].level, test: CONTENT_TYPES[k].question })))}
Activities: ${json(txs.slice(0, 60).map(t => ({ id: t.id, activity: clip(t.name, 140), process: clip(t.workflow, 80), role: clip(t.role, 80), rulesSaid: t.auto.type })))}
Answer with JSON only: {"items":[{"id":"<id>","type":"<one of the three types>","why":"..."}]}. One item per activity. Keep each "why" under 15 words.`;
}
export function checkClassify(ans, txs) {
  const ids = new Set(txs.map(t => t.id));
  const byId = new Map(txs.map(t => [t.id, t]));
  return { items: (Array.isArray(ans?.items) ? ans.items : [])
    .filter(x => ids.has(x.id) && CONTENT_TYPES[x.type])
    .map(x => ({ id: x.id, name: byId.get(x.id).name, type: x.type, level: CONTENT_TYPES[x.type].level, why: clip(x.why, 140), current: txType(byId.get(x.id)) }))
    .filter(x => x.type !== x.current) };
}

// ---- 5. Map personas to platform roles ----
export function mappingPrompt(paths, people) {
  const tx = paths.transactions || [];
  const roles = rolesOf(tx).slice(0, 40).map(r => ({ role: clip(r, 80), activities: tx.filter(t => t.role === r).slice(0, 6).map(t => clip(t.name, 80)) }));
  return `${ROLE}
Task: decide which personas perform each platform role.
Personas: ${json(people.map(p => ({ key: p.persona, title: p.title, level: p.prof, summary: clip(PROFILES[p.persona]?.summary, 200) })))}
Roles with sample activities: ${json(roles)}
Answer with JSON only: {"roles":[{"role":"<exact role>","personas":["<persona key>"],"why":"..."}]}. Include only roles you can match with confidence. Keep each "why" under 15 words.`;
}
export function checkMapping(ans, paths, people) {
  const roles = new Set(rolesOf(paths.transactions || []));
  const keys = new Set(people.map(p => p.persona));
  return { roles: (Array.isArray(ans?.roles) ? ans.roles : [])
    .filter(r => roles.has(r.role))
    .map(r => ({ role: r.role, personas: [...new Set((Array.isArray(r.personas) ? r.personas : []).filter(k => keys.has(k)))], why: clip(r.why, 140) }))
    .map(r => ({ ...r, personas: r.personas.filter(k => !paths.roleMap?.[k]?.[r.role]) }))
    .filter(r => r.personas.length) };
}

// ---- 6. Learning path: narrative and unit names ----
export function pathPrompt(path, insights) {
  return `${ROLE}
Task: polish how this persona's learning path is described in the Design Document.
1. Rewrite the narrative in 2 to 3 sentences, warm but precise, for a vendor and a sponsor. Keep every fact (activities, modes, assessments, recognition, learning time).
2. Give each learning unit a clearer title (max 6 words) that says what the learner can do. Keep "Awareness microlearning" and "Role microlearning" as they are.
Path: ${json({ persona: path.title, level: path.prof, objective: clip(path.objective, 200), recognition: path.recognition, learningTime: formatMinutes(path.totalMinutes), narrative: clip(insights.narrative, 900), units: insights.units.map(u => ({ title: clip(u.title, 80), activities: u.transactions.slice(0, 8).map(n => clip(n, 80)) })) })}
Answer with JSON only: {"narrative":"...","units":[{"from":"<original title>","title":"<new title>"}]}`;
}
export function checkPath(ans, insights) {
  const titles = new Set(insights.units.map(u => u.title));
  const narrative = clip(ans?.narrative, 900);
  const units = (Array.isArray(ans?.units) ? ans.units : [])
    .filter(u => titles.has(u.from) && clip(u.title, 60) && !/microlearning/i.test(u.from))
    .map(u => ({ from: u.from, title: clip(u.title, 60) }))
    .filter(u => u.title !== u.from);
  return { narrative, units };
}

// Accepted path wording replaces the built-in narrative and unit titles, as long as the path has
// not changed since (the built-in narrative it was written from must still match).
export function applyPolish(ins, polish) {
  if (!polish || polish.base !== ins.narrative) return { ...ins, polished: false };
  return { ...ins, narrative: polish.narrative || ins.narrative, units: ins.units.map(u => ({ ...u, title: (polish.units || {})[u.title] || u.title })), polished: true };
}

// ---- 7. Ask Rafeeq: questions about the open initiative ----
export function askContext(init, screen) {
  if (!init) return { screen, initiative: null };
  const people = profiledPersonas(init);
  return {
    screen,
    platform: clip(init.needs.name, 120),
    goLive: init.needs.goLive || null,
    outcomes: processList(init.needs.outcome).map(o => clip(o, 160)),
    processes: processList(init.needs.processes).map(p => clip(p, 160)),
    personas: init.rows.map(r => ({ persona: title(r.persona), level: r.prof || 'not set', domains: r.levels })),
    activities: (init.paths.transactions || []).slice(0, 40).map(t => ({ activity: clip(t.name, 80), process: clip(t.workflow, 60), role: clip(t.role, 60), type: txType(t), level: txLevel(t) })),
    learningModes: Object.fromEntries(people.map(p => [p.title, (init.modes[p.persona] || []).slice(0, 13)]))
  };
}
// Does the question ask about a specific initiative (rather than the framework in general)?
export function asksAboutInitiative(question, init) {
  const q = String(question || '').toLowerCase();
  if (init && init.needs && init.needs.name && q.includes(String(init.needs.name).toLowerCase())) return true;
  return /\b(my|our|this|the current|current)\s+(initiative|platform|project|programme|program|rollout|personas?|learning paths?|paths?|design document|activities|timeline|go-live)\b/.test(q)
    || /\bapply\b[^.?!]*\b(to|in|for|on)\b/.test(q)
    || /\b(for|in) (us|my case|our case)\b/.test(q);
}

// General questions get a generic answer with no initiative data. Initiative details are sent only
// when they can matter: on Home only if the question is about an initiative; elsewhere always, with
// an instruction to use them only when the question asks how something applies to that initiative.
export function askMessages(init, screen, history, question) {
  const include = !!init && (screen !== 'dash' || asksAboutInitiative(question, init));
  const intro = `${ROLE}
You answer questions about the CDP Learning Framework and how to apply it. The framework has five phases: Define (business needs, personas, proficiency, Capability Architecture), Design (learning modes, then learning paths and the Design Document), Assess (assessment modes, readiness evidence), Deploy and Measure. Proficiency levels: Essential, Proficient, Advanced. Activities are classified as Procedures (Essential), Practice & Observation (Proficient) or Judgement & Governance (Advanced). Each persona's learning path follows six steps: understand the change, clarify the role, build proficiency, build confidence, prove readiness and proficiency, sustain performance.
Keep answers short (under 150 words) and practical. You cannot change anything in the tool yourself; tell the user where in the tool to make a change.
${include
    ? `How to answer: if the question is about the framework or a concept in general, answer generically and do not mention the initiative below or its data. Only when the question asks how something applies to this initiative (its platform, personas, activities, paths or timeline), tailor the answer to the initiative.
Initiative: ${json(askContext(init, screen))}`
    : 'How to answer: answer generically about the framework. No specific initiative is being discussed, so do not invent platform names, personas or data.'}`;
  const turns = history.slice(-8).map(m => ({ role: m.role, content: clip(m.content, 2000) }));
  return [{ role: 'user', content: intro + '\n\nReply "Ready." to confirm.' }, { role: 'assistant', content: 'Ready.' }, ...turns, { role: 'user', content: clip(question, 1500) }];
}

// ---- 8. Lesson plan: a course-style syllabus for each learning unit ----
export const LESSON_TYPES = ['Video', 'Interactive walkthrough', 'Sandbox practice', 'Scenario', 'Live session', 'Job aid', 'Quiz', 'Discussion', 'On-the-job task'];

// What each unit may use: its activities, the modes that teach them and the assessments that cover them.
export function unitSpecs(path, insights) {
  const byName = new Map((path.plan || []).map(p => [p.tx.name, p]));
  const fixed = new Map(path.steps.flatMap(s => s.items.filter(i => i.kind === 'fixed').map(i => [i.label, { ...i, step: s.title }])));
  return insights.units.map(u => {
    if (u.kind === 'fixed') {
      const f = fixed.get(u.title) || {};
      return { unit: u.title, kind: 'fixed', activities: [], modes: [u.title], assessments: [], minutes: f.range ? `${f.range[0]}-${f.range[1]} min` : '', delivery: f.where || 'LMS' };
    }
    const plans = u.transactions.map(n => byName.get(n)).filter(Boolean);
    return {
      unit: u.title, kind: 'activities',
      activities: plans.map(p => ({ activity: p.tx.name, level: p.level })),
      modes: [...new Set(plans.flatMap(p => p.modes))],
      assessments: [...new Set(plans.flatMap(p => p.assess.map(k => k.split('|')[1])))]
    };
  });
}
// Fingerprint of the units a plan was written for; a changed path makes the saved plan stale.
export const lessonBase = specs => specs.map(s => s.unit + ':' + s.activities.map(a => a.activity).join(',')).join('|');

export function lessonPlanPrompt(path, specs) {
  const modeTimes = Object.fromEntries(path.steps.flatMap(s => s.items.filter(i => i.kind !== 'fixed' && !i.ongoing).map(i => [i.label, Math.round(i.minutes)])));
  return `${ROLE}
Task: design the lesson plan for each learning unit of this persona's learning path, like a world-class course syllabus (LinkedIn Learning, Coursera): clear outcomes, short lessons, varied formats, practice, then assessment.
Rules:
- One entry per unit, in the same order. Keep "unit" exactly as given; you may add a learner-friendly "title" (max 7 words).
- 2 to 5 lessons per unit (1 to 2 for units of kind "fixed"). Each lesson uses one of the unit's "modes" exactly as written, and a "type" from: ${json(LESSON_TYPES)}.
- Lessons cover the unit's activities; list which activities each lesson covers using the exact activity names.
- Lesson minutes are realistic for the type; keep each unit near the time its modes allow (minutes per mode for the whole path: ${json(modeTimes)}).
- "assessment" uses one of the unit's "assessments" exactly as written; omit it if the unit has none.
- "experience" is one sentence in the learner's voice describing how the unit feels.
Persona: ${json({ persona: path.title, level: path.prof, objective: clip(path.objective, 200) })}
Units: ${json(specs.map(s => ({ ...s, activities: s.activities.map(a => `${clip(a.activity, 80)} (${a.level})`) })))}
Answer with JSON only: {"units":[{"unit":"<exact>","title":"...","outcomes":["..."],"lessons":[{"title":"...","type":"...","mode":"<exact mode>","minutes":5,"activities":["<exact activity>"],"description":"what the learner does, one sentence"}],"assessment":{"mode":"<exact>","task":"what the learner does","evidence":"what proves readiness"},"experience":"..."}]}`;
}

export function checkLessonPlan(ans, specs) {
  const want = new Map(specs.map(s => [s.unit, s]));
  const units = [];
  (Array.isArray(ans?.units) ? ans.units : []).forEach(u => {
    const spec = want.get(u.unit);
    if (!spec || units.some(x => x.unit === u.unit)) return;
    const acts = new Map(spec.activities.map(a => [a.activity.toLowerCase(), a.activity]));
    const modes = new Map(spec.modes.map(m => [m.toLowerCase(), m]));
    const lessons = (Array.isArray(u.lessons) ? u.lessons : []).slice(0, 6).map(l => ({
      title: clip(l.title, 90), type: LESSON_TYPES.includes(l.type) ? l.type : 'Job aid',
      mode: modes.get(String(l.mode || '').toLowerCase()) || '',
      minutes: Math.max(1, Math.min(240, Math.round(Number(l.minutes) || 5))),
      activities: (Array.isArray(l.activities) ? l.activities : []).map(a => acts.get(String(a).toLowerCase())).filter(Boolean),
      description: clip(l.description, 220)
    })).filter(l => l.title);
    if (!lessons.length) return;
    const am = u.assessment && spec.assessments.find(a => a.toLowerCase() === String(u.assessment.mode || '').toLowerCase());
    units.push({
      unit: spec.unit, kind: spec.kind, title: clip(u.title, 70) || spec.unit,
      outcomes: (Array.isArray(u.outcomes) ? u.outcomes : []).map(o => clip(o, 160)).filter(Boolean).slice(0, 4),
      lessons,
      activities: spec.activities.map(a => a.activity),
      assessment: am ? { mode: am, task: clip(u.assessment.task, 200), evidence: clip(u.assessment.evidence, 160) } : null,
      experience: clip(u.experience, 220)
    });
  });
  return { units: specs.map(s => units.find(u => u.unit === s.unit)).filter(Boolean) };
}
