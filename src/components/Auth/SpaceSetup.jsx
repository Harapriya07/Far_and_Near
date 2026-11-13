import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import AuthShell from "./AuthShell.jsx";

function SpaceSetup() {
  const { account, space, createSpace, joinSpace, logout } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState(null); // 'create' | 'join' | null
  const [spaceName, setSpaceName] = useState("");
  const [code, setCode] = useState("");
  const [createdSpace, setCreatedSpace] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (space && !createdSpace) {
    return <Navigate to="/dashboard" replace />;
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const trimmedName = spaceName.trim();
      if (!trimmedName) {
        setError("Give your space a name before creating it.");
        return;
      }
      const space = await createSpace(trimmedName);
      setCreatedSpace(space);
    } catch (err) {
      setError(err.message);
    } finally { setBusy(false); }
  }

  async function handleJoin(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await joinSpace(code);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally { setBusy(false); }
  }

  async function handleLogout() {
    setError("");
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't log out. Please try again.");
    }
  }

  if (createdSpace) {
    return (
      <AuthShell
        eyebrow="Almost there"
        title="Your space is ready"
        subtitle="Share this code with your person so they can join from their own device."
      >
        <div className="space-code-display">
          <p className="space-code-display__label">Invite code</p>
          <p className="space-code-display__code">{createdSpace.code}</p>
        </div>
        <button
          className="btn btn-primary auth-submit"
          onClick={() => navigate("/dashboard", { replace: true })}
        >
          Continue to dashboard
        </button>
        <p className="space-note" role="status">This code connects a second account to your shared space. Keep it private and share it only with your person.</p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow={`Hi ${account?.name?.split(" ")[0] ?? "there"}`}
      title="Set up your space"
      subtitle="A space is the private world you'll share with one other person."
    >
      {error && <p className="auth-error" role="alert">{error}</p>}

      {mode === null && (
        <div className="space-options">
          <button
            className="space-option-btn"
            onClick={() => setMode("create")}
          >
            <strong>Create a new space</strong>
            <span>Start a private space for two.</span>
          </button>
          <button className="space-option-btn" onClick={() => setMode("join")}>
            <strong>Join with a code</strong>
            <span>Enter the invite code your person shared with you.</span>
          </button>
        </div>
      )}

      {mode === "create" && (
        <form className="auth-form" onSubmit={handleCreate}>
          <div className="auth-field">
            <label htmlFor="space-name">Name your space</label>
            <input
              id="space-name"
              type="text"
              required
              value={spaceName}
              onChange={(e) => setSpaceName(e.target.value)}
              placeholder="Us Two"
              maxLength={40}
            />
          </div>
          <button type="submit" className="btn btn-primary auth-submit" disabled={busy}>
            {busy ? "Creating…" : "Create space"}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setMode(null)}
          >
            Back
          </button>
        </form>
      )}

      {mode === "join" && (
        <form className="auth-form" onSubmit={handleJoin}>
          <div className="auth-field">
            <label htmlFor="space-code">Invite code</label>
            <input
              id="space-code"
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              maxLength={6}
              style={{ letterSpacing: "4px", textTransform: "uppercase" }}
            />
          </div>
          <button type="submit" className="btn btn-primary auth-submit" disabled={busy}>{busy ? "Joining…" : "Join space"}</button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setMode(null)}
          >
            Back
          </button>
        </form>
      )}

      <p className="auth-switch">
        Wrong account?{" "}
        <a
          href="/login"
          onClick={(e) => {
            e.preventDefault();
            handleLogout();
          }}
        >
          Log out
        </a>
      </p>
    </AuthShell>
  );
}

export default SpaceSetup;
