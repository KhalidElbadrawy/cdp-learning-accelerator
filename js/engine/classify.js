// Maps a transaction to one of the three content types, and the content type to a proficiency
// level. It follows the workbook's decision tree:
//   approval words → phrase list (the business object decides) → Judgement & Governance words →
//   Practice & Observation words → Procedures words
// using the workbook's signal words plus the tool's extended lists. When the transaction itself
// has no signal word, two built-in fallbacks run before Manual review:
//   1. the platform role and workflow (e.g. an "Approver" role points to Judgement & Governance);
//   2. a recognisable action verb defaults to Procedures, the routine type.
// Every result carries a plain-language reason so the user can see why.
import { SIGNALS, PHRASES, CONTENT_TYPES, MANUAL_REVIEW, EXTRA_SIGNALS, ROLE_HINTS, GENERIC_VERBS } from '../rules/workbook.js';

const TYPES = ['Judgement & Governance', 'Practice & Observation', 'Procedures'];
const escape = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// A signal matches at the start of a word: "evaluat" matches "Evaluate" but not "Reevaluate".
// An entry written with a trailing space ("log ") must match the whole word, so "log" never matches "logistics".
const wordStart = w => new RegExp(`(^|[^a-z0-9])${escape(w.toLowerCase().trim())}${/\s$/.test(w) ? '(?![a-z])' : ''}`);
const build = list => [...new Set(list)].map(w => ({ w: w.trim(), re: wordStart(w) }));

const MATCHERS = {
  approval: build([...SIGNALS.approval, ...EXTRA_SIGNALS.approval])
};
TYPES.forEach(t => { MATCHERS[t] = build([...SIGNALS[t], ...(EXTRA_SIGNALS[t] || [])]); });
const ROLE = {}; TYPES.forEach(t => { ROLE[t] = build(ROLE_HINTS[t] || []); });
const GENERIC = build(GENERIC_VERBS);

const hits = (list, text) => list.filter(m => m.re.test(text)).map(m => m.w);

export function levelForType(type) {
  return CONTENT_TYPES[type] ? CONTENT_TYPES[type].level : 'To be confirmed';
}

// Returns { type, level, rule, signals, confidence, reason }.
// confidence: 'high' (approval word or phrase), 'medium' (one list matched), 'low' (several lists
// matched, or a fallback decided), 'none' (Manual review).
export function classifyTransaction(name, context = {}) {
  const text = String(name || '').toLowerCase().trim();
  const out = (type, rule, signals, confidence, reason) => ({ type, level: levelForType(type), rule, signals, confidence, reason });
  if (!text || !/[a-z]/.test(text)) return out(MANUAL_REVIEW, 'empty', [], 'none', 'No transaction name to read.');

  const approval = hits(MATCHERS.approval, text);
  if (approval.length) return out('Judgement & Governance', 'approval word', approval, 'high', `"${approval[0]}" is an approval word, so it needs a decision.`);

  // The workbook takes the last matching phrase in list order.
  let phrase = null;
  PHRASES.forEach(([p, type]) => { if (text.includes(p)) phrase = [p, type]; });
  if (phrase) return out(phrase[1], 'phrase', [phrase[0]], 'high', `The phrase "${phrase[0]}" decides the type.`);

  const found = TYPES.map(t => [t, hits(MATCHERS[t], text)]).filter(([, h]) => h.length);
  if (found.length) {
    const [type, sig] = found[0];
    const others = found.slice(1).map(([t]) => t);
    const reason = `"${sig[0]}" points to ${type}` + (others.length ? `; it also matches ${others.join(' and ')}, and the workbook order puts ${type} first.` : '.');
    return out(type, 'signal word', sig, found.length > 1 ? 'low' : 'medium', reason);
  }

  // Fallback 1: the role and workflow describe the kind of work.
  const ctx = `${context.role || ''} ${context.workflow || ''}`.toLowerCase();
  if (ctx.trim()) {
    const fromRole = TYPES.map(t => [t, hits(ROLE[t], ctx)]).filter(([, h]) => h.length);
    if (fromRole.length) {
      const [type, sig] = fromRole[0];
      return out(type, 'role', sig, 'low', `No signal word in the transaction; the role or process ("${sig[0]}") suggests ${type}.`);
    }
    const ctxSignals = TYPES.map(t => [t, hits(MATCHERS[t], ctx)]).filter(([, h]) => h.length);
    if (ctxSignals.length) {
      const [type, sig] = ctxSignals[0];
      return out(type, 'workflow', sig, 'low', `No signal word in the transaction; its process ("${sig[0]}") suggests ${type}.`);
    }
  }

  // Fallback 2: an action verb with no other signal is routine work.
  const verb = hits(GENERIC, text);
  if (verb.length) return out('Procedures', 'action verb', verb, 'low', `"${verb[0]}" is a routine action with no judgement or coaching signal, so it is treated as a procedure.`);

  return out(MANUAL_REVIEW, 'no signal word', [], 'none', 'No signal word, role or action verb to go on. Pick a content type.');
}
