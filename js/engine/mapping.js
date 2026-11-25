// Persona ↔ transaction mapping. A persona performs a transaction when it is ticked directly, or
// when the persona is mapped to the transaction's platform role (a direct untick wins over the role).
//
// A transaction's level decides how it is taught, not the persona's level. When a mapped
// transaction is above the persona's proficiency, the user must decide:
//   'unmap'  revise the mapping (the persona no longer performs it)
//   'lower'  revise the transaction's proficiency down to the persona's level
//   'accept' keep it; it is taught with the modes for its own level and logged as a deviation
import { LEVELS } from '../rules/framework.js';
import { txLevel, txNeedsReview, setOverride } from './transactions.js';

export function emptyPaths() {
  return { transactions: [], roleMap: {}, txMap: {}, decisions: {}, durations: {}, modeEdits: {}, generatedAt: null, ai: {} };
}

export function isMapped(paths, persona, tx) {
  const direct = paths.txMap?.[persona]?.[tx.id];
  if (direct === true || direct === false) return direct;
  return !!(tx.role && paths.roleMap?.[persona]?.[tx.role]);
}

export function mappedVia(paths, persona, tx) {
  const direct = paths.txMap?.[persona]?.[tx.id];
  if (direct === true) return 'direct';
  if (direct === false) return 'excluded';
  return tx.role && paths.roleMap?.[persona]?.[tx.role] ? 'role' : '';
}

export function personaTransactions(paths, persona) {
  return (paths.transactions || []).filter(t => isMapped(paths, persona, t));
}

export function toggleTx(paths, persona, txId, on) {
  const txMap = { ...paths.txMap, [persona]: { ...(paths.txMap?.[persona] || {}), [txId]: !!on } };
  return { ...paths, txMap, generatedAt: null };
}

// Mapping a role ticks every transaction carrying it, except ones the user unticked directly.
export function toggleRole(paths, persona, role, on) {
  const roleMap = { ...paths.roleMap, [persona]: { ...(paths.roleMap?.[persona] || {}), [role]: !!on } };
  // Turning a role off also clears direct ticks for its transactions so the role really goes away.
  let txMap = paths.txMap;
  if (!on) {
    const mine = { ...(paths.txMap?.[persona] || {}) };
    (paths.transactions || []).forEach(t => { if (t.role === role && mine[t.id] === true) delete mine[t.id]; });
    txMap = { ...paths.txMap, [persona]: mine };
  }
  return { ...paths, roleMap, txMap, generatedAt: null };
}

// Mapped transactions above the persona's proficiency, with the decision taken so far (if any).
export function levelConflicts(paths, persona, prof) {
  const top = LEVELS.indexOf(prof);
  return personaTransactions(paths, persona)
    .filter(t => !txNeedsReview(t) && LEVELS.indexOf(txLevel(t)) > top)
    .map(t => ({ tx: t, txLevel: txLevel(t), personaLevel: prof, decision: paths.decisions?.[persona]?.[t.id] || null }));
}

export function resolveConflict(paths, persona, txId, action, prof) {
  if (action === 'unmap') return toggleTx(paths, persona, txId, false);
  if (action === 'lower') {
    const transactions = paths.transactions.map(t => (t.id === txId ? setOverride(t, { level: prof }) : t));
    return { ...paths, transactions, generatedAt: null };
  }
  if (action === 'accept' || action === null) {
    const mine = { ...(paths.decisions?.[persona] || {}) };
    if (action) mine[txId] = 'accept'; else delete mine[txId];
    return { ...paths, decisions: { ...paths.decisions, [persona]: mine }, generatedAt: null };
  }
  return paths;
}

// Turns mapping suggestions into concrete changes against the current mapping, dropping
// anything already in place, so the user only reviews real differences.
export function mappingChanges(paths, suggestion) {
  const out = [];
  (suggestion?.roles || []).forEach(r => {
    const add = r.personas.filter(p => !paths.roleMap?.[p]?.[r.role]);
    const remove = r.remove.filter(p => paths.roleMap?.[p]?.[r.role]);
    if (add.length || remove.length) out.push({ kind: 'role', key: r.role, add, remove, reason: r.reason, confidence: r.confidence });
  });
  (suggestion?.transactions || []).forEach(t => {
    const tx = (paths.transactions || []).find(x => x.id === t.id);
    if (!tx) return;
    const add = t.personas.filter(p => !isMapped(paths, p, tx));
    if (add.length) out.push({ kind: 'tx', key: t.id, label: tx.name, add, remove: [], reason: t.reason, confidence: 'medium' });
  });
  return out;
}

export function applyMappingChange(paths, change) {
  let next = paths;
  if (change.kind === 'role') {
    change.add.forEach(p => { next = toggleRole(next, p, change.key, true); });
    change.remove.forEach(p => { next = toggleRole(next, p, change.key, false); });
  } else change.add.forEach(p => { next = toggleTx(next, p, change.key, true); });
  return next;
}

// What still blocks path generation for the given personas ({persona, prof}).
export function mappingIssues(paths, personas) {
  const issues = [];
  if (!(paths.transactions || []).length) issues.push({ kind: 'upload', text: 'Upload the system transactions first.' });
  const review = (paths.transactions || []).filter(txNeedsReview);
  if (review.length) issues.push({ kind: 'review', text: `${review.length} transaction(s) need a content type and proficiency.` });
  personas.forEach(p => {
    const list = personaTransactions(paths, p.persona);
    if (!list.length) issues.push({ kind: 'unmapped', persona: p.persona, text: `${p.title} has no transactions mapped.` });
    const open = levelConflicts(paths, p.persona, p.prof).filter(c => !c.decision);
    if (open.length) issues.push({ kind: 'conflict', persona: p.persona, text: `${p.title}: ${open.length} transaction(s) above ${p.prof} need a decision.` });
  });
  return issues;
}
