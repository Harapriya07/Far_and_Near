import assert from 'node:assert/strict';
import { TIC_TAC_TOE_LINES, calculateTicTacToeResult, playTicTacToeMove } from '../src/components/Games/ticTacToeLogic.js';
let passed = 0;
function test(name, fn) { try { fn(); passed++; console.log(`PASS ${name}`); } catch (e) { console.error(`FAIL ${name}: ${e.message}`); process.exitCode = 1; } }
test('all 8 horizontal, vertical, and diagonal wins are detected', () => {
  assert.equal(TIC_TAC_TOE_LINES.length, 8);
  for (const line of TIC_TAC_TOE_LINES) {
    const board = Array(9).fill(null);
    for (const index of line) board[index] = 'X';
    const result = calculateTicTacToeResult(board);
    assert.equal(result?.winner, 'X');
    assert.deepEqual(result?.line, line);
  }
});
test('turns alternate after legal moves', () => {
  const first = playTicTacToeMove(Array(9).fill(null), 'X', 0);
  assert.equal(first.moved, true);
  assert.equal(first.turn, 'O');
  assert.equal(first.board[0], 'X');
});
test('occupied and out-of-range cells are rejected', () => {
  const board = ['X', null, null, null, null, null, null, null, null];
  assert.equal(playTicTacToeMove(board, 'O', 0).moved, false);
  assert.equal(playTicTacToeMove(board, 'O', -1).moved, false);
  assert.equal(playTicTacToeMove(board, 'O', 9).moved, false);
});
test('draw is detected', () => {
  const board = ['X','O','X','X','O','O','O','X','X'];
  assert.deepEqual(calculateTicTacToeResult(board), { winner: 'draw', line: [] });
});
test('moves are rejected after a win', () => {
  const board = ['X','X','X','O','O',null,null,null,null];
  assert.equal(playTicTacToeMove(board, 'O', 5).moved, false);
});
if (process.exitCode) process.exit(process.exitCode);
console.log(`Tic-Tac-Toe logic checks: ${passed} passed.`);
