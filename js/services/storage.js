// Initiative repository. Shared storage (the artifact's database) when the viewer can reach it, so
// every team member sees the same initiatives; otherwise this browser's storage.
// Each initiative is one document holding its JSON, so field names never collide with storage rules.
import { capability } from './platform.js';
import { normalizeInitiative } from '../engine/initiative.js';

const COLLECTION = 'initiatives';
const LOCAL_KEY = 'cdp-learning-accelerator-v2:initiatives';
export const MAX_DOC_BYTES = 240 * 1024;

function localBackend(storage) {
  const read = () => {
    try { const v = JSON.parse(storage.getItem(LOCAL_KEY) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; }
  };
  const write = list => { try { storage.setItem(LOCAL_KEY, JSON.stringify(list)); return true; } catch (e) { return false; } };
  return {
    kind: 'local',
    async list() { return read().map(normalizeInitiative).filter(Boolean); },
    async save(init) {
      const list = read().filter(x => x && x.id !== init.id);
      list.push(init);
      if (!write(list)) throw new Error('This browser did not allow saving. Free some space or allow site data.');
    },
    async remove(id) { write(read().filter(x => x && x.id !== id)); },
    subscribe() { return () => {}; }
  };
}

function sharedBackend(db) {
  const col = db.collection(COLLECTION);
  const decode = snap => {
    try { const d = snap.data(); return d && d.json ? normalizeInitiative(JSON.parse(d.json)) : null; } catch (e) { return null; }
  };
  return {
    kind: 'shared',
    async list() { const q = await col.get(); return q.docs.map(decode).filter(Boolean); },
    async save(init) {
      const json = JSON.stringify(init);
      if (json.length > MAX_DOC_BYTES) throw new Error('This initiative is too large to save. Remove unused transactions and try again.');
      await col.doc(init.id).set({ json, name: init.needs?.name || '', updatedAt: new Date().toISOString() });
    },
    async remove(id) { await col.doc(id).delete(); },
    // Calls back with the full list whenever another viewer changes an initiative.
    subscribe(cb) {
      try { return col.onSnapshot(q => { if (!q.metadata?.hasPendingWrites) cb(q.docs.map(decode).filter(Boolean)); }, () => {}); }
      catch (e) { return () => {}; }
    }
  };
}

let storageRef = null;
function browserStorage() {
  if (storageRef) return storageRef;
  try { storageRef = window.localStorage; storageRef.getItem('x'); } catch (e) { storageRef = memoryStorage(); }
  return storageRef;
}
function memoryStorage() { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) }; }

export async function createRepository({ storage, timeoutMs } = {}) {
  const db = await capability('db', timeoutMs);
  if (db) {
    const shared = sharedBackend(db);
    try { await shared.list(); return shared; } catch (e) { /* not granted or unavailable: fall back */ }
  }
  return localBackend(storage || browserStorage());
}

export const _test = { localBackend, sharedBackend, memoryStorage };
