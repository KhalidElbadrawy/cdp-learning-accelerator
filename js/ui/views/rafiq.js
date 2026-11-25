// Rafeeq in the interface: the suggestion card used on each screen, and the "Ask Rafeeq" panel.
// Everything here renders nothing when Rafeeq is unavailable, so the app looks as before.
import { esc, icon, each, when, levelChip } from '../dom.js';
import { DOMAINS } from '../../rules/framework.js';

// Rafeeq's icon: a speech bubble (a companion you talk to) holding a spark (AI).
export const rafiqIcon = (size = 16) => `<svg class="rq-icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" aria-hidden="true">
  <path d="M5.5 4h13A2.5 2.5 0 0 1 21 6.5v8a2.5 2.5 0 0 1-2.5 2.5H13l-4.6 3.4c-.4.3-.9 0-.9-.4V17h-2A2.5 2.5 0 0 1 3 14.5v-8A2.5 2.5 0 0 1 5.5 4Z" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/>
  <path class="rq-star" d="M12 6.6l1.05 2.6 2.6 1.05-2.6 1.05L12 13.9l-1.05-2.6-2.6-1.05 2.6-1.05Z" fill="#fff"/></svg>`;
// Rafeeq's "R" monogram, drawn as one continuous pen stroke (up the stem, round the bowl, out along the leg) so it can write itself.
export const rafiqR = (size = 16, cls = '') => `<svg class="rq-r ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path pathLength="1" d="M8 19V5h4.8a3.9 3.9 0 0 1 0 7.8H8l8.6 6.2" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
export const rafiqMark = (size = 22) => `<span class="rafiq-mark" style="width:${size}px;height:${size}px" aria-hidden="true">${rafiqR(Math.round(size * 0.62))}</span>`;

// A suggestion card. `render(data)` draws the suggestions; an empty result says so.
export function rafiqCard(s, task, { heading, intro, cta, render, isEmpty }) {
  if (!s.rafiq || !s.rafiq.on) return '';
  const r = s.rafiq.results[task];
  const head = `<div class="rafiq-head">${rafiqMark()}<div class="stack" style="gap:0"><b>${esc(heading)}</b><span class="tiny">Suggested by Rafeeq · nothing changes until you accept</span></div>
    ${when(r && r.status !== 'loading', `<button class="btn small ghost" style="margin-left:auto" data-act="rafiq-dismiss" data-task="${esc(task)}">Close</button>`)}</div>`;
  let body;
  if (!r) body = `<div class="row between" style="gap:12px"><span class="small" style="flex:1 1 280px">${esc(intro)}</span><button class="btn small rafiq-btn" data-act="rafiq-run" data-task="${esc(task)}">${icon('spark', 14)} ${esc(cta)}</button></div>`;
  else if (r.status === 'loading') body = `<div class="row"><span class="spinner"></span><span class="small">Rafeeq is thinking…</span></div>`;
  else if (r.status === 'error') body = `<div class="row between"><span class="small" style="color:var(--quantum-pale)">${esc(r.error)}</span><button class="btn small ghost" data-act="rafiq-run" data-task="${esc(task)}">Try again</button></div>`;
  else if (isEmpty(r.data)) body = `<span class="small">Rafeeq has nothing to change here. It looks good as it is.</span>`;
  else body = render(r.data);
  return `<div class="rafiq-card" data-rafiq="${esc(task)}">${head}${body}</div>`;
}

const accept = (task, kind, idx, label = 'Accept') => `<button class="btn small rafiq-btn" data-act="rafiq-accept" data-task="${esc(task)}" data-kind="${kind}" data-idx="${idx}">${label}</button>`;
const acceptAll = (task, label = 'Accept all') => `<button class="btn small ghost" data-act="rafiq-accept" data-task="${esc(task)}" data-kind="all">${label}</button>`;
const why = w => (w ? `<span class="tiny">${esc(w)}</span>` : '');

export const renderNeeds = task => d => `<div class="stack" style="gap:10px">
  ${when(d.outcomes.length, `<b class="small" style="color:var(--text)">Sharper business outcomes</b>${each(d.outcomes, (o, i) => `<div class="rafiq-row"><div class="stack" style="gap:3px;flex:1;min-width:0"><span class="tiny" style="text-decoration:line-through">${o.index + 1}. ${esc(o.from)}</span><span class="small" style="color:var(--text)">${o.index + 1}. ${esc(o.text)}</span>${why(o.why)}</div>${accept(task, 'outcome', i)}</div>`)}`)}
  ${when(d.processes.length, `<b class="small" style="color:var(--text)">Critical processes to consider</b>${each(d.processes, (p, i) => `<div class="rafiq-row"><div class="stack" style="gap:3px;flex:1;min-width:0"><span class="small" style="color:var(--text)">${esc(p.text)}</span>${why(p.why)}</div>${accept(task, 'process', i, 'Add')}</div>`)}`)}
  <div class="row">${acceptAll(task)}</div></div>`;

export const renderPersonas = task => d => `<div class="stack" style="gap:10px">${each(d.personas, (p, i) => `<div class="rafiq-row"><div class="stack" style="gap:3px;flex:1;min-width:0"><span class="small" style="color:var(--text)">${esc(p.title)}</span>${why(p.why)}</div>${accept(task, 'persona', i, 'Select')}</div>`)}
  <div class="row">${acceptAll(task, 'Select all')}</div></div>`;

export const renderProficiency = task => d => `<div class="stack" style="gap:8px">${each(DOMAINS, dm => `<div class="rafiq-row"><span class="small" style="width:200px;flex:none;color:var(--text)">${esc(dm.name)}</span>${levelChip(d.domains[dm.key].level)}<span class="tiny" style="flex:1;min-width:160px">${esc(d.domains[dm.key].why)}</span></div>`)}
  <div class="row">${accept(task, 'all', 0, 'Apply these levels')}</div></div>`;

export const renderClassify = task => d => `<div class="stack" style="gap:8px">${each(d.items, (x, i) => `<div class="rafiq-row"><div class="stack" style="gap:3px;flex:1;min-width:0"><span class="small" style="color:var(--text)">${esc(x.name)}</span><span class="tiny">${esc(x.current)} → <b style="color:var(--text);font-weight:500">${esc(x.type)}</b> (${esc(x.level)}). ${esc(x.why)}</span></div>${accept(task, 'item', i)}</div>`)}
  <div class="row">${acceptAll(task)}</div></div>`;

export const renderMapping = (task, titleOf) => d => `<div class="stack" style="gap:8px">${each(d.roles, (r, i) => `<div class="rafiq-row"><div class="stack" style="gap:3px;flex:1;min-width:0"><span class="small" style="color:var(--text)">${esc(r.role)} → ${esc(r.personas.map(titleOf).join(', '))}</span>${why(r.why)}</div>${accept(task, 'role', i, 'Apply')}</div>`)}
  <div class="row">${acceptAll(task, 'Apply all')}</div></div>`;

export const renderPath = task => d => `<div class="stack" style="gap:10px">
  ${when(d.narrative, `<b class="small" style="color:var(--text)">Narrative</b><p class="small" style="color:var(--text);margin:0">${esc(d.narrative)}</p>`)}
  ${when(d.units.length, `<b class="small" style="color:var(--text)">Unit titles</b>${each(d.units, u => `<span class="small"><span style="text-decoration:line-through">${esc(u.from)}</span> → <span style="color:var(--text)">${esc(u.title)}</span></span>`)}`)}
  <div class="row">${accept(task, 'all', 0, 'Use this wording')}</div></div>`;

// ---- Ask Rafeeq panel ----
// What Rafeeq suggests starting with on each screen: a guiding question, an example answer and
// quick actions in the tool's own terms (each sends a question to Rafeeq).
const GUIDE = {
  dash: { q: 'What platform change are you enabling, and who does it affect?', ex: 'We are introducing Website Hub so every entity can publish its own content.', chips: [['How the framework works', 'Explain the five phases of the CDP Learning Framework in plain words.'], ['What I need to start', 'What information do I need before starting a new initiative?'], ['How Rafeeq helps', 'How can you help me at each step of this tool?']] },
  needs: { q: 'What is changing, and what should people be able to do differently?', ex: 'We are replacing the intranet with Website Hub; editors must publish pages without IT help.', chips: [['Write a measurable outcome', 'How do I turn my business outcome into a measurable one?'], ['Find critical processes', 'Which critical processes should I list for this platform?'], ['Choose a go-live date', 'How far ahead should go-live be to leave time for learning?']] },
  personas: { q: 'Who will use the platform, and how does their work change?', ex: 'Content editors publish every day; managers approve requests once a week.', chips: [['Suggest personas', 'Which personas does this platform most likely affect, and why?'], ['End users or specialists?', 'What is the difference between End users and Specialists?'], ['Include executive leaders?', 'When should executive leaders be included as a persona?']] },
  proficiency: { q: 'What must this persona be able to do after go-live?', ex: 'Super users must solve colleagues\u2019 problems without escalating them.', chips: [['Explain proficiency levels', 'Explain Essential, Proficient and Advanced with an example for this platform.'], ['When is a domain Advanced?', 'When should a capability domain be set to Advanced?'], ['Check my levels', 'Do the proficiency levels I set look sensible for these personas?']] },
  capability: { q: 'Does the Capability Architecture reflect what each persona needs?', ex: 'People managers need Proficient process knowledge to approve requests.', chips: [['Read the Capability Architecture', 'How should I read the Capability Architecture table?'], ['What happens next', 'What happens after I confirm the Capability Architecture?']] },
  learning: { q: 'How do your personas prefer to learn, and where?', ex: 'Most staff learn in the flow of work; few can attend classroom sessions.', chips: [['Modes for Essential personas', 'Which learning modes suit Essential personas best?'], ['What makes a deviation', 'What makes a learning mode a deviation, and when is that acceptable?'], ['Blend live and self-paced', 'How should I balance live and self-paced learning modes?']] },
  assess: { q: 'How will you know each persona is ready on go-live day?', ex: 'Editors publish a real page in the sandbox before they get live access.', chips: [['How readiness is proven', 'How does the framework prove a persona is ready?'], ['Choose assessment modes', 'Which assessment modes fit each proficiency level?'], ['What counts as evidence', 'What counts as good readiness evidence?']] },
  upload: { q: 'Which system activities matter most for go-live?', ex: 'Submitting and approving content requests happens hundreds of times a week.', chips: [['Fill in the template', 'How should the vendor fill in the activities template?'], ['How many activities?', 'How many activities should I include for a good learning path?']] },
  classify: { q: 'Which activities are hardest for people to get right?', ex: 'Approving content needs judgement; publishing follows fixed steps.', chips: [['Content types explained', 'Explain the three content types and how they set proficiency.'], ['Classify approval work', 'Why is approval work classified as Judgement & Governance?'], ['Low-confidence rows', 'What should I do with low-confidence classifications?']] },
  map: { q: 'Who performs each platform role day to day?', ex: 'Requesters are end users; site owners are super users.', chips: [['Map shared roles', 'How do I map a role that several personas share?'], ['Leaders and routine work', 'Should executive leaders be mapped to routine activities?'], ['Above-level activities', 'What should I do with activities above a persona\u2019s level?']] },
  paths: { q: 'What would make this path realistic for busy staff?', ex: 'Most learners can give 30 minutes a week in the month before go-live.', chips: [['Shorten the longest path', 'How can I shorten the longest learning path?'], ['Is the timeline realistic?', 'Is the timeline realistic for go-live?'], ['Plan the lessons', 'What makes a good lesson plan for these units?']] },
  pathedit: { q: 'Which part of this path would you like to adjust?', ex: 'DAP workflows feel long for only four activities.', chips: [['Which modes could go?', 'Which learning modes could I remove to save time?'], ['Sensible durations', 'What is a sensible duration for DAP workflows and eLearning?']] },
  handoff: { q: 'What does the vendor need to start building?', ex: 'The vendor needs the asset list and a lesson plan for each persona.', chips: [['What the vendor needs', 'What does the vendor need from the Design Document to start?'], ['Explain the deviation register', 'How should I explain the deviation register to the approver?']] }
};
GUIDE.evidence = GUIDE.assess;

// The floating "Ask Rafeeq" button. main.js creates it once, outside the page that redraws, so its
// entrance plays when it appears rather than on every redraw.
export const fabMarkup = () => `<span class="rafiq-fab-orb">${rafiqR(24, 'write')}<i class="rafiq-ripple"></i><i class="rafiq-ripple r2"></i></span><span class="rafiq-fab-label"><span>Ask</span> <b>Rafeeq</b></span>`;

export function askPanel(s) {
  const r = s.rafiq;
  if (!r || !r.on || !r.open) return '';
  const g = GUIDE[s.screen] || GUIDE.dash;
  return `<aside class="rafiq-panel" aria-label="Ask Rafeeq">
    <div class="rafiq-panel-head">${rafiqMark(40)}<div class="stack" style="gap:1px"><b>Rafeeq</b><span class="tiny" style="color:var(--muted)">Your CDP Learning Companion</span></div>
      <button class="btn small ghost" style="margin-left:auto" data-act="rafiq-close" aria-label="Close Rafeeq">Close</button></div>
    <div class="rafiq-log" id="rafiq-log">
      ${r.chat.length ? '' : `<div class="rafiq-welcome">
        <h3>Let\u2019s design learning that makes a difference.</h3>
        <p>Tell me about the change you are enabling. I\u2019ll help you identify who is affected, the proficiency they need and the most effective learning for each persona.</p>
        <div class="rafiq-guide">${icon('info', 16, '#66BEFF')}<div class="stack" style="gap:4px"><b>Rafeeq suggests starting with:</b><span>${esc(g.q)}</span><span class="tiny">For example: \u201c${esc(g.ex)}\u201d</span></div></div>
        <div class="rafiq-quick">${each(g.chips, ([label, q]) => `<button class="rafiq-chip" data-act="rafiq-starter" data-q="${esc(q)}">${esc(label)}</button>`)}</div>
        <span class="tiny">Rafeeq means \u201ccompanion\u201d. Rafeeq suggests; you decide.</span>
      </div>`}
      ${each(r.chat, m => `<div class="rafiq-msg ${m.role === 'user' ? 'me' : 'bot'}">${esc(m.content)}</div>`)}
      ${when(r.busy, `<div class="rafiq-msg bot" id="rafiq-stream">${esc(r.partial || '') || '<span class="spinner"></span>'}</div>`)}
      ${when(r.chatError, `<div class="small" style="color:var(--quantum-pale)">${esc(r.chatError)}</div>`)}
    </div>
    <div class="rafiq-compose">
      <textarea class="textarea" id="rafiq-input" rows="2" placeholder="Ask Rafeeq about your initiative\u2026" data-inp="rafiq-draft" ${r.busy ? 'disabled' : ''}>${esc(r.draft || '')}</textarea>
      <button class="btn rafiq-btn" data-act="rafiq-send" ${r.busy ? 'disabled' : ''} aria-label="Send">${icon('arrow', 16)}</button>
    </div>
    <span class="tiny" style="padding:0 16px 12px">Rafeeq can make mistakes. Check important details.</span>
  </aside>`;
}

// ---- Lesson plan, laid out like a course syllabus ----
const TYPE_ICON = { 'Video': 'play', 'Interactive walkthrough': 'pointer', 'Sandbox practice': 'flask', 'Scenario': 'layers', 'Live session': 'users', 'Job aid': 'doc', 'Quiz': 'quiz', 'Discussion': 'chat', 'On-the-job task': 'briefcase' };
const mins = m => (m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}` : `${m} min`);

export function renderSyllabus(units, open, key) {
  const lessons = units.reduce((a, u) => a + u.lessons.length, 0);
  const total = units.reduce((a, u) => a + u.lessons.reduce((b, l) => b + l.minutes, 0), 0);
  const assessed = units.filter(u => u.assessment).length;
  const isOpen = i => (open && open[i] != null ? open[i] : i === 0);
  return `<div class="syl">
    <div class="syl-stats"><span><b>${units.length}</b> units</span><span><b>${lessons}</b> lessons</span><span><b>${mins(total)}</b> of learning</span><span><b>${assessed}</b> assessed units</span></div>
    ${each(units, (u, i) => { const t = u.lessons.reduce((b, l) => b + l.minutes, 0); return `<div class="syl-unit ${isOpen(i) ? 'open' : ''}">
      <button class="syl-sum" data-act="lesson-toggle" data-key="${esc(key)}" data-idx="${i}" aria-expanded="${isOpen(i)}">
        <span class="syl-n">${i + 1}</span>
        <span class="stack" style="gap:2px;flex:1;min-width:0;text-align:left"><b>${esc(u.title)}</b><span class="tiny">${u.lessons.length} lesson${u.lessons.length === 1 ? '' : 's'} · ${mins(t)}${u.assessment ? ' · assessed' : ''}${u.kind === 'fixed' ? ' · every persona' : ''}</span></span>
        <span class="syl-chev">${icon('chevron', 18)}</span></button>
      ${when(isOpen(i), () => `<div class="syl-body">
        ${when(u.outcomes.length, `<div><span class="syl-label">What you'll learn</span><div class="syl-outcomes">${each(u.outcomes, o => `<span>${icon('check', 15, '#4EA72E')}${esc(o)}</span>`)}</div></div>`)}
        <div><span class="syl-label">Lessons</span><ol class="syl-lessons">${each(u.lessons, (l, k) => `<li>
          <span class="syl-ic">${icon(TYPE_ICON[l.type] || 'doc', 16)}</span>
          <span class="stack" style="gap:3px;flex:1;min-width:0"><span class="syl-lt">${k + 1}. ${esc(l.title)}</span>
            ${when(l.description, `<span class="tiny">${esc(l.description)}</span>`)}
            <span class="syl-tags"><span>${esc(l.type)}</span>${when(l.mode, `<span>${esc(l.mode)}</span>`)}${each(l.activities, a => `<span class="act">${esc(a)}</span>`)}</span></span>
          <span class="syl-min">${mins(l.minutes)}</span></li>`)}</ol></div>
        ${when(u.assessment, () => `<div class="syl-assess">${icon('quiz', 18, '#66BEFF')}<div class="stack" style="gap:3px"><span class="syl-label" style="margin:0">Assessment · ${esc(u.assessment.mode)}</span><span class="small" style="color:var(--text)">${esc(u.assessment.task)}</span>${when(u.assessment.evidence, `<span class="tiny">Evidence: ${esc(u.assessment.evidence)}</span>`)}</div></div>`)}
        ${when(u.experience, `<p class="syl-exp">“${esc(u.experience)}”</p>`)}
      </div>`)}
    </div>`; })}
  </div>`;
}
