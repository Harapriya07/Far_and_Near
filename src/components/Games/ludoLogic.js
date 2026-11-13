export const TRACK_LENGTH = 52;
export const HOME_LENGTH = 6;
export const FINISH = TRACK_LENGTH + HOME_LENGTH - 1;
// Red (top-left) and Blue (bottom-right) are the only playable houses.
export const PLAYER_COLORS = [
  { id: 0, name: "Red", hex: "#E85D5D", start: 0, team: 0, active: true },
  { id: 1, name: "Green", hex: "#42A879", start: 13, team: null, active: false },
  { id: 2, name: "Yellow", hex: "#E6B938", start: 26, team: null, active: false },
  { id: 3, name: "Blue", hex: "#4F6BFF", start: 39, team: 1, active: true },
];
export const ACTIVE_COLORS = [0, 3];
export const TURN_ORDER = [0, 3];
export const SAFE_SQUARES = new Set([0, 8, 13, 21, 26, 34, 39, 47]);
export const createLudoState = () => ({
  rulesVersion: 4, turn: 0, dice: null, lastRoll: null, lastRollPlayer: null,
  // Inactive houses deliberately have no tokens.
  pieces: PLAYER_COLORS.map((color) => color.active ? Array.from({ length: 4 }, (_, id) => ({ id, step: -1 })) : []),
  winner: null, message: "Red starts. Roll a six to bring a token out."
});
export const trackIndex = (player, step) => step < 0 || step >= TRACK_LENGTH ? null : (PLAYER_COLORS[player].start + step) % TRACK_LENGTH;
export function legalMoves(state, roll) {
  if (!Number.isInteger(roll) || roll < 1 || roll > 6 || state.winner !== null || !ACTIVE_COLORS.includes(state.turn)) return [];
  return (state.pieces?.[state.turn] || []).filter(p => p.step !== FINISH && (p.step === -1 ? roll === 6 : p.step + roll <= FINISH)).map(p => p.id);
}
export function nextLudoTurn(color) { return color === 0 ? 3 : 0; }
export function rollLudo(state, roll) {
  if (state.winner !== null || state.dice !== null || !ACTIVE_COLORS.includes(state.turn) || !Number.isInteger(roll) || roll < 1 || roll > 6) return state;
  const next = { ...state, dice: roll, lastRoll: roll, lastRollPlayer: state.turn };
  const moves = legalMoves(next, roll);
  if (!moves.length) { const turn = nextLudoTurn(state.turn); return { ...next, dice: null, turn, message: `No legal move on ${roll}. ${PLAYER_COLORS[turn].name}'s turn.` }; }
  return { ...next, message: `${PLAYER_COLORS[state.turn].name} rolled ${roll}. Select a highlighted token.` };
}
export function moveLudo(state, pieceId) {
  if (!ACTIVE_COLORS.includes(state.turn) || state.dice === null || !legalMoves(state, state.dice).includes(pieceId) || state.winner !== null) return state;
  const color = state.turn, roll = state.dice;
  const current = state.pieces[color].find(p => p.id === pieceId);
  const step = current.step === -1 ? 0 : current.step + roll;
  const pieces = state.pieces.map(set => set.map(p => ({ ...p })));
  pieces[color][pieceId] = { ...current, step };
  let captured = null; const landing = trackIndex(color, step);
  if (landing !== null && !SAFE_SQUARES.has(landing)) {
    const opponent = color === 0 ? 3 : 0;
    for (const token of pieces[opponent]) if (trackIndex(opponent, token.step) === landing) { token.step = -1; captured = PLAYER_COLORS[opponent].name; }
  }
  const won = pieces[color].every(p => p.step === FINISH);
  if (won) return { ...state, pieces, dice: null, winner: color === 0 ? 0 : 1, message: `${PLAYER_COLORS[color].name} wins! All four tokens are home.` };
  const turn = nextLudoTurn(color);
  return { ...state, pieces, dice: null, turn, message: captured ? `${PLAYER_COLORS[color].name} captured a ${captured} token! ${PLAYER_COLORS[turn].name}'s turn.` : `${PLAYER_COLORS[color].name} moved. ${PLAYER_COLORS[turn].name}'s turn.` };
}
