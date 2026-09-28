/**
 * CareerPilot AI — LocalStorage wrapper.
 * Namespaced, versioned keys (`cp:v1:*`). Every access is wrapped in try/catch so
 * private mode, quota errors or corrupted JSON never crash the app.
 * Pages must not use this module directly; they go through api.js.
 */

export const PREFIX = 'cp:v1:';

export const KEYS = Object.freeze({
  profile: 'profile',
  skills: 'skills',
  applications: 'applications',
  savedJobs: 'savedJobs',
  roadmap: 'roadmap',
  assistant: 'assistant',
  theme: 'theme',
  settings: 'settings',
  demo: 'demo',
});

const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));

/** True when LocalStorage can be read and written. */
export function isAvailable() {
  try {
    const probe = `${PREFIX}__probe`;
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

/**
 * Read a JSON value.
 * @param {string} key one of KEYS
 * @param {*} fallback returned (as a copy) when missing or unreadable
 */
export function get(key, fallback = null) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw === null) return clone(fallback);
    return JSON.parse(raw);
  } catch {
    return clone(fallback);
  }
}

/**
 * Write a JSON value. Returns false if the write failed (e.g. quota exceeded).
 * @param {string} key
 * @param {*} value
 */
export function set(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.warn('[storage] write failed', key, err);
    return false;
  }
}

/** Remove one key. */
export function remove(key) {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    /* ignore */
  }
}

/** All CareerPilot keys currently stored (without prefix). */
export function listKeys() {
  const out = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIX)) out.push(k.slice(PREFIX.length));
    }
  } catch {
    /* ignore */
  }
  return out;
}

/** Export every CareerPilot key as a portable JSON object. */
export function exportAll() {
  const data = {};
  for (const k of Object.values(KEYS)) {
    const v = get(k, undefined);
    if (v !== undefined) data[k] = v;
  }
  return { app: 'careerpilot-ai', version: 1, exportedAt: new Date().toISOString(), data };
}

/**
 * Import a payload produced by exportAll(). Unknown keys are ignored.
 * The payload is validated before anything is changed.
 * @param {object} payload
 * @param {{replace?:boolean, keep?:string[]}} [options] replace = clear existing keys first (except `keep`)
 * @returns {number} number of keys written
 * @throws {Error} when the payload is not a CareerPilot export
 */
export function importAll(payload, { replace = false, keep = [] } = {}) {
  if (!payload || typeof payload !== 'object' || payload.app !== 'careerpilot-ai' || typeof payload.data !== 'object' || payload.data === null || Array.isArray(payload.data)) {
    throw new Error('This file is not a CareerPilot AI export.');
  }
  if (payload.version !== 1) throw new Error(`Unsupported export version: ${payload.version}`);
  const allowed = new Set(Object.values(KEYS));
  if (!Object.keys(payload.data).some((k) => allowed.has(k))) throw new Error('The export file contains no CareerPilot data.');
  if (replace) resetAll(keep);
  let written = 0;
  for (const [k, v] of Object.entries(payload.data)) {
    if (allowed.has(k) && set(k, v)) written++;
  }
  return written;
}

/**
 * Remove all CareerPilot keys.
 * @param {string[]} [keep] keys to preserve (e.g. theme)
 */
export function resetAll(keep = []) {
  for (const k of listKeys()) if (!keep.includes(k)) remove(k);
}

/** Approximate bytes used by CareerPilot keys. */
export function usageBytes() {
  let bytes = 0;
  try {
    for (const k of listKeys()) bytes += (PREFIX + k).length + (localStorage.getItem(PREFIX + k) || '').length;
  } catch {
    /* ignore */
  }
  return bytes * 2; // UTF-16
}
