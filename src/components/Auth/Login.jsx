import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import AuthShell from "./AuthShell.jsx";

function Login() {
  const { login, authError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    (async () => {
      try {
        await login({ email, password });
        const dest = location.state?.from?.pathname || "/dashboard";
        navigate(dest, { replace: true });
      } catch (err) { setError(err.message); }
      finally { setLoading(false); }
    })();
  }

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Log in to Far & Near"
      subtitle="Pick up right where you and your person left off."
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        {(error || authError) && <p className="auth-error" role="alert">{error || authError}</p>}

        <div className="auth-field">
          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
          />
        </div>

        <div className="auth-field">
          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
          />
        </div>

        <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
          {loading ? "Logging in…" : "Log in"}
        </button>
      </form>

      <p className="auth-switch">
        New to Far & Near? <Link to="/signup">Create an account</Link>
      </p>
    </AuthShell>
  );
}

export default Login;
