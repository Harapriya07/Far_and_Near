import assert from "node:assert/strict";
import { TRACK_COORDS, HOME, YARDS, pieceCell } from "../src/components/Games/ludoBoard.js";
import { PLAYER_COLORS, FINISH } from "../src/components/Games/ludoLogic.js";

assert.deepEqual(YARDS[0], {r:0,c:0});
assert.deepEqual(YARDS[3], {r:9,c:9}); // Red and Blue are diagonally opposite.
assert.equal(TRACK_COORDS.length, 52);
assert.equal(new Set(TRACK_COORDS.map(([r,c]) => `${r},${c}`)).size, 52);
for (const [r,c] of TRACK_COORDS) assert.ok(r >= 0 && r < 15 && c >= 0 && c < 15);
for (let player = 0; player < 4; player++) {
  const entryIndex = (PLAYER_COLORS[player].start + 51) % 52;
  const entry = TRACK_COORDS[entryIndex];
  const lane = HOME[player];
  assert.equal(lane.length, 5);
  const route = [entry, ...lane, [7,7]];
  for (let i = 1; i < route.length; i++) {
    const [r1,c1] = route[i-1]; const [r2,c2] = route[i];
    assert.equal(Math.abs(r1-r2) + Math.abs(c1-c2), 1, `${PLAYER_COLORS[player].name} home-lane break at ${i}`);
  }
  assert.deepEqual(pieceCell(player, {id:0, step:52}), lane[0]);
  assert.deepEqual(pieceCell(player, {id:0, step:56}), lane[4]);
  assert.deepEqual(pieceCell(player, {id:0, step:FINISH}), [7,7]);
}
console.log("Ludo board geometry checks: 52 unique track cells and all four home-entry lanes connect to center.");
