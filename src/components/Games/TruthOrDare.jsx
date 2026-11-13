import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BackIcon } from "../Navigation/icons.jsx";
import { CATEGORIES, getRandomPrompt } from "../../data/truthOrDare.js";
import { useSharedGameState } from "./useSharedGameState.js";
import "./Games.css";

const INITIAL = { category: "all", type: null, prompt: null, activeCategory: null };
function pickCategory(id) { if (id !== "all") return id; const ids = CATEGORIES.map((c) => c.id); return ids[Math.floor(Math.random() * ids.length)]; }
function TruthOrDare() {
  const { state, setSharedState, ready, error, retry } = useSharedGameState("truth-or-dare", INITIAL);
  const [flipped, setFlipped] = useState(false);
  useEffect(() => { if (state.prompt) { setFlipped(false); requestAnimationFrame(() => requestAnimationFrame(() => setFlipped(true))); } }, [state.prompt]);
  function startRound(type) { const category = pickCategory(state.category); setSharedState((old) => ({ ...old, type, activeCategory: category, prompt: getRandomPrompt(category, `${type}s`) })); }
  function nextPrompt() { const category = pickCategory(state.category); setSharedState((old) => ({ ...old, activeCategory: category, prompt: getRandomPrompt(category, `${old.type}s`, old.prompt) })); }
  function reset() { setSharedState((old) => ({ ...old, type: null, prompt: null, activeCategory: null })); }
  const categoryLabel = CATEGORIES.find((c) => c.id === state.activeCategory)?.label ?? "";
  if (!ready) return <div className="game-page"><p>Connecting to your shared round…</p>{error && <p className="shared-game-error" role="alert">{error}</p>}<button className="btn btn-outline" onClick={retry}>Retry connection</button></div>;
  return <div className="game-page"><Link to="/games" className="game-back"><BackIcon /><span>Games</span></Link><div className="page-head"><p className="page-head__eyebrow">A game for two</p><h1>Truth or Dare</h1><p>Choose together, then take turns answering.</p></div>
    <div className="tod-categories"><button className="tag" data-active={state.category === "all"} onClick={() => setSharedState((s) => ({ ...s, category: "all" }))}>All</button>{CATEGORIES.map((c) => <button key={c.id} className="tag" data-cat={c.id} data-active={state.category === c.id} onClick={() => setSharedState((s) => ({ ...s, category: c.id }))}>{c.label}</button>)}</div>
    {!state.type && <div className="tod-picker"><button className="tod-choice glass-card glass-card--interactive" onClick={() => startRound("truth")}><span className="tod-choice__icon">💬</span><span className="tod-choice__label">Truth</span></button><button className="tod-choice glass-card glass-card--interactive" onClick={() => startRound("dare")}><span className="tod-choice__icon">🔥</span><span className="tod-choice__label">Dare</span></button></div>}
    {state.type && state.prompt && <div className="tod-round"><div className={`flip-card${flipped ? " flip-card--flipped" : ""}`}><div className="flip-card__inner"><div className="flip-card__face flip-card__face--back"/><div className="flip-card__face flip-card__face--front glass-card"><span className="tag" data-cat={state.activeCategory} data-active="true">{categoryLabel} · {state.type}</span><p className="tod-prompt">{state.prompt}</p></div></div></div><div className="tod-actions"><button className="btn btn-outline" onClick={reset}>Switch</button><button className="btn btn-primary" onClick={nextPrompt}>Next {state.type}</button></div></div>}
    {error && <p className="shared-game-error" role="status">{error}</p>}
  </div>;
}
export default TruthOrDare;
