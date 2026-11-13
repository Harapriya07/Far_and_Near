import { FINISH, PLAYER_COLORS } from "./ludoLogic.js";

// 52 unique outer-track cells. Each player's final outer cell meets their
// five-cell home lane orthogonally; the sixth logical home step is the center.
export const TRACK_COORDS = [
  [6,1],[6,2],[6,3],[6,4],[6,5],[5,6],[4,6],[3,6],[2,6],[1,6],[0,6],[0,7],[1,7],
  [1,8],[2,8],[3,8],[4,8],[5,8],[6,9],[6,10],[6,11],[6,12],[6,13],[6,14],[7,14],[7,13],
  [8,13],[8,12],[8,11],[8,10],[8,9],[9,8],[10,8],[11,8],[12,8],[13,8],[14,8],[14,7],[13,7],
  [13,6],[12,6],[11,6],[10,6],[9,6],[8,5],[8,4],[8,3],[8,2],[8,1],[8,0],[7,0],[7,1],
];

export const HOME = [
  [[7,2],[7,3],[7,4],[7,5],[7,6]],
  [[2,7],[3,7],[4,7],[5,7],[6,7]],
  [[7,12],[7,11],[7,10],[7,9],[7,8]],
  [[12,7],[11,7],[10,7],[9,7],[8,7]],
];

export const YARDS = [{r:0,c:0},{r:0,c:9},{r:9,c:9},{r:9,c:0}];

export function pieceCell(player, piece) {
  if (piece.step === -1) {
    const yard = YARDS[player];
    return [yard.r + (piece.id < 2 ? 1 : 3), yard.c + (piece.id % 2 ? 3 : 1)];
  }
  if (piece.step === FINISH) return [7,7];
  if (piece.step < 52) return TRACK_COORDS[(PLAYER_COLORS[player].start + piece.step) % 52];
  return HOME[player][piece.step - 52] || [7,7];
}
