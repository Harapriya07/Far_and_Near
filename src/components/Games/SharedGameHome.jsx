import { Link } from "react-router-dom";
const games = [
  ["❤️", "Truth or Dare", "Pick a prompt together.", "/games/truth-or-dare"],
  ["💭", "Would You Rather", "Choose separately, compare answers.", "/games/would-you-rather"],
  ["🙈", "Never Have I Ever", "Share your confessions.", "/games/never-have-i-ever"],
  ["✍️", "Finish My Sentence", "Write your own ending and reveal.", "/games/finish-my-sentence"],
  ["⭕", "Tic Tac Toe", "Take turns on the synchronized board.", "/games/tic-tac-toe"],
  ["🎲", "Ludo", "Roll the dice and race home.", "/games/ludo"],
];
export default function SharedGameHome() {
  return <main className="games-hub shared-game-home"><div className="page-head"><p className="page-head__eyebrow">YOUR SHARED GAME LOUNGE</p><h1>You're both in. Pick a game.</h1><p>Every game below belongs to this same private room. Your partner sees the same rounds and game state.</p></div><div className="card-grid">{games.map(([icon, name, description, to]) => <Link className="glass-card glass-card--interactive game-card" key={to} to={to}><span className="game-card__icon">{icon}</span><h3>{name}</h3><p>{description}</p><span className="tag">Play together ↗</span></Link>)}</div><Link to="/bucket-list" className="shared-lounge-bucket-link">♡ Open our shared bucket list <span>See and update the same list together →</span></Link></main>;
}
