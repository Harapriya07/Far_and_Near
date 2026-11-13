import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../services/api.js";

export function useSharedGameState(gameKey, initialState) {
  const [state, setState] = useState(initialState);
  const [room, setRoom] = useState(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const stateRef = useRef(initialState);
  const revisionRef = useRef(0);
  const writingRef = useRef(false);
  const loadingRef = useRef(false);
  const pollingRef = useRef(false);
  const mountedRef = useRef(true);

  const apply = useCallback((next, revision, nextRoom) => {
    stateRef.current = next;
    revisionRef.current = revision;
    if (mountedRef.current) {
      setState(next);
      if (nextRoom) setRoom(nextRoom);
      setReady(true);
      setError("");
    }
  }, []);

  const load = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      const result = await api.getSharedGameState(gameKey);
      if (result.state == null) {
        try {
          const created = await api.updateSharedGameState(gameKey, initialState, result.revision);
          apply(created.state, created.revision, created.room);
        } catch (err) {
          if (err.status === 409) {
            const latest = await api.getSharedGameState(gameKey);
            apply(latest.state ?? initialState, latest.revision, latest.room);
          } else throw err;
        }
      } else apply(result.state, result.revision, result.room);
    } catch (err) {
      if (mountedRef.current) setError(err.message || "Couldn't sync this game. Check that both partners joined the same game lounge.");
    } finally { loadingRef.current = false; }
  }, [gameKey, initialState, apply]);

  useEffect(() => {
    mountedRef.current = true;
    load();
    const timer = window.setInterval(async () => {
      if (writingRef.current || loadingRef.current || pollingRef.current || !mountedRef.current) return;
      pollingRef.current = true;
      try {
        const latest = await api.getSharedGameState(gameKey);
        if (latest.revision !== revisionRef.current) apply(latest.state ?? initialState, latest.revision, latest.room);
        else if (latest.room) setRoom(latest.room);
        if (!ready) setReady(true);
      } catch (err) {
        if (mountedRef.current && !ready) setError(err.message || "Couldn't connect to the shared game room.");
      } finally { pollingRef.current = false; }
    }, 1800);
    return () => { mountedRef.current = false; window.clearInterval(timer); };
  }, [gameKey, load, apply, initialState, ready]);

  const setSharedState = useCallback(async (nextOrUpdater) => {
    if (!ready || writingRef.current) return false;
    const next = typeof nextOrUpdater === "function" ? nextOrUpdater(stateRef.current) : nextOrUpdater;
    if (!next || typeof next !== "object") return false;
    writingRef.current = true;
    try {
      const saved = await api.updateSharedGameState(gameKey, next, revisionRef.current);
      apply(saved.state, saved.revision, saved.room);
      return true;
    } catch (err) {
      if (err.status === 409) {
        const latest = await api.getSharedGameState(gameKey);
        apply(latest.state ?? initialState, latest.revision, latest.room);
        setError("Your partner updated this round first. The latest move is now shown; try again.");
      } else setError(err.message || "Couldn't save that move.");
      return false;
    } finally { writingRef.current = false; }
  }, [gameKey, ready, apply, initialState]);

  const retry = useCallback(() => { setError(""); setReady(false); load(); }, [load]);
  return { state, setSharedState, room, userId: room?.me?.id, ready, error, retry };
}
