export const TIC_TAC_TOE_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

export function calculateTicTacToeResult(board) {
  for (const line of TIC_TAC_TOE_LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line };
    }
  }
  if (board.every(Boolean)) return { winner: "draw", line: [] };
  return null;
}

export function playTicTacToeMove(board, turn, index) {
  const result = calculateTicTacToeResult(board);
  if (result || !Number.isInteger(index) || index < 0 || index >= 9 || board[index]) {
    return { board, turn, result, moved: false };
  }
  const nextBoard = board.slice();
  nextBoard[index] = turn;
  const nextResult = calculateTicTacToeResult(nextBoard);
  return {
    board: nextBoard,
    turn: nextResult ? turn : turn === "X" ? "O" : "X",
    result: nextResult,
    moved: true,
  };
}
