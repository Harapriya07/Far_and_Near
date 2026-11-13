import { Link } from "react-router-dom";
import { BackIcon } from "../Navigation/icons.jsx";
import { calculateTicTacToeResult, playTicTacToeMove } from "./ticTacToeLogic.js";
import { useSharedGameState } from "./useSharedGameState.js";
import "./Games.css";
import "./TicTacToe.css";
const INITIAL = { board: Array(9).fill(null), turn: "X", scores: { X: 0, O: 0, draw: 0 } };
function TicTacToe() {
  const { state, setSharedState, room, userId, ready, error, retry } = useSharedGameState("tic-tac-toe", INITIAL);
  const board = state.board || INITIAL.board;
  const result = calculateTicTacToeResult(board);
  const myMark = room?.players?.[0]?.id === userId ? "X" : "O";
  const canPlay = ready && !result && state.turn === myMark;
  function playCell(index) {
    if (!canPlay || board[index]) return;
    const next = playTicTacToeMove(board, state.turn, index);
    if (!next.moved) return;
    const scores = { ...(state.scores || INITIAL.scores) };
    if (next.result) scores[next.result.winner] = (scores[next.result.winner] || 0) + 1;
    setSharedState((old) => ({ ...old, board: next.board, turn: next.result ? old.turn : next.turn, scores }));
  }
  function newRound() { if (!result) return; setSharedState((old) => ({ ...old, board: Array(9).fill(null), turn: result.winner === "draw" ? (old.turn === "X" ? "O" : "X") : result.winner === "X" ? "O" : "X" })); }
  function resetMatch() { if (myMark !== "X") return; setSharedState({ ...INITIAL, board: Array(9).fill(null), scores: { X: 0, O: 0, draw: 0 } }); }
  const status = result?.winner === "draw" ? "It's a draw" : result?.winner ? `${result.winner} wins this round` : `${state.turn}'s turn`;
  if (!ready) return <div className="game-page"><p>Connecting to your shared round…</p>{error && <p className="shared-game-error" role="alert">{error}</p>}<button className="btn btn-outline" onClick={retry}>Retry connection</button></div>;
  return <div className="game-page"><Link to="/games" className="game-back"><BackIcon/><span>Games</span></Link><div className="page-head"><p className="page-head__eyebrow">Tic Tac Toe</p><h1>A quiet little rivalry</h1><p>You're {myMark}. Your partner is {myMark === "X" ? "O" : "X"}. Moves sync on both screens.</p></div>
    <div className="ttt"><div className="ttt-scoreboard glass-card"><div className="ttt-score"><span className="ttt-score__label">You · {myMark}</span><span className="ttt-score__value">{state.scores?.[myMark] || 0}</span></div><div className="ttt-score"><span className="ttt-score__label">Draws</span><span className="ttt-score__value">{state.scores?.draw || 0}</span></div><div className="ttt-score"><span className="ttt-score__label">Partner · {myMark === "X" ? "O" : "X"}</span><span className="ttt-score__value">{state.scores?.[myMark === "X" ? "O" : "X"] || 0}</span></div></div>
      <p className="ttt-status">{status}{!result && !canPlay ? " · Waiting for your partner" : ""}</p><div className="ttt-board">{board.map((cell, i) => <button key={i} className={`ttt-cell${result?.line?.includes(i) ? " ttt-cell--win" : ""}`} onClick={() => playCell(i)} disabled={!canPlay || Boolean(cell)} aria-label={`Cell ${i + 1}${cell ? `, ${cell}` : ", empty"}`}>{cell}</button>)}</div>
      <div className="ttt-actions"><button className="btn btn-outline" onClick={resetMatch} disabled={myMark !== "X"}>Reset match (X)</button><button className="btn btn-primary" onClick={newRound} disabled={!result}>Play again</button></div></div>
    {error && <p className="shared-game-error">{error}</p>}
  </div>;
}
export default TicTacToe;
