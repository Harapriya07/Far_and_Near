import { Link } from "react-router-dom";
import { BackIcon } from "../Navigation/icons.jsx";
import { NHIE_CATEGORIES, NEVER_HAVE_I_EVER, getRandomNHIE } from "../../data/neverHaveIEver.js";
import { useSharedGameState } from "./useSharedGameState.js";
import "./Games.css";
import "./NeverHaveIEver.css";
const INITIAL_CATEGORY = pickCategory("all");
const INITIAL = { category: "all", activeCategory: INITIAL_CATEGORY, statement: getRandomNHIE(INITIAL_CATEGORY), responses: {}, round: 0, seen: [] };
function pickCategory(id) { if (id !== "all") return id; const ids = NHIE_CATEGORIES.map((c) => c.id); return ids[Math.floor(Math.random() * ids.length)]; }
function NeverHaveIEver() {
  const { state, setSharedState, room, userId, ready, error, retry } = useSharedGameState("never-have-i-ever", INITIAL);
  const response = state.responses?.[userId] || null;
  function respond(value) { setSharedState((old) => ({ ...old, responses: { ...(old.responses || {}), [userId]: value } })); }
  function nextStatement(categoryOverride) { const category = pickCategory(categoryOverride ?? state.category); const bank = category === "all" ? Object.values(NEVER_HAVE_I_EVER).flat() : (NEVER_HAVE_I_EVER[category] || []); const unseen = bank.filter((item) => typeof item === "string" && item.trim() && !(state.seen || []).includes(item)); const statement = unseen.length ? unseen[Math.floor(Math.random() * unseen.length)] : getRandomNHIE(category, state.statement); setSharedState((old) => ({ ...old, activeCategory: category, statement, responses: {}, round: old.round + 1, seen: [...(old.seen || []), statement] })); }
  const categoryLabel = NHIE_CATEGORIES.find((c) => c.id === state.activeCategory)?.label ?? "";
  const answers = Object.entries(state.responses || {});
  if (!ready) return <div className="game-page"><p>Connecting to your shared round…</p>{error && <p className="shared-game-error" role="alert">{error}</p>}<button className="btn btn-outline" onClick={retry}>Retry connection</button></div>;
  return <div className="game-page"><Link to="/games" className="game-back"><BackIcon/><span>Games</span></Link><div className="page-head"><p className="page-head__eyebrow">Never Have I Ever</p><h1>Confessions, big and small</h1><p>Answer privately from your own device. Your partner's answer appears here too.</p></div>
    <div className="tod-categories"><button className="tag" data-active={state.category === "all"} onClick={() => setSharedState((s) => ({ ...s, category: "all" }))}>All</button>{NHIE_CATEGORIES.map((c) => <button key={c.id} className="tag" data-cat={c.id} data-active={state.category === c.id} onClick={() => setSharedState((old) => { const category = c.id; const bank = NEVER_HAVE_I_EVER[category] || []; const unseen = bank.filter((item) => typeof item === "string" && item.trim() && !(old.seen || []).includes(item)); const statement = unseen.length ? unseen[Math.floor(Math.random() * unseen.length)] : getRandomNHIE(category, old.statement); return { ...old, category, activeCategory: category, statement, responses: {}, round: (old.round || 0) + 1, seen: [...(old.seen || []), statement] }; })}>{c.label}</button>)}</div>
    {state.statement && <div className="nhie-round"><div className="nhie-card glass-card"><span className="tag" data-active="true">{categoryLabel}</span><p className="nhie-statement">{state.statement}</p></div><div className="nhie-responses"><button className={`btn btn-outline nhie-response${response === "havenot" ? " nhie-response--picked" : ""}`} onClick={() => respond("havenot")}>Never have I</button><button className={`btn btn-outline nhie-response${response === "have" ? " nhie-response--picked" : ""}`} onClick={() => respond("have")}>I have, actually</button></div><p className="shared-game-compare">Your answer: <strong>{response || "not answered"}</strong> · Partner: <strong>{answers.find(([id]) => id !== userId)?.[1] || "not answered"}</strong></p><div className="nhie-footer"><span className="nhie-tally">Round {state.round + 1}</span><button className="btn btn-primary" onClick={() => nextStatement()} disabled={(room?.players || []).filter(Boolean).some((player) => !state.responses?.[player.id])}>Next statement</button></div></div>}
    {error && <p className="shared-game-error">{error}</p>}
  </div>;
}
export default NeverHaveIEver;
