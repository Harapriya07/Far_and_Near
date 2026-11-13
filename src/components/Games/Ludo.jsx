import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { BackIcon } from "../Navigation/icons.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { api } from "../../services/api.js";
import { PLAYER_COLORS, SAFE_SQUARES, legalMoves } from "./ludoLogic.js";
import { TRACK_COORDS, HOME, YARDS, pieceCell } from "./ludoBoard.js";
import "./Games.css";
import "./Ludo.css";

function DiceFace({ value, rolling = false }) {
  return <span className={`ludo-die-face${rolling ? " is-rolling" : ""}`} role="img" aria-label={rolling ? "Dice rolling" : value ? `Dice shows ${value}` : "Dice ready"}>
    {value ? <span className={`ludo-pips ludo-pips--${value}`}>{Array.from({ length: 9 }, (_, i) => <i key={i} />)}</span> : <span className="ludo-die-question">?</span>}
  </span>;
}

function SeatCard({ seat, room, state, canRoll, rolling, busy, onRoll }) {
  const color = PLAYER_COLORS[seat];
  const player = room?.players?.[color.team] || null;
  const isTurn = state?.turn === seat && room?.status === "playing";
  const value = state?.dice != null && isTurn ? state.dice : state?.lastRollPlayer === seat ? state.lastRoll : null;
  return <section className={`ludo-player-card ludo-player-card--${color.name.toLowerCase()}${isTurn ? " is-turn" : ""}`} style={{ "--seat-color": color.hex }}>
    <div className="ludo-player-info">
      <span className="ludo-seat__avatar">{player?.name?.slice(0, 1)?.toUpperCase() || "?"}</span>
      <span className="ludo-seat__copy"><strong>{player?.name || (color.team === 0 ? "Player 1" : "Waiting for partner")}</strong><small>{color.name} house · {player?.online ? "Online" : "Waiting"}</small></span>
      <span className={`ludo-seat__presence${player?.online ? " is-online" : ""}`} />
    </div>
    <button type="button" className={`ludo-dice-square${rolling && isTurn ? " is-rolling" : ""}${isTurn ? " is-active" : ""}`} onClick={onRoll} disabled={!canRoll || !isTurn || busy} aria-label={isTurn ? "Roll dice" : `${color.name} dice`}>
      <DiceFace value={value} rolling={rolling && isTurn} />
      <span className="ludo-dice-caption">{rolling && isTurn ? "ROLLING" : value ? "ROLLED" : isTurn ? canRoll ? "ROLL" : "WAIT" : "DICE"}</span>
    </button>
    {isTurn && <span className="ludo-seat-turn-label">YOUR TURN</span>}
  </section>;
}

function LudoBoard({ state, onMove, canAct, busy }) {
  const moves = state?.dice == null ? [] : legalMoves(state, state.dice);
  const occupied = useMemo(() => {
    const map = new Map();
    (state?.pieces || []).slice(0, 4).forEach((set, playerIndex) => set.forEach((piece) => {
      const [r, c] = pieceCell(playerIndex, piece);
      const key = `${r},${c}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push({ playerIndex, piece });
    }));
    return map;
  }, [state?.pieces]);

  return <div className="ludo-board-shell"><div className="ludo-board" role="group" aria-label="Four-house diagonal-team Ludo board">
    {Array.from({ length: 15 }, (_, r) => Array.from({ length: 15 }, (_, c) => {
      const key = `${r},${c}`;
      const trackIndex = TRACK_COORDS.findIndex(([rr, cc]) => rr === r && cc === c);
      const lane = HOME.findIndex((path) => path.some(([rr, cc]) => rr === r && cc === c));
      const yard = YARDS.findIndex((area) => r >= area.r && r < area.r + 6 && c >= area.c && c < area.c + 6);
      const isCenter = r === 7 && c === 7;
      const yardArea = yard >= 0 ? YARDS[yard] : null;
      const yardInner = yardArea && r >= yardArea.r + 1 && r <= yardArea.r + 4 && c >= yardArea.c + 1 && c <= yardArea.c + 4;
      const yardSlot = yardArea && ([yardArea.r + 1, yardArea.r + 3].includes(r) && [yardArea.c + 1, yardArea.c + 3].includes(c));
      const pieces = occupied.get(key) || [];
      let className = "ludo-cell";
      if (isCenter) className += " ludo-cell--center";
      else if (lane >= 0) className += ` ludo-cell--home ludo-cell--home-${lane}`;
      else if (yard >= 0) className += ` ludo-cell--yard ludo-cell--yard-${yard}${yardInner ? " ludo-cell--yard-inner" : ""}${yardSlot ? " ludo-cell--yard-slot" : ""}`;
      else if (trackIndex >= 0) className += " ludo-cell--track";
      if (trackIndex >= 0 && SAFE_SQUARES.has(trackIndex)) className += " ludo-cell--safe";
      return <div key={key} className={className} style={lane >= 0 ? { "--home-color": PLAYER_COLORS[lane].hex } : yard >= 0 ? { "--yard-color": PLAYER_COLORS[yard].hex } : undefined}>
        {trackIndex >= 0 && SAFE_SQUARES.has(trackIndex) && pieces.length === 0 && <span className="ludo-star" aria-hidden="true">✦</span>}
        {pieces.length > 0 && <div className={`ludo-piece-stack${pieces.length > 1 ? " has-stack" : ""}`}>
          {pieces.map(({ playerIndex, piece }) => {
            const isMovable = canAct && playerIndex === state.turn && moves.includes(piece.id);
            return <button key={`${playerIndex}-${piece.id}`} type="button" className={`ludo-piece${isMovable ? " ludo-piece--movable" : ""}`} style={{ "--piece-color": PLAYER_COLORS[playerIndex].hex }} disabled={!isMovable || busy} onClick={() => onMove(piece.id)} aria-label={`${PLAYER_COLORS[playerIndex].name} token ${piece.id + 1}${isMovable ? ", move token" : ""}`}><span /></button>;
          })}
        </div>}
      </div>;
    }))}
  </div></div>;
}

function Ludo() {
  const { account, partner } = useAuth();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [rolling, setRolling] = useState(false);
  const [error, setError] = useState("");
  const pollLock = useRef(false);
  const busyRef = useRef(false);

  const loadRoom = useCallback(async (showLoader = false) => {
    if (pollLock.current || busyRef.current) return;
    pollLock.current = true;
    if (showLoader) setLoading(true);
    try { setRoom(await api.getLudoRoom()); setError(""); }
    catch (err) { setError(err.message || "Couldn't connect to the shared Ludo room."); }
    finally { pollLock.current = false; setLoading(false); }
  }, []);

  useEffect(() => {
    loadRoom(true);
    const interval = window.setInterval(() => loadRoom(false), 1800);
    return () => window.clearInterval(interval);
  }, [loadRoom]);

  const act = useCallback(async (action, animate = false) => {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setRolling(animate);
    try {
      const next = await action();
      if (animate) await new Promise((resolve) => window.setTimeout(resolve, 900));
      setRoom(next); setError("");
    } catch (err) { setError(err.message || "That move couldn't be completed."); await loadRoom(false); }
    finally { busyRef.current = false; setBusy(false); setRolling(false); }
  }, [loadRoom]);

  const state = room?.state;
  const isWaiting = room?.status === "waiting";
  const isFinished = room?.status === "finished";
  const canAct = Boolean(room?.canAct);
  const canRoll = canAct && state?.dice == null && !isFinished;
  const legal = state?.dice == null ? [] : legalMoves(state, state.dice);
  const partnerName = room?.partner?.name || partner?.name || "your partner";
  const myName = room?.me?.name || account?.name || "You";

  return <main className="game-page ludo-page">
    <Link to="/games/room" className="game-back"><BackIcon /><span>Exit Ludo · Back to all games</span></Link>
    <header className="ludo-heading"><div><p className="page-head__eyebrow">A little friendly rivalry</p><h1>Roll closer, even from afar.</h1><p>Two partners. Diagonal color teams. One roll per turn.</p></div><div className={`ludo-room-pill ${room?.status === "playing" ? "is-live" : ""}`}><span />{room?.status === "playing" ? "Both players here" : isFinished ? "Game finished" : "Waiting room"}</div></header>
    {error && <div className="ludo-alert" role="alert"><span>{error}</span><button type="button" onClick={() => loadRoom(true)}>Retry</button></div>}
    {loading && !room ? <section className="ludo-loading glass-card"><span className="ludo-loading__die">🎲</span><strong>Setting up your shared board…</strong><p>Finding your partner's seat.</p></section> : room ? <div className="ludo-layout">
      <section className="ludo-game-card">
        <div className="ludo-player-row ludo-player-row--four">
          {[0, 1, 2, 3].map((seat) => <SeatCard key={seat} seat={seat} room={room} state={state} canRoll={canRoll} rolling={rolling} busy={busy} onRoll={() => act(() => api.rollLudo(), true)} />)}
        </div>
        <div className="ludo-board-frame"><div className="ludo-board-label"><span>ALYA LUDO CLUB</span><span>✦ DIAGONAL TEAMS · ONE ROLL PER TURN ✦</span></div>{state && <LudoBoard state={state} onMove={(pieceId) => act(() => api.moveLudo(pieceId))} canAct={canAct} busy={busy} />}</div>
        <div className="ludo-color-legend"><span><i style={{ "--legend-color": PLAYER_COLORS[1].hex }} />{room.players?.[0]?.name || myName} · Green + Blue</span><span><i style={{ "--legend-color": PLAYER_COLORS[0].hex }} />{room.players?.[1]?.name || partnerName} · Red + Yellow</span></div>
      </section>
      <aside className="ludo-side-panel">
        {isWaiting ? <div className="ludo-wait-card"><div className="ludo-wait-illustration"><span>🎲</span><i>✦</i><b>♡</b></div><span className="ludo-panel-kicker">YOUR SHARED GAME</span><h2>{room.partner ? "Your partner stepped away" : "Your seat is ready"}</h2><p>{room.partner ? `The board is paused until ${partnerName} comes back online.` : `Hey ${myName}! Your board is open. Ask ${partnerName} to join the shared lounge.`}</p><div className="ludo-waiting-status"><span className="ludo-waiting-dot" /> Waiting for both players to be online</div><button type="button" className="ludo-secondary-button" onClick={() => loadRoom(true)}>Check connection</button></div> : isFinished ? <div className="ludo-turn-card ludo-finished-card"><span className="ludo-panel-kicker">THAT'S A WRAP</span><div className="ludo-finish-icon">🏆</div><h2>{room.players?.[state.winner]?.name || (state.winner === 0 ? myName : partnerName)} wins!</h2><p>{state.message}</p><button type="button" className="ludo-roll-button" onClick={() => act(() => api.newLudoRoom())} disabled={busy}>Play another round <span>↗</span></button></div> : <div className="ludo-turn-card"><span className="ludo-panel-kicker">IT'S GAME TIME</span><div className="ludo-turn-heading"><span className="ludo-turn-dot" style={{ "--turn-color": PLAYER_COLORS[state?.turn ?? 1].hex }} /><div><small>UP NEXT</small><h2>{PLAYER_COLORS[state?.turn ?? 1].name}'s turn</h2></div></div><p className="ludo-turn-message" aria-live="polite">{state?.message}</p>{state?.dice != null && <div className="ludo-move-hint">{legal.length ? `${legal.length} legal ${legal.length === 1 ? "move" : "moves"} highlighted on the board` : "No moves available"}</div>}<div className="ludo-team-note"><span>●</span><p><strong>{room.players?.[0]?.name || myName}</strong> plays Green + Blue</p><span>●</span><p><strong>{room.players?.[1]?.name || partnerName}</strong> plays Red + Yellow</p></div></div>}
        <div className="ludo-how-card"><h3>How to play</h3><ul><li>You control two diagonal colors: Green + Blue or Red + Yellow.</li><li>Roll a <strong>6</strong> to bring a token out.</li><li>Tap a glowing token to move it.</li><li>Each turn gets one roll. A six does not grant an extra roll.</li><li>Get all eight of your team tokens home to win.</li></ul></div>
        <div className="ludo-connection-note"><span className={room.bothOnline ? "is-online" : ""} />{room.bothOnline ? "Synced with your partner" : "Waiting for partner connection"}</div>
      </aside>
    </div> : <section className="ludo-loading glass-card"><strong>We couldn't open your shared board.</strong><p>Check that you're connected to your shared space.</p><button type="button" className="ludo-secondary-button" onClick={() => loadRoom(true)}>Try again</button></section>}
  </main>;
}

export default Ludo;
