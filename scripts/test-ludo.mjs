import assert from 'node:assert/strict';
import { createLudoState, legalMoves, rollLudo, moveLudo, trackIndex, FINISH, PLAYER_COLORS, SAFE_SQUARES, TRACK_LENGTH, ACTIVE_COLORS, TURN_ORDER, nextLudoTurn } from '../src/components/Games/ludoLogic.js';
let passed = 0;
function test(name, fn) { try { fn(); passed++; console.log(`PASS ${name}`); } catch (e) { console.error(`FAIL ${name}: ${e.message}`); process.exitCode = 1; } }
function withPiece(state, color, id, step) { return { ...state, pieces: state.pieces.map((set, ci) => ci === color ? set.map((piece) => piece.id === id ? { ...piece, step } : piece) : set) }; }

test('only Red and Blue are active, opposite, with four tokens each', () => {
  const state = createLudoState();
  assert.deepEqual(ACTIVE_COLORS, [0, 3]); assert.deepEqual(TURN_ORDER, [0, 3]);
  assert.equal(state.turn, 0); assert.equal(state.pieces[0].length, 4); assert.equal(state.pieces[3].length, 4);
  assert.equal(state.pieces[1].length, 0); assert.equal(state.pieces[2].length, 0);
  assert.deepEqual(PLAYER_COLORS.filter(c => c.active).map(c => c.name), ['Red', 'Blue']);
  assert.equal(PLAYER_COLORS[0].team, 0); assert.equal(PLAYER_COLORS[3].team, 1);
});
test('turns alternate exclusively Red then Blue', () => {
  assert.equal(nextLudoTurn(0), 3); assert.equal(nextLudoTurn(3), 0);
  let state = rollLudo(createLudoState(), 6); assert.deepEqual(legalMoves(state, 6), [0,1,2,3]);
  state = moveLudo(state, 0); assert.equal(state.pieces[0][0].step, 0); assert.equal(state.turn, 3); assert.equal(state.dice, null);
  state = rollLudo(state, 6); state = moveLudo(state, 0); assert.equal(state.turn, 0);
});
test('inactive houses cannot receive moves or turns', () => {
  const state = createLudoState();
  assert.deepEqual(legalMoves({...state, turn:1}, 6), []);
  assert.deepEqual(legalMoves({...state, turn:2}, 6), []);
  assert.equal(moveLudo({...state, turn:1, dice:6}, 0).pieces[1].length, 0);
});
test('invalid dice results and repeated rolls do not change state', () => {
  const state = createLudoState();
  for (const roll of [0,7,2.5,NaN]) assert.equal(rollLudo(state, roll), state);
  const rolled = rollLudo(state, 6); assert.equal(rollLudo(rolled, 4), rolled);
});
test('yard tokens require a six and no-move rolls pass the turn', () => {
  assert.deepEqual(legalMoves(createLudoState(), 5), []);
  assert.deepEqual(legalMoves(createLudoState(), 6), [0,1,2,3]);
  const noMove = rollLudo(createLudoState(), 4); assert.equal(noMove.dice, null); assert.equal(noMove.turn, 3);
});
test('movement follows both active tracks and exact finish rules', () => {
  assert.equal(TRACK_LENGTH,52); assert.equal(trackIndex(0,51),51); assert.equal(trackIndex(3,51),38);
  let state = withPiece(createLudoState(),0,0,51); state={...state,dice:1}; state=moveLudo(state,0); assert.equal(state.pieces[0][0].step,52); assert.equal(state.turn,3);
  let exact = withPiece(createLudoState(),3,0,FINISH-1); exact={...exact,turn:3,dice:1}; assert.deepEqual(legalMoves(exact,1),[0]); assert.deepEqual(legalMoves(exact,2),[]);
});
test('captures only the opposing active color and safe squares protect tokens', () => {
  let state=withPiece(createLudoState(),0,0,4); state=withPiece(state,3,0,18); state={...state,dice:1};
  const moved=moveLudo(state,0); assert.equal(moved.pieces[3][0].step,-1); assert.match(moved.message,/captured/i);
  for(const safe of SAFE_SQUARES){const redStep=(safe-PLAYER_COLORS[0].start+TRACK_LENGTH)%TRACK_LENGTH;const blueStep=(safe-PLAYER_COLORS[3].start+TRACK_LENGTH)%TRACK_LENGTH;let s=withPiece(createLudoState(),0,0,redStep-1);s=withPiece(s,3,0,blueStep);s={...s,dice:1};assert.equal(moveLudo(s,0).pieces[3][0].step,blueStep);}
});
test('one color wins with four tokens and six does not grant an extra turn', () => {
  let state=createLudoState(); state={...state,pieces:state.pieces.map((set,i)=>i===0?set.map(p=>({...p,step:FINISH})):set)};
  state=withPiece(state,0,3,FINISH-1); state={...state,dice:1}; const won=moveLudo(state,3);
  assert.equal(won.winner,0); assert.equal(won.turn,0); assert.equal(rollLudo(won,6),won);
  const six=rollLudo(createLudoState(),6); const moved=moveLudo(six,0); assert.equal(moved.turn,3);
});
if(process.exitCode)process.exit(process.exitCode); console.log(`Ludo logic checks: ${passed} passed.`);
