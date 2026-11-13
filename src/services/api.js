const API_BASE = (import.meta.env.VITE_API_BASE_URL || "/api/v1").replace(/\/$/, "");
let accessToken = null;
let refreshPromise = null;

export function setAccessToken(token) { accessToken = token || null; }
export function getAccessToken() { return accessToken; }

function readCookie(name) {
  if (typeof document === "undefined") return "";
  const prefix = `${name}=`;
  const entry = document.cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(prefix));
  return entry ? decodeURIComponent(entry.slice(prefix.length)) : "";
}

async function parseResponse(response) {
  if (response.status === 204) return null;
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message = body?.error?.message || body?.detail?.message || body?.detail || body?.message || `Request failed (${response.status}).`;
    const error = new Error(typeof message === "string" ? message : "Something went wrong. Please try again.");
    error.status = response.status;
    error.code = body?.error?.code || body?.detail?.code || "request_failed";
    throw error;
  }
  return body;
}

async function refreshAccessToken() {
  if (refreshPromise) return refreshPromise;
  const csrf = readCookie("far_near_csrf");
  if (!csrf) return null;
  refreshPromise = (async () => {
    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST", credentials: "include", headers: { "X-CSRF-Token": csrf },
    });
    if (!response.ok) { setAccessToken(null); return null; }
    const body = await response.json();
    setAccessToken(body.access_token);
    return body;
  })().finally(() => { refreshPromise = null; });
  return refreshPromise;
}

export async function apiRequest(path, options = {}) {
  const { auth = true, retryAuth = true, ...init } = options;
  const headers = new Headers(init.headers || {});
  if (init.body && !(init.body instanceof FormData)) headers.set("Content-Type", "application/json");
  if (auth && accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  const response = await fetch(`${API_BASE}${path}`, { ...init, headers, credentials: "include" });
  if (response.status === 401 && auth && retryAuth) {
    const refreshed = await refreshAccessToken();
    if (refreshed?.access_token) {
      headers.set("Authorization", `Bearer ${refreshed.access_token}`);
      return parseResponse(await fetch(`${API_BASE}${path}`, { ...init, headers, credentials: "include" }));
    }
  }
  return parseResponse(response);
}

export const api = {
  signup: (payload) => apiRequest("/auth/signup", { method: "POST", auth: false, body: JSON.stringify({ display_name: payload.name, email: payload.email, password: payload.password }) }),
  login: (payload) => apiRequest("/auth/login", { method: "POST", auth: false, body: JSON.stringify(payload) }),
  me: () => apiRequest("/auth/me"),
  refresh: refreshAccessToken,
  logout: () => apiRequest("/auth/logout", { method: "POST", retryAuth: false }),
  getSpace: () => apiRequest("/spaces/me"),
  createSpace: (name) => apiRequest("/spaces", { method: "POST", body: JSON.stringify({ name }) }),
  joinSpace: (code) => apiRequest("/spaces/join", { method: "POST", body: JSON.stringify({ code }) }),
  getBucketList: () => apiRequest("/bucket-list"),
  importBucketList: (items) => apiRequest("/bucket-list/import", { method: "POST", body: JSON.stringify({ items }) }),
  createBucketItem: (payload) => apiRequest("/bucket-list", { method: "POST", body: JSON.stringify(payload) }),
  updateBucketItem: (id, payload) => apiRequest(`/bucket-list/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteBucketItem: (id) => apiRequest(`/bucket-list/${id}`, { method: "DELETE" }),
  getSharedGameRoom: () => apiRequest("/games/room"),
  joinSharedGameRoom: (code, displayName) => apiRequest("/games/room/join", { method: "POST", body: JSON.stringify({ code, display_name: displayName }) }),
  heartbeatSharedGameRoom: () => apiRequest("/games/room/heartbeat"),
  getSharedGameState: (gameKey) => apiRequest(`/games/room/state/${gameKey}`),
  updateSharedGameState: (gameKey, state, expectedRevision) => apiRequest(`/games/room/state/${gameKey}`, { method: "PUT", body: JSON.stringify({ state, expected_revision: expectedRevision }) }),
  getLudoRoom: () => apiRequest("/games/ludo/room"),
  newLudoRoom: () => apiRequest("/games/ludo/room/new", { method: "POST" }),
  rollLudo: () => apiRequest("/games/ludo/room/roll", { method: "POST" }),
  moveLudo: (pieceId) => apiRequest("/games/ludo/room/move", { method: "POST", body: JSON.stringify({ piece_id: pieceId }) }),
};
