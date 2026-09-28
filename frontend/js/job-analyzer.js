/** Job analyzer: description → structured requirements, quick match and saved jobs. */
import {
  bootPage, $, html, setHTML, icon, toast, showFieldErrors, setLoading, ringSvg, animateIn, wait, relativeTime,
  confirmDialog, emptyState, prefersReducedMotion, pluralize,
} from './app.js';
import { api, ValidationError } from './api.js';
import { analyzeJob, computeSkillGap, skillStatus } from './ai-sim.js';
import { SAMPLE_JOBS } from './data.js';

let skills = [];
let jobs = [];
let activeId = null;
let current = null; // { title, company, description, analysis, savedId }

bootPage('job-analyzer', async () => {
  const snap = await api.getSnapshot();
  skills = snap.skills;
  jobs = snap.savedJobs;
  activeId = snap.activeJob?.id || null;
  initForm();
  renderSaved();
  bindSavedActions();
});

function initForm() {
  const form = $('#job-form');
  const desc = $('#description');
  const count = () => { $('#desc-count').textContent = desc.value.trim().length; };
  desc.addEventListener('input', count);

  const sel = $('#sample-select');
  setHTML(sel, html`<option value="">Load a sample…</option>${SAMPLE_JOBS.map((j, i) => html`<option value="${i}">${j.title} · ${j.company}</option>`)}`);
  sel.addEventListener('change', () => {
    const j = SAMPLE_JOBS[Number(sel.value)];
    if (!j) return;
    form.title.value = j.title;
    form.company.value = j.company;
    desc.value = j.description;
    count();
    showFieldErrors(form, {});
    sel.value = '';
    toast('Sample job loaded. Select "Analyze job" to continue.', { type: 'info' });
  });

  form.addEventListener('reset', () => {
    setTimeout(count, 0);
    showFieldErrors(form, {});
    $('#results').hidden = true;
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = form.title.value.trim();
    const company = form.company.value.trim();
    const description = desc.value.trim();
    const errors = {};
    if (!title) errors.title = 'Enter the job title.';
    if (!description) errors.description = 'Paste the job description.';
    else if (description.length < 80) errors.description = `The description is too short (${description.length}/80 characters).`;
    if (Object.keys(errors).length) {
      showFieldErrors(form, errors);
      return;
    }
    showFieldErrors(form, {});
    const btn = $('#analyze-btn');
    setLoading(btn, true);
    showResultsSkeleton();
    await wait(900);
    current = { title, company, description, analysis: analyzeJob({ title, company, description }), savedId: null };
    setLoading(btn, false);
    renderResults();
  });
}

function showResultsSkeleton() {
  const box = $('#results');
  box.hidden = false;
  setHTML(box, html`<div class="grid gap-4 lg:grid-cols-3" aria-busy="true" aria-label="Analyzing job description">
    <div class="skeleton skeleton-card h-56"></div><div class="skeleton skeleton-card h-56 lg:col-span-2"></div>
    <div class="skeleton skeleton-card h-40"></div><div class="skeleton skeleton-card h-40"></div><div class="skeleton skeleton-card h-40"></div></div>`);
  box.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
}

function skillChip(name) {
  const u = skills.find((s) => s.name.toLowerCase() === name.toLowerCase());
  const st = skillStatus(u ? u.level : null);
  const label = { strong: 'strong', partial: 'partial', missing: 'missing' }[st];
  return html`<span class="chip chip-${st}" title="Your level: ${u ? `${u.level}%` : 'not in profile'}">${name}<span class="sr-only">(${label} for you)</span></span>`;
}

function renderResults() {
  const a = current.analysis;
  const gap = computeSkillGap(skills, a);
  const box = $('#results');
  const saved = !!current.savedId;
  const list = (items, empty) => (items.length ? html`<div class="chip-list">${items}</div>` : html`<p class="text-sm text-muted">${empty}</p>`);

  setHTML(box, html`<div class="grid gap-4 lg:grid-cols-3 stagger">
    <section class="card card-pad" aria-labelledby="match-title">
      <div class="flex items-start justify-between gap-2">
        <div><h2 class="card-title" id="match-title">Quick match</h2><p class="card-subtitle">Compared with your profile skills</p></div>
        <span class="badge badge-brand">${icon('sparkles')}Simulated</span>
      </div>
      <div class="my-5 flex justify-center">${ringSvg(gap.compatibility ?? 0, { label: 'compatibility', size: 150, ariaLabel: `Prototype compatibility ${gap.compatibility ?? 0}%` })}</div>
      <div class="grid grid-cols-3 gap-2 text-center text-sm">
        <div class="rounded-xl bg-surface-2 p-2"><p class="text-lg font-bold text-success tabular">${gap.counts.strong}</p><p class="text-xs text-muted">Strong</p></div>
        <div class="rounded-xl bg-surface-2 p-2"><p class="text-lg font-bold text-warning tabular">${gap.counts.partial}</p><p class="text-xs text-muted">Partial</p></div>
        <div class="rounded-xl bg-surface-2 p-2"><p class="text-lg font-bold text-danger tabular">${gap.counts.missing}</p><p class="text-xs text-muted">Missing</p></div>
      </div>
      <p class="hint mt-3">Prototype compatibility score. Not a hiring probability.</p>
      <div class="mt-4 grid gap-2">
        <button type="button" class="btn btn-primary" id="save-job" ${saved ? 'disabled' : ''}>${icon(saved ? 'check' : 'bookmark-plus')}${saved ? 'Saved' : 'Save job & set as target'}</button>
        <a class="btn btn-secondary" id="view-gap" href="skill-gap.html" ${saved ? '' : 'hidden'}>${icon('target')}View full skill gap</a>
      </div>
    </section>

    <section class="card card-pad lg:col-span-2" aria-labelledby="overview-title">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="min-w-0">
          <h2 class="text-xl font-bold tracking-tight" id="overview-title">${a.title}</h2>
          <p class="text-muted">${a.company || 'Company not specified'}</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <span class="badge badge-violet">${icon('signal')}${a.seniority}</span>
          ${a.experience ? html`<span class="badge badge-accent">${icon('clock')}${a.experience.label}</span>` : ''}
          ${a.role ? html`<span class="badge badge-brand">${icon('user-round')}${a.role}</span>` : ''}
        </div>
      </div>
      <div class="mt-5 grid gap-5 md:grid-cols-2">
        <div><h3 class="mb-2 text-sm font-semibold">Required skills <span class="text-muted">(${a.requiredSkills.length})</span></h3>
          ${list(a.requiredSkills.map((s) => skillChip(s.name)), 'No required skills detected.')}</div>
        <div><h3 class="mb-2 text-sm font-semibold">Preferred skills <span class="text-muted">(${a.preferredSkills.length})</span></h3>
          ${list(a.preferredSkills.map((s) => skillChip(s.name)), 'No preferred skills detected.')}</div>
      </div>
      <p class="hint mt-4">Chip colours show your level: 🟢 strong · 🟡 partial · 🔴 missing.</p>
    </section>

    <section class="card card-pad" aria-labelledby="tech-title">
      <h2 class="card-title mb-3" id="tech-title">Technologies</h2>
      ${list(a.technologies.map((t) => html`<span class="chip">${t}</span>`), 'No technologies detected.')}
      <h3 class="mb-2 mt-5 text-sm font-semibold">Soft skills</h3>
      ${list(a.softSkills.map((t) => html`<span class="chip">${t}</span>`), 'No soft skills detected.')}
    </section>

    <section class="card card-pad" aria-labelledby="resp-title">
      <h2 class="card-title mb-3" id="resp-title">Responsibilities</h2>
      ${a.responsibilities.length
        ? html`<ul class="bullets">${a.responsibilities.map((r) => html`<li>${icon('chevron-right', 'text-brand')}<span>${r}</span></li>`)}</ul>`
        : html`<p class="text-sm text-muted">No bullet-point responsibilities found. Headings like "Responsibilities" help detection.</p>`}
    </section>

    <section class="card card-pad" aria-labelledby="kw-title">
      <h2 class="card-title mb-3" id="kw-title">Keywords</h2>
      <div class="flex flex-wrap gap-2">${a.keywords.map((k) => html`<span class="keyword">${k.term}<b>${k.count}</b></span>`)}</div>
      <p class="hint mt-4">${a.stats.wordCount} words analyzed.</p>
    </section>
  </div>`);
  box.hidden = false;
  animateIn(box);
  box.focus({ preventScroll: true });

  $('#save-job').addEventListener('click', saveCurrent);
}

async function saveCurrent(e) {
  const btn = e.currentTarget;
  setLoading(btn, true);
  try {
    const rec = await api.saveJob(current);
    current.savedId = rec.id;
    jobs = [rec, ...jobs];
    activeId = rec.id;
    renderSaved();
    renderResults();
    toast(`"${rec.title}" saved and set as your target job`);
  } catch (err) {
    if (err instanceof ValidationError) showFieldErrors($('#job-form'), err.fields);
    toast(err.message, { type: 'error' });
    setLoading(btn, false);
  }
}

function renderSaved() {
  $('#saved-count').textContent = jobs.length;
  const box = $('#saved-jobs');
  if (!jobs.length) {
    setHTML(box, emptyState({ icon: 'bookmark', title: 'No saved jobs', message: 'Analyze a job description and save it to track your fit.', compact: true }));
    return;
  }
  setHTML(box, html`<ul>${jobs.map((j) => {
    const gap = computeSkillGap(skills, j.analysis);
    const active = j.id === activeId;
    return html`<li class="list-row items-start">
      <span class="list-icon">${icon('briefcase')}</span>
      <div class="min-w-0 flex-1">
        <p class="truncate text-sm font-semibold">${j.title}</p>
        <p class="truncate text-xs text-muted">${j.company || '—'} · ${relativeTime(j.createdAt)}</p>
        <div class="mt-2 flex flex-wrap items-center gap-1.5">
          <span class="badge badge-brand tabular">${gap.compatibility ?? 0}% match</span>
          ${active ? html`<span class="badge badge-success">${icon('crosshair')}Active target</span>` : ''}
          ${j.demo ? html`<span class="badge badge-outline">demo</span>` : ''}
        </div>
        <div class="mt-2 flex flex-wrap gap-1">
          <button type="button" class="btn btn-ghost btn-sm" data-view="${j.id}">${icon('eye')}View</button>
          ${active ? '' : html`<button type="button" class="btn btn-ghost btn-sm" data-activate="${j.id}">${icon('crosshair')}Set active</button>`}
          <button type="button" class="btn btn-ghost btn-sm" data-delete="${j.id}" aria-label="Delete ${j.title}">${icon('trash-2')}</button>
        </div>
      </div>
    </li>`;
  })}</ul>`);
}

function bindSavedActions() {
  $('#saved-jobs').addEventListener('click', async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    const id = b.dataset.view || b.dataset.activate || b.dataset.delete;
    const job = jobs.find((j) => j.id === id);
    if (!job) return;
    if (b.dataset.view) {
      current = { ...job, savedId: job.id };
      renderResults();
      $('#results').scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
    } else if (b.dataset.activate) {
      await api.setActiveJob(id);
      activeId = id;
      renderSaved();
      toast(`${job.title} is now your target job`);
    } else if (b.dataset.delete) {
      const ok = await confirmDialog({ title: 'Delete saved job?', message: `"${job.title}" and its analysis will be removed. Your roadmap is kept.`, confirmLabel: 'Delete', danger: true });
      if (!ok) return;
      await api.deleteJob(id);
      jobs = jobs.filter((j) => j.id !== id);
      if (activeId === id) activeId = jobs[0]?.id || null;
      if (current?.savedId === id) $('#results').hidden = true;
      renderSaved();
      toast(`Deleted. ${pluralize(jobs.length, 'saved job')} left.`);
    }
  });
}
