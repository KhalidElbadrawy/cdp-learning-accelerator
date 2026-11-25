// System transactions: reading the uploaded spreadsheet, classifying each row, and applying the
// user's overrides of content type and proficiency.
import { TEMPLATE_COLUMNS, CONTENT_TYPES, MANUAL_REVIEW } from '../rules/workbook.js';
import { LEVELS } from '../rules/framework.js';
import { classifyTransaction, levelForType } from './classify.js';

// Header names accepted for each template column (case and spacing are ignored).
const HEADER_ALIASES = {
  module: ['system module', 'module', 'platform / process area (module)', 'process area', 'platform module'],
  workflow: ['process', 'processes', 'business process', 'workflow', 'workflows'],
  name: ['transaction', 'transactions', 'transaction name', 'task'],
  role: ['platform role', 'role', 'system role', 'platform roles']
};
const norm = s => String(s == null ? '' : s).toLowerCase().replace(/\s+/g, ' ').trim();

function findHeader(rows) {
  for (let r = 0; r < Math.min(rows.length, 15); r++) {
    const cells = (rows[r] || []).map(norm);
    const idx = {};
    Object.keys(HEADER_ALIASES).forEach(k => {
      const i = cells.findIndex(c => HEADER_ALIASES[k].includes(c));
      if (i > -1) idx[k] = i;
    });
    if (idx.name != null) return { row: r, idx };
  }
  return null;
}

export const txKey = t => [t.module, t.workflow, t.name, t.role].map(norm).join('|');

// rows: a 2D array of cell values (first sheet of the upload). Returns
// { transactions, errors, warnings }. Ids are stable for identical rows so mappings survive a re-upload.
export function parseTransactionRows(rows) {
  const errors = [], warnings = [];
  if (!Array.isArray(rows) || !rows.length) return { transactions: [], errors: ['The file is empty.'], warnings };
  const head = findHeader(rows);
  if (!head) return { transactions: [], errors: [`No "Transaction" column found. Use the template columns: ${TEMPLATE_COLUMNS.join(', ')}.`], warnings };
  ['module', 'workflow', 'role'].forEach(k => {
    if (head.idx[k] == null) warnings.push(`No "${TEMPLATE_COLUMNS[['module', 'workflow', 'name', 'role'].indexOf(k)]}" column found; that field is left blank.`);
  });
  const seen = new Set(), transactions = [];
  let blank = 0, dupes = 0;
  for (let r = head.row + 1; r < rows.length; r++) {
    const row = rows[r] || [];
    const get = k => (head.idx[k] == null ? '' : String(row[head.idx[k]] == null ? '' : row[head.idx[k]]).trim());
    const t = { module: get('module'), workflow: get('workflow'), name: get('name'), role: get('role') };
    if (!t.name) { if (t.module || t.workflow || t.role) blank++; continue; }
    const key = txKey(t);
    if (seen.has(key)) { dupes++; continue; }
    seen.add(key);
    transactions.push(makeTransaction(t));
  }
  if (blank) warnings.push(`${blank} row(s) without a transaction name were skipped.`);
  if (dupes) warnings.push(`${dupes} duplicate row(s) were skipped.`);
  if (!transactions.length && !errors.length) errors.push('No transactions found under the header row.');
  return { transactions, errors, warnings };
}

export function makeTransaction({ module = '', workflow = '', name, role = '' }) {
  const auto = classifyTransaction(name, { role, workflow });
  return { id: 'tx-' + hash(txKey({ module, workflow, name, role })), module, workflow, name, role, auto, typeOverride: null, levelOverride: null };
}

// Content type: the user's choice if any, otherwise the automatic one.
export const txType = t => t.typeOverride || t.auto.type;

// Proficiency: an explicit override wins; otherwise it follows the (possibly overridden) content type.
export function txLevel(t) {
  if (t.levelOverride && LEVELS.includes(t.levelOverride)) return t.levelOverride;
  return levelForType(txType(t));
}
export const txNeedsReview = t => txType(t) === MANUAL_REVIEW || !LEVELS.includes(txLevel(t));

export function setOverride(t, { type, level }) {
  const next = { ...t };
  if (type !== undefined) next.typeOverride = type && (CONTENT_TYPES[type] || type === MANUAL_REVIEW) && type !== t.auto.type ? type : null;
  if (level !== undefined) next.levelOverride = level && LEVELS.includes(level) && level !== levelForType(txType(next)) ? level : null;
  return next;
}

// Merges a new upload into the current list: matching rows keep their overrides.
export function mergeTransactions(current, incoming) {
  const byId = new Map((current || []).map(t => [t.id, t]));
  return incoming.map(t => {
    const old = byId.get(t.id);
    return old ? { ...t, typeOverride: old.typeOverride, levelOverride: old.levelOverride, rafiq: old.rafiq } : t;
  });
}

export const workflowsOf = list => [...new Set(list.map(t => t.workflow || '(No process)'))];
export const rolesOf = list => [...new Set(list.map(t => t.role).filter(Boolean))].sort((a, b) => a.localeCompare(b));

// Minimal CSV reader (quoted fields, commas, CRLF) for uploads saved as .csv.
export function parseCsv(text) {
  const rows = []; let row = [], cell = '', q = false;
  const s = String(text || '').replace(/^﻿/, '');
  // The delimiter is whichever of comma, semicolon or tab appears most in the first line.
  const first = s.split(/\r?\n/)[0] || '';
  const delim = [',', ';', '\t'].map(d => [d, first.split(d).length]).sort((a, b) => b[1] - a[1])[0][0];
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) {
      if (c === '"' && s[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === delim) { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

export function toCsv(rows) {
  return rows.map(r => r.map(v => {
    const s = String(v == null ? '' : v);
    return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(',')).join('\r\n');
}

function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36);
}
