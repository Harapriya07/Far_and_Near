import assert from 'node:assert/strict';
import { CATEGORIES, TRUTH_OR_DARE, getRandomPrompt } from '../src/data/truthOrDare.js';
import { WYR_CATEGORIES, WOULD_YOU_RATHER, getRandomWYR } from '../src/data/wouldYouRather.js';
import { NHIE_CATEGORIES, NEVER_HAVE_I_EVER, getRandomNHIE } from '../src/data/neverHaveIEver.js';
import { FINISH_MY_SENTENCE, getRandomSentence } from '../src/data/finishMySentence.js';
let passed = 0;
function test(name, fn) { try { fn(); passed++; console.log(`PASS ${name}`); } catch (e) { console.error(`FAIL ${name}: ${e.message}`); process.exitCode = 1; } }

test('Truth or Dare categories each contain valid truth and dare prompts', () => {
  for (const category of CATEGORIES) {
    assert.ok(TRUTH_OR_DARE[category.id].truths.some((p) => typeof p === 'string' && p.trim()));
    assert.ok(TRUTH_OR_DARE[category.id].dares.some((p) => typeof p === 'string' && p.trim()));
    assert.equal(typeof getRandomPrompt(category.id, 'truths'), 'string');
    assert.notEqual(getRandomPrompt(category.id, 'truths', TRUTH_OR_DARE[category.id].truths[0]), '');
  }
});
test('Would You Rather pairs are nonblank and distinct', () => {
  for (const category of WYR_CATEGORIES) {
    const item = getRandomWYR(category.id);
    assert.ok(item && item.a.trim() && item.b.trim() && item.a.trim() !== item.b.trim());
    assert.notEqual(getRandomWYR(category.id, item), null); // a valid category still has another item
  }
});
test('Never Have I Ever categories return valid statements', () => {
  for (const category of NHIE_CATEGORIES) assert.ok(getRandomNHIE(category.id).trim());
});
test('Finish My Sentence returns valid blanks and no fabricated fallback for an empty bank', () => {
  assert.ok(FINISH_MY_SENTENCE.every((sentence) => sentence.includes('______')));
  assert.ok(getRandomSentence().includes('______'));
  const original = FINISH_MY_SENTENCE.splice(0, FINISH_MY_SENTENCE.length);
  try { assert.equal(getRandomSentence(), null); }
  finally { FINISH_MY_SENTENCE.push(...original); }
});
test('invalid or unknown prompt categories return no prompt', () => {
  assert.equal(getRandomPrompt('missing', 'truths'), null);
  assert.equal(getRandomWYR('missing'), null);
  assert.equal(getRandomNHIE('missing'), null);
});

test('prompt helpers ignore blank or malformed entries', () => {
  const truths = TRUTH_OR_DARE.cute.truths;
  const wyr = WOULD_YOU_RATHER.cute;
  const nhie = NEVER_HAVE_I_EVER.cute;
  TRUTH_OR_DARE.cute.truths = ['', null, '   '];
  WOULD_YOU_RATHER.cute = [{ a: 'same', b: 'same' }, { a: '', b: 'valid' }];
  NEVER_HAVE_I_EVER.cute = ['', null, '  '];
  try {
    assert.equal(getRandomPrompt('cute', 'truths'), null);
    assert.equal(getRandomWYR('cute'), null);
    assert.equal(getRandomNHIE('cute'), null);
  } finally {
    TRUTH_OR_DARE.cute.truths = truths;
    WOULD_YOU_RATHER.cute = wyr;
    NEVER_HAVE_I_EVER.cute = nhie;
  }
});

if (process.exitCode) process.exit(process.exitCode);
console.log(`Game data checks: ${passed} passed.`);
