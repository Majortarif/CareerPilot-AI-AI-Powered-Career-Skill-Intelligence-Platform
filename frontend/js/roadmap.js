/** Learning roadmap: weekly plan, completion toggles and animated progress. */
import {
  bootPage, $, $$, html, setHTML, icon, toast, emptyState, animateIn, initReveal, confirmDialog, relativeTime, setLoading, pluralize,
} from './app.js';
import { api } from './api.js';
import { computeSkillGap, buildRoadmap, learningProgress } from './ai-sim.js';

let roadmap = null;
let view = 'all';

bootPage('roadmap', async () => {
  const snap = await api.getSnapshot();
  roadmap = snap.roadmap;
  if (!roadmap || !roadmap.items.length) {
    renderEmpty(snap);
    return;
  }
  $('#roadmap-actions').hidden = false;
  $('#reset-progress').addEventListener('click', resetProgress);
  render();
});

function renderEmpty(snap) {
  const body = $('[data-page-body]');
  if (!snap.activeJob) {
    setHTML(body, html`<div class="card">${emptyState({
      icon: 'map', title: 'No roadmap yet',
      message: 'Analyze a target job first. Your roadmap is built from the skills you are missing for that job.',
      action: { href: 'job-analyzer.html', label: 'Analyze a job', icon: 'briefcase' },
    })}</div>`);
    return;
  }
  setHTML(body, html`<div class="card">${emptyState({
    icon: 'map', title: 'No roadmap yet',
    message: `Generate a 12-week plan from your gaps for ${snap.activeJob.title}${snap.activeJob.company ? ` at ${snap.activeJob.company}` : ''}.`,
    action: { label: 'Generate 12-week roadmap', icon: 'sparkles' },
  })}</div>`);
  $('[data-state-action]', body).addEventListener('click', async (e) => {
    const items = buildRoadmap(computeSkillGap(snap.skills, snap.activeJob.analysis).items, 12);
    if (!items.length) {
      toast('No gaps to plan for: every listed skill is already strong.', { type: 'info' });
      return;
    }
    setLoading(e.currentTarget, true);
    roadmap = await api.saveRoadmap({ job: snap.activeJob, weeks: 12, items });
    $('#roadmap-actions').hidden = false;
    $('#reset-progress').addEventListener('click', resetProgress);
    render();
    toast('Roadmap generated');
  });
}

function render() {
  const p = learningProgress(roadmap);
  const weeks = [...new Set(roadmap.items.map((i) => i.week))].sort((a, b) => a - b);
  const currentWeek = roadmap.items.find((i) => !i.done)?.week ?? null;
  $('#roadmap-sub').textContent = `${roadmap.weeks}-week plan${roadmap.jobTitle ? ` for ${roadmap.jobTitle}` : ''}${roadmap.company ? ` at ${roadmap.company}` : ''} · generated ${relativeTime(roadmap.generatedAt)}${roadmap.demo ? ' · demo data' : ''}`;

  const stat = (label, value, id) => html`<div class="rounded-xl bg-surface-2 p-3"><p class="text-xl font-bold tabular" id="${id}">${value}</p><p class="text-xs text-muted">${label}</p></div>`;
  setHTML($('[data-page-body]'), html`
    <section class="card card-pad" aria-labelledby="progress-title">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div><h2 class="card-title" id="progress-title">Overall progress</h2><p class="card-subtitle">Weighted by planned hours · saved in this browser</p></div>
        <p class="text-3xl font-bold tracking-tight tabular"><span id="progress-pct" data-count="${p.percent}">0</span><span class="text-lg text-muted">%</span></p>
      </div>
      <div class="progress progress-lg mt-4" role="progressbar" aria-label="Roadmap progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${p.percent}" id="progress-track">
        <div class="progress-bar" id="progress-bar" data-value="${p.percent}"></div>
      </div>
      <div class="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        ${stat('Current week', currentWeek ? `Week ${currentWeek}` : 'Done 🎉', 'stat-week')}
        ${stat('Items completed', `${p.doneItems}/${p.totalItems}`, 'stat-items')}
        ${stat('Hours completed', `${p.doneHours}/${p.totalHours} h`, 'stat-hours')}
        ${stat('Weeks', weeks.length, 'stat-weeks')}
      </div>
    </section>

    <div class="mt-4 flex flex-wrap items-center justify-between gap-3">
      <h2 class="section-title">Weekly plan</h2>
      <div class="segmented" role="group" aria-label="Show items">
        ${[['all', 'All'], ['open', 'Remaining'], ['done', 'Completed']].map(([k, l]) => html`<button type="button" data-view="${k}" aria-pressed="${view === k}">${l}</button>`)}
      </div>
    </div>
    <p class="sr-only" id="roadmap-live" aria-live="polite"></p>
    <ol class="mt-3 grid gap-4" id="weeks">${weeks.map((w) => renderWeek(w, w === currentWeek))}</ol>`);

  applyView();
  animateIn();
  initReveal();

  $$('[data-view]').forEach((b) => b.addEventListener('click', () => {
    view = b.dataset.view;
    $$('[data-view]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    applyView();
  }));
  $('#weeks').addEventListener('change', onToggle);
}

function renderWeek(week, isCurrent) {
  const items = roadmap.items.filter((i) => i.week === week);
  const complete = items.every((i) => i.done);
  const hours = items.reduce((s, i) => s + i.hours, 0);
  return html`<li class="card card-pad week-card reveal${complete ? ' is-complete' : ''}" data-week="${week}">
    <div class="week-badge" aria-hidden="true"><span><small>Week</small>${week}</span></div>
    <div class="min-w-0">
      <div class="mb-3 flex flex-wrap items-center gap-2">
        <h3 class="font-semibold">Week ${week}</h3>
        <span class="badge">${icon('clock')}${hours} h</span>
        <span class="badge badge-brand" data-current="${week}" ${isCurrent ? '' : 'hidden'}>${icon('flag')}Current week</span>
        <span class="badge badge-success" data-week-done ${complete ? '' : 'hidden'}>${icon('circle-check')}Complete</span>
      </div>
      ${items.map((i) => html`<div class="roadmap-item${i.done ? ' is-done' : ''}" data-item="${i.id}">
        <input type="checkbox" class="check mt-0.5" id="chk-${i.id}" data-toggle="${i.id}" ${i.done ? 'checked' : ''} aria-describedby="obj-${i.id}">
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <label for="chk-${i.id}" class="roadmap-skill cursor-pointer font-semibold">${i.skill}</label>
            <span class="badge ${i.type === 'skill' ? 'badge-violet' : 'badge-accent'}">${i.phase}</span>
            ${i.gapStatus ? html`<span class="badge ${i.gapStatus === 'missing' ? 'badge-danger' : 'badge-warning'}">${i.gapStatus === 'missing' ? '🔴 Missing' : '🟡 Partial'}</span>` : ''}
            ${i.priority === 'preferred' ? html`<span class="badge badge-outline">Preferred</span>` : ''}
            <span class="text-xs text-muted">${i.hours} h</span>
          </div>
          <div class="roadmap-meta">
            <p id="obj-${i.id}"><b>Objective:</b> ${i.objective}</p>
            <p><b>Practice:</b> ${i.practice}</p>
            <p><b>Mini project:</b> ${i.miniProject}</p>
          </div>
        </div>
      </div>`)}
    </div>
  </li>`;
}

function applyView() {
  $$('[data-item]').forEach((el) => {
    const item = roadmap.items.find((i) => i.id === el.dataset.item);
    el.hidden = (view === 'open' && item.done) || (view === 'done' && !item.done);
  });
  $$('[data-week]').forEach((w) => { w.hidden = $$('[data-item]', w).every((el) => el.hidden); });
}

async function onToggle(e) {
  const cb = e.target.closest('[data-toggle]');
  if (!cb) return;
  const id = cb.dataset.toggle;
  const done = cb.checked;
  try {
    roadmap = await api.setRoadmapItemDone(id, done);
  } catch (err) {
    cb.checked = !done;
    toast(err.message, { type: 'error' });
    return;
  }
  const item = roadmap.items.find((i) => i.id === id);
  const row = cb.closest('[data-item]');
  row.classList.toggle('is-done', done);
  row.classList.remove('just-done');
  if (done) { void row.offsetWidth; row.classList.add('just-done'); }

  const weekEl = cb.closest('[data-week]');
  const weekItems = roadmap.items.filter((i) => i.week === item.week);
  const complete = weekItems.every((i) => i.done);
  const wasComplete = weekEl.classList.contains('is-complete');
  weekEl.classList.toggle('is-complete', complete);
  $('[data-week-done]', weekEl).hidden = !complete;
  if (complete && !wasComplete) toast(`Week ${item.week} complete! Keep the momentum going 🎉`);

  updateProgress();
  $('#roadmap-live').textContent = `${item.skill} marked as ${done ? 'done' : 'not done'}`;
  if (view !== 'all') setTimeout(applyView, 350);
}

function updateProgress() {
  const p = learningProgress(roadmap);
  $('#progress-bar').style.width = `${p.percent}%`;
  $('#progress-track').setAttribute('aria-valuenow', p.percent);
  $('#progress-pct').textContent = p.percent;
  $('#stat-items').textContent = `${p.doneItems}/${p.totalItems}`;
  $('#stat-hours').textContent = `${p.doneHours}/${p.totalHours} h`;
  const next = roadmap.items.find((i) => !i.done);
  $('#stat-week').textContent = next ? `Week ${next.week}` : 'Done 🎉';
  $$('[data-current]').forEach((b) => { b.hidden = Number(b.dataset.current) !== next?.week; });
  if (p.percent === 100) toast('Roadmap complete! Update your skill levels in your profile.', { type: 'success', duration: 6000 });
}

async function resetProgress() {
  const done = roadmap.items.filter((i) => i.done).length;
  if (!done) {
    toast('Nothing to reset yet.', { type: 'info' });
    return;
  }
  const ok = await confirmDialog({ title: 'Reset roadmap progress?', message: `${pluralize(done, 'completed item')} will be marked as not done.`, confirmLabel: 'Reset', danger: true });
  if (!ok) return;
  for (const i of roadmap.items.filter((x) => x.done)) roadmap = await api.setRoadmapItemDone(i.id, false);
  render();
  toast('Progress reset');
}
