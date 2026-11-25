// Rafeeq (AI assistant): every answer is checked before it reaches the screen.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as R from '../js/engine/rafiq.js';
import { newInitiative } from '../js/engine/initiative.js';
import { newRow } from '../js/engine/proficiency.js';
import { makeTransaction } from '../js/engine/transactions.js';
import { PERSONAS } from '../js/rules/personas.js';

const init = () => {
  const i = newInitiative('t1');
  i.needs = { name: 'Website Hub', outcome: 'Faster publishing\nFewer tickets', processes: 'Publishing', goLive: '2027-02-01' };
  return i;
};

test('needs: keeps valid rewrites and new processes only', () => {
  const i = init();
  const out = R.checkNeeds({ outcomes: [{ index: 0, text: 'Cut publishing time from 5 to 2 days', why: 'Measurable' }, { index: 9, text: 'bad' }, { index: 1, text: 'Fewer tickets' }],
    processes: [{ text: 'Publishing' }, { text: 'Content approval', why: 'Likely' }, { text: '' }] }, i);
  assert.equal(out.outcomes.length, 1);
  assert.equal(out.outcomes[0].from, 'Faster publishing');
  assert.deepEqual(out.processes.map(p => p.text), ['Content approval']);
  assert.match(R.needsPrompt(i), /Website Hub/);
});

test('personas: only known, unselected keys', () => {
  const i = init(); i.rows = [newRow(PERSONAS[0])];
  const out = R.checkPersonas({ personas: [{ key: PERSONAS[0] }, { key: 'Nobody' }, { key: PERSONAS[1], why: 'x' }, { key: PERSONAS[1] }] }, i);
  assert.deepEqual(out.personas.map(p => p.key), [PERSONAS[1]]);
});

test('proficiency: needs a valid level for all four domains', () => {
  const ok = R.checkProficiency({ domains: { platform: { level: 'Advanced' }, role: { level: 'Essential' }, process: { level: 'Proficient' }, support: { level: 'Essential' } } });
  assert.equal(Object.keys(ok.domains).length, 4);
  assert.deepEqual(R.checkProficiency({ domains: { platform: { level: 'Expert' } } }).domains, {});
  assert.deepEqual(R.answersForLevel('Proficient'), [true, true, false]);
});

test('classify: valid types that differ from the current one', () => {
  const t1 = makeTransaction({ name: 'Handle stuff', role: 'Clerk' }), t2 = makeTransaction({ name: 'Approve purchase order' });
  const out = R.checkClassify({ items: [{ id: t1.id, type: 'Practice & Observation', why: 'Needs feedback' }, { id: t2.id, type: 'Judgement & Governance' }, { id: 'tx-x', type: 'Procedures' }, { id: t1.id, type: 'Nonsense' }] }, [t1, t2]);
  assert.deepEqual(out.items.map(x => x.id), [t1.id]);
  assert.equal(out.items[0].level, 'Proficient');
});

test('mapping: known roles and personas, not already mapped', () => {
  const paths = { transactions: [makeTransaction({ name: 'Create request', role: 'Requester' })], roleMap: { 'Super users': { Requester: true } }, txMap: {} };
  const people = [{ persona: 'End users', title: 'Operational End User', prof: 'Essential' }, { persona: 'Super users', title: 'Super User', prof: 'Advanced' }];
  const out = R.checkMapping({ roles: [{ role: 'Requester', personas: ['End users', 'Super users', 'Ghost'] }, { role: 'Unknown', personas: ['End users'] }] }, paths, people);
  assert.deepEqual(out.roles, [{ role: 'Requester', personas: ['End users'], why: '' }]);
});

test('path polish applies only while the path is unchanged', () => {
  const ins = { narrative: 'Base text.', units: [{ title: 'Purchase to pay', transactions: ['A'] }], gaps: [] };
  const polish = { base: 'Base text.', narrative: 'Nicer text.', units: { 'Purchase to pay': 'Raise and track purchases' } };
  const a = R.applyPolish(ins, polish);
  assert.equal(a.polished, true); assert.equal(a.narrative, 'Nicer text.'); assert.equal(a.units[0].title, 'Raise and track purchases');
  assert.equal(R.applyPolish({ ...ins, narrative: 'Changed.' }, polish).polished, false);
  const p = R.checkPath({ narrative: 'N', units: [{ from: 'Purchase to pay', title: 'Buy things' }, { from: 'Awareness microlearning', title: 'X' }, { from: 'Ghost', title: 'Y' }] }, { narrative: 'Base', units: [{ title: 'Purchase to pay', transactions: [] }, { title: 'Awareness microlearning', transactions: [] }] });
  assert.deepEqual(p.units, [{ from: 'Purchase to pay', title: 'Buy things' }]);
});

test('ask: conversation ends on the user question and carries the initiative', () => {
  const m = R.askMessages(init(), 'needs', [{ role: 'user', content: 'hi' }, { role: 'assistant', content: 'hello' }], 'What next?');
  assert.equal(m[m.length - 1].role, 'user');
  assert.equal(m[m.length - 1].content, 'What next?');
  assert.match(m[0].content, /Website Hub/);
});

test('lesson plan: only the unit\'s own modes, activities and assessments', () => {
  const specs = [
    { unit: 'Awareness microlearning', kind: 'fixed', activities: [], modes: ['Awareness microlearning'], assessments: [] },
    { unit: 'Purchase to pay', kind: 'activities', activities: [{ activity: 'Create Purchase Requisition', level: 'Essential' }], modes: ['DAP workflows', 'In-app guidance'], assessments: ['Use job aid'] }
  ];
  const out = R.checkLessonPlan({ units: [
    { unit: 'Purchase to pay', title: 'Raise a purchase request', outcomes: ['Raise a request'], lessons: [
      { title: 'Walk through a request', type: 'Interactive walkthrough', mode: 'dap workflows', minutes: 8, activities: ['Create Purchase Requisition', 'Fly a plane'] },
      { title: 'Bad mode', type: 'Hologram', mode: 'Virtual reality', minutes: 999 }],
      assessment: { mode: 'Use job aid', task: 'Complete a request with the job aid', evidence: 'Request submitted' } },
    { unit: 'Ghost unit', lessons: [{ title: 'x' }] },
    { unit: 'Awareness microlearning', lessons: [{ title: 'Why it changes', type: 'Video', mode: 'Awareness microlearning', minutes: 4 }], assessment: { mode: 'Quiz' } }
  ] }, specs);
  assert.deepEqual(out.units.map(u => u.unit), ['Awareness microlearning', 'Purchase to pay']);
  const p = out.units[1];
  assert.equal(p.lessons[0].mode, 'DAP workflows');
  assert.deepEqual(p.lessons[0].activities, ['Create Purchase Requisition']);
  assert.equal(p.lessons[1].mode, ''); assert.equal(p.lessons[1].type, 'Job aid'); assert.equal(p.lessons[1].minutes, 240);
  assert.equal(p.assessment.mode, 'Use job aid');
  assert.equal(out.units[0].assessment, null);
  assert.notEqual(R.lessonBase(specs), R.lessonBase([specs[0]]));
});

test('ask: home questions about the framework carry no initiative data; initiative questions do', () => {
  const i = init();
  const generic = R.askMessages(i, 'dash', [], 'Explain the five phases of the CDP Learning Framework in plain words.');
  assert.doesNotMatch(generic[0].content, /Website Hub/);
  assert.match(generic[0].content, /answer generically/);
  const tailored = R.askMessages(i, 'dash', [], 'How do I apply the Assess phase to my initiative?');
  assert.match(tailored[0].content, /Website Hub/);
  assert.equal(R.asksAboutInitiative('What does Website Hub need next?', i), true);
  assert.equal(R.asksAboutInitiative('What is a learning mode?', i), false);
  const onScreen = R.askMessages(i, 'needs', [], 'What is a measurable outcome?');
  assert.match(onScreen[0].content, /do not mention the initiative below/);
});
