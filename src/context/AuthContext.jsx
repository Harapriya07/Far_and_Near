import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { api, setAccessToken } from "../services/api.js";

const AuthContext = createContext(null);
const normalizeUser = (user) => user ? ({ id: user.id, name: user.display_name, email: user.email }) : null;
const normalizeSpace = (space) => space ? ({ ...space, createdBy: space.created_by, members: (space.members || []).map((member) => ({ ...member, name: member.display_name })) }) : null;

export function AuthProvider({ children }) {
  const [account, setAccount] = useState(null);
  const [space, setSpace] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState("");

  const loadSpace = useCallback(async () => {
    const current = await api.getSpace();
    setSpace(normalizeSpace(current));
    return current;
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const refreshed = await api.refresh();
        if (!active) return;
        if (refreshed?.access_token) {
          setAccessToken(refreshed.access_token);
          const user = await api.me();
          if (!active) return;
          setAccount(normalizeUser(user));
          const currentSpace = await api.getSpace();
          if (active) setSpace(normalizeSpace(currentSpace));
        }
      } catch (error) {
        if (active) { setAccessToken(null); setAccount(null); setSpace(null); setAuthError(error.message); }
      } finally {
        if (active) setAuthReady(true);
      }
    })();
    return () => { active = false; };
  }, []);

  const signup = useCallback(async (payload) => {
    setAuthError("");
    await api.signup(payload);
    const session = await api.login({ email: payload.email, password: payload.password });
    setAccessToken(session.access_token);
    setAccount(normalizeUser(session.user));
    setSpace(null);
    return normalizeUser(session.user);
  }, []);

  const login = useCallback(async (payload) => {
    setAuthError("");
    const session = await api.login(payload);
    setAccessToken(session.access_token);
    setAccount(normalizeUser(session.user));
    const current = await api.getSpace();
    setSpace(normalizeSpace(current));
    return normalizeUser(session.user);
  }, []);

  const logout = useCallback(async () => {
    try { await api.logout(); } finally { setAccessToken(null); setAccount(null); setSpace(null); }
  }, []);

  const createSpace = useCallback(async (name) => {
    const created = await api.createSpace(name);
    setSpace(normalizeSpace(created));
    return created;
  }, []);

  const joinSpace = useCallback(async (code) => {
    const joined = await api.joinSpace(code);
    setSpace(normalizeSpace(joined));
    return joined;
  }, []);

  const refresh = useCallback(async () => {
    const user = await api.me();
    setAccount(normalizeUser(user));
    await loadSpace();
  }, [loadSpace]);

  const partner = space?.members?.find((member) => member.id !== account?.id) || null;
  const value = useMemo(() => ({
    account, space, partner, authError, authReady,
    isAuthenticated: Boolean(account), hasSpace: Boolean(space),
    signup, login, logout, createSpace, joinSpace, refresh,
  }), [account, space, partner, authError, authReady, signup, login, logout, createSpace, joinSpace, refresh]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
