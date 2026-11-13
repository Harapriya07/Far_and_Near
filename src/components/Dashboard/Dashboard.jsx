import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { useSharedBucketList } from "../../context/SharedBucketListContext.jsx";
import { BUCKET_CATEGORIES } from "../../data/bucketList.js";
import "./Dashboard.css";

const games = [
  { title: "Truth or Dare", description: "A little bold, a little silly.", to: "/games/truth-or-dare", mark: "T/D" },
  { title: "Would You Rather", description: "Find out what they'd choose.", to: "/games/would-you-rather", mark: "OR" },
  { title: "Never Have I Ever", description: "Swap stories and surprises.", to: "/games/never-have-i-ever", mark: "ME" },
  { title: "Finish My Sentence", description: "See how well you know each other.", to: "/games/finish-my-sentence", mark: "…" },
  { title: "Tic-Tac-Toe", description: "A tiny classic for a quick break.", to: "/games/tic-tac-toe", mark: "XO" },
  { title: "Ludo", description: "Bring a little friendly competition.", to: "/games/ludo", mark: "4" },
];

function Dashboard() {
  const { account, space, partner } = useAuth();
  const { items, error: bucketError, loading: bucketLoading } = useSharedBucketList();
  const firstName = account?.name?.trim()?.split(/\s+/)[0] || "there";
  const completed = items.filter((item) => item.completed).length;
  const recentItems = items.filter((item) => !item.completed).slice(0, 3);
  const categoryLabel = (id) => BUCKET_CATEGORIES.find((category) => category.id === id)?.label || "Experiences";

  return (
    <div className="dashboard">
      <section className="dashboard-welcome" aria-labelledby="dashboard-title">
        <div className="dashboard-welcome__copy">
          <p className="page-head__eyebrow">A little space for your favourite person</p>
          <h1 id="dashboard-title">Hey, {firstName}<span aria-hidden="true"> ✳</span></h1>
          <p className="dashboard-welcome__message">
            {space?.name ? `Welcome back to ${space.name}.` : "Your little world for two starts here."} {partner ? `You and ${partner.name} can make this space your own.` : "Little moments count, even from far away."}
          </p>
          {!space && <Link className="btn btn-primary" to="/space/setup">Set up your space <span aria-hidden="true">→</span></Link>}
          {space && !partner && <p className="dashboard-welcome__note">Share this invite code with your person to connect from another device.</p>}
        </div>
        <div className="dashboard-welcome__sticker" aria-hidden="true"><span>FAR</span><span className="dashboard-welcome__sticker-heart">♥</span><span>& NEAR</span></div>
      </section>

      {space && !partner && <section className="dashboard-invite" aria-label="Space invite code">
        <div><p className="dashboard-invite__label">Your invite code</p><p className="dashboard-invite__hint">Share privately with your person</p></div>
        <code>{space.code}</code>
      </section>}

      <section className="dashboard-section" aria-labelledby="bucket-preview-title">
        <div className="dashboard-section__heading">
          <div><p className="section-kicker">Little dreams, big plans</p><h2 id="bucket-preview-title">Your bucket list</h2></div>
          <Link className="text-link" to="/bucket-list">See the whole list <span aria-hidden="true">→</span></Link>
        </div>
        <div className="dashboard-bucket glass-card">
          <div className="dashboard-bucket__progress">
            <span className="dashboard-bucket__progress-mark" aria-hidden="true">✦</span>
            <div className="dashboard-bucket__progress-copy"><strong>{completed} of {items.length}</strong><span>dreams checked off</span></div>
            <div className="dashboard-bucket__progress-track" role="progressbar" aria-label="Bucket list completion" aria-valuemin="0" aria-valuemax={items.length || 1} aria-valuenow={completed}><span style={{ width: `${items.length ? (completed / items.length) * 100 : 0}%` }} /></div>
          </div>
          <div className="dashboard-bucket__items">
            {bucketError ? <p className="dashboard-inline-message" role="status">{bucketError}</p> : bucketLoading ? <p className="dashboard-inline-message">Loading your shared dreams…</p> : recentItems.length ? recentItems.map((item) => <div className="dashboard-bucket__item" key={item.id}><span className="dashboard-bucket__bullet" aria-hidden="true">♡</span><div><strong>{item.text}</strong><span>{categoryLabel(item.category)}</span></div></div>) : <div className="dashboard-bucket__empty"><span aria-hidden="true">♡</span><div><strong>Your list is a blank page.</strong><p>Add one little dream you want to make happen.</p></div></div>}
          </div>
          <Link to="/bucket-list" className="btn btn-secondary dashboard-bucket__action">{items.length ? "Add a new dream" : "Write your first dream"}</Link>
          <p className="dashboard-local-note">Shared with both of you, wherever you sign in.</p>
        </div>
      </section>

      <section className="dashboard-section" aria-labelledby="dashboard-games-title">
        <div className="dashboard-section__heading"><div><p className="section-kicker">A few minutes together</p><h2 id="dashboard-games-title">Pick your playdate</h2></div><Link className="text-link" to="/games">All games <span aria-hidden="true">→</span></Link></div>
        <div className="dashboard-games-grid">
          {games.map((game, index) => <Link className={`dashboard-game dashboard-game--${index % 3}`} to={game.to} key={game.to}><span className="dashboard-game__mark" aria-hidden="true">{game.mark}</span><span className="dashboard-game__arrow" aria-hidden="true">↗</span><strong>{game.title}</strong><span className="dashboard-game__description">{game.description}</span></Link>)}
        </div>
      </section>
    </div>
  );
}

export default Dashboard;
