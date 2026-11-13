import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import AuthShell from "./AuthShell.jsx";

function Signup() {
  const { signup, authError } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (name.trim().length > 80) {
      setError("Your name must be 80 characters or fewer.");
      return;
    }
    if (password.length < 12) {
      setError("Use a password with at least 12 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Those passwords don’t match yet.");
      return;
    }

    setLoading(true);
    (async () => {
      try {
        await signup({ name, email, password });
        navigate("/space/setup", { replace: true });
      } catch (err) { setError(err.message); }
      finally { setLoading(false); }
    })();
  }

  return (
    <AuthShell
      eyebrow="Get started"
      title="Create your account"
      subtitle="Create your account, then invite your person into a private shared space."
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        {(error || authError) && <p className="auth-error" role="alert">{error || authError}</p>}

        <div className="auth-field">
          <label htmlFor="signup-name">Your name</label>
          <input
            id="signup-name"
            type="text"
            required
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Kaju"
            autoComplete="name"
          />
        </div>

        <div className="auth-field">
          <label htmlFor="signup-email">Email</label>
          <input
            id="signup-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
          />
        </div>

        <div className="auth-field">
          <label htmlFor="signup-password">Password</label>
          <input
            id="signup-password"
            type="password"
            required
            minLength={12}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 12 characters"
            autoComplete="new-password"
          />
        </div>

        <div className="auth-field">
          <label htmlFor="signup-confirm-password">Confirm password</label>
          <input
            id="signup-confirm-password"
            type="password"
            required
            minLength={12}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Enter your password again"
            autoComplete="new-password"
          />
        </div>

        <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="auth-switch">
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </AuthShell>
  );
}

export default Signup;
