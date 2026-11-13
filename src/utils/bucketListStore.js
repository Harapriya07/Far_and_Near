import { useSyncExternalStore } from "react";

// Keep this legacy key for compatibility with existing browser data.
export const BUCKET_LIST_STORAGE_KEY = "alya:bucket-list";

let snapshot;
const listeners = new Set();

function isValidItem(item) {
  return Boolean(
    item &&
      typeof item === "object" &&
      !Array.isArray(item) &&
      (typeof item.id === "string" || typeof item.id === "number") &&
      String(item.id).trim().length > 0 &&
      typeof item.text === "string" &&
      item.text.trim().length > 0 &&
      typeof item.completed === "boolean"
  );
}

function readStorage() {
  try {
    const raw = window.localStorage.getItem(BUCKET_LIST_STORAGE_KEY);
    if (raw === null) return { items: [], error: "", writable: true };

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.every(isValidItem)) {
      return {
        items: [],
        error: "Your saved bucket list looks incomplete or damaged. We left the saved data untouched to help protect it.",
        writable: false,
      };
    }

    // Add optional fields in memory only; the existing stored shape is not rewritten on read.
    return {
      items: parsed.map((item) => ({
        ...item,
        category: typeof item.category === "string" ? item.category : "experiences",
        targetDate: typeof item.targetDate === "string" ? item.targetDate : "",
        note: typeof item.note === "string" ? item.note : "",
      })),
      error: "",
      writable: true,
    };
  } catch {
    return {
      items: [],
      error: "We couldn't read your saved bucket list. The original data has been left untouched; check your browser storage before trying again.",
      writable: false,
    };
  }
}

function ensureSnapshot() {
  if (!snapshot) snapshot = readStorage();
  return snapshot;
}

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return ensureSnapshot();
}

function onStorage(event) {
  if (event && event.key !== BUCKET_LIST_STORAGE_KEY && event.key !== null) return;
  snapshot = readStorage();
  emit();
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", onStorage);
}

export function useBucketList() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function saveBucketList(nextItems) {
  const current = ensureSnapshot();
  if (!current.writable) {
    return { ok: false, error: current.error || "Saved data is read-only until it can be recovered." };
  }
  if (!Array.isArray(nextItems) || !nextItems.every(isValidItem)) {
    return { ok: false, error: "This change has an invalid item format, so it was not saved." };
  }
  const ids = nextItems.map((item) => String(item.id));
  if (new Set(ids).size !== ids.length) {
    return { ok: false, error: "This change contains duplicate item IDs, so it was not saved." };
  }

  try {
    window.localStorage.setItem(BUCKET_LIST_STORAGE_KEY, JSON.stringify(nextItems));
    snapshot = { items: nextItems, error: "", writable: true };
    emit();
    return { ok: true, error: "" };
  } catch {
    // Keep the in-memory snapshot and the previous stored value intact on write failure.
    return {
      ok: false,
      error: "Your browser couldn't save this change. Check available storage space or browser privacy settings, then try again.",
    };
  }
}

export function refreshBucketListFromStorage() {
  snapshot = readStorage();
  emit();
}
