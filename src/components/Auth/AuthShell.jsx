import { Link } from "react-router-dom";
import "./Auth.css";

function AuthShell({ eyebrow, title, subtitle, children }) {
  return (
    <div className="auth-shell">
      <Link to="/" className="auth-shell__logo">
        Far & Near
      </Link>

      <div className="glass-card auth-card">
        {eyebrow && <p className="page-head__eyebrow">{eyebrow}</p>}
        <h1 className="auth-card__title">{title}</h1>
        {subtitle && <p className="auth-card__subtitle">{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}

export default AuthShell;
