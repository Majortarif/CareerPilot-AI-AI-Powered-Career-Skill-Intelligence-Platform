/** CV analyzer: PDF metadata or pasted text → simulated analysis. Nothing is uploaded. */
import {
  bootPage, $, $$, html, setHTML, icon, toast, ringSvg, animateIn, wait, fmtDate, pluralize, setLoading, refreshShell, prefersReducedMotion,
} from './app.js';
import { api } from './api.js';
import { analyzeCV } from './ai-sim.js';
import { SAMPLE_CV_TEXT, SKILL_CATEGORIES } from './data.js';

const MAX_BYTES = 10 * 1024 * 1024;
let selectedFile = null;
let mode = 'upload';
let lastResult = null;

bootPage('cv-analyzer', async () => {
  const profile = await api.getProfile();
  if (profile.lastCv) {
    $('#last-cv').textContent = `Last analysis: ${fmtDate(profile.lastCv.analyzedAt)} · score ${profile.lastCv.score}/100`;
  }
  initTabs();
  initDropzone();
  initPaste();
  $('#analyze-btn').addEventListener('click', () => run());
  $('#try-sample').addEventListener('click', () => run({ sample: true }));
});

/* ---------- Input ---------- */

function initTabs() {
  const tabs = $$('[role="tab"]');
  const select = (tab, focus = true) => {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      $(`#${t.getAttribute('aria-controls')}`).hidden = !on;
    });
    mode = tab.id === 'tab-paste' ? 'paste' : 'upload';
    if (focus) tab.focus();
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(t));
    t.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        select(tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length]);
      }
    });
  });
}

const formatBytes = (b) => (b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`);

function validateFile(file) {
  if (!file) return 'No file selected.';
  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
  if (!isPdf) return `"${file.name}" is not a PDF. Please choose a .pdf file.`;
  if (file.size === 0) return 'This file is empty.';
  if (file.size > MAX_BYTES) return `This file is ${formatBytes(file.size)}. The limit is 10 MB.`;
  return null;
}

function setFileError(msg) {
  const zone = $('#dropzone');
  $('#file-error').textContent = msg || '';
  zone.classList.remove('is-invalid');
  if (msg) {
    void zone.offsetWidth; // restart the shake animation
    zone.classList.add('is-invalid');
  }
}

function selectFile(file) {
  const err = validateFile(file);
  if (err) {
    selectedFile = null;
    setFileError(err);
    renderFileCard();
    toast(err, { type: 'error' });
    return;
  }
  setFileError('');
  selectedFile = file;
  renderFileCard();
}

function renderFileCard() {
  const card = $('#file-card');
  card.hidden = !selectedFile;
  if (!selectedFile) return;
  setHTML(card, html`<div class="flex items-center gap-3 rounded-2xl border border-line bg-surface-2/60 p-3 fade-in">
    <span class="list-icon">${icon('file-text')}</span>
    <div class="min-w-0 flex-1"><p class="truncate text-sm font-semibold">${selectedFile.name}</p><p class="text-xs text-muted">${formatBytes(selectedFile.size)} · PDF · metadata only</p></div>
    <button type="button" class="icon-btn icon-btn-sm" id="remove-file" aria-label="Remove ${selectedFile.name}">${icon('x')}</button>
  </div>`);
  $('#remove-file').addEventListener('click', () => {
    selectedFile = null;
    $('#cv-file').value = '';
    renderFileCard();
    $('#cv-file').focus();
  });
}

function initDropzone() {
  const zone = $('#dropzone');
  const input = $('#cv-file');
  input.addEventListener('change', () => selectFile(input.files[0]));
  ['dragenter', 'dragover'].forEach((ev) => zone.addEventListener(ev, (e) => { e.preventDefault(); zone.classList.add('is-dragover'); }));
  ['dragleave', 'dragend'].forEach((ev) => zone.addEventListener(ev, () => zone.classList.remove('is-dragover')));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('is-dragover');
    const files = e.dataTransfer?.files;
    if (files?.length > 1) toast('Only the first file will be used.', { type: 'info' });
    selectFile(files?.[0]);
  });
  // Prevent the browser from opening files dropped outside the zone
  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('drop', (e) => e.preventDefault());
}

function initPaste() {
  const ta = $('#cv-text');
  const count = () => { $('#cv-text-count').textContent = (ta.value.match(/\S+/g) || []).length; };
  ta.addEventListener('input', () => { count(); $('#err-cv-text').textContent = ''; ta.removeAttribute('aria-invalid'); });
  $('#use-sample-text').addEventListener('click', () => { ta.value = SAMPLE_CV_TEXT; count(); ta.focus(); });
}

/* ---------- Analysis ---------- */

async function run({ sample = false } = {}) {
  let input;
  if (sample) {
    input = { text: SAMPLE_CV_TEXT };
  } else if (mode === 'paste') {
    const text = $('#cv-text').value.trim();
    if ((text.match(/\S+/g) || []).length < 30) {
      $('#err-cv-text').textContent = 'Paste at least 30 words of CV text, or insert the sample.';
      $('#cv-text').setAttribute('aria-invalid', 'true');
      $('#cv-text').focus();
      return;
    }
    input = { text };
  } else {
    if (!selectedFile) {
      setFileError('Choose a PDF first, or try the sample CV.');
      $('#cv-file').focus();
      return;
    }
    input = { fileMeta: { name: selectedFile.name, size: selectedFile.size, type: selectedFile.type } };
  }

  const profile = await api.getProfile();
  input.targetRole = profile.targetRole;
  const btn = $('#analyze-btn');
  setLoading(btn, true);
  $('#results').hidden = true;
  await showProcessing(input.fileMeta ? 'file' : 'text');
  try {
    lastResult = analyzeCV(input);
    const label = input.fileMeta ? input.fileMeta.name : sample ? 'Sample CV' : 'Pasted text';
    await api.saveCvSummary({ label, source: lastResult.source, score: lastResult.score, skillCount: lastResult.skills.length, suggestions: lastResult.suggestions.slice(0, 3) });
    $('#last-cv').textContent = `Last analysis: just now · score ${lastResult.score}/100`;
    await renderResults(lastResult, label);
    refreshShell();
  } catch (err) {
    console.error(err);
    toast(err.message || 'Analysis failed.', { type: 'error' });
  } finally {
    $('#processing').hidden = true;
    setLoading(btn, false);
  }
}

async function showProcessing(kind) {
  const steps = [kind === 'file' ? 'Reading file metadata' : 'Reading your text', 'Detecting CV sections', 'Extracting skills', 'Scoring structure & impact', 'Generating suggestions'];
  const panel = $('#processing');
  setHTML($('#scan-steps'), html`${steps.map((s) => html`<li class="scan-step"><span class="step-dot">${icon('check')}</span>${s}</li>`)}`);
  panel.hidden = false;
  panel.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'center' });
  const items = $$('.scan-step', panel);
  for (const li of items) {
    li.classList.add('is-active');
    await wait(430);
    li.classList.remove('is-active');
    li.classList.add('is-done');
  }
  await wait(200);
}

const SOURCE_NOTE = {
  text: 'Analyzed the text you provided.',
  file: 'PDF contents were not read. The prototype analyzed the built-in sample CV profile.',
  sample: 'Analyzed the built-in sample CV profile.',
};

async function renderResults(r, label) {
  const box = $('#results');
  const skills = await api.getSkills();
  const have = new Set(skills.map((s) => s.name.toLowerCase()));
  const newSkills = r.skills.filter((s) => !have.has(s.name.toLowerCase()));
  const categories = SKILL_CATEGORIES.filter((c) => r.skillsByCategory[c]);
  const stat = (value, labelText) => html`<div class="rounded-xl bg-surface-2 p-3"><p class="text-xl font-bold tabular" data-count="${value}">0</p><p class="text-xs text-muted">${labelText}</p></div>`;

  setHTML(box, html`
    <div class="grid gap-4 xl:grid-cols-3 stagger">
      <section class="card card-pad xl:row-span-2" aria-labelledby="results-title">
        <div class="flex items-start justify-between gap-2">
          <div><h2 class="card-title" id="results-title">CV score</h2><p class="card-subtitle">${label}</p></div>
          <span class="badge badge-brand">${icon('sparkles')}Simulated</span>
        </div>
        <div class="my-5 flex justify-center">${ringSvg(r.score, { label: 'CV score', ariaLabel: `Prototype CV score ${r.score} out of 100` })}</div>
        <div class="grid grid-cols-2 gap-2">
          ${stat(r.stats.skillCount, 'skills found')}
          ${stat(r.stats.wordCount, 'words')}
          ${stat(r.stats.quantified, 'quantified results')}
          ${stat(r.stats.actionVerbs, 'action verbs')}
        </div>
        <div class="notice mt-4 ${r.source === 'file' ? 'notice-warning' : ''}">${icon(r.source === 'file' ? 'info' : 'circle-check')}<p>${SOURCE_NOTE[r.source]}</p></div>
        <div class="mt-4 grid gap-2">
          <button type="button" class="btn btn-primary" id="add-skills" ${newSkills.length ? '' : 'disabled'}>${icon('list-plus')}${newSkills.length ? `Add ${pluralize(newSkills.length, 'new skill')} to profile` : 'All skills already in profile'}</button>
          <button type="button" class="btn btn-secondary" id="analyze-again">${icon('rotate-ccw')}Analyze another CV</button>
        </div>
        <p class="hint mt-3">Prototype score based on sections, skills, links and measurable results. Not an ATS or recruiter rating.</p>
      </section>

      <section class="card card-pad xl:col-span-2" aria-labelledby="skills-title">
        <div class="card-header"><div><h2 class="card-title" id="skills-title">Detected skills</h2><p class="card-subtitle">${pluralize(r.skills.length, 'skill')} across ${pluralize(categories.length, 'category', 'categories')} · dictionary match</p></div></div>
        ${r.skills.length
          ? html`<div class="grid gap-4 sm:grid-cols-2">${categories.map((c) => html`<div><p class="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">${c}</p>
              <div class="chip-list">${r.skills.filter((s) => s.category === c).map((s) => html`<span class="chip ${have.has(s.name.toLowerCase()) ? '' : 'chip-brand'}">${s.name}${s.count > 1 ? html`<small>×${s.count}</small>` : ''}</span>`)}</div></div>`)}</div>
            ${newSkills.length ? html`<p class="hint mt-4">Highlighted skills are not in your profile yet.</p>` : ''}`
          : html`<p class="text-sm text-muted">No dictionary skills were detected. Try adding a dedicated Skills section.</p>`}
      </section>

      <section class="card card-pad" aria-labelledby="strengths-title">
        <h2 class="card-title mb-4" id="strengths-title">Strengths</h2>
        <ul class="bullets">${r.strengths.map((s) => html`<li>${icon('circle-check', 'text-success')}<span>${s}</span></li>`)}</ul>
      </section>

      <section class="card card-pad" aria-labelledby="suggestions-title">
        <h2 class="card-title mb-4" id="suggestions-title">Suggestions</h2>
        <ul class="bullets">${r.suggestions.map((s) => html`<li>${icon('lightbulb', 'text-warning')}<span>${s}</span></li>`)}</ul>
      </section>

      <section class="card card-pad" aria-labelledby="missing-title">
        <h2 class="card-title mb-4" id="missing-title">Missing information</h2>
        ${r.missingInfo.length
          ? html`<ul class="bullets">${r.missingInfo.map((m) => html`<li>${icon('circle-alert', 'text-danger')}<span>${m}</span></li>`)}</ul>`
          : html`<p class="text-sm text-muted">All common sections were found.</p>`}
      </section>

      <section class="card card-pad xl:col-span-2" aria-labelledby="keywords-title">
        <h2 class="card-title mb-4" id="keywords-title">Top keywords</h2>
        <div class="flex flex-wrap gap-2">${r.keywords.map((k) => html`<span class="keyword">${k.term}<b>${k.count}</b></span>`)}</div>
      </section>
    </div>`);
  box.hidden = false;
  animateIn(box);
  box.focus({ preventScroll: true });
  box.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });

  $('#analyze-again').addEventListener('click', () => {
    box.hidden = true;
    $('#input-panel').scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    $(mode === 'paste' ? '#cv-text' : '#cv-file').focus({ preventScroll: true });
  });
  $('#add-skills').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const level = (s) => (s.category === 'Soft skills' ? 60 : Math.min(70, 40 + s.count * 10));
    try {
      const res = await api.addSkills(newSkills.map((s) => ({ name: s.name, category: s.category, level: level(s) })));
      btn.disabled = true;
      setHTML(btn, html`${icon('check')}Added to profile`);
      toast(`${pluralize(res.added, 'skill')} added. Levels are estimates; adjust them in your profile.`, { type: 'success', duration: 5000 });
    } catch (err) {
      toast(err.message, { type: 'error' });
    }
  });
}
