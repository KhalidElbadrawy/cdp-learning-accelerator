// Persona proficiency: three yes/no questions per capability domain. The first "No" sets the
// domain's level; the persona's overall level is its highest domain level. Proficiency is set by
// the persona, never by transactions.
import { DOMAINS, LEVELS } from '../rules/framework.js';

export function domainLevel(answers) {
  const a = answers || [];
  for (let q = 0; q < 3; q++) {
    if (a[q] === false) return q < 2 ? 'Essential' : 'Proficient';
    if (a[q] !== true) return '';
  }
  return 'Advanced';
}

// Q1 starts as Yes: every persona needs at least the Essential floor.
export function freshAnswers() {
  const out = {};
  DOMAINS.forEach(d => { out[d.key] = [true, null, null]; });
  return out;
}

export function baselineAnswers(level) {
  const a = level === 'Advanced' ? [true, true, true] : (level === 'Proficient' ? [true, true, false] : [true, false, null]);
  const out = {};
  DOMAINS.forEach(d => { out[d.key] = a.slice(); });
  return out;
}

// Adds `levels` (per domain) and `prof` (overall, '' until every domain is answered).
export function deriveRow(row) {
  const answers = row.answers || freshAnswers();
  const levels = {};
  let done = true, top = -1;
  DOMAINS.forEach(d => {
    const l = domainLevel(answers[d.key]);
    levels[d.key] = l;
    if (!l) done = false; else top = Math.max(top, LEVELS.indexOf(l));
  });
  return { ...row, answers, levels, prof: done ? LEVELS[top] : '' };
}

export function newRow(persona, answers) {
  return deriveRow({ persona, answers: answers || freshAnswers(), flag: false });
}

// Records an answer. Answering "No" clears the questions after it, because they no longer apply.
export function answerQuestion(row, domainKey, q, value) {
  const answers = { ...row.answers };
  const a = (answers[domainKey] || [true, null, null]).slice();
  a[q] = value;
  if (value === false) for (let i = q + 1; i < 3; i++) a[i] = null;
  answers[domainKey] = a;
  return deriveRow({ ...row, answers });
}

export const levelIndex = l => LEVELS.indexOf(l);
