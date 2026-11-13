import { Link } from "react-router-dom";
import "./Landing.css";

function Landing() {
  return (
    <main className="app landing-page">
      <header className="navbar">
        <Link to="/" className="logo" aria-label="Far & Near home">far <span>&</span> near<span className="logo-heart">♥</span></Link>
        <nav className="nav-actions" aria-label="Account navigation">
          <Link to="/login" className="btn btn-ghost landing-nav-btn">Log in</Link>
          <Link to="/signup" className="btn btn-primary landing-nav-btn">Sign up <span aria-hidden="true">↗</span></Link>
        </nav>
      </header>

      <section className="hero">
        <div className="hero-sticker hero-sticker--left" aria-hidden="true">✳</div>
        <div className="hero-sticker hero-sticker--right" aria-hidden="true">♡</div>
        <p className="eyebrow"><span className="eyebrow-dot" /> FOR YOUR FAVORITE PERSON, ANYWHERE</p>
        <h1>Love that<br /><span>defeats distance.</span></h1>
        <p className="description">A little corner of the internet for your favorite two. Play, make plans, collect memories, and feel close — even when you're far apart.</p>
        <div className="hero-actions">
          <Link to="/signup" className="btn btn-primary start-button">Create your space <span aria-hidden="true">→</span></Link>
          <span className="hero-note">Made for two. Full of heart.</span>
        </div>
        <div className="hero-art" aria-label="A playful illustration of two people staying connected">
          <div className="orbit orbit--one" /><div className="orbit orbit--two" />
          <div className="art-card art-card--yellow"><span className="art-emoji">☀️</span><span>thinking<br />of you</span></div>
          <div className="art-heart">♥</div>
          <div className="art-card art-card--lavender"><span className="art-emoji">✉️</span><span>little things<br />we share</span></div>
          <span className="art-spark art-spark--one">✦</span><span className="art-spark art-spark--two">✳</span>
        </div>
      </section>
      <section className="landing-features" aria-label="What you can do together">
        <article><span className="feature-icon feature-icon--yellow">♡</span><div><h2>Your own little space</h2><p>A cozy place for the two of you to make it yours.</p></div></article>
        <article><span className="feature-icon feature-icon--blue">✳</span><div><h2>Play, even apart</h2><p>Lighthearted games to spark a laugh and a conversation.</p></div></article>
        <article><span className="feature-icon feature-icon--lavender">✈</span><div><h2>Dream up what's next</h2><p>Keep a list of places, plans, and moments for someday.</p></div></article>
      </section>
      <footer className="landing-footer">Far & Near <span>·</span> Love that defeats distance</footer>
    </main>
  );
}

export default Landing;
