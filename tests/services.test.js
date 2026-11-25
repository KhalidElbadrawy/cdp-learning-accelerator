import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { _setCapability, _resetCapabilities, capability } from '../js/services/platform.js';
import { createRepository, _test, MAX_DOC_BYTES } from '../js/services/storage.js';
import { newInitiative } from '../js/engine/initiative.js';
import { makeTransaction } from '../js/engine/transactions.js';

beforeEach(() => _resetCapabilities());

test('capability resolves null outside claude.ai', async () => {
  assert.equal(await capability('db', 50), null);
});

test('local repository: save, list, replace, remove, broken storage', async () => {
  const repo = await createRepository({ storage: _test.memoryStorage(), timeoutMs: 20 });
  assert.equal(repo.kind, 'local');
  const a = { ...newInitiative('a'), created: true, needs: { name: 'A', outcome: '', processes: '', goLive: '' } };
  await repo.save(a);
  await repo.save({ ...a, needs: { ...a.needs, name: 'A2' } });
  let list = await repo.list();
  assert.equal(list.length, 1);
  assert.equal(list[0].needs.name, 'A2');
  await repo.remove('a');
  assert.equal((await repo.list()).length, 0);
  const bad = { getItem: () => '{not json', setItem: () => { throw new Error('quota'); } };
  const local = _test.localBackend(bad);
  assert.deepEqual(await local.list(), []);
  await assert.rejects(local.save(a), /did not allow saving/);
});

function fakeDb() {
  const docs = new Map();
  const col = {
    async get() { return { docs: [...docs.entries()].map(([id, data]) => ({ id, data: () => data })) }; },
    doc: id => ({ async set(d) { docs.set(id, d); }, async delete() { docs.delete(id); } }),
    onSnapshot(cb) { col._cb = cb; return () => {}; }
  };
  return { docs, collection: () => col, col };
}

test('shared repository stores JSON per initiative and survives junk documents', async () => {
  const db = fakeDb();
  _setCapability('db', db);
  const repo = await createRepository({ timeoutMs: 20 });
  assert.equal(repo.kind, 'shared');
  const a = { ...newInitiative('a'), created: true };
  await repo.save(a);
  db.docs.set('junk', { json: '{oops' });
  db.docs.set('empty', {});
  const list = await repo.list();
  assert.equal(list.length, 1);
  assert.equal(list[0].id, 'a');
  let seen = null;
  repo.subscribe(l => { seen = l; });
  db.col._cb({ metadata: { hasPendingWrites: false }, docs: (await db.col.get()).docs });
  assert.equal(seen.length, 1);
  const huge = { ...a, paths: { ...a.paths, transactions: Array.from({ length: 4000 }, (_, i) => makeTransaction({ name: 'Create invoice number ' + i, workflow: 'W', module: 'M', role: 'R' })) } };
  assert.ok(JSON.stringify(huge).length > MAX_DOC_BYTES);
  await assert.rejects(repo.save(huge), /too large/);
});

test('shared storage that refuses falls back to this browser', async () => {
  _setCapability('db', { collection: () => ({ get: async () => { throw { code: 'not_granted' }; } }) });
  const repo = await createRepository({ storage: _test.memoryStorage(), timeoutMs: 20 });
  assert.equal(repo.kind, 'local');
});
