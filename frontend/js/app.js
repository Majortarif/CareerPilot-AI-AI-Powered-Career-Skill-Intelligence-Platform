/**
 * CareerPilot AI — app shell and shared UI helpers.
 * Sidebar / top bar / bottom nav, theme, toasts, modals, safe HTML templating,
 * loading / empty / error states, count-up, reveal-on-scroll and Chart.js theming.
 */
import { api } from './api.js';

/* ------------------------------------------------------------------------- */
/* Navigation                                                                */
/* ------------------------------------------------------------------------- */

export const NAV = [
  { group: 'Overview', items: [
    { id: 'dashboard', label: 'Dashboard', short: 'Home', href: 'dashboard.html', icon: 'layout-dashboard' },
  ] },
  { group: 'Career', items: [
    { id: 'profile', label: 'Career Profile', short: 'Profile', href: 'profile.html', icon: 'user-round' },
    { id: 'cv-analyzer', label: 'CV Analyzer', short: 'CV', href: 'cv-analyzer.html', icon: 'file-search' },
    { id: 'job-analyzer', label: 'Job Analyzer', short: 'Jobs', href: 'job-analyzer.html', icon: 'briefcase' },
    { id: 'skill-gap', label: 'Skill Gap', short: 'Gaps', href: 'skill-gap.html', icon: 'target' },
  ] },
  { group: 'Growth', items: [
    { id: 'roadmap', label: 'Learning Roadmap', short: 'Roadmap', href: 'roadmap.html', icon: 'map' },
    { id: 'projects', label: 'Project Ideas', short: 'Projects', href: 'projects.html', icon: 'lightbulb' },
  ] },
  { group: 'Tracking', items: [
    { id: 'applications', label: 'Applications', short: 'Tracker', href: 'applications.html', icon: 'square-kanban' },
    { id: 'analytics', label: 'Analytics', short: 'Analytics', href: 'analytics.html', icon: 'chart-column' },
  ] },
  { group: 'Assist', items: [
    { id: 'assistant', label: 'AI Assistant', short: 'Assistant', href: 'assistant.html', icon: 'bot' },
    { id: 'settings', label: 'Settings', short: 'Settings', href: 'settings.html', icon: 'settings' },
  ] },
];

const BOTTOM_NAV = ['dashboard', 'cv-analyzer', 'skill-gap', 'applications', 'assistant'];
const NAV_ITEMS = NAV.flatMap((g) => g.items);

/* ------------------------------------------------------------------------- */
/* DOM & safe templating                                                     */
/* ------------------------------------------------------------------------- */

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

class SafeHtml {
  constructor(value) { this.value = value; }
  toString() { return this.value; }
}

/** Mark a trusted string as HTML (never pass user input). */
export const raw = (v) => new SafeHtml(String(v));

/** Escape text for safe insertion into HTML (text and quoted attributes). */
export function escapeHtml(v) {
  return String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function toSafe(v) {
  if (v === null || v === undefined || v === false) return '';
  if (v instanceof SafeHtml) return v.value;
  if (Array.isArray(v)) return v.map(toSafe).join('');
  return escapeHtml(v);
}

/**
 * Tagged template that escapes every interpolated value unless it is SafeHtml
 * (nested html`` results, raw(), icon()). Prevents XSS from user data.
 */
export function html(strings, ...values) {
  let out = '';
  strings.forEach((s, i) => {
    out += s;
    if (i < values.length) out += toSafe(values[i]);
  });
  return new SafeHtml(out);
}

/** Render SafeHtml into an element and hydrate icons. Plain strings are escaped. */
export function setHTML(el, content) {
  if (!el) return;
  el.innerHTML = content instanceof SafeHtml ? content.value : escapeHtml(content ?? '');
  refreshIcons();
}

/** Append SafeHtml at the end of a (connected) element and hydrate icons. */
export function appendHTML(el, content) {
  if (!el) return;
  el.insertAdjacentHTML('beforeend', content instanceof SafeHtml ? content.value : escapeHtml(content ?? ''));
  refreshIcons();
}

/** Lucide icon placeholder (hydrated by refreshIcons; the element must be in the document). */
export const icon = (name, cls = '') => raw(`<i data-lucide="${name}"${cls ? ` class="${cls}"` : ''} aria-hidden="true"></i>`);

export function refreshIcons() {
  try {
    const L = window.lucide;
    if (L?.createIcons) L.createIcons({ icons: L.icons, attrs: { 'aria-hidden': 'true', focusable: 'false' } });
  } catch (e) {
    console.warn('[icons]', e);
  }
}

/* ------------------------------------------------------------------------- */
/* Formatting                                                                */
/* ------------------------------------------------------------------------- */

const toDate = (v) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T00:00:00`) : new Date(v));

export function fmtDate(v) {
  if (!v) return '—';
  const d = toDate(v);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function relativeTime(v) {
  const d = toDate(v);
  if (Number.isNaN(d.getTime())) return '';
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (days < 30) return `${Math.round(days / 7)} wk ago`;
  return fmtDate(v);
}

export const initials = (name) => String(name || '').trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() || '').join('') || '?';

export const clamp = (n, min = 0, max = 100) => Math.min(max, Math.max(min, Number(n) || 0));

export function debounce(fn, ms = 200) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

export const pluralize = (n, word, plural = `${word}s`) => `${n} ${n === 1 ? word : plural}`;

export const wait = (ms) => new Promise((r) => setTimeout(r, prefersReducedMotion() ? Math.min(ms, 150) : ms));

/* ------------------------------------------------------------------------- */
/* Theme & motion                                                            */
/* ------------------------------------------------------------------------- */

export const currentTheme = () => (document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark');

export function applyTheme(theme) {
  const t = theme === 'light' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', t);
  api.setTheme(t);
  updateThemeToggles();
  window.dispatchEvent(new CustomEvent('cp:themechange', { detail: { theme: t } }));
}

export const toggleTheme = () => applyTheme(currentTheme() === 'dark' ? 'light' : 'dark');
export const onThemeChange = (fn) => window.addEventListener('cp:themechange', fn);

function updateThemeToggles() {
  const dark = currentTheme() === 'dark';
  $$('[data-theme-toggle]').forEach((btn) => {
    btn.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
    btn.dataset.tooltip = dark ? 'Light mode' : 'Dark mode';
    setHTML(btn, icon(dark ? 'sun' : 'moon'));
  });
}

export function initThemeToggles() {
  $$('[data-theme-toggle]').forEach((btn) => btn.addEventListener('click', toggleTheme));
  updateThemeToggles();
}

export function prefersReducedMotion() {
  return document.documentElement.getAttribute('data-motion') === 'reduced'
    || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function applyMotion(pref) {
  if (pref === 'reduced') document.documentElement.setAttribute('data-motion', 'reduced');
  else document.documentElement.removeAttribute('data-motion');
}

/* ------------------------------------------------------------------------- */
/* Shell                                                                     */
/* ------------------------------------------------------------------------- */

const brandMark = () => html`<span class="brand-mark">${icon('compass')}</span>`;

function renderShell(pageId) {
  const current = NAV_ITEMS.find((i) => i.id === pageId);
  const aria = (id) => (id === pageId ? raw(' aria-current="page"') : '');

  setHTML($('#sidebar'), html`
    <div class="sidebar-brand">
      <a href="index.html" class="flex items-center gap-2.5" aria-label="CareerPilot AI home">
        ${brandMark()}<span class="brand-name">CareerPilot <span>AI</span></span>
      </a>
      <button type="button" class="icon-btn ml-auto lg:hidden" data-drawer-close aria-label="Close menu">${icon('x')}</button>
    </div>
    <nav class="sidebar-nav" aria-label="Main">
      ${NAV.map((g) => html`
        <div class="nav-group-label" aria-hidden="true">${g.group}</div>
        <ul>${g.items.map((i) => html`<li><a class="nav-link" href="${i.href}"${aria(i.id)}>${icon(i.icon)}<span>${i.label}</span></a></li>`)}</ul>`)}
    </nav>
    <div class="sidebar-footer">
      <div class="sidebar-card">
        <strong>${icon('flask-conical', 'w-4 h-4')} Frontend prototype</strong>
        Simulated AI. Your data stays in this browser.
        <p class="mt-2" data-demo-status></p>
      </div>
    </div>`);

  setHTML($('#topbar'), html`
    <button type="button" class="icon-btn menu-btn" data-drawer-open aria-label="Open menu" aria-controls="sidebar" aria-expanded="false">${icon('menu')}</button>
    <a href="index.html" class="brand-inline" aria-label="CareerPilot AI home">${brandMark()}</a>
    <div class="topbar-title"><span>${current?.label || 'CareerPilot AI'}</span></div>
    <div class="topbar-actions">
      <a href="settings.html#data" class="badge badge-warning" data-demo-badge hidden>${icon('flask-conical')}<span class="hidden sm:inline">Demo data</span><span class="sr-only sm:hidden">Demo data active</span></a>
      <button type="button" class="icon-btn" data-theme-toggle aria-label="Toggle theme"></button>
      <a href="profile.html" class="avatar" data-avatar aria-label="Your career profile">?</a>
    </div>`);

  setHTML($('#bottom-nav'), html`${BOTTOM_NAV.map((id) => {
    const i = NAV_ITEMS.find((n) => n.id === id);
    return html`<a href="${i.href}"${aria(i.id)}>${icon(i.icon)}<span>${i.short}</span></a>`;
  })}`);
}

function initDrawer() {
  const sidebar = $('#sidebar');
  const openBtn = $('[data-drawer-open]');
  if (!sidebar || !openBtn) return;
  const overlay = document.createElement('div');
  overlay.className = 'drawer-overlay';
  document.body.appendChild(overlay);
  let isOpen = false;

  const onKey = (e) => {
    if (e.key === 'Escape') close();
    else if (e.key === 'Tab') trapFocus(e, sidebar);
  };
  function open() {
    isOpen = true;
    sidebar.classList.add('is-open');
    overlay.classList.add('is-open');
    openBtn.setAttribute('aria-expanded', 'true');
    lockScroll(true);
    document.addEventListener('keydown', onKey);
    setTimeout(() => ($('[aria-current="page"]', sidebar) || $('a', sidebar))?.focus(), 50);
  }
  function close(restoreFocus = true) {
    if (!isOpen) return;
    isOpen = false;
    sidebar.classList.remove('is-open');
    overlay.classList.remove('is-open');
    openBtn.setAttribute('aria-expanded', 'false');
    lockScroll(false);
    document.removeEventListener('keydown', onKey);
    if (restoreFocus) openBtn.focus();
  }
  openBtn.addEventListener('click', open);
  overlay.addEventListener('click', () => close());
  $('[data-drawer-close]', sidebar)?.addEventListener('click', () => close());
  window.matchMedia('(min-width: 1024px)').addEventListener('change', (e) => { if (e.matches) close(false); });
}

/** Update the demo badge, sidebar note and avatar after data changes. */
export async function refreshShell() {
  try {
    const demo = api.isDemoActive();
    $$('[data-demo-badge]').forEach((b) => { b.hidden = !demo; });
    $$('[data-demo-status]').forEach((p) => {
      setHTML(p, demo
        ? html`<a class="link" href="settings.html#data">Demo data is on</a>. Turn it off in Settings.`
        : html`Demo data is off.`);
    });
    const profile = await api.getProfile();
    $$('[data-avatar]').forEach((a) => {
      a.textContent = initials(profile.fullName);
      if (profile.fullName) a.setAttribute('aria-label', `Career profile of ${profile.fullName}`);
    });
  } catch {
    /* shell extras are optional */
  }
}

/**
 * Boot an app page: render the shell, check storage/seed demo data, then run the page renderer.
 * Any uncaught error shows a page-level error state with a retry button.
 * @param {string} pageId
 * @param {(ctx:{main:HTMLElement}) => Promise<void>|void} render
 */
export async function bootPage(pageId, render) {
  const main = $('#main');
  try {
    applyMotion(api.getSettings().motion);
    renderShell(pageId);
    initDrawer();
    initThemeToggles();
  } catch (e) {
    console.error('[shell]', e);
  }
  try {
    await api.init();
    await refreshShell();
    await render({ main });
  } catch (err) {
    console.error(err);
    const target = $('[data-page-body]', main) || main;
    setHTML(target, errorState({ message: err?.message || 'Unexpected error.' }));
    $('[data-retry]', target)?.addEventListener('click', () => location.reload());
  } finally {
    refreshIcons();
    initReveal();
  }
}

/** Boot the marketing landing page (no app shell). */
export function bootLanding() {
  try { applyMotion(api.getSettings().motion); } catch { /* ignore */ }
  initThemeToggles();
  refreshIcons();
  initReveal();
}

/* ------------------------------------------------------------------------- */
/* Focus, scroll lock                                                        */
/* ------------------------------------------------------------------------- */

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function trapFocus(e, container) {
  const items = $$(FOCUSABLE, container).filter((el) => el.offsetParent !== null || el === document.activeElement);
  if (!items.length) return;
  const first = items[0];
  const last = items[items.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}

let scrollLocks = 0;
function lockScroll(on) {
  scrollLocks = Math.max(0, scrollLocks + (on ? 1 : -1));
  document.documentElement.style.overflow = scrollLocks ? 'hidden' : '';
}

/* ------------------------------------------------------------------------- */
/* Toasts                                                                    */
/* ------------------------------------------------------------------------- */

let toastRegion = null;
const TOAST_ICONS = { success: 'circle-check', error: 'circle-alert', warning: 'triangle-alert', info: 'info' };

/**
 * Show a toast notification.
 * @param {string} message
 * @param {{type?:'success'|'error'|'warning'|'info', duration?:number}} [options]
 */
export function toast(message, { type = 'success', duration = 3800 } = {}) {
  if (!toastRegion) {
    toastRegion = document.createElement('div');
    toastRegion.className = 'toast-region';
    toastRegion.setAttribute('role', 'status');
    toastRegion.setAttribute('aria-live', 'polite');
    document.body.appendChild(toastRegion);
  }
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  toastRegion.appendChild(el);
  setHTML(el, html`${icon(TOAST_ICONS[type] || 'info')}<div class="toast-msg">${message}</div>
    <button type="button" class="icon-btn icon-btn-sm" aria-label="Dismiss notification">${icon('x')}</button>`);
  let timer;
  const dismiss = () => {
    clearTimeout(timer);
    el.classList.add('is-leaving');
    setTimeout(() => el.remove(), prefersReducedMotion() ? 0 : 200);
  };
  $('button', el).addEventListener('click', dismiss);
  timer = setTimeout(dismiss, duration);
  el.addEventListener('mouseenter', () => clearTimeout(timer));
  el.addEventListener('mouseleave', () => { timer = setTimeout(dismiss, 1500); });
}

/* ------------------------------------------------------------------------- */
/* Modals                                                                    */
/* ------------------------------------------------------------------------- */

let modalSeq = 0;

/**
 * Open an accessible modal dialog (focus trap, Esc to close, focus restore).
 * @param {{title:string, body:any, footer?:any, size?:string, onClose?:Function, initialFocus?:string}} options
 * @returns {{el:HTMLElement, close:Function}}
 */
export function openModal({ title, body, footer, size = '', onClose, initialFocus } = {}) {
  const previous = document.activeElement;
  const id = `modal-${++modalSeq}`;
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  document.body.appendChild(backdrop);
  setHTML(backdrop, html`
    <div class="modal ${size}" role="dialog" aria-modal="true" aria-labelledby="${id}-title">
      <div class="modal-header">
        <h2 class="modal-title" id="${id}-title">${title}</h2>
        <button type="button" class="icon-btn icon-btn-sm" data-modal-close aria-label="Close dialog">${icon('x')}</button>
      </div>
      <div class="modal-body">${body}</div>
      ${footer ? html`<div class="modal-footer">${footer}</div>` : ''}
    </div>`);
  lockScroll(true);
  const modal = $('.modal', backdrop);
  let closed = false;

  const onKey = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'Tab') trapFocus(e, modal);
  };
  function close() {
    if (closed) return;
    closed = true;
    document.removeEventListener('keydown', onKey);
    backdrop.classList.add('is-closing');
    setTimeout(() => backdrop.remove(), prefersReducedMotion() ? 0 : 160);
    lockScroll(false);
    if (previous && document.contains(previous)) previous.focus();
    onClose?.();
  }
  document.addEventListener('keydown', onKey);
  backdrop.addEventListener('mousedown', (e) => { if (e.target === backdrop) close(); });
  $$('[data-modal-close]', backdrop).forEach((b) => b.addEventListener('click', close));
  requestAnimationFrame(() => {
    const target = (initialFocus && $(initialFocus, modal))
      || $('.modal-body input, .modal-body select, .modal-body textarea', modal)
      || $('[data-modal-close]', modal);
    target?.focus();
  });
  return { el: modal, close };
}

/**
 * Promise-based confirmation dialog.
 * @returns {Promise<boolean>}
 */
export function confirmDialog({ title = 'Are you sure?', message = '', confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false } = {}) {
  return new Promise((resolve) => {
    let result = false;
    const m = openModal({
      title,
      size: 'modal-sm',
      body: html`<p class="text-muted">${message}</p>`,
      footer: html`<button type="button" class="btn btn-secondary" data-modal-close data-cancel>${cancelLabel}</button>
        <button type="button" class="btn ${danger ? 'btn-danger-solid' : 'btn-primary'}" data-confirm>${confirmLabel}</button>`,
      initialFocus: '[data-cancel]',
      onClose: () => resolve(result),
    });
    $('[data-confirm]', m.el).addEventListener('click', () => { result = true; m.close(); });
  });
}

/* ------------------------------------------------------------------------- */
/* States                                                                    */
/* ------------------------------------------------------------------------- */

/**
 * Empty state markup. `action` renders a link ({href,label}) or a button ({label}) marked [data-state-action].
 */
export function emptyState({ icon: ic = 'inbox', title = 'Nothing here yet', message = '', action = null, compact = false } = {}) {
  const btn = action
    ? action.href
      ? html`<a class="btn btn-primary" href="${action.href}">${action.icon ? icon(action.icon) : ''}${action.label}</a>`
      : html`<button type="button" class="btn btn-primary" data-state-action>${action.icon ? icon(action.icon) : ''}${action.label}</button>`
    : '';
  return html`<div class="state fade-in${compact ? ' py-8' : ''}"><div class="state-icon">${icon(ic)}</div><h3>${title}</h3>${message ? html`<p>${message}</p>` : ''}${btn}</div>`;
}

/** Error state markup with an optional retry button ([data-retry]). */
export function errorState({ title = 'Something went wrong', message = '', retry = true } = {}) {
  return html`<div class="state state-error fade-in" role="alert"><div class="state-icon">${icon('triangle-alert')}</div><h3>${title}</h3>
    ${message ? html`<p>${message}</p>` : ''}
    ${retry ? html`<button type="button" class="btn btn-secondary" data-retry>${icon('refresh-cw')}Try again</button>` : ''}</div>`;
}

/* ------------------------------------------------------------------------- */
/* Forms                                                                     */
/* ------------------------------------------------------------------------- */

/** Show validation errors next to fields (`name` → `[data-error-for=name]`) and focus the first invalid one. */
export function showFieldErrors(form, errors = {}) {
  $$('[aria-invalid="true"]', form).forEach((el) => el.removeAttribute('aria-invalid'));
  $$('[data-error-for]', form).forEach((el) => { el.textContent = ''; });
  for (const [name, msg] of Object.entries(errors)) {
    const input = form.querySelector(`[name="${CSS.escape(name)}"]`);
    const err = form.querySelector(`[data-error-for="${CSS.escape(name)}"]`);
    if (input) input.setAttribute('aria-invalid', 'true');
    if (err) err.textContent = msg;
  }
  // First invalid field in document order, regardless of the order errors were reported
  $('[aria-invalid="true"]', form)?.focus();
}

/** Set a button's loading state. */
export function setLoading(btn, loading) {
  if (!btn) return;
  btn.classList.toggle('is-loading', loading);
  btn.disabled = loading;
  btn.setAttribute('aria-busy', String(loading));
}

/* ------------------------------------------------------------------------- */
/* Motion helpers                                                            */
/* ------------------------------------------------------------------------- */

/** Animate a number from 0 to `to` (respects reduced motion). */
export function countUp(el, to, { duration = 1000, suffix = '' } = {}) {
  const target = Math.round(Number(to) || 0);
  if (prefersReducedMotion()) { el.textContent = `${target}${suffix}`; return; }
  const start = performance.now();
  const step = (now) => {
    const t = Math.min(1, (now - start) / duration);
    el.textContent = `${Math.round(target * (1 - (1 - t) ** 3))}${suffix}`;
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/** Run count-ups for `[data-count]`, progress bars `[data-value]` and rings inside `root`. */
export function animateIn(root = document) {
  $$('[data-count]', root).forEach((el) => countUp(el, el.dataset.count, { suffix: el.dataset.suffix || '' }));
  const bars = $$('.progress-bar[data-value]', root);
  const rings = $$('.ring-value[data-offset]', root);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    bars.forEach((b) => { b.style.width = `${clamp(b.dataset.value)}%`; });
    rings.forEach((c) => { c.style.strokeDashoffset = c.dataset.offset; });
  }));
}

let ringSeq = 0;

/** SVG score ring markup. Call animateIn() after inserting it. */
export function ringSvg(value, { size = 164, stroke = 12, label = 'match', ariaLabel } = {}) {
  const v = value === null || value === undefined ? 0 : clamp(value);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const gid = `ring-grad-${++ringSeq}`;
  return html`<div class="score-ring" style="width:${size}px;height:${size}px" role="img" aria-label="${ariaLabel || `${v}% ${label}`}">
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true">
      <defs><linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#6366f1"/><stop offset="100%" stop-color="#0ea5e9"/></linearGradient></defs>
      <circle class="ring-track" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke-width="${stroke}"/>
      <circle class="ring-value" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="url(#${gid})" stroke-width="${stroke}"
        stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${c.toFixed(2)}" data-offset="${(c * (1 - v / 100)).toFixed(2)}"/>
    </svg>
    <div class="ring-label" aria-hidden="true"><strong data-count="${v}" data-suffix="%">0%</strong><span>${label}</span></div>
  </div>`;
}

/** Reveal `.reveal` elements when they scroll into view. */
export function initReveal(root = document) {
  const els = $$('.reveal:not(.is-visible)', root);
  if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
    els.forEach((e) => e.classList.add('is-visible'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add('is-visible'); io.unobserve(en.target); }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });
  els.forEach((e) => io.observe(e));
}

/* ------------------------------------------------------------------------- */
/* Charts                                                                    */
/* ------------------------------------------------------------------------- */

function cssRgb(name, alpha) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim().split(/\s+/).join(', ');
  return alpha === undefined ? `rgb(${v})` : `rgba(${v}, ${alpha})`;
}

/** Theme-aware colours for Chart.js, read from CSS variables. */
export function chartTheme() {
  return {
    text: cssRgb('--text'),
    muted: cssRgb('--muted'),
    grid: cssRgb('--line', 0.7),
    surface: cssRgb('--surface'),
    c: (name, alpha) => cssRgb(`--${name}`, alpha),
    categorical: ['brand', 'accent', 'success', 'warning', 'violet', 'danger', 'muted'],
  };
}

export const STATUS_TOKENS = { Saved: 'muted', Applied: 'accent', Screening: 'violet', Interview: 'warning', Offer: 'success', Rejected: 'danger', Withdrawn: 'muted' };

/** Chart colour for an application status. */
export function statusColor(theme, status, alpha = 0.85) {
  return theme.c(STATUS_TOKENS[status] || 'muted', status === 'Withdrawn' ? 0.4 : alpha);
}

/** Apply theme defaults to Chart.js. Returns false when Chart.js failed to load. */
export function setupCharts() {
  const C = window.Chart;
  if (!C) return false;
  const t = chartTheme();
  C.defaults.color = t.muted;
  C.defaults.borderColor = t.grid;
  C.defaults.font.family = 'Inter, ui-sans-serif, system-ui, sans-serif';
  C.defaults.font.size = 12;
  C.defaults.maintainAspectRatio = false;
  C.defaults.animation = prefersReducedMotion() ? false : { duration: 900, easing: 'easeOutQuart' };
  C.defaults.plugins.legend.labels.usePointStyle = true;
  C.defaults.plugins.legend.labels.boxWidth = 8;
  C.defaults.plugins.legend.labels.boxHeight = 8;
  C.defaults.plugins.legend.labels.padding = 14;
  Object.assign(C.defaults.plugins.tooltip, {
    backgroundColor: t.surface, titleColor: t.text, bodyColor: t.muted, borderColor: t.grid, borderWidth: 1,
    padding: 10, cornerRadius: 10, boxPadding: 4, usePointStyle: true,
  });
  return true;
}

/** Markup shown in a chart card when Chart.js is unavailable. */
export const chartUnavailable = () => errorState({ title: 'Charts unavailable', message: 'Chart.js could not be loaded. Check your internet connection and reload.', retry: false });
