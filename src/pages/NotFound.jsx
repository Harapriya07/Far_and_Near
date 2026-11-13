import { Link } from "react-router-dom";
import "../components/Auth/Auth.css";

function NotFound() {
  return (
    <div className="auth-shell">
      <Link to="/" className="auth-shell__logo">
        Far & Near
      </Link>
      <div className="glass-card auth-card" style={{ textAlign: "center" }}>
        <p className="page-head__eyebrow">404</p>
        <h1 className="auth-card__title">This page wandered off</h1>
        <p className="auth-card__subtitle">
          Let's get you back to somewhere familiar.
        </p>
        <Link to="/dashboard" className="btn btn-primary auth-submit">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}

export default NotFound;
