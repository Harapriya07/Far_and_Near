import { Link } from "react-router-dom";
import { BackIcon } from "../Navigation/icons.jsx";
import { WYR_CATEGORIES, getRandomWYR } from "../../data/wouldYouRather.js";
import { useSharedGameState } from "./useSharedGameState.js";
import "./Games.css";
import "./WouldYouRather.css";
const INITIAL_CATEGORY = pickCategory("all");
const INITIAL = { category: "all", activeCategory: INITIAL_CATEGORY, prompt: getRandomWYR(INITIAL_CATEGORY), choices: {} };
function pickCategory(id) { if (id !== "all") return id; const ids = WYR_CATEGORIES.map((c) => c.id); return ids[Math.floor(Math.random() * ids.length)]; }
function WouldYouRather() {
  const { state, setSharedState, room, userId, ready, error, retry } = useSharedGameState("would-you-rather", INITIAL);
  const choice = state.choices?.[userId] || null;
  function nextPrompt(categoryOverride) { const category = pickCategory(categoryOverride ?? state.category); setSharedState((old) => ({ ...old, activeCategory: category, prompt: getRandomWYR(category, old.prompt), choices: {} })); }
  function choose(value) { setSharedState((old) => ({ ...old, choices: { ...(old.choices || {}), [userId]: value } })); }
  const categoryLabel = WYR_CATEGORIES.find((c) => c.id === state.activeCategory)?.label ?? "";
  if (!ready) return <div className="game-page"><p>Connecting to your shared round…</p>{error && <p className="shared-game-error" role="alert">{error}</p>}<button className="btn btn-outline" onClick={retry}>Retry connection</button></div>;
  return <div className="game-page"><Link to="/games" className="game-back"><BackIcon/><span>Games</span></Link><div className="page-head"><p className="page-head__eyebrow">Would You Rather</p><h1>Two choices, one call</h1><p>Both answers are saved separately so you can compare.</p></div>
    <div className="tod-categories"><button className="tag" data-active={state.category === "all"} onClick={() => setSharedState((s) => ({ ...s, category: "all" }))}>All</button>{WYR_CATEGORIES.map((c) => <button key={c.id} className="tag" data-cat={c.id} data-active={state.category === c.id} onClick={() => setSharedState((old) => { const category = c.id; return { ...old, category, activeCategory: category, prompt: getRandomWYR(category, old.prompt), choices: {} }; })}>{c.label}</button>)}</div>
    {state.prompt && <div className="wyr-round"><span className="tag" data-active="true">{categoryLabel}</span><div className="wyr-options"><button className={`wyr-option glass-card glass-card--interactive${choice === "a" ? " wyr-option--picked" : ""}`} onClick={() => choose("a")}><span className="wyr-option__label">Would you rather…</span><span className="wyr-option__text">{state.prompt.a}</span></button><div className="wyr-or">or</div><button className={`wyr-option glass-card glass-card--interactive${choice === "b" ? " wyr-option--picked" : ""}`} onClick={() => choose("b")}><span className="wyr-option__label">&nbsp;</span><span className="wyr-option__text">{state.prompt.b}</span></button></div><p className="shared-game-compare">You: <strong>{choice ? choice.toUpperCase() : "not answered"}</strong> · Partner: <strong>{Object.entries(state.choices || {}).find(([id]) => id !== userId)?.[1]?.toUpperCase() || "not answered"}</strong></p><button className="btn btn-primary wyr-next" onClick={() => nextPrompt()} disabled={(room?.players || []).filter(Boolean).some((player) => !state.choices?.[player.id])}>Next question</button></div>}
    {error && <p className="shared-game-error">{error}</p>}
  </div>;
}
export default WouldYouRather;
