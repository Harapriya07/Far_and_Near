export const TRACK_LENGTH = 52;
export const HOME_LENGTH = 6;
export const FINISH = TRACK_LENGTH + HOME_LENGTH - 1;
export const PLAYER_COLORS = [
  { id: 0, name: "Red", hex: "#E85D5D", start: 0, team: 1 },
  { id: 1, name: "Green", hex: "#42A879", start: 13, team: 0 },
  { id: 2, name: "Yellow", hex: "#E6B938", start: 26, team: 1 },
  { id: 3, name: "Blue", hex: "#4F6BFF", start: 39, team: 0 },
];
export const TURN_ORDER = [1, 2, 3, 0];
export const SAFE_SQUARES = new Set([0, 8, 13, 21, 26, 34, 39, 47]);
export const createLudoState = () => ({
  rulesVersion: 3, turn: 1, dice: null, lastRoll: null, lastRollPlayer: null,
  pieces: PLAYER_COLORS.map(() => Array.from({ length: 4 }, (_, id) => ({ id, step: -1 }))),
  winner: null, message: "Green starts. Roll a six to bring a token out."
});
export const trackIndex = (player, step) => step < 0 || step >= TRACK_LENGTH ? null : (PLAYER_COLORS[player].start + step) % TRACK_LENGTH;
export function legalMoves(state, roll) {
  if (!Number.isInteger(roll) || roll < 1 || roll > 6 || state.winner !== null) return [];
  return (state.pieces?.[state.turn] || []).filter(p => p.step !== FINISH && (p.step === -1 ? roll === 6 : p.step + roll <= FINISH)).map(p => p.id);
}
export function nextLudoTurn(color) { return TURN_ORDER[(TURN_ORDER.indexOf(color) + 1) % TURN_ORDER.length]; }
export function rollLudo(state, roll) {
  if (state.winner !== null || state.dice !== null || !Number.isInteger(roll) || roll < 1 || roll > 6) return state;
  const next = { ...state, dice: roll, lastRoll: roll, lastRollPlayer: state.turn };
  const moves = legalMoves(next, roll);
  if (!moves.length) { const turn = nextLudoTurn(state.turn); return { ...next, dice: null, turn, message: `No legal move on ${roll}. ${PLAYER_COLORS[turn].name}'s turn.` }; }
  return { ...next, message: `${PLAYER_COLORS[state.turn].name} rolled ${roll}. Select a highlighted token.` };
}
export function moveLudo(state, pieceId) {
  if (state.dice === null || !legalMoves(state, state.dice).includes(pieceId) || state.winner !== null) return state;
  const color = state.turn, team = PLAYER_COLORS[color].team, roll = state.dice;
  const current = state.pieces[color].find(p => p.id === pieceId);
  const step = current.step === -1 ? 0 : current.step + roll;
  const pieces = state.pieces.map(set => set.map(p => ({ ...p })));
  pieces[color][pieceId] = { ...current, step };
  let captured = null; const landing = trackIndex(color, step);
  if (landing !== null && !SAFE_SQUARES.has(landing)) {
    for (let opponent = 0; opponent < 4; opponent++) {
      if (PLAYER_COLORS[opponent].team === team) continue;
      for (const token of pieces[opponent]) if (trackIndex(opponent, token.step) === landing) { token.step = -1; captured = PLAYER_COLORS[opponent].name; }
    }
  }
  const teamColors = PLAYER_COLORS.filter(c => c.team === team).map(c => c.id);
  const won = teamColors.every(index => pieces[index].every(p => p.step === FINISH));
  if (won) return { ...state, pieces, dice: null, winner: team, message: `Team ${team === 0 ? "Green + Blue" : "Red + Yellow"} wins! All eight tokens are home.` };
  const turn = nextLudoTurn(color);
  return { ...state, pieces, dice: null, turn, message: captured ? `${PLAYER_COLORS[color].name} captured a ${captured} token! ${PLAYER_COLORS[turn].name}'s turn.` : `${PLAYER_COLORS[color].name} moved. ${PLAYER_COLORS[turn].name}'s turn.` };
}
