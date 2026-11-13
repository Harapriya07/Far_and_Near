import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const app = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');
const expected = [
  '/', '/login', '/signup', '/space/setup', '/dashboard', '/games',
  '/games/room', '/games/truth-or-dare', '/games/would-you-rather', '/games/never-have-i-ever',
  '/games/finish-my-sentence', '/games/tic-tac-toe', '/games/ludo', '/bucket-list',
];
for (const route of expected) assert.ok(app.includes(`path="${route}"`), `missing route ${route}`);
assert.match(app, /<Route path="\*" element=\{<NotFound \/>\} \/>/, 'wildcard Not Found route is missing');
assert.match(app, /<Route element=\{<ProtectedRoute \/>\}>[\s\S]*<Route path="\/dashboard"/, 'dashboard should remain behind ProtectedRoute');
assert.match(app, /<Route element=\{<GameRoomGate \/>\}>[\s\S]*<Route path="\/games\/ludo"/, 'all game routes should be behind the shared game room gate');
console.log(`PASS route configuration: ${expected.length} existing routes plus wildcard and protected dashboard declaration.`);
