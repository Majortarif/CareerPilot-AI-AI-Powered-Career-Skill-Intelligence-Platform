/** Skill gap: strong / partial / missing table, compatibility ring and roadmap generation. */
import {
  bootPage, $, $$, html, raw, setHTML, icon, toast, ringSvg, animateIn, emptyState, openModal, confirmDialog, setLoading,
} from './app.js';
import { api } from './api.js';
import { computeSkillGap, buildRoadmap, GAP_THRESHOLDS } from './ai-sim.js';

const STATUS = {
  strong: { emoji: '🟢', label: 'Strong', badge: 'badge-success', bar: 'is-strong', order: 2 },
  partial: { emoji: '🟡', label: 'Partial', badge: 'badge-warning', bar: 'is-partial', order: 1 },
  missing: { emoji: '🔴', label: 'Missing', badge: 'badge-danger', bar: 'is-missing', order: 0 },
};

let snap;
let job = null;
let gap = null;
let filter = 'all';
let sort = 'priority';

bootPage('skill-gap', async () => {
  snap = await api.getSnapshot();
  const body = $('[data-page-body]');
  if (!snap.savedJobs.length) {
    setHTML(body, html`<div class="card">${emptyState({
      icon: 'target', title: 'No target job yet',
      message: 'Analyze and save a job description first. CareerPilot AI will compare it with the skills in your profile.',
      action: { href: 'job-analyzer.html', label: 'Analyze a job', icon: 'briefcase' },
    })}</div>`);
    return;
  }
  job = snap.activeJob;
  const sel = $('#job-select');
  setHTML(sel, html`${snap.savedJobs.map((j) => html`<option value="${j.id}"${j.id === job.id ? raw(' selected') : ''}>${j.title}${j.company ? ` · ${j.company}` : ''}</option>`)}`);
  $('#job-picker').hidden = false;
  sel.addEventListener('change', async () => {
    job = snap.savedJobs.find((j) => j.id === sel.value);
    await api.setActiveJob(job.id);
    render();
    toast(`Now comparing with ${job.title}`, { type: 'info' });
  });
  render();
});

function render() {
  gap = computeSkillGap(snap.skills, job.analysis);
  const body = $('[data-page-body]');
  setHTML(body, html`
    <div class="grid gap-4 xl:grid-cols-3">
      <section class="card card-pad" aria-labelledby="score-title">
        <div class="flex items-start justify-between gap-2">
          <div><h2 class="card-title" id="score-title">Compatibility</h2><p class="card-subtitle">${job.title}${job.company ? ` at ${job.company}` : ''}</p></div>
          <span class="badge badge-brand">${icon('sparkles')}Simulated</span>
        </div>
        <div class="my-6 flex justify-center">${ringSvg(gap.compatibility ?? 0, { size: 180, stroke: 14, label: 'compatibility', ariaLabel: `Prototype compatibility ${gap.compatibility ?? 0}%` })}</div>
        <div class="grid grid-cols-3 gap-2 text-center">
          ${['strong', 'partial', 'missing'].map((k) => html`<div class="rounded-xl bg-surface-2 p-3">
            <p class="text-xl font-bold tabular" data-count="${gap.counts[k]}">0</p><p class="text-xs text-muted">${STATUS[k].emoji} ${STATUS[k].label}</p></div>`)}
        </div>
        <div class="notice mt-4">${icon('info')}<p><strong>Prototype compatibility score. Not a hiring probability.</strong></p></div>
        <details class="mt-4 rounded-xl border border-line p-3 text-sm">
          <summary class="cursor-pointer font-semibold">How is this calculated?</summary>
          <div class="mt-3 grid gap-2 text-muted">
            <p>🟢 Strong: level ≥ ${GAP_THRESHOLDS.strong} · 🟡 Partial: ${GAP_THRESHOLDS.partial}–${GAP_THRESHOLDS.strong - 1} · 🔴 Missing: below ${GAP_THRESHOLDS.partial} or not in your profile.</p>
            <p>Each skill scores Strong = 1, Partial = 0.5, Missing = 0.</p>
            <p><code class="rounded bg-surface-2 px-1.5 py-0.5 text-ink">(0.7 × required + 0.3 × preferred) × 100</code></p>
            <p>Required: <strong class="text-ink">${pct(gap.requiredScore)}</strong> · Preferred: <strong class="text-ink">${pct(gap.preferredScore)}</strong></p>
          </div>
        </details>
        <div class="mt-5 border-t border-line pt-5">
          <label class="label" for="weeks">Roadmap length</label>
          <div class="mt-2 flex gap-2">
            <select class="select" id="weeks">${[8, 12, 16].map((w) => html`<option value="${w}"${w === 12 ? raw(' selected') : ''}>${w} weeks</option>`)}</select>
            <button type="button" class="btn btn-primary shrink-0" id="generate">${icon('map')}Generate roadmap</button>
          </div>
          <p class="hint mt-2">Missing and partial skills are ordered by importance and spread across the weeks.</p>
        </div>
      </section>

      <section class="card xl:col-span-2" aria-labelledby="table-title">
        <div class="flex flex-wrap items-center justify-between gap-3 p-5 pb-4 sm:px-6">
          <div><h2 class="card-title" id="table-title">Skill breakdown</h2><p class="card-subtitle">${gap.total} skills from the job description</p></div>
          <div class="flex flex-wrap gap-2">
            <div class="segmented" role="group" aria-label="Filter by status">
              ${[['all', 'All'], ['missing', '🔴 Missing'], ['partial', '🟡 Partial'], ['strong', '🟢 Strong']].map(([k, l]) => html`<button type="button" data-filter="${k}" aria-pressed="${filter === k}">${l}</button>`)}
            </div>
            <label for="sort" class="sr-only">Sort skills</label>
            <select class="select" id="sort" style="min-height:44px;width:auto">
              ${[['priority', 'Sort: priority'], ['status', 'Sort: status'], ['level', 'Sort: your level']].map(([k, l]) => html`<option value="${k}"${sort === k ? raw(' selected') : ''}>${l}</option>`)}
            </select>
          </div>
        </div>
        <div id="gap-table"></div>
      </section>
    </div>`);
  renderTable();
  animateIn(body);

  $$('[data-filter]').forEach((b) => b.addEventListener('click', () => {
    filter = b.dataset.filter;
    $$('[data-filter]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    renderTable();
  }));
  $('#sort').addEventListener('change', (e) => { sort = e.target.value; renderTable(); });
  $('#generate').addEventListener('click', generate);
  $('#gap-table').addEventListener('click', (e) => {
    const b = e.target.closest('[data-adjust]');
    if (b) adjustSkill(b.dataset.adjust);
  });
}

const pct = (v) => (v === null ? 'n/a' : `${Math.round(v * 100)}%`);

function renderTable() {
  let items = gap.items.filter((i) => filter === 'all' || i.status === filter);
  if (sort === 'status') items = [...items].sort((a, b) => STATUS[a.status].order - STATUS[b.status].order || a.skill.localeCompare(b.skill));
  if (sort === 'level') items = [...items].sort((a, b) => (b.userLevel ?? -1) - (a.userLevel ?? -1));
  const box = $('#gap-table');
  if (!gap.items.length) {
    setHTML(box, emptyState({ icon: 'search-x', title: 'No skills detected', message: 'This job description did not match any dictionary skills. Try a more detailed description.', compact: true }));
    return;
  }
  if (!items.length) {
    setHTML(box, emptyState({ icon: 'filter-x', title: `No ${filter} skills`, message: 'Choose another filter.', compact: true }));
    return;
  }
  setHTML(box, html`<div class="table-wrap"><table class="table table-stack">
    <caption class="sr-only">Skills required by ${job.title} compared with your levels</caption>
    <thead><tr><th scope="col">Skill</th><th scope="col">Priority</th><th scope="col">Your level</th><th scope="col">Status</th><th scope="col"><span class="sr-only">Actions</span></th></tr></thead>
    <tbody>${items.map((i) => {
      const s = STATUS[i.status];
      return html`<tr>
        <td class="td-main"><p class="font-semibold">${i.skill}</p><p class="text-xs text-muted">${i.category}</p></td>
        <td data-label="Priority"><span class="badge ${i.type === 'required' ? 'badge-brand' : 'badge-outline'}">${i.type === 'required' ? 'Required' : 'Preferred'}</span></td>
        <td data-label="Your level">
          <div class="flex items-center gap-3 sm:min-w-[160px]">
            <div class="progress progress-sm w-28 sm:flex-1"><div class="progress-bar ${s.bar}" data-value="${i.userLevel ?? 0}"></div></div>
            <span class="w-10 text-right text-sm tabular">${i.userLevel === null ? '—' : `${i.userLevel}%`}</span>
          </div>
        </td>
        <td data-label="Status"><span class="badge ${s.badge}">${s.emoji} ${s.label}</span></td>
        <td data-label="Action" class="text-right"><button type="button" class="btn btn-ghost btn-sm" data-adjust="${i.skill}">${icon(i.userLevel === null ? 'plus' : 'sliders-horizontal')}${i.userLevel === null ? 'Add' : 'Update'}</button></td>
      </tr>`;
    })}</tbody></table></div>`);
  animateIn(box);
}

function adjustSkill(name) {
  const existing = snap.skills.find((s) => s.name.toLowerCase() === name.toLowerCase());
  const item = gap.items.find((i) => i.skill === name);
  const start = existing ? existing.level : 30;
  const m = openModal({
    title: existing ? `Update ${name}` : `Add ${name}`,
    size: 'modal-sm',
    body: html`<form id="adjust-form" class="grid gap-3">
      <p class="text-sm text-muted">${existing ? 'Be honest. Your level drives every analysis.' : 'Add this skill to your profile if you already have some experience with it.'}</p>
      <label class="label" for="adjust-level">Your level: <output id="adjust-out" class="text-brand">${start}%</output></label>
      <input type="range" class="range" id="adjust-level" min="0" max="100" step="5" value="${start}" style="--pct:${start}%">
      <p class="hint">🟢 70+ strong · 🟡 30–69 partial · 🔴 below 30</p>
    </form>`,
    footer: html`<button type="button" class="btn btn-secondary" data-modal-close>Cancel</button><button type="submit" form="adjust-form" class="btn btn-primary">Save</button>`,
    initialFocus: '#adjust-level',
  });
  const range = $('#adjust-level', m.el);
  range.addEventListener('input', () => {
    range.style.setProperty('--pct', `${range.value}%`);
    $('#adjust-out', m.el).textContent = `${range.value}%`;
  });
  $('#adjust-form', m.el).addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const rec = await api.saveSkill({ ...(existing || {}), name, category: existing?.category || item.category, level: range.value });
      if (existing) Object.assign(existing, rec);
      else snap.skills.push(rec);
      m.close();
      render();
      // The opener was re-rendered: return focus to this skill's button, or to the table if it is filtered out
      const table = $('#gap-table');
      const target = $(`[data-adjust="${CSS.escape(name)}"]`) || table;
      if (target === table) table.tabIndex = -1;
      target.focus();
      toast(`${name} saved at ${rec.level}%`);
    } catch (err) {
      toast(err.message, { type: 'error' });
    }
  });
}

async function generate(e) {
  const btn = e.currentTarget;
  const weeks = Number($('#weeks').value);
  const items = buildRoadmap(gap.items, weeks);
  if (!items.length) {
    toast('No gaps to plan for: every listed skill is already strong.', { type: 'info' });
    return;
  }
  if (snap.roadmap?.items?.length) {
    const ok = await confirmDialog({
      title: 'Replace your current roadmap?',
      message: `Your existing roadmap${snap.roadmap.jobTitle ? ` for ${snap.roadmap.jobTitle}` : ''} and its progress will be replaced by a new ${weeks}-week plan.`,
      confirmLabel: 'Replace roadmap',
    });
    if (!ok) return;
  }
  setLoading(btn, true);
  try {
    await api.saveRoadmap({ job, weeks, items });
    toast(`${weeks}-week roadmap generated`);
    setTimeout(() => { location.href = 'roadmap.html'; }, 500);
  } catch (err) {
    toast(err.message, { type: 'error' });
    setLoading(btn, false);
  }
}
