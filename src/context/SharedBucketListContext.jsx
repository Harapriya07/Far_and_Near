import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../services/api.js";
import { useAuth } from "./AuthContext.jsx";

const SharedBucketListContext = createContext(null);
const normalize = (item) => ({
  id: item.id,
  text: item.text,
  category: item.category,
  note: item.note || "",
  targetDate: item.target_date || "",
  completed: Boolean(item.completed),
  createdBy: item.created_by,
});
const toPayload = (item) => ({
  text: item.text,
  category: item.category || "experiences",
  note: item.note || "",
  target_date: item.targetDate || null,
  completed: Boolean(item.completed),
});

export function SharedBucketListProvider({ children }) {
  const { isAuthenticated, hasSpace, space } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loadedSpaceId, setLoadedSpaceId] = useState(null);
  const pollLock = useRef(false);

  const reload = useCallback(async () => {
    if (!isAuthenticated || !hasSpace || !space?.id) {
      setItems([]); setLoadedSpaceId(null); setError(""); setLoading(false); return [];
    }
    setLoading(true); setError("");
    try {
      const result = await api.getBucketList();
      const next = result.map(normalize);
      setItems(next); setLoadedSpaceId(space.id);
      return next;
    } catch (err) {
      setError(err.message || "Your shared list couldn't be loaded.");
      throw err;
    } finally { setLoading(false); }
  }, [isAuthenticated, hasSpace, space?.id]);

  useEffect(() => { reload().catch(() => {}); }, [reload]);

  useEffect(() => {
    if (!isAuthenticated || !hasSpace || !space?.id) return undefined;
    const timer = window.setInterval(async () => {
      if (pollLock.current) return;
      pollLock.current = true;
      try {
        const result = await api.getBucketList();
        setItems(result.map(normalize));
        setLoadedSpaceId(space.id);
        setError("");
      } catch (err) {
        setError(err.message || "Your shared list couldn't be refreshed.");
      } finally { pollLock.current = false; }
    }, 4000);
    return () => window.clearInterval(timer);
  }, [isAuthenticated, hasSpace, space?.id]);

  const addItem = useCallback(async (draft) => {
    const created = await api.createBucketItem(toPayload(draft));
    const next = normalize(created);
    setItems((current) => [next, ...current]);
    setError("");
    return next;
  }, []);

  const importItems = useCallback(async (legacyItems) => {
    const payload = legacyItems.map((item) => ({ text: item.text, category: item.category || "experiences", note: item.note || "", target_date: item.targetDate || null, completed: Boolean(item.completed) }));
    const imported = await api.importBucketList(payload);
    const next = imported.map(normalize);
    setItems(next); setError("");
    return next;
  }, []);

  const updateItem = useCallback(async (id, changes) => {
    const updated = await api.updateBucketItem(id, toPayload(changes));
    const next = normalize(updated);
    setItems((current) => current.map((item) => item.id === id ? next : item));
    setError("");
    return next;
  }, []);

  const deleteItem = useCallback(async (id) => {
    await api.deleteBucketItem(id);
    setItems((current) => current.filter((item) => item.id !== id));
    setError("");
  }, []);

  const value = useMemo(() => ({
    items, loading, error, ready: loadedSpaceId === space?.id && Boolean(space?.id) && !loading,
    addItem, updateItem, deleteItem, importItems, reload,
  }), [items, loading, error, loadedSpaceId, space?.id, addItem, updateItem, deleteItem, importItems, reload]);

  return <SharedBucketListContext.Provider value={value}>{children}</SharedBucketListContext.Provider>;
}

export function useSharedBucketList() {
  const value = useContext(SharedBucketListContext);
  if (!value) throw new Error("useSharedBucketList must be used inside SharedBucketListProvider");
  return value;
}
