import assert from 'node:assert/strict';
import { createLudoState, legalMoves, rollLudo, moveLudo, trackIndex, FINISH, PLAYER_COLORS, SAFE_SQUARES, TRACK_LENGTH } from '../src/components/Games/ludoLogic.js';
let passed = 0;
function test(name, fn) { try { fn(); passed++; console.log(`PASS ${name}`); } catch (e) { console.error(`FAIL ${name}: ${e.message}`); process.exitCode = 1; } }
function withPiece(state, color, id, step) { return { ...state, pieces: state.pieces.map((set, ci) => ci === color ? set.map((piece) => piece.id === id ? { ...piece, step } : piece) : set) }; }

test('four houses have four tokens and diagonal teams', () => {
  const state = createLudoState();
  assert.equal(state.pieces.length, 4);
  assert.ok(state.pieces.every((pieces) => pieces.length === 4));
  assert.deepEqual(PLAYER_COLORS.filter(c => c.team === 0).map(c => c.name), ['Green', 'Blue']);
  assert.deepEqual(PLAYER_COLORS.filter(c => c.team === 1).map(c => c.name), ['Red', 'Yellow']);
  assert.equal(state.turn, 1);
});
test('one roll is consumed and turn order alternates between diagonal partners', () => {
  let state = rollLudo(createLudoState(), 6);
  assert.deepEqual(legalMoves(state, 6), [0, 1, 2, 3]);
  state = moveLudo(state, 0);
  assert.equal(state.pieces[1][0].step, 0);
  assert.equal(state.turn, 2); // Yellow belongs to partner
  assert.equal(state.dice, null);
  state = { ...state, dice: 6 };
  state = moveLudo(state, 0);
  assert.equal(state.turn, 3); // Blue returns to first partner
});
test('invalid dice results do not change state', () => {
  const state = createLudoState();
  assert.equal(rollLudo(state, 0), state);
  assert.equal(rollLudo(state, 7), state);
  assert.equal(rollLudo(state, 2.5), state);
});
test('yard tokens require a six', () => {
  const state = { ...createLudoState(), turn: 1 };
  assert.deepEqual(legalMoves(state, 5), []);
  assert.deepEqual(legalMoves(state, 6), [0, 1, 2, 3]);
  assert.equal(rollLudo(state, 5).turn, 2);
});
test('shared-track movement follows each color start', () => {
  assert.equal(TRACK_LENGTH, 52);
  assert.equal(trackIndex(1, 51), 12);
  assert.equal(trackIndex(1, 52), null);
  let state = withPiece(createLudoState(), 1, 0, 10);
  state = { ...state, turn: 1, dice: 4 };
  const next = moveLudo(state, 0);
  assert.equal(next.pieces[1][0].step, 14);
  assert.equal(trackIndex(1, 14), 27);
});
test('tokens enter the home lane and require exact finish roll', () => {
  let state = withPiece(createLudoState(), 1, 0, 51);
  state = { ...state, turn: 1, dice: 1 };
  assert.deepEqual(legalMoves(state, 1), [0]);
  state = moveLudo(state, 0);
  assert.equal(state.pieces[1][0].step, 52);
  let exact = withPiece(createLudoState(), 1, 0, FINISH - 1);
  exact = { ...exact, turn: 1, dice: 1 };
  assert.deepEqual(legalMoves(exact, 1), [0]);
  assert.deepEqual(legalMoves(exact, 2), []);
});
test('capture targets the opposing team but never a diagonal teammate', () => {
  let state = withPiece(createLudoState(), 1, 0, 4); // Green lands at global 18
  state = withPiece(state, 3, 0, 31); // Blue shares that square; teammate
  state = withPiece(state, 0, 0, 18); // Red shares that square; opponent
  state = { ...state, turn: 1, dice: 1 };
  const next = moveLudo(state, 0);
  assert.equal(next.pieces[3][0].step, 31);
  assert.equal(next.pieces[0][0].step, -1);
  assert.equal(next.turn, 2);
  assert.match(next.message, /captured/i);
});
test('safe squares prevent captures', () => {
  for (const safeIndex of SAFE_SQUARES) {
    const greenStep = (safeIndex - PLAYER_COLORS[1].start + TRACK_LENGTH) % TRACK_LENGTH;
    const redStep = (safeIndex - PLAYER_COLORS[0].start + TRACK_LENGTH) % TRACK_LENGTH;
    let state = withPiece(createLudoState(), 1, 0, greenStep - 1);
    state = withPiece(state, 0, 0, redStep);
    state = { ...state, turn: 1, dice: 1 };
    const next = moveLudo(state, 0);
    assert.equal(next.pieces[0][0].step, redStep);
  }
});
test('no legal move clears the die and advances to next color', () => {
  const state = { ...createLudoState(), pieces: createLudoState().pieces.map((set, ci) => ci === 1 ? set.map(p => ({ ...p, step: FINISH })) : set) };
  const next = rollLudo(state, 4);
  assert.equal(next.dice, null);
  assert.equal(next.turn, 2);
});
test('team wins only after all eight tokens reach home', () => {
  let state = createLudoState();
  for (const color of [1, 3]) state = { ...state, pieces: state.pieces.map((set, ci) => ci === color ? set.map(p => ({ ...p, step: FINISH })) : set) };
  state = withPiece(state, 1, 3, FINISH - 1);
  state = { ...state, turn: 1, dice: 1 };
  const won = moveLudo(state, 3);
  assert.equal(won.winner, 0);
  assert.equal(moveLudo(won, 0), won);
  assert.equal(rollLudo(won, 6), won);
});
if (process.exitCode) process.exit(process.exitCode);
console.log(`Ludo logic checks: ${passed} passed.`);
