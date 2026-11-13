import { useCallback, useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { api } from "../../services/api.js";
import { useAuth } from "../../context/AuthContext.jsx";
import "./GameRoom.css";

function RoomAccessControls({ room, account, onJoined, compact = false }) {
  const [code, setCode] = useState(room?.joined ? room.code : "");
  const [displayName, setDisplayName] = useState(room?.me?.name || account?.name || "");
  const [joining, setJoining] = useState(false);
  const [feedback, setFeedback] = useState("");
  useEffect(() => {
    if (room?.me?.name) setDisplayName(room.me.name);
    if (room?.joined && room.code) setCode(room.code);
  }, [room?.me?.name, room?.joined, room?.code]);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(room.code);
      setFeedback("Room code copied. Send it to your partner!");
    } catch {
      setFeedback("Select the room code and copy it manually.");
    }
  }

  async function submit(event) {
    event.preventDefault();
    setJoining(true); setFeedback("");
    try {
      const next = await api.joinSharedGameRoom(code, displayName.trim());
      setCode(next.code); setDisplayName(next.me?.name || displayName.trim());
      setFeedback("You're connected to the shared lounge.");
      onJoined(next);
    } catch (err) { setFeedback(err.message || "That code couldn't be joined."); }
    finally { setJoining(false); }
  }

  return <div className={`shared-room-access${compact ? " is-compact" : ""}`}>
    <div className="shared-room-code-block"><span className="shared-room-field-label">SHARED ROOM CODE</span><div className="shared-room-code" aria-label={`Room code ${room.code}`}>{room.code.split("").map((letter, i) => <span key={i}>{letter}</span>)}</div><button className="shared-room-copy" type="button" onClick={copyCode}>Copy code</button></div>
    <form className="shared-room-join" onSubmit={submit}>
      <div className="shared-room-form-field"><label htmlFor={compact ? "room-code-compact" : "room-code-main"}>Paste partner's code</label><input id={compact ? "room-code-compact" : "room-code-main"} value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))} placeholder="6-CHAR CODE" maxLength={6} autoComplete="off" /></div>
      <div className="shared-room-form-field"><label htmlFor={compact ? "room-name-compact" : "room-name-main"}>Your name in this room</label><input id={compact ? "room-name-compact" : "room-name-main"} value={displayName} onChange={(e) => setDisplayName(e.target.value.slice(0, 40))} placeholder="Enter your name" maxLength={40} required /></div>
      <button type="submit" disabled={joining || code.length !== 6 || !displayName.trim()}>{joining ? "Connecting…" : room.joined ? "Join / update name" : "Join shared room"}</button>
      {feedback && <p className="shared-room-feedback" role="status">{feedback}</p>}
    </form>
  </div>;
}

function GameRoomGate() {
  const { account, partner } = useAuth();
  const location = useLocation();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try { const next = await api.getSharedGameRoom(); setRoom(next); setError(""); }
    catch (err) { setError(err.message || "Couldn't open your shared game room."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    refresh();
    const timer = window.setInterval(async () => {
      try { setRoom(await api.heartbeatSharedGameRoom()); }
      catch { /* keep the last known room visible during brief network interruptions */ }
    }, 2500);
    return () => window.clearInterval(timer);
  }, [refresh]);

  if (loading) return <div className="shared-room-loading">Opening your shared game lounge…</div>;
  if (!room) return <section className="shared-room-gate"><h2>Couldn't open your game lounge</h2><p>{error || "Check your connection and try again."}</p><button onClick={refresh}>Try again</button></section>;

  if (!room.bothJoined) return <main className="shared-room-gate">
    <Link to="/games" className="shared-room-back">← All games</Link>
    <div className="shared-room-card">
      <span className="shared-room-eyebrow">YOUR PRIVATE TWO-PERSON LOUNGE</span><div className="shared-room-icon">✦</div>
      <h1>{room.joined ? "Your room is ready" : "Join your person's room"}</h1>
      <p className="shared-room-intro">Both partners can copy the shared code or paste the code they received. Add the name you want your partner to see.</p>
      <RoomAccessControls room={room} account={account} onJoined={setRoom} />
      <div className="shared-room-people"><span className={`shared-room-person${room.joined ? " is-here" : ""}`}><i />{room.players?.[0]?.name || account?.name || "Player 1"}<small>{room.players?.[0]?.online ? "Connected" : "Room creator"}</small></span><span className={`shared-room-person${room.bothJoined ? " is-here" : ""}`}><i />{room.players?.[1]?.name || (room.joined ? partner?.name || "Partner" : "You — not joined yet")}<small>{room.bothJoined ? "Connected" : room.joined ? "Waiting to join" : "Enter the code to join"}</small></span></div>
      <p className="shared-room-note">Once both accounts join, the same private lounge unlocks all six games and the shared bucket list.</p>
    </div>
  </main>;

  const inGame = location.pathname !== "/games/room";
  return <>
    <div className="shared-room-status"><span><i /> Shared room connected</span><strong>{room.code}</strong><span>{room.partner?.name || "Partner"} is {room.partner?.online ? "online" : "reconnecting"}</span><Link to="/games/room" className="shared-room-exit">{inGame ? "Exit game · All games" : "Game lounge"}</Link><Link to="/bucket-list" className="shared-room-bucket">Our bucket list</Link></div>
    <details className="shared-room-tools"><summary>Copy / paste room code · Edit your room name</summary><RoomAccessControls compact room={room} account={account} onJoined={setRoom} /></details>
    <Outlet />
  </>;
}

export default GameRoomGate;
