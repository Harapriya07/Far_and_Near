import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

class MemoryStorage {
  data = new Map();
  failGet = false;
  failSetKey = null;
  failRemove = false;
  getItem(key) {
    if (this.failGet) throw new Error('blocked');
    return this.data.has(key) ? this.data.get(key) : null;
  }
  setItem(key, value) {
    if (this.failSetKey === key) throw new Error('quota');
    this.data.set(key, String(value));
  }
  removeItem(key) {
    if (this.failRemove) throw new Error('blocked');
    this.data.delete(key);
  }
  clear() { this.data.clear(); }
}

const storage = new MemoryStorage();
globalThis.localStorage = storage;
globalThis.window = { localStorage: storage, addEventListener() {} };
const auth = await import('../src/utils/authStore.js');
const bucketSource = (await readFile(new URL('../src/utils/bucketListStore.js', import.meta.url), 'utf8'))
  .replace('import { useSyncExternalStore } from "react";', 'const useSyncExternalStore = () => {};')
  .replace('export const BUCKET_LIST_STORAGE_KEY', 'const BUCKET_LIST_STORAGE_KEY')
  .replaceAll('export function ', 'function ');
const bucketModuleSource = `${bucketSource}\nexport { BUCKET_LIST_STORAGE_KEY, saveBucketList, refreshBucketListFromStorage, useBucketList };`;
const bucket = await import(`data:text/javascript;base64,${Buffer.from(bucketModuleSource).toString('base64')}`);
let passed = 0;
function test(name, fn) {
  try { fn(); passed += 1; console.log(`PASS ${name}`); }
  catch (error) { console.error(`FAIL ${name}: ${error.message}`); process.exitCode = 1; }
}
function reset() { storage.clear(); storage.failGet = false; storage.failSetKey = null; storage.failRemove = false; }

reset();
let alice;
test('signup stores account and returns no password representation', () => {
  alice = auth.signup({ name: 'Alice', email: ' Alice@example.com ', password: 'password-123' });
  assert.equal(alice.email, 'alice@example.com');
  assert.equal('passwordHash' in alice, false);
  assert.equal(auth.getCurrentAccount().id, alice.id);
});
test('rejects invalid signup fields', () => {
  assert.throws(() => auth.signup({ name: ' ', email: 'a@b.com', password: 'password-123' }), /name/i);
  assert.throws(() => auth.signup({ name: 'Bob', email: 'not-email', password: 'password-123' }), /valid email/i);
  assert.throws(() => auth.signup({ name: 'Bob', email: 'b@b.com', password: 'short' }), /8 characters/i);
});
test('rejects duplicate email case-insensitively', () => {
  assert.throws(() => auth.signup({ name: 'Another Alice', email: 'ALICE@example.com', password: 'password-123' }), /couldn't create/i);
});
test('valid login works and invalid credentials are rejected', () => {
  assert.equal(auth.login({ email: 'ALICE@example.com', password: 'password-123' }).id, alice.id);
  assert.throws(() => auth.login({ email: 'alice@example.com', password: 'wrong-password' }), /couldn't log you in/i);
});
let space;
test('creates a space and second account can join locally', () => {
  space = auth.createSpace({ accountId: alice.id, spaceName: 'Us Two' });
  assert.match(space.code, /^[A-HJ-NP-Z2-9]{6}$/);
  const bob = auth.signup({ name: 'Bob', email: 'bob@example.com', password: 'password-456' });
  assert.equal(auth.joinSpace({ accountId: bob.id, code: space.code.toLowerCase() }).id, space.id);
  assert.equal(auth.getPartner(alice.id, space.id).email, 'bob@example.com');
});
test('rejects a third member and invalid invite code', () => {
  const charlie = auth.signup({ name: 'Charlie', email: 'charlie@example.com', password: 'password-789' });
  assert.throws(() => auth.joinSpace({ accountId: charlie.id, code: space.code }), /two people/i);
  assert.throws(() => auth.joinSpace({ accountId: charlie.id, code: 'bad' }), /6 letters/i);
});
test('logout clears the session and relogin restores it', () => {
  auth.logout();
  assert.equal(auth.getCurrentAccount(), null);
  assert.equal(auth.login({ email: 'alice@example.com', password: 'password-123' }).id, alice.id);
});
test('malformed auth JSON is preserved and reported', () => {
  const raw = '{not valid'; storage.setItem('alya:accounts', raw);
  assert.throws(() => auth.getCurrentAccount(), /could not be read/i);
  assert.equal(storage.getItem('alya:accounts'), raw);
});
test('auth storage write failure is reported', () => {
  reset(); storage.failSetKey = 'alya:accounts';
  assert.throws(() => auth.signup({ name: 'Fail', email: 'fail@example.com', password: 'password-123' }), /couldn't save/i);
  assert.equal(storage.getItem('alya:accounts'), null);
});


test('dangling space associations can be repaired by an explicit setup action', () => {
  reset();
  const user = auth.signup({ name: 'Repair', email: 'repair@example.com', password: 'password-123' });
  const accounts = JSON.parse(storage.getItem('alya:accounts'));
  accounts[0].spaceId = 'missing-space-id';
  storage.setItem('alya:accounts', JSON.stringify(accounts));
  const created = auth.createSpace({ accountId: user.id, spaceName: 'Fresh start' });
  assert.equal(auth.getCurrentAccount().spaceId, created.id);
});

reset(); bucket.refreshBucketListFromStorage();
test('bucket list starts empty without seed data', () => {
  assert.equal(typeof bucket.useBucketList, 'function'); // hook is not invoked by this storage-only harness
  assert.equal(storage.getItem('alya:bucket-list'), null);
});
test('bucket list saves valid items and rejects duplicate IDs', () => {
  const item = { id: 'stable-1', text: 'See the sea', category: 'experiences', targetDate: '', note: '', completed: false };
  assert.equal(bucket.saveBucketList([item]).ok, true);
  assert.equal(JSON.parse(storage.getItem('alya:bucket-list'))[0].id, 'stable-1');
  assert.equal(bucket.saveBucketList([{ ...item, id: 'blank-text', text: '   ' }]).ok, false);
  const duplicate = bucket.saveBucketList([item, { ...item, text: 'Another dream' }]);
  assert.equal(duplicate.ok, false);
  assert.equal(JSON.parse(storage.getItem('alya:bucket-list')).length, 1);
});
test('bucket list refuses malformed storage without overwriting it', () => {
  const raw = '{broken'; storage.setItem('alya:bucket-list', raw); bucket.refreshBucketListFromStorage();
  assert.equal(bucket.saveBucketList([]).ok, false);
  assert.equal(storage.getItem('alya:bucket-list'), raw);
});
test('bucket list reports storage write failure', () => {
  reset(); bucket.refreshBucketListFromStorage(); storage.failSetKey = 'alya:bucket-list';
  const result = bucket.saveBucketList([{ id: 'write-fail', text: 'Test', completed: false }]);
  assert.equal(result.ok, false);
  assert.match(result.error, /couldn't save/i);
  assert.equal(storage.getItem('alya:bucket-list'), null);
});

if (process.exitCode) process.exit(process.exitCode);
console.log(`Auth/bucket localStorage checks: ${passed} passed.`);
