/**
 * CareerPilot AI — data-access layer.
 *
 * Every page talks to `api` only (never to localStorage directly).
 * Stage A: this module wraps storage.js (LocalStorage in this browser).
 * Stage B: only this module changes, to call the REST API with fetch().
 * Methods that touch records are async so that swap does not affect callers.
 */
import * as storage from './storage.js';
import { DEMO_PROFILE, DEMO_SKILLS, DEMO_APPLICATIONS, SAMPLE_JOBS, APPLICATION_STATUSES } from './data.js';
import { analyzeJob, computeSkillGap, buildRoadmap, categoryOf } from './ai-sim.js';

const K = storage.KEYS;
/** Small artificial delay on page loads so loading states are visible and realistic. */
const LATENCY_MS = 180;

export const EMPTY_PROFILE = Object.freeze({
  fullName: '', headline: '', location: '', targetRole: '', experienceLevel: '', summary: '',
  education: [], links: { linkedin: '', github: '', portfolio: '' }, lastCv: null,
});

export const DEFAULT_SETTINGS = Object.freeze({ activeJobId: null, motion: 'system', roadmapWeeks: 12 });

export class StorageUnavailableError extends Error {
  constructor() {
    super('Browser storage is unavailable. Disable private mode or allow site data, then reload.');
    this.name = 'StorageUnavailableError';
  }
}

export class ValidationError extends Error {
  /** @param {string} message @param {Record<string,string>} [fields] */
  constructor(message, fields = {}) {
    super(message);
    this.name = 'ValidationError';
    this.fields = fields;
  }
}

/* ------------------------------------------------------------------------- */
/* Helpers                                                                   */
/* ------------------------------------------------------------------------- */

const uid = () => (globalThis.crypto?.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`);
const nowIso = () => new Date().toISOString();
const pad = (n) => String(n).padStart(2, '0');
const daysAgoIso = (d) => new Date(Date.now() - d * 864e5).toISOString();
const daysAgoDate = (d) => { const t = new Date(Date.now() - d * 864e5); return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`; };
const todayDate = () => daysAgoDate(0);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const clampLevel = (v) => Math.min(100, Math.max(0, Math.round(Number(v) || 0)));
const str = (v, max = 500) => String(v ?? '').trim().slice(0, max);
const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const isUrl = (v) => /^https?:\/\/[^\s]+$/i.test(v);

function ensure() {
  if (!storage.isAvailable()) throw new StorageUnavailableError();
}

function write(key, value) {
  if (!storage.set(key, value)) throw new Error('Could not save. Browser storage may be full or blocked.');
  return value;
}

/* ------------------------------------------------------------------------- */
/* Readers (defensive against corrupted or older data)                       */
/* ------------------------------------------------------------------------- */

function normProfile(p) {
  const base = { ...EMPTY_PROFILE, links: { ...EMPTY_PROFILE.links }, education: [] };
  if (!isObj(p)) return base;
  return {
    ...base,
    ...p,
    links: { ...base.links, ...(isObj(p.links) ? p.links : {}) },
    education: Array.isArray(p.education) ? p.education.filter(isObj) : [],
  };
}

const list = (key) => {
  const v = storage.get(key, []);
  return Array.isArray(v) ? v.filter(isObj) : [];
};

const readProfileRaw = () => storage.get(K.profile, null);
const readProfile = () => normProfile(readProfileRaw());
const readSkills = () => list(K.skills)
  .filter((s) => typeof s.name === 'string' && s.name.trim())
  .map((s) => ({ ...s, level: clampLevel(s.level), category: s.category || categoryOf(s.name) }));
const readJobs = () => list(K.savedJobs).filter((j) => j.id && isObj(j.analysis));
const readApps = () => list(K.applications)
  .filter((a) => a.id)
  .map((a) => ({ ...a, status: APPLICATION_STATUSES.includes(a.status) ? a.status : 'Saved', history: Array.isArray(a.history) ? a.history : [] }));
const readRoadmap = () => {
  const r = storage.get(K.roadmap, null);
  return isObj(r) && Array.isArray(r.items) ? r : null;
};

function isProfileEmpty(p) {
  const n = normProfile(p);
  return !n.fullName && !n.targetRole && !n.summary && !n.education.length;
}

function resolveActiveJob(jobs, settings) {
  return jobs.find((j) => j.id === settings.activeJobId) || jobs[0] || null;
}

/* ------------------------------------------------------------------------- */
/* Settings & theme (stay in LocalStorage in Stage B too)                    */
/* ------------------------------------------------------------------------- */

/** @returns {'dark'|'light'} */
function getTheme() {
  return storage.get(K.theme, 'dark') === 'light' ? 'light' : 'dark';
}

function setTheme(theme) {
  storage.set(K.theme, theme === 'light' ? 'light' : 'dark');
}

function getSettings() {
  const s = storage.get(K.settings, {});
  return { ...DEFAULT_SETTINGS, ...(isObj(s) ? s : {}) };
}

function saveSettings(patch) {
  const next = { ...getSettings(), ...patch };
  storage.set(K.settings, next);
  return next;
}

/* ------------------------------------------------------------------------- */
/* Demo data                                                                 */
/* ------------------------------------------------------------------------- */

function isDemoActive() {
  return storage.get(K.demo, false) === true;
}

/** Load sample records (flagged `demo: true`). Records you created are kept. */
async function loadDemoData() {
  ensure();
  const userSkills = readSkills().filter((s) => !s.demo);
  const have = new Set(userSkills.map((s) => s.name.toLowerCase()));
  const demoSkills = DEMO_SKILLS.filter((s) => !have.has(s.name.toLowerCase())).map((s, i) => ({
    id: `demo-skill-${i}`, name: s.name, level: s.level, category: categoryOf(s.name), demo: true, updatedAt: daysAgoIso(20 - (i % 10)),
  }));
  const skills = write(K.skills, [...userSkills, ...demoSkills]);

  const current = readProfileRaw();
  if (!current || current.demo || isProfileEmpty(current)) {
    write(K.profile, { ...normProfile(DEMO_PROFILE), demo: true, updatedAt: daysAgoIso(9) });
  }

  const userJobs = readJobs().filter((j) => !j.demo);
  const demoJobs = SAMPLE_JOBS.slice(0, 2).map((j, i) => ({
    id: `demo-job-${j.key}`, title: j.title, company: j.company, description: j.description,
    analysis: analyzeJob(j), createdAt: daysAgoIso(10 + i * 9), demo: true,
  }));
  write(K.savedJobs, [...userJobs, ...demoJobs]);

  const userApps = readApps().filter((a) => !a.demo);
  const demoApps = DEMO_APPLICATIONS.map((a, i) => {
    const history = a.history.map(([status, d]) => ({ status, at: daysAgoIso(d) }));
    return {
      id: `demo-app-${i}`, jobTitle: a.jobTitle, company: a.company, location: a.location, status: a.status,
      appliedOn: a.applied != null ? daysAgoDate(a.applied) : '', url: '', notes: a.notes,
      createdAt: daysAgoIso(a.applied ?? a.created ?? 1), updatedAt: history[history.length - 1].at, history, demo: true,
    };
  });
  write(K.applications, [...userApps, ...demoApps]);

  const settings = getSettings();
  if (!settings.activeJobId || ![...userJobs, ...demoJobs].some((j) => j.id === settings.activeJobId)) {
    saveSettings({ activeJobId: demoJobs[0].id });
  }

  const rm = readRoadmap();
  if (!rm || rm.demo) {
    const job = demoJobs[0];
    const items = buildRoadmap(computeSkillGap(skills, job.analysis).items, 12);
    items.forEach((it) => {
      if (it.week <= 3) { it.done = true; it.doneAt = daysAgoIso((4 - it.week) * 6); }
    });
    write(K.roadmap, { jobId: job.id, jobTitle: job.title, company: job.company, weeks: 12, generatedAt: daysAgoIso(21), items, demo: true });
  }
  storage.set(K.demo, true);
}

/** Remove every record flagged as demo. */
async function clearDemoData() {
  ensure();
  write(K.skills, readSkills().filter((s) => !s.demo));
  write(K.savedJobs, readJobs().filter((j) => !j.demo));
  write(K.applications, readApps().filter((a) => !a.demo));
  if (readProfileRaw()?.demo) storage.remove(K.profile);
  if (readRoadmap()?.demo) storage.remove(K.roadmap);
  const s = getSettings();
  if (String(s.activeJobId || '').startsWith('demo-')) saveSettings({ activeJobId: null });
  storage.set(K.demo, false);
}

/* ------------------------------------------------------------------------- */
/* Public API                                                                */
/* ------------------------------------------------------------------------- */

export const api = {
  /** Check storage and seed demo data on the very first visit. */
  async init() {
    ensure();
    const firstVisit = storage.get(K.demo, null) === null
      && storage.listKeys().every((k) => k === K.theme || k === K.settings);
    if (firstVisit) await loadDemoData();
  },

  /** Everything a page usually needs, in one call. */
  async getSnapshot() {
    ensure();
    await wait(LATENCY_MS);
    const savedJobs = readJobs();
    const settings = getSettings();
    return {
      profile: readProfile(),
      skills: readSkills(),
      applications: readApps(),
      savedJobs,
      roadmap: readRoadmap(),
      settings,
      demo: isDemoActive(),
      activeJob: resolveActiveJob(savedJobs, settings),
    };
  },

  /* ---- Profile ---- */
  async getProfile() { ensure(); return readProfile(); },

  /** Validate and save the profile. Saving makes a demo profile yours. */
  async saveProfile(input) {
    ensure();
    const errors = {};
    const links = {
      linkedin: str(input.links?.linkedin, 300), github: str(input.links?.github, 300), portfolio: str(input.links?.portfolio, 300),
    };
    for (const [k, v] of Object.entries(links)) if (v && !isUrl(v)) errors[`link-${k}`] = 'Links must start with http:// or https://';
    const fullName = str(input.fullName, 120);
    if (!fullName) errors.fullName = 'Please enter your name.';
    const education = (Array.isArray(input.education) ? input.education : [])
      .map((e) => ({ degree: str(e.degree, 160), institution: str(e.institution, 160), startYear: str(e.startYear, 4), endYear: str(e.endYear, 4), grade: str(e.grade, 60) }))
      .filter((e) => e.degree || e.institution);
    education.forEach((e, i) => {
      for (const f of ['startYear', 'endYear']) if (e[f] && !/^(19|20)\d{2}$/.test(e[f])) errors[`edu-${i}-${f}`] = 'Use a 4-digit year.';
      if (e.startYear && e.endYear && Number(e.endYear) < Number(e.startYear)) errors[`edu-${i}-endYear`] = 'End year is before start year.';
    });
    if (Object.keys(errors).length) throw new ValidationError('Please fix the highlighted fields.', errors);
    const prev = readProfile();
    const next = {
      ...prev,
      fullName, headline: str(input.headline, 160), location: str(input.location, 120), targetRole: str(input.targetRole, 120),
      experienceLevel: str(input.experienceLevel, 40), summary: str(input.summary, 1200), education, links,
      demo: false, updatedAt: nowIso(),
    };
    return write(K.profile, next);
  },

  /** Store a short summary of the latest CV analysis on the profile. */
  async saveCvSummary(summary) {
    ensure();
    const prev = readProfile();
    return write(K.profile, { ...prev, lastCv: { ...summary, analyzedAt: nowIso() } });
  },

  /* ---- Skills ---- */
  async getSkills() { ensure(); return readSkills(); },

  /** Create (no id) or update (with id) a skill. Names are unique (case-insensitive). */
  async saveSkill(skill) {
    ensure();
    const all = readSkills();
    const name = str(skill.name, 60);
    if (!name) throw new ValidationError('Skill name is required.', { name: 'Skill name is required.' });
    if (all.some((s) => s.name.toLowerCase() === name.toLowerCase() && s.id !== skill.id)) {
      throw new ValidationError(`"${name}" is already in your skills.`, { name: 'This skill already exists.' });
    }
    const existing = all.find((s) => s.id === skill.id);
    const rec = { ...(existing || {}), id: existing?.id || uid(), name, level: clampLevel(skill.level), category: skill.category || categoryOf(name), updatedAt: nowIso() };
    write(K.skills, existing ? all.map((s) => (s.id === rec.id ? rec : s)) : [...all, rec]);
    return rec;
  },

  async deleteSkill(id) {
    ensure();
    write(K.skills, readSkills().filter((s) => s.id !== id));
  },

  /**
   * Add several skills at once (e.g. from a CV analysis). Existing names are skipped.
   * @param {{name:string, level?:number, category?:string}[]} items
   */
  async addSkills(items) {
    ensure();
    const all = readSkills();
    const have = new Set(all.map((s) => s.name.toLowerCase()));
    const added = [];
    for (const it of items) {
      const name = str(it.name, 60);
      if (!name || have.has(name.toLowerCase())) continue;
      have.add(name.toLowerCase());
      added.push({ id: uid(), name, level: clampLevel(it.level ?? 50), category: it.category || categoryOf(name), updatedAt: nowIso() });
    }
    write(K.skills, [...all, ...added]);
    return { added: added.length, skipped: items.length - added.length };
  },

  /* ---- Saved jobs ---- */
  async getSavedJobs() { ensure(); return readJobs(); },

  async getActiveJob() { ensure(); return resolveActiveJob(readJobs(), getSettings()); },

  async setActiveJob(id) { ensure(); saveSettings({ activeJobId: id }); },

  /** Save an analyzed job and make it the active target. */
  async saveJob({ title, company, description, analysis }) {
    ensure();
    const errors = {};
    if (!str(title)) errors.title = 'Job title is required.';
    if (str(description, 20000).length < 80) errors.description = 'Paste at least 80 characters of the job description.';
    if (Object.keys(errors).length) throw new ValidationError('Please fix the highlighted fields.', errors);
    const rec = {
      id: uid(), title: str(title, 160), company: str(company, 160), description: str(description, 20000),
      analysis: analysis || analyzeJob({ title, company, description }), createdAt: nowIso(),
    };
    write(K.savedJobs, [rec, ...readJobs()]);
    saveSettings({ activeJobId: rec.id });
    return rec;
  },

  async deleteJob(id) {
    ensure();
    write(K.savedJobs, readJobs().filter((j) => j.id !== id));
    if (getSettings().activeJobId === id) saveSettings({ activeJobId: null });
  },

  /* ---- Applications ---- */
  async getApplications() { ensure(); return readApps(); },

  async createApplication(data) {
    ensure();
    const rec = validateApplication({ ...data, id: uid() });
    const now = nowIso();
    rec.createdAt = now;
    rec.updatedAt = now;
    rec.history = [{ status: rec.status, at: now }];
    if (!rec.appliedOn && rec.status !== 'Saved') rec.appliedOn = todayDate();
    write(K.applications, [rec, ...readApps()]);
    return rec;
  },

  async updateApplication(id, patch) {
    ensure();
    const all = readApps();
    const old = all.find((a) => a.id === id);
    if (!old) throw new Error('Application not found. It may have been deleted.');
    const next = { ...old, ...validateApplication({ ...old, ...patch, id }) };
    if (next.status !== old.status) {
      next.history = [...old.history, { status: next.status, at: nowIso() }];
      if (!next.appliedOn && next.status !== 'Saved') next.appliedOn = todayDate();
    }
    next.updatedAt = nowIso();
    write(K.applications, all.map((a) => (a.id === id ? next : a)));
    return next;
  },

  async deleteApplication(id) {
    ensure();
    write(K.applications, readApps().filter((a) => a.id !== id));
  },

  /* ---- Roadmap ---- */
  async getRoadmap() { ensure(); return readRoadmap(); },

  /** Save a freshly generated roadmap (replaces the previous one). */
  async saveRoadmap({ job, weeks, items }) {
    ensure();
    return write(K.roadmap, {
      jobId: job?.id || null, jobTitle: job?.title || '', company: job?.company || '',
      weeks, generatedAt: nowIso(), items: items.map((i) => ({ ...i, done: false, doneAt: null })),
    });
  },

  async setRoadmapItemDone(itemId, done) {
    ensure();
    const r = readRoadmap();
    if (!r) throw new Error('No roadmap found.');
    const item = r.items.find((i) => i.id === itemId);
    if (!item) throw new Error('Roadmap item not found.');
    item.done = !!done;
    item.doneAt = done ? nowIso() : null;
    return write(K.roadmap, r);
  },

  async clearRoadmap() { ensure(); storage.remove(K.roadmap); },

  /* ---- Assistant ---- */
  async getAssistantHistory() { ensure(); return list(K.assistant); },

  /** Append messages; keeps the latest 100. */
  async appendAssistantMessages(...messages) {
    ensure();
    const next = [...list(K.assistant), ...messages.map((m) => ({ id: uid(), role: m.role, content: str(m.content, 4000), intent: m.intent || null, at: nowIso() }))].slice(-100);
    write(K.assistant, next);
    return next;
  },

  async clearAssistantHistory() { ensure(); storage.remove(K.assistant); },

  /* ---- Theme, settings, demo ---- */
  getTheme,
  setTheme,
  getSettings,
  saveSettings,
  isDemoActive,
  loadDemoData,
  clearDemoData,

  /* ---- Data management ---- */
  exportData() { return storage.exportAll(); },

  /** Replace all data with an export file (theme is kept unless the file has one). */
  async importData(payload) {
    ensure();
    const n = storage.importAll(payload, { replace: true, keep: [K.theme] });
    if (storage.get(K.demo, null) === null) storage.set(K.demo, false);
    return n;
  },

  /** Delete all data except the theme. Demo data is not reloaded afterwards. */
  async resetData() {
    ensure();
    storage.resetAll([K.theme]);
    storage.set(K.demo, false);
  },

  storageUsage() { return storage.usageBytes(); },
};

function validateApplication(data) {
  const rec = {
    id: data.id,
    jobTitle: str(data.jobTitle, 160),
    company: str(data.company, 160),
    location: str(data.location, 120),
    status: data.status,
    appliedOn: str(data.appliedOn, 10),
    url: str(data.url, 500),
    notes: str(data.notes, 2000),
  };
  const errors = {};
  if (!rec.jobTitle) errors.jobTitle = 'Job title is required.';
  if (!rec.company) errors.company = 'Company is required.';
  if (!APPLICATION_STATUSES.includes(rec.status)) errors.status = 'Choose a valid status.';
  if (rec.appliedOn && !/^\d{4}-\d{2}-\d{2}$/.test(rec.appliedOn)) errors.appliedOn = 'Use a valid date.';
  if (rec.url && !isUrl(rec.url)) errors.url = 'Links must start with http:// or https://';
  if (Object.keys(errors).length) throw new ValidationError('Please fix the highlighted fields.', errors);
  return rec;
}
