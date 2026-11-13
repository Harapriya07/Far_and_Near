// Far & Near local demo auth store. This is NOT production authentication.
// Legacy storage keys and the existing account/space shapes are retained.
// Password values use reversible Base64 obfuscation for legacy compatibility;
// this is neither encryption nor password hashing. Replace with trusted backend auth.

const ACCOUNTS_KEY = "alya:accounts";
const SPACES_KEY = "alya:spaces";
const SESSION_KEY = "alya:session";

function readJSON(key, fallback, validate = () => true) {
  let raw;
  try {
    raw = localStorage.getItem(key);
  } catch {
    throw new Error("Browser storage is unavailable. Check your browser privacy settings and try again.");
  }
  if (raw === null) return fallback;
  let value;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error("Saved app data could not be read. Your stored data was left untouched; do not clear browser storage if you need to recover it.");
  }
  if (!validate(value)) {
    throw new Error("Saved app data has an unexpected format. Your stored data was left untouched.");
  }
  return value;
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    throw new Error("Your browser couldn't save this change. Check available storage and browser permissions, then try again.");
  }
}

function removeStored(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    throw new Error("Browser storage is unavailable, so your session could not be cleared. Please enable browser storage and try again.");
  }
}

// Compatibility only; this reversible transformation provides no real security.
function obfuscate(value) {
  return btoa(unescape(encodeURIComponent(value))).split("").reverse().join("");
}

function generateId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function generateSpaceCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

const isAccountList = (value) => Array.isArray(value) && value.every((a) =>
  a && typeof a.id === "string" && typeof a.email === "string" &&
  typeof a.name === "string" && typeof a.passwordHash === "string" &&
  (a.spaceId === null || typeof a.spaceId === "string")
);
const isSpaceList = (value) => Array.isArray(value) && value.every((s) =>
  s && typeof s.id === "string" && typeof s.name === "string" &&
  typeof s.code === "string" && typeof s.createdBy === "string"
);
const isSession = (value) => value === null || (value && typeof value === "object" && typeof value.accountId === "string");

function getAccounts() { return readJSON(ACCOUNTS_KEY, [], isAccountList); }
function getSpaces() { return readJSON(SPACES_KEY, [], isSpaceList); }
function publicAccount(account) {
  if (!account) return null;
  const { passwordHash, ...safeAccount } = account;
  return safeAccount;
}
export function getSession() { return readJSON(SESSION_KEY, null, isSession); }
function setSession(accountId) { writeJSON(SESSION_KEY, { accountId }); }
export function clearSession() { removeStored(SESSION_KEY); }

function validateCredentials({ name, email, password }, includeName = false) {
  if (includeName && (!name || !name.trim())) throw new Error("Please enter your name.");
  if (includeName && name.trim().length > 80) throw new Error("Your name must be 80 characters or fewer.");
  if (!email || !email.trim()) throw new Error("Please enter your email address.");
  const normalizedEmail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) throw new Error("Enter a valid email address, like you@example.com.");
  if (typeof password !== "string" || !password) throw new Error("Please enter your password.");
  if (includeName && password.length < 8) throw new Error("Use a password with at least 8 characters.");
  return normalizedEmail;
}

export function signup({ name, email, password }) {
  const normalizedEmail = validateCredentials({ name, email, password }, true);
  const accounts = getAccounts();
  if (accounts.some((a) => a.email.toLowerCase() === normalizedEmail)) {
    throw new Error("We couldn't create that account. Check your details or try logging in.");
  }
  const account = { id: generateId(), name: name.trim(), email: normalizedEmail, passwordHash: obfuscate(password), spaceId: null };
  writeJSON(ACCOUNTS_KEY, [...accounts, account]);
  try {
    setSession(account.id);
  } catch (error) {
    // Keep the successfully created account; tell the user session setup failed.
    throw new Error(`Your account was saved, but we couldn't start your session. Please log in. ${error.message}`);
  }
  return publicAccount(account);
}

export function login({ email, password }) {
  const normalizedEmail = validateCredentials({ email, password });
  const accounts = getAccounts();
  const encodedPassword = obfuscate(password);
  const account = accounts.find((a) => a.email.toLowerCase() === normalizedEmail && a.passwordHash === encodedPassword);
  if (!account) throw new Error("We couldn't log you in with those details. Check your email and password, then try again.");
  setSession(account.id);
  return publicAccount(account);
}

export function logout() { clearSession(); }

export function getCurrentAccount() {
  const session = getSession();
  if (!session) return null;
  const accounts = getAccounts();
  return publicAccount(accounts.find((a) => a.id === session.accountId) ?? null);
}

export function createSpace({ accountId, spaceName }) {
  if (!spaceName || !spaceName.trim()) throw new Error("Give your space a name before creating it.");
  if (spaceName.trim().length > 40) throw new Error("Your space name must be 40 characters or fewer.");
  const accounts = getAccounts();
  const account = accounts.find((a) => a.id === accountId);
  if (!account) throw new Error("We couldn't find your local account. Please log in again.");
  const spaces = getSpaces();
  // A dangling spaceId can occur if old/corrupt data references a missing
  // space. Allow an explicit create action to repair that association rather
  // than trapping the account in setup forever.
  if (account.spaceId && spaces.some((savedSpace) => savedSpace.id === account.spaceId)) {
    throw new Error("Your account is already connected to a space.");
  }
  let code = generateSpaceCode();
  while (spaces.some((s) => s.code === code)) code = generateSpaceCode();
  const space = { id: generateId(), name: spaceName.trim(), code, createdBy: accountId, createdAt: new Date().toISOString() };
  // Write account association first so an account write failure doesn't create an orphaned space.
  writeJSON(ACCOUNTS_KEY, accounts.map((a) => a.id === accountId ? { ...a, spaceId: space.id } : a));
  try {
    writeJSON(SPACES_KEY, [...spaces, space]);
  } catch (error) {
    // Attempt rollback, but surface both failures if storage prevents recovery.
    try {
      writeJSON(ACCOUNTS_KEY, accounts);
    } catch (rollbackError) {
      throw new Error(`${error.message} The account-to-space update also could not be rolled back: ${rollbackError.message}`);
    }
    throw error;
  }
  return space;
}

export function joinSpace({ accountId, code }) {
  if (!code || !code.trim()) throw new Error("Enter an invite code to continue.");
  const normalizedCode = code.trim().toUpperCase();
  if (!/^[A-HJ-NP-Z2-9]{6}$/.test(normalizedCode)) throw new Error("Invite codes contain 6 letters or numbers. Check the code and try again.");
  const spaces = getSpaces();
  const space = spaces.find((s) => s.code === normalizedCode);
  if (!space) throw new Error("We couldn't find a space with that code in this browser. Invite codes don't connect different devices in this demo.");
  const accounts = getAccounts();
  const account = accounts.find((a) => a.id === accountId);
  if (!account) throw new Error("We couldn't find your local account. Please log in again.");
  if (account.spaceId === space.id) return space;
  if (account.spaceId && spaces.some((savedSpace) => savedSpace.id === account.spaceId)) {
    throw new Error("Your account already belongs to another space.");
  }
  const members = accounts.filter((a) => a.spaceId === space.id && a.id !== accountId);
  if (members.length >= 2) throw new Error("That space already has two people in it.");
  writeJSON(ACCOUNTS_KEY, accounts.map((a) => a.id === accountId ? { ...a, spaceId: space.id } : a));
  return space;
}

export function getSpaceById(spaceId) {
  if (!spaceId) return null;
  return getSpaces().find((s) => s.id === spaceId) ?? null;
}

export function getPartner(accountId, spaceId) {
  const accounts = getAccounts();
  return publicAccount(accounts.find((a) => a.spaceId === spaceId && a.id !== accountId) ?? null);
}
