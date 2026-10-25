/*
 * Global filter + preference state.
 * - `filters` (mode, range) drive every page and are shared by the header chips.
 * - `prefs` are the saved defaults + profile edits (localStorage, guarded by try/catch).
 */
import { baseProfile } from './data.js';

const KEY = 'vanta:prefs:v1';
const DEFAULT_PREFS = {
  mode: 'Competitive',
  range: '30d',
  displayName: baseProfile.display_name,
  tag: baseProfile.tag,
};

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    return { ...DEFAULT_PREFS, ...(saved && typeof saved === 'object' ? saved : {}) };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

function persist(prefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
    return true;
  } catch {
    return false;
  }
}

let prefs = load();
let filters = { mode: prefs.mode, range: prefs.range };
const listeners = new Set();

const notify = () => listeners.forEach((fn) => fn());

export const subscribe = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export const getFilters = () => ({ ...filters });
export const getPrefs = () => ({ ...prefs });

export function setFilters(patch) {
  const next = { ...filters, ...patch };
  if (next.mode === filters.mode && next.range === filters.range) return;
  filters = next;
  notify();
}

/** Save preferences. Changing the default mode/range also applies it right away. */
export function setPrefs(patch) {
  prefs = { ...prefs, ...patch };
  const saved = persist(prefs);
  filters = { mode: prefs.mode, range: prefs.range };
  notify();
  return saved;
}

export function resetPrefs() {
  prefs = { ...DEFAULT_PREFS };
  try { localStorage.removeItem(KEY); } catch { /* storage unavailable: in-memory reset is enough */ }
  filters = { mode: prefs.mode, range: prefs.range };
  notify();
}

export const getProfile = () => ({
  name: prefs.displayName,
  tag: prefs.tag,
  full: `${prefs.displayName}#${prefs.tag}`,
  level: baseProfile.account_level,
});
