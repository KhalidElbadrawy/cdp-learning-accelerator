import { test } from 'node:test';
import assert from 'node:assert/strict';
import { domainLevel, freshAnswers, baselineAnswers, deriveRow, newRow, answerQuestion } from '../js/engine/proficiency.js';
import { MODES, modeModel, defaultModes, modeDeviations, modesUpToLevel, defaultAssess, assessDeviations, assessComplete, modeLevel } from '../js/engine/modes.js';
import { classifyTransaction } from '../js/engine/classify.js';
import { parseTransactionRows, parseCsv, toCsv, txLevel, txType, setOverride, mergeTransactions, makeTransaction, txNeedsReview } from '../js/engine/transactions.js';
import { emptyPaths, isMapped, toggleTx, toggleRole, levelConflicts, resolveConflict, mappingIssues, personaTransactions } from '../js/engine/mapping.js';
import { modeMinutes, generatePath, transactionPlan, formatMinutes, weekStart } from '../js/engine/paths.js';
import { newInitiative, normalizeInitiative, gates, summary, nextScreen, canOpen, pathContext, phaseStates } from '../js/engine/initiative.js';
import { buildDocument, successMeasure } from '../js/engine/document.js';
import { defaultEmail, mailtoUrl, shortEmailBody, MAILTO_LIMIT } from '../js/engine/email.js';
import { TEMPLATE_COLUMNS, TEMPLATE_EXAMPLES } from '../js/rules/workbook.js';
import { PERSONAS, PROFILES } from '../js/rules/personas.js';

// ---------- proficiency ----------
test('domainLevel: first No sets the level', () => {
  assert.equal(domainLevel([true, false, null]), 'Essential');
  assert.equal(domainLevel([false, null, null]), 'Essential');
  assert.equal(domainLevel([true, true, false]), 'Proficient');
  assert.equal(domainLevel([true, true, true]), 'Advanced');
  assert.equal(domainLevel([true, null, null]), '');
  assert.equal(domainLevel(undefined), '');
});
test('deriveRow: overall is the highest domain level, empty until all answered', () => {
  const r = newRow('Super users');
  assert.equal(r.prof, '');
  const done = deriveRow({ persona: 'x', answers: { ...baselineAnswers('Essential'), role: [true, true, true] } });
  assert.equal(done.prof, 'Advanced');
  assert.equal(done.levels.platform, 'Essential');
});
test('answerQuestion clears later questions after a No', () => {
  let r = deriveRow({ persona: 'x', answers: baselineAnswers('Advanced') });
  r = answerQuestion(r, 'platform', 1, false);
  assert.deepEqual(r.answers.platform, [true, false, null]);
  assert.equal(r.levels.platform, 'Essential');
});
test('baselineAnswers gives the stated level everywhere', () => {
  ['Essential', 'Proficient', 'Advanced'].forEach(l => assert.equal(deriveRow({ answers: baselineAnswers(l) }).prof, l));
  assert.equal(Object.keys(freshAnswers()).length, 4);
});

// ---------- modes ----------
test('mode inventory: 13 modes, cumulative by level', () => {
  assert.equal(MODES.length, 13);
  assert.deepEqual(defaultModes('Essential'), ['In-app guidance', 'DAP workflows', 'Support agent']);
  assert.ok(defaultModes('Advanced').includes('Community of practice'));
  assert.ok(!defaultModes('Proficient').includes('Virtual training'), 'optional modes are not pre-selected');
  assert.ok(modeModel('Proficient').allowed.includes('Virtual training'));
});
test('modeDeviations flags only modes above the level', () => {
  assert.equal(modeDeviations('Essential', ['In-app guidance']).length, 0);
  const d = modeDeviations('Essential', ['Practice environment', 'In-app guidance']);
  assert.equal(d.length, 1);
  assert.match(d[0].text, /Not|not compliant/);
  assert.equal(modeDeviations('Advanced', MODES).length, 0);
});
test('modesUpToLevel keeps the persona picks that fit a transaction level', () => {
  const sel = ['In-app guidance', 'Practice environment', 'Coaching'];
  assert.deepEqual(modesUpToLevel(sel, 'Essential'), ['In-app guidance']);
  assert.deepEqual(modesUpToLevel(sel, 'Proficient'), ['In-app guidance', 'Practice environment']);
  assert.deepEqual(modesUpToLevel(sel, 'Advanced'), sel);
  assert.equal(modeLevel('Case study learning'), 'Proficient');
});
test('assessment: defaults, deviations, completeness', () => {
  assert.equal(defaultAssess('Proficient').length, 6);
  assert.equal(assessDeviations('Essential', ['Advanced|Coach colleagues']).length, 1);
  assert.equal(assessComplete('Proficient', ['Essential|Use job aid']), false);
  assert.equal(assessComplete('Proficient', defaultAssess('Proficient')), true);
  assert.equal(assessComplete('', []), false);
});

// ---------- classification (workbook decision tree) ----------
test('classify follows the workbook order', () => {
  const c = n => classifyTransaction(n);
  assert.equal(c('Approve Purchase Order').type, 'Judgement & Governance');
  assert.equal(c('Approve Purchase Order').confidence, 'high');
  assert.equal(c('Budget Preparation').type, 'Judgement & Governance');
  assert.equal(c('Evaluate Supplier Bid Response').type, 'Judgement & Governance');
  assert.equal(c('Performance Calibration').rule, 'phrase');
  assert.equal(c('Request Feedback').type, 'Practice & Observation', 'feedback is checked before request');
  assert.equal(c('Request Feedback').confidence, 'low');
  assert.equal(c('Schedule Check-In').type, 'Practice & Observation');
  assert.equal(c('Create Individual Development Plan').type, 'Practice & Observation', 'phrase beats the plan signal');
  assert.equal(c('Create Purchase Requisition').type, 'Procedures');
  assert.equal(c('Create Purchase Requisition').level, 'Essential');
  assert.equal(c('Hello world').type, 'Manual review');
  assert.equal(c('Hello world').level, 'To be confirmed');
  assert.equal(c('').confidence, 'none');
});
test('signal words match only at the start of a word', () => {
  assert.equal(classifyTransaction('Unrecorded thing').type, 'Manual review');
  assert.equal(classifyTransaction('Record leave').type, 'Procedures');
  assert.equal(classifyTransaction('Rerun batch').type, 'Manual review');
  assert.equal(classifyTransaction('Sign-off timesheet').type, 'Judgement & Governance');
});

// ---------- transactions ----------
const sampleRows = () => [TEMPLATE_COLUMNS, ...TEMPLATE_EXAMPLES];
test('parseTransactionRows reads the template and classifies', () => {
  const r = parseTransactionRows(sampleRows());
  assert.equal(r.errors.length, 0);
  assert.equal(r.transactions.length, TEMPLATE_EXAMPLES.length);
  const po = r.transactions.find(t => t.name === 'Approve Purchase Order');
  assert.equal(po.module, 'Procurement');
  assert.equal(po.role, 'Budget Approver');
  assert.equal(txLevel(po), 'Advanced');
});
test('parseTransactionRows: an Activity column works like a Transaction column', () => {
  for (const h of ['Activity', 'Activities', 'activity name', 'Transaction / Activity']) {
    const r = parseTransactionRows([['System module', 'Process', h, 'Platform role'], ['Finance', 'Invoicing', 'Create invoice', 'Clerk']]);
    assert.equal(r.errors.length, 0, h);
    assert.equal(r.transactions[0].name, 'Create invoice', h);
    assert.equal(r.transactions[0].role, 'Clerk', h);
  }
  const none = parseTransactionRows([['Module', 'Step'], ['Finance', 'Create invoice']]);
  assert.match(none.errors[0], /"Transaction" or "Activity"/);
});

test('parseTransactionRows: header search, duplicates, blanks, missing columns', () => {
  const r = parseTransactionRows([['Intro text'], ['', 'Transaction', 'Role'], ['', 'Create invoice', 'Clerk'], ['', 'Create invoice', 'Clerk'], ['', '', 'Clerk']]);
  assert.equal(r.transactions.length, 1);
  assert.ok(r.warnings.some(w => /duplicate/.test(w)));
  assert.ok(r.warnings.some(w => /without a transaction or activity name/.test(w)));
  assert.ok(r.warnings.some(w => /System module/.test(w)));
  assert.equal(parseTransactionRows([['a', 'b']]).errors.length, 1);
  assert.equal(parseTransactionRows([]).errors.length, 1);
});
test('ids are stable so mappings survive a re-upload', () => {
  const a = parseTransactionRows(sampleRows()).transactions;
  const b = parseTransactionRows(sampleRows()).transactions;
  assert.deepEqual(a.map(t => t.id), b.map(t => t.id));
  assert.equal(new Set(a.map(t => t.id)).size, a.length);
});
test('overrides: type changes level, explicit level wins, reverting clears', () => {
  let t = makeTransaction({ name: 'Create invoice' });
  assert.equal(txLevel(t), 'Essential');
  t = setOverride(t, { type: 'Judgement & Governance' });
  assert.equal(txType(t), 'Judgement & Governance');
  assert.equal(txLevel(t), 'Advanced');
  t = setOverride(t, { level: 'Proficient' });
  assert.equal(txLevel(t), 'Proficient');
  t = setOverride(t, { type: 'Procedures', level: 'Essential' });
  assert.equal(t.typeOverride, null);
  assert.equal(t.levelOverride, null);
  const m = makeTransaction({ name: 'Hello world' });
  assert.ok(txNeedsReview(m));
  assert.ok(!txNeedsReview(setOverride(m, { type: 'Procedures' })));
});
test('mergeTransactions keeps overrides for matching rows', () => {
  const old = parseTransactionRows(sampleRows()).transactions.map(t => t.name === 'Budget Preparation' ? setOverride(t, { level: 'Proficient' }) : t);
  const merged = mergeTransactions(old, parseTransactionRows(sampleRows()).transactions);
  assert.equal(txLevel(merged.find(t => t.name === 'Budget Preparation')), 'Proficient');
});
test('CSV round trip with quotes, commas and semicolon files', () => {
  const rows = [['System module', 'Transaction'], ['HR', 'Create "fast" plan, now']];
  assert.deepEqual(parseCsv(toCsv(rows)), rows);
  assert.deepEqual(parseCsv('a;b\r\nc;d e,f\r\n'), [['a', 'b'], ['c', 'd e,f']]);
  assert.deepEqual(parseCsv('﻿Transaction\nX'), [['Transaction'], ['X']]);
});

// ---------- mapping ----------
function pathsWith(list) { return { ...emptyPaths(), transactions: parseTransactionRows([TEMPLATE_COLUMNS, ...list]).transactions }; }
test('role mapping ticks transactions; a direct untick wins', () => {
  let p = pathsWith(TEMPLATE_EXAMPLES);
  p = toggleRole(p, 'End users', 'Employee', true);
  assert.equal(personaTransactions(p, 'End users').length, 2);
  const idp = p.transactions.find(t => t.name === 'Create Individual Development Plan');
  p = toggleTx(p, 'End users', idp.id, false);
  assert.equal(isMapped(p, 'End users', idp), false);
  assert.equal(personaTransactions(p, 'End users').length, 1);
  p = toggleRole(p, 'End users', 'Employee', false);
  assert.equal(personaTransactions(p, 'End users').length, 0);
});
test('level conflicts and their three resolutions', () => {
  let p = pathsWith(TEMPLATE_EXAMPLES);
  const po = p.transactions.find(t => t.name === 'Approve Purchase Order');
  p = toggleTx(p, 'End users', po.id, true);
  assert.equal(levelConflicts(p, 'End users', 'Essential').length, 1);
  assert.equal(levelConflicts(p, 'End users', 'Advanced').length, 0);
  const people = [{ persona: 'End users', title: 'Operational End User', prof: 'Essential' }];
  assert.ok(mappingIssues(p, people).some(i => i.kind === 'conflict'));
  const accepted = resolveConflict(p, 'End users', po.id, 'accept', 'Essential');
  assert.equal(levelConflicts(accepted, 'End users', 'Essential')[0].decision, 'accept');
  assert.equal(mappingIssues(accepted, people).length, 0);
  const lowered = resolveConflict(p, 'End users', po.id, 'lower', 'Essential');
  assert.equal(levelConflicts(lowered, 'End users', 'Essential').length, 0);
  const unmapped = resolveConflict(p, 'End users', po.id, 'unmap', 'Essential');
  assert.equal(personaTransactions(unmapped, 'End users').length, 0);
});
test('mappingIssues reports upload, review and unmapped personas', () => {
  assert.equal(mappingIssues(emptyPaths(), [])[0].kind, 'upload');
  const p = pathsWith([['HR', 'X', 'Hello world', '']]);
  const kinds = mappingIssues(p, [{ persona: 'End users', title: 'E', prof: 'Essential' }]).map(i => i.kind);
  assert.deepEqual(kinds, ['review', 'unmapped']);
});

// ---------- paths ----------
test('modeMinutes uses the duration model', () => {
  const txs = [{ workflow: 'A' }, { workflow: 'A' }, { workflow: 'B' }];
  assert.equal(modeMinutes('DAP workflows', txs), 15);
  assert.equal(modeMinutes('Interactive eLearning', txs), 26);
  assert.equal(modeMinutes('Instructor-led workshop', txs), 180);
  assert.equal(modeMinutes('Support agent', txs), 0);
  assert.equal(modeMinutes('DAP workflows', []), 0);
});
test('transaction level decides the modes, not the persona level', () => {
  let p = pathsWith(TEMPLATE_EXAMPLES);
  p = toggleRole(p, 'Super users', 'Requester', true);       // Essential transaction
  p = toggleRole(p, 'Super users', 'Budget Approver', true); // Advanced transaction
  const ctx = { persona: 'Super users', prof: 'Advanced', modes: defaultModes('Advanced'), assess: defaultAssess('Advanced') };
  const plan = transactionPlan(p, ctx);
  const ess = plan.find(x => x.tx.name === 'Create Purchase Requisition');
  const adv = plan.find(x => x.tx.name === 'Approve Purchase Order');
  assert.deepEqual(ess.modes, ['In-app guidance', 'DAP workflows', 'Support agent']);
  assert.ok(adv.modes.includes('Instructor-led workshop'));
  assert.ok(ess.assess.every(k => k.startsWith('Essential|')));
});
test('accepted above-level transactions use their own level modes and are flagged', () => {
  let p = pathsWith(TEMPLATE_EXAMPLES);
  const po = p.transactions.find(t => t.name === 'Approve Purchase Order');
  p = toggleTx(p, 'End users', po.id, true);
  p = resolveConflict(p, 'End users', po.id, 'accept', 'Essential');
  const path = generatePath(p, { persona: 'End users', prof: 'Essential', modes: defaultModes('Essential'), assess: defaultAssess('Essential') });
  assert.equal(path.deviations.length, 1);
  assert.equal(path.deviations[0].accepted, true);
  assert.ok(path.plan[0].modes.includes('Community of practice'));
});
test('generatePath follows the six-step journey with times and weeks', () => {
  let p = pathsWith(TEMPLATE_EXAMPLES);
  p = toggleRole(p, 'People managers', 'Line Manager', true);
  p = toggleRole(p, 'People managers', 'Employee', true);
  const conflicts = levelConflicts(p, 'People managers', 'Proficient');
  conflicts.forEach(c => { p = resolveConflict(p, 'People managers', c.tx.id, 'accept', 'Proficient'); });
  const ctx = { persona: 'People managers', prof: 'Proficient', modes: defaultModes('Proficient'), assess: defaultAssess('Proficient') };
  const path = generatePath(p, ctx);
  assert.deepEqual(path.steps.map(s => s.key), ['understand', 'role', 'build', 'confidence', 'prove', 'sustain']);
  assert.equal(path.steps[0].items[0].label, 'Awareness microlearning');
  assert.deepEqual(path.steps[2].weeks, [-3, -2]);
  assert.ok(path.steps[4].items.length >= 3, 'assessment modes fill step 5');
  assert.ok(path.totalMinutes > 0);
  assert.equal(path.totalMinutes, path.steps.reduce((a, s) => a + s.minutes, 0));
  const edited = generatePath(p, ctx, { durations: { 'DAP workflows': 99 } });
  const dap = edited.steps.find(s => s.key === 'build').items.find(i => i.label === 'DAP workflows');
  assert.equal(dap.minutes, 99);
  assert.equal(dap.edited, true);
  assert.equal(path.recognition, 'Persona badge');
});
test('a persona that unticks every mode for a level falls back to defaults (gap)', () => {
  let p = pathsWith(TEMPLATE_EXAMPLES);
  p = toggleRole(p, 'Super users', 'Requester', true);
  const path = generatePath(p, { persona: 'Super users', prof: 'Advanced', modes: ['Coaching'], assess: defaultAssess('Advanced') });
  assert.equal(path.gaps.length, 1);
});
test('formatMinutes and weekStart', () => {
  assert.equal(formatMinutes(45), '45 min');
  assert.equal(formatMinutes(60), '1 h');
  assert.equal(formatMinutes(135), '2 h 15 min');
  assert.equal(weekStart('2027-01-01', 1).toISOString().slice(0, 10), '2027-01-01');
  assert.equal(weekStart('2027-01-01', -1).toISOString().slice(0, 10), '2026-12-25');
  assert.equal(weekStart('', 1), null);
});

// ---------- initiative flow ----------
function fullInitiative() {
  let i = newInitiative('init-test');
  i = { ...i, created: true, started: '17 Nov 2026', needs: { name: 'Website Hub', outcome: 'Faster publishing.', processes: 'Content approval', goLive: '2027-02-01' } };
  i.rows = [deriveRow({ persona: 'End users', answers: baselineAnswers('Essential') }), deriveRow({ persona: 'Super users', answers: baselineAnswers('Advanced') })];
  i.capConfirmed = true;
  i.assessConfirmed = true;
  i.paths = pathsWith(TEMPLATE_EXAMPLES);
  i.paths = toggleRole(i.paths, 'End users', 'Requester', true);
  i.paths = toggleRole(i.paths, 'Super users', 'Budget Approver', true);
  return i;
}
test('gates open in flow order', () => {
  const blank = newInitiative();
  assert.equal(nextScreen(blank), 'needs');
  assert.equal(canOpen(blank, 'personas'), false);
  const i = fullInitiative();
  const g = gates(i);
  assert.ok(g.needs && g.capability && g.learning && g.assess && g.assessConfirmed && g.upload && g.classified && g.mapped);
  assert.equal(g.generated, false);
  assert.equal(nextScreen(i), 'paths');
  const done = { ...i, paths: { ...i.paths, generatedAt: 1 }, reviewed: { 'End users': true, 'Super users': true }, pathsConfirmed: true };
  assert.equal(gates(done).handoff, true);
  assert.equal(summary(done).done, true);
  assert.equal(summary(done).pct, 87);
  assert.equal(phaseStates(done).design, 'done');
});
test('go-live date is required in Define', () => {
  const i = fullInitiative();
  i.needs.goLive = '';
  assert.equal(gates(i).needs, false);
});
test('changing the mapping invalidates generated paths', () => {
  const i = fullInitiative();
  i.paths.generatedAt = 5;
  const p2 = toggleRole(i.paths, 'End users', 'Employee', true);
  assert.equal(p2.generatedAt, null);
});
test('normalizeInitiative repairs stored data and rejects junk', () => {
  assert.equal(normalizeInitiative(null), null);
  assert.equal(normalizeInitiative({}), null);
  const n = normalizeInitiative({ id: 'a', rows: [{ persona: 'Nope' }, { persona: 'End users', answers: baselineAnswers('Essential') }], paths: { transactions: [{ id: 1 }] } });
  assert.equal(n.rows.length, 1);
  assert.equal(n.rows[0].prof, 'Essential');
  assert.equal(n.paths.transactions.length, 0);
  assert.deepEqual(Object.keys(n.handoff).sort(), ['body', 'decisions', 'measure', 'qc', 'subject', 'vendorEmail']);
});
test('summary flags overdue initiatives', () => {
  const i = { ...newInitiative(), due: '01 Jan 2020' };
  assert.equal(summary(i).atRisk, true);
});
test('pathContext uses persona picks only for the current level', () => {
  const i = fullInitiative();
  i.modes['End users'] = ['In-app guidance'];
  i.modesProf['End users'] = 'Proficient';
  assert.deepEqual(pathContext(i, 'End users').modes, defaultModes('Essential'));
  i.modesProf['End users'] = 'Essential';
  assert.deepEqual(pathContext(i, 'End users').modes, ['In-app guidance']);
  assert.equal(pathContext(i, 'Nobody'), null);
});

// ---------- document and email ----------
test('document collects every section, including paths and deviations', () => {
  const i = fullInitiative();
  i.paths.generatedAt = 1;
  i.modes['End users'] = ['In-app guidance', 'Practice environment'];
  i.modesProf['End users'] = 'Essential';
  const d = buildDocument(i, new Date('2026-11-17'));
  assert.equal(d.platform, 'Website Hub');
  assert.equal(d.capability.length, 2);
  assert.equal(d.paths.length, 2);
  assert.ok(d.deviations.some(x => x.kind === 'Learning mode' && x.item === 'Practice environment'));
  assert.equal(d.deviations[0].id, 'D-01');
  assert.equal(d.learning[0].cells.length, 13);
  assert.match(d.needs[2][1], /^Evidence that the business outcome is achieved: faster publishing\./);
  i.needs.outcome = 'Faster publishing\nFewer tickets';
  const d2 = buildDocument(i, new Date('2026-11-17'));
  assert.equal(d2.needs[1][1], '1. Faster publishing\n2. Fewer tickets');
  assert.match(d2.needs[2][1], /each business outcome is achieved: \(1\) faster publishing; \(2\) fewer tickets\./);
  assert.match(defaultEmail(i).body, /Business outcome\(s\): \(1\) Faster publishing \(2\) Fewer tickets/);
  assert.equal(successMeasure(''), '');
});
test('email: brief, paths line, mailto fallback', () => {
  const i = fullInitiative();
  i.paths.generatedAt = 1;
  const e = defaultEmail(i);
  assert.match(e.subject, /Website Hub/);
  assert.match(e.body, /of learning/);
  assert.ok(!/—/.test(e.body), 'no em dashes');
  const long = 'x'.repeat(3000);
  const url = mailtoUrl('a@b.com', 'S', long, shortEmailBody(i));
  assert.ok(url.length < MAILTO_LIMIT + 400);
  assert.ok(url.startsWith('mailto:a%40b.com?subject=S&body='));
});
test('rule data is complete for every persona', () => {
  PERSONAS.forEach(p => { assert.ok(PROFILES[p].title); assert.ok(PROFILES[p].domains); });
});
test('dates are formatted for people', async () => {
  const { formatDate } = await import('../js/engine/paths.js');
  assert.equal(formatDate('2027-02-01'), '01 Feb 2027');
  const i = fullInitiative();
  assert.match(defaultEmail(i).body, /Planned go-live: 01 Feb 2027\./);
  assert.equal(buildDocument(i).meta[1][1], '01 Feb 2027');
});
test('selected modes that no transaction uses are reported', () => {
  let p = pathsWith(TEMPLATE_EXAMPLES);
  p = toggleRole(p, 'End users', 'Requester', true);
  const path = generatePath(p, { persona: 'End users', prof: 'Essential', modes: [...defaultModes('Essential'), 'Practice environment'], assess: defaultAssess('Essential') });
  assert.deepEqual(path.unusedModes, ['Practice environment']);
});
test('hand-off sits at the end of Design', () => {
  const i = fullInitiative();
  const done = { ...i, paths: { ...i.paths, generatedAt: 1 }, reviewed: { 'End users': true, 'Super users': true }, pathsConfirmed: true };
  assert.equal(summary(done).stage, 'Hand-off');
  assert.equal(buildDocument(done).cycle[1][1], 'Complete, hand-off point');
});
test('critical processes are a numbered list', async () => {
  const { processList } = await import('../js/engine/initiative.js');
  assert.deepEqual(processList('A\n\n B \n'), ['A', 'B']);
  const i = fullInitiative();
  i.needs.processes = 'Content request\nApproval';
  assert.equal(buildDocument(i).needs[3][1], '1. Content request\n2. Approval');
  assert.match(defaultEmail(i).body, /Critical processes: \(1\) Content request \(2\) Approval/);
  i.needs.processes = '\n  \n';
  assert.equal(gates(i).needs, false);
});
test('AI mapping suggestions become only real changes, and apply cleanly', async () => {
  const { mappingChanges, applyMappingChange } = await import('../js/engine/mapping.js');
  let p = pathsWith(TEMPLATE_EXAMPLES);
  p = toggleRole(p, 'End users', 'Employee', true);
  p = toggleRole(p, 'Executive Leader', 'Requester', true);
  const sugg = { roles: [
    { role: 'Employee', personas: ['End users'], remove: [], reason: 'Already mapped', confidence: 'high' },
    { role: 'Requester', personas: ['End users'], remove: ['Executive Leader'], reason: 'Leaders do not raise requisitions', confidence: 'high' }
  ], transactions: [] };
  const ch = mappingChanges(p, sugg);
  assert.equal(ch.length, 1, 'the already-mapped role is dropped');
  assert.deepEqual(ch[0].add, ['End users']);
  assert.deepEqual(ch[0].remove, ['Executive Leader']);
  p = applyMappingChange(p, ch[0]);
  assert.equal(personaTransactions(p, 'Executive Leader').length, 0);
  assert.equal(personaTransactions(p, 'End users').length, 3);
  assert.equal(mappingChanges(p, sugg).length, 0);
});

// ---------- built-in replacements for the AI features ----------
test('classification falls back to role, workflow, then action verb, with reasons', () => {
  const c = (n, ctx) => classifyTransaction(n, ctx);
  assert.equal(c('Quarterly something', { role: 'Budget Approver' }).type, 'Judgement & Governance');
  assert.equal(c('Quarterly something', { role: 'Budget Approver' }).rule, 'role');
  assert.equal(c('Do the thing').type, 'Procedures');
  assert.equal(c('Do the thing').confidence, 'low');
  assert.equal(c('Log in to portal').type, 'Procedures');
  assert.equal(c('Position description').type, 'Manual review', '"post" must not match "position"');
  assert.equal(c('Resolve colleague issue').type, 'Practice & Observation');
  assert.match(c('Approve Purchase Order').reason, /approval word/);
  assert.match(c('Request Feedback').reason, /workbook order/);
});
test('stored transactions are re-read with the current rules, overrides kept', () => {
  const t = { ...makeTransaction({ name: 'Do the thing' }), auto: { type: 'Manual review', level: 'To be confirmed', rule: 'old', signals: [], confidence: 'none' }, levelOverride: 'Advanced' };
  const n = normalizeInitiative({ id: 'x', paths: { transactions: [t], ai: { classify: {} } } });
  assert.equal(n.paths.transactions[0].auto.type, 'Procedures');
  assert.equal(n.paths.transactions[0].levelOverride, 'Advanced');
  assert.equal(n.paths.ai, undefined);
});
test('built-in mapping suggestions follow persona definitions', async () => {
  const { suggestMapping } = await import('../js/engine/suggest.js');
  const { mappingChanges } = await import('../js/engine/mapping.js');
  const p = pathsWith(TEMPLATE_EXAMPLES);
  const people = ['End users', 'Super users', 'People managers', 'Specialist', 'Executive Leader'].map(k => ({ persona: k, title: PROFILES[k].title, prof: 'Essential' }));
  const s = suggestMapping(p, people);
  const role = r => s.roles.find(x => x.role === r) || { personas: [] };
  assert.ok(role('Requester').personas.includes('End users'));
  assert.ok(role('Employee').personas.includes('End users'));
  assert.ok(role('Line Manager').personas.includes('People managers'));
  assert.ok(role('Procurement Officer').personas.includes('Specialist'));
  assert.ok(role('Requester').personas.includes('Super users'), 'super users support end-user roles');
  assert.ok(!role('Requester').personas.includes('Executive Leader'));
  assert.ok(mappingChanges(p, s).length > 0);
  const flagged = suggestMapping(toggleRole(p, 'Executive Leader', 'Requester', true), people);
  assert.deepEqual(flagged.roles.find(x => x.role === 'Requester').remove, ['Executive Leader']);
});
test('path insights: narrative, process units, gaps', async () => {
  const { pathInsights } = await import('../js/engine/suggest.js');
  let p = pathsWith(TEMPLATE_EXAMPLES);
  p = toggleRole(p, 'Super users', 'Budget Approver', true);
  p = toggleRole(p, 'Super users', 'Requester', true);
  const path = { ...generatePath(p, { persona: 'Super users', prof: 'Advanced', modes: ['In-app guidance', 'DAP workflows'], assess: defaultAssess('Essential') }), title: 'Super User' };
  const ins = pathInsights(path);
  assert.match(ins.narrative, /Super User learns 2 activities/);
  assert.deepEqual(ins.units.slice(0, 2).map(u => u.kind), ['fixed', 'fixed']);
  assert.match(ins.units[0].title, /Awareness/i); assert.match(ins.units[1].title, /Role/i);
  assert.equal(ins.units.find(u => u.kind === 'activities').title, 'Purchase to pay');
  assert.ok(ins.gaps.some(g => /no live or sandbox practice/.test(g)));
  assert.ok(ins.gaps.some(g => /No assessment covers the Advanced/.test(g)));
});
test('readiness check scores the document and lists fixes', async () => {
  const { readinessCheck } = await import('../js/engine/suggest.js');
  const i = fullInitiative();
  i.paths.generatedAt = 1;
  i.modes['End users'] = ['In-app guidance', 'Practice environment']; i.modesProf['End users'] = 'Essential';
  const rc = readinessCheck(buildDocument(i, new Date('2026-11-17')), i, Date.parse('2026-11-17'));
  assert.ok(rc.issues.some(x => x.section === 'Deviation register' && x.severity === 'high'));
  assert.ok(rc.issues.some(x => /not confirmed/.test(x.issue)));
  assert.ok(rc.score < 100);
  const late = readinessCheck(buildDocument(i), { ...i, needs: { ...i.needs, goLive: '2026-11-20' } }, Date.parse('2026-11-17'));
  assert.ok(late.issues.some(x => x.section === 'Timeline'));
});
