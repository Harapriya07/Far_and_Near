import { Link } from "react-router-dom";
import { BackIcon } from "../Navigation/icons.jsx";
import { getRandomSentence } from "../../data/finishMySentence.js";
import { useSharedGameState } from "./useSharedGameState.js";
import "./Games.css";
import "./FinishMySentence.css";
const INITIAL = { sentence: getRandomSentence(), answers: {}, submitted: {} };
function FinishMySentence() {
  const { state, setSharedState, room, userId, ready, error, retry } = useSharedGameState("finish-my-sentence", INITIAL);
  const answer = state.answers?.[userId] || "";
  const submitted = Boolean(state.submitted?.[userId]);
  function nextSentence() { setSharedState((old) => ({ ...old, sentence: getRandomSentence(old.sentence), answers: {}, submitted: {} })); }
  const valid = typeof state.sentence === "string" && state.sentence.includes("______");
  const [before, after] = valid ? state.sentence.split("______") : ["", ""];
  const partnerAnswer = Object.entries(state.answers || {}).find(([id]) => id !== userId);
  if (!ready) return <div className="game-page"><p>Connecting to your shared round…</p>{error && <p className="shared-game-error" role="alert">{error}</p>}<button className="btn btn-outline" onClick={retry}>Retry connection</button></div>;
  return <div className="game-page"><Link to="/games" className="game-back"><BackIcon/><span>Games</span></Link><div className="page-head"><p className="page-head__eyebrow">Finish My Sentence</p><h1>Fill in the blank</h1><p>You each write your own ending, then reveal them together.</p></div>
    {valid ? <div className="fms-round"><div className="glass-card fms-card"><p className="fms-sentence">{before}<span className="fms-blank">{submitted ? answer || "…" : "______"}</span>{after}</p>{!submitted ? <><textarea className="fms-input" placeholder="Type your answer…" value={answer} onChange={(e) => setSharedState((old) => ({ ...old, answers: { ...(old.answers || {}), [userId]: e.target.value } }))} rows={3} maxLength={220}/><button className="btn btn-primary" disabled={!answer.trim()} onClick={() => setSharedState((old) => ({ ...old, submitted: { ...(old.submitted || {}), [userId]: true } }))}>Reveal my answer</button></> : <button className="btn btn-outline" onClick={() => setSharedState((old) => ({ ...old, submitted: { ...(old.submitted || {}), [userId]: false } }))}>Edit answer</button>}</div>
      <div className="glass-card fms-card"><strong>Your partner's ending</strong><p className="fms-sentence">{partnerAnswer && state.submitted?.[partnerAnswer[0]] ? partnerAnswer[1] : "Waiting for your partner to reveal…"}</p></div><button className="btn btn-primary fms-next" onClick={nextSentence} disabled={(room?.players || []).filter(Boolean).some((player) => !state.submitted?.[player.id])}>Next sentence →</button></div> : <div className="glass-card empty-state">No sentence starters available.</div>}
    {error && <p className="shared-game-error">{error}</p>}
  </div>;
}
export default FinishMySentence;
