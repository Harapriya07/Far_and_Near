import { Link } from "react-router-dom";
import "./GamesHub.css";

const games = [
  {
    icon: "❤️",
    name: "Truth or Dare",
    blurb: "The classic, made for two — pick a category and go.",
    to: "/games/truth-or-dare",
    live: true,
  },
  {
    icon: "💭",
    name: "Would You Rather",
    blurb: "Two choices. See if you'd pick the same one.",
    to: "/games/would-you-rather",
    live: true,
  },
  {
    icon: "🙈",
    name: "Never Have I Ever",
    blurb: "Confessions, big and small.",
    to: "/games/never-have-i-ever",
    live: true,
  },
  {
    icon: "✍️",
    name: "Finish My Sentence",
    blurb: "Fill in the blank, straight from the heart.",
    to: "/games/finish-my-sentence",
    live: true,
  },
  {
    icon: "⭕",
    name: "Tic Tac Toe",
    blurb: "A quiet little rivalry, best of however many.",
    to: "/games/tic-tac-toe",
    live: true,
  },
  {
    icon: "🎲",
    name: "Ludo",
    blurb: "Roll, race, and gently betray each other.",
    to: "/games/ludo",
    live: true,
  },
];

function GameCard({ game }) {
  const content = (
    <>
      <span className="game-card__icon" aria-hidden="true">
        {game.icon}
      </span>
      <h3>{game.name}</h3>
      <p>{game.blurb}</p>
      {!game.live && <span className="tag game-card__badge">Coming soon</span>}
    </>
  );

  if (game.live) {
    return (
      <Link
        to={game.to}
        className="glass-card glass-card--interactive game-card"
      >
        {content}
      </Link>
    );
  }

  return <div className="glass-card game-card game-card--soon">{content}</div>;
}

function GamesHub() {
  return (
    <div className="games-hub">
      <div className="page-head">
        <p className="page-head__eyebrow">Games</p>
        <h1>Six ways to spend time together</h1>
        <p>Start with tonight's favorite, or work through the whole list.</p>
      </div>

      <Link to="/games/room" className="glass-card glass-card--interactive shared-lounge-entry">
        <span className="shared-lounge-entry__icon">✦</span>
        <span><strong>Open your shared game lounge</strong><small>One six-character room code gives both of you access to all six games.</small></span>
        <b>Enter lounge ↗</b>
      </Link>
      <div className="card-grid">
        {games.map((game) => (
          <GameCard key={game.name} game={game} />
        ))}
      </div>
    </div>
  );
}

export default GamesHub;
