/** Settings: theme, motion, demo data, export/import, reset and the simulation self-test. */
import {
  bootPage, $, $$, html, setHTML, icon, toast, confirmDialog, applyTheme, currentTheme, onThemeChange, applyMotion,
  refreshShell, setLoading, pluralize,
} from './app.js';
import { api } from './api.js';

bootPage('settings', async () => {
  initTheme();
  initMotion();
  initDemo();
  initData();
  $('#selftest-btn').addEventListener('click', runSelfTest);
  if (location.hash === '#data') $('#data').scrollIntoView();
});

/* ---------- Appearance ---------- */

function radioGroup(group, attr, value) {
  $$(`[${attr}]`, group).forEach((b) => {
    const on = b.getAttribute(attr) === value;
    b.setAttribute('aria-checked', String(on));
    b.setAttribute('aria-pressed', String(on));
    b.tabIndex = on ? 0 : -1;
  });
}

function bindRadioKeys(group, attr, onPick) {
  const buttons = $$(`[${attr}]`, group);
  buttons.forEach((b, i) => {
    b.addEventListener('click', () => onPick(b.getAttribute(attr)));
    b.addEventListener('keydown', (e) => {
      if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(e.key)) return;
      e.preventDefault();
      const next = buttons[(i + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : buttons.length - 1)) % buttons.length];
      onPick(next.getAttribute(attr));
      next.focus();
    });
  });
}

function initTheme() {
  const group = $('#theme-group');
  radioGroup(group, 'data-theme-value', currentTheme());
  bindRadioKeys(group, 'data-theme-value', (v) => { applyTheme(v); toast(`${v === 'dark' ? 'Dark' : 'Light'} theme applied`, { type: 'info', duration: 2000 }); });
  onThemeChange(() => radioGroup(group, 'data-theme-value', currentTheme()));
}

function initMotion() {
  const group = $('#motion-group');
  const hint = () => {
    const sys = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    $('#motion-hint').textContent = `Your system currently ${sys ? 'prefers reduced motion' : 'allows animations'}.`;
  };
  radioGroup(group, 'data-motion-value', api.getSettings().motion);
  hint();
  bindRadioKeys(group, 'data-motion-value', (v) => {
    api.saveSettings({ motion: v });
    applyMotion(v);
    radioGroup(group, 'data-motion-value', v);
  });
}

/* ---------- Demo data ---------- */

function renderDemoStatus() {
  const on = api.isDemoActive();
  $('#demo-toggle').checked = on;
  setHTML($('#demo-status'), on
    ? html`<span class="badge badge-warning">${icon('flask-conical')}Demo data is on</span> <span class="text-muted">Dashboard and analytics include sample records.</span>`
    : html`<span class="badge">${icon('circle-off')}Demo data is off</span> <span class="text-muted">Only your own records are shown.</span>`);
}

function initDemo() {
  renderDemoStatus();
  const toggle = $('#demo-toggle');
  toggle.addEventListener('change', async () => {
    const wantOn = toggle.checked;
    try {
      if (wantOn) {
        await api.loadDemoData();
        toast('Demo data loaded. Your own records were kept.');
      } else {
        const ok = await confirmDialog({ title: 'Remove demo data?', message: 'All sample records (labelled "demo") will be removed. Records you created stay.', confirmLabel: 'Remove demo data', danger: true });
        if (!ok) { toggle.checked = true; return; }
        await api.clearDemoData();
        toast('Demo data removed');
      }
    } catch (err) {
      toggle.checked = !wantOn;
      toast(err.message, { type: 'error' });
    }
    renderDemoStatus();
    renderUsage();
    refreshShell();
  });
}

/* ---------- Export / import / reset ---------- */

function renderUsage() {
  const kb = api.storageUsage() / 1024;
  $('#usage').textContent = `about ${kb < 1 ? '<1' : kb.toFixed(1)} KB used`;
}

function initData() {
  renderUsage();

  $('#export-btn').addEventListener('click', () => {
    const data = api.exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `careerpilot-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast(`Exported ${pluralize(Object.keys(data.data).length, 'data key')}`);
  });

  const input = $('#import-file');
  input.addEventListener('change', async () => {
    const file = input.files[0];
    const err = $('#import-error');
    err.textContent = '';
    if (!file) return;
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error('This file is larger than 5 MB.');
      let payload;
      try {
        payload = JSON.parse(await file.text());
      } catch {
        throw new Error('This file is not valid JSON.');
      }
      if (payload?.app !== 'careerpilot-ai') throw new Error('This file is not a CareerPilot AI export.');
      const ok = await confirmDialog({ title: 'Replace your data?', message: `All current CareerPilot data in this browser will be replaced with "${file.name}".`, confirmLabel: 'Import and replace' });
      if (!ok) return;
      const n = await api.importData(payload);
      toast(`Imported ${pluralize(n, 'data key')}. Reloading…`);
      setTimeout(() => location.reload(), 900);
    } catch (e) {
      err.textContent = e.message;
      toast(e.message, { type: 'error' });
    } finally {
      input.value = '';
    }
  });

  $('#reset-btn').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const ok = await confirmDialog({
      title: 'Reset all data?',
      message: 'This permanently deletes your profile, skills, saved jobs, applications, roadmap and chat history from this browser. Export a backup first if you might need it.',
      confirmLabel: 'Delete everything',
      danger: true,
    });
    if (!ok) return;
    setLoading(btn, true);
    await api.resetData();
    toast('All data was reset. Reloading…');
    setTimeout(() => location.reload(), 900);
  });
}

/* ---------- Self-test ---------- */

async function runSelfTest(e) {
  const btn = e.currentTarget;
  const box = $('#selftest-results');
  setLoading(btn, true);
  try {
    const { runAiSimTests } = await import('./ai-sim.test.js');
    const r = runAiSimTests({ log: true });
    setHTML(box, html`<div class="notice ${r.failed ? 'notice-warning' : 'notice-success'}">${icon(r.failed ? 'triangle-alert' : 'circle-check')}
      <p><strong>${r.passed}/${r.total} checks passed.</strong> <span class="text-muted">Details are also logged to the browser console.</span></p></div>
      <ul class="mt-3 grid gap-1.5 text-sm">${r.results.map((t) => html`<li class="flex items-start gap-2">${icon(t.pass ? 'check' : 'x', `mt-0.5 h-4 w-4 shrink-0 ${t.pass ? 'text-success' : 'text-danger'}`)}
        <span>${t.name}${t.detail ? html` <span class="text-danger">(${t.detail})</span>` : ''}</span></li>`)}</ul>`);
  } catch (err) {
    setHTML(box, html`<p class="field-error">${err.message}</p>`);
  } finally {
    setLoading(btn, false);
  }
}
