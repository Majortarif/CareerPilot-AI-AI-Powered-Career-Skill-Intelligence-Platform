/** Project recommendations: curated ideas filtered and ranked by skill gaps and target role. */
import { bootPage, $, html, setHTML, icon, emptyState, openModal, debounce, pluralize } from './app.js';
import { api } from './api.js';
import { computeSkillGap, recommendProjects, findRole } from './ai-sim.js';
import { PROJECTS, PROJECT_CATEGORIES, PROJECT_DIFFICULTIES, PROJECT_OBJECTIVES } from './data.js';

const DIFF_BADGE = { Beginner: 'badge-success', Intermediate: 'badge-warning', Advanced: 'badge-danger' };
const MATCH_BADGE = { 'Top match': 'badge-brand', 'Good match': 'badge-accent', Explore: 'badge-outline' };

let targetRole = '';
let gapItems = [];
let results = [];

bootPage('projects', async () => {
  const snap = await api.getSnapshot();
  targetRole = snap.profile.targetRole || snap.activeJob?.title || '';
  gapItems = snap.activeJob ? computeSkillGap(snap.skills, snap.activeJob.analysis).items : [];
  const role = findRole(targetRole);
  const job = snap.activeJob;
  const sameRole = role && job && findRole(job.title)?.id === role.id;
  $('#projects-sub').textContent = job
    ? `Ranked by your skill gaps for ${job.title}${role ? (sameRole ? ', which matches your target role' : ` and your target role (${role.title})`) : ''}.`
    : `Ranked by your target role${role ? ` (${role.title})` : ''}. Analyze a job to rank by skill gaps too.`;
  initFilters();
  render();
});

function options(select, label, values) {
  setHTML(select, html`<option value="">${label}</option>${values.map((v) => html`<option>${v}</option>`)}`);
}

function initFilters() {
  const techs = [...new Set(PROJECTS.flatMap((p) => p.technologies))].sort((a, b) => a.localeCompare(b));
  options($('#f-category'), 'All categories', PROJECT_CATEGORIES);
  options($('#f-difficulty'), 'All levels', PROJECT_DIFFICULTIES);
  options($('#f-technology'), 'Any technology', techs);
  options($('#f-objective'), 'Any objective', PROJECT_OBJECTIVES);
  const form = $('#filters');
  form.addEventListener('change', render);
  $('#f-query').addEventListener('input', debounce(render, 150));
  form.addEventListener('submit', (e) => e.preventDefault());
  $('#reset-filters').addEventListener('click', () => { form.reset(); render(); });
  $('#project-grid').addEventListener('click', (e) => {
    const b = e.target.closest('[data-details]');
    if (b) showDetails(b.dataset.details);
  });
}

function currentFilters() {
  const f = Object.fromEntries(new FormData($('#filters')).entries());
  return { query: f.query || '', category: f.category || '', difficulty: f.difficulty || '', technology: f.technology || '', objective: f.objective || '' };
}

function render() {
  const filters = currentFilters();
  results = recommendProjects(targetRole, gapItems, filters);
  const active = Object.values(filters).filter(Boolean).length;
  $('#result-count').textContent = `${pluralize(results.length, 'project')}${active ? ` · ${pluralize(active, 'filter')} active` : ''}`;
  const grid = $('#project-grid');
  if (!results.length) {
    setHTML(grid, html`<div class="card md:col-span-2 2xl:col-span-3">${emptyState({ icon: 'search-x', title: 'No projects match these filters', message: 'Try removing a filter or searching for another technology.', action: { label: 'Reset filters', icon: 'filter-x' } })}</div>`);
    $('[data-state-action]', grid).addEventListener('click', () => { $('#filters').reset(); render(); });
    return;
  }
  const gapSet = new Set(gapItems.filter((g) => g.status !== 'strong').map((g) => g.skill.toLowerCase()));
  setHTML(grid, html`${results.map((p) => html`
    <article class="card card-pad card-hover flex flex-col fade-in">
      <div class="flex flex-wrap items-center gap-2">
        <span class="badge badge-violet">${p.category}</span>
        <span class="badge ${DIFF_BADGE[p.difficulty]}">${p.difficulty}</span>
        <span class="badge ${MATCH_BADGE[p.match]} ml-auto">${p.match === 'Explore' ? '' : icon('sparkles')}${p.match}</span>
      </div>
      <h2 class="mt-4 text-lg font-semibold tracking-tight">${p.title}</h2>
      <p class="mt-1.5 text-sm text-muted">${p.summary}</p>
      ${p.matchedGaps.length ? html`<p class="mt-3 flex items-start gap-2 text-sm">${icon('target', 'mt-0.5 h-4 w-4 shrink-0 text-brand')}<span>Practises ${pluralize(p.matchedGaps.length, 'gap')}: <strong>${p.matchedGaps.join(', ')}</strong></span></p>` : ''}
      ${p.roleMatch ? html`<p class="mt-1.5 flex items-start gap-2 text-sm">${icon('user-round-check', 'mt-0.5 h-4 w-4 shrink-0 text-success')}<span>Fits your target role</span></p>` : ''}
      <div class="chip-list mt-4">${p.technologies.map((t) => html`<span class="chip ${gapSet.has(t.toLowerCase()) ? 'chip-brand' : ''}">${t}</span>`)}</div>
      <div class="flex-1" aria-hidden="true"></div>
      <div class="mt-5 flex items-center justify-between gap-2 border-t border-line pt-4">
        <span class="flex items-center gap-1.5 text-sm text-muted">${icon('clock', 'h-4 w-4')}~${p.weeks} ${p.weeks === 1 ? 'week' : 'weeks'}</span>
        <button type="button" class="btn btn-secondary btn-sm" data-details="${p.id}">View plan${icon('arrow-right')}</button>
      </div>
    </article>`)}`);
}

function showDetails(id) {
  const p = results.find((x) => x.id === id);
  if (!p) return;
  openModal({
    title: p.title,
    size: 'modal-lg',
    body: html`
      <div class="flex flex-wrap gap-2"><span class="badge badge-violet">${p.category}</span><span class="badge ${DIFF_BADGE[p.difficulty]}">${p.difficulty}</span><span class="badge">${icon('clock')}~${p.weeks} ${p.weeks === 1 ? 'week' : 'weeks'}</span></div>
      <p class="mt-4 text-muted">${p.summary}</p>
      <h3 class="mt-5 text-sm font-semibold">Milestones</h3>
      <ol class="mt-3 grid gap-2">${p.milestones.map((m, i) => html`<li class="flow-step"><span class="flow-num">${i + 1}</span>${m}</li>`)}</ol>
      <div class="mt-5 grid gap-5 sm:grid-cols-2">
        <div><h3 class="text-sm font-semibold">Learning objectives</h3><ul class="bullets mt-3">${p.objectives.map((o) => html`<li>${icon('graduation-cap', 'text-brand')}<span>${o}</span></li>`)}</ul></div>
        <div><h3 class="text-sm font-semibold">Technologies</h3><div class="chip-list mt-3">${p.technologies.map((t) => html`<span class="chip">${t}</span>`)}</div></div>
      </div>
      <div class="notice mt-5">${icon('info')}<p><strong>Why recommended:</strong> ${p.matchedGaps.length ? `covers ${p.matchedGaps.join(', ')} from your skill gaps` : 'a solid portfolio piece in this area'}${p.roleMatch ? ' and fits your target role' : ''}. Ranking is rule-based (score ${p.score}).</p></div>`,
    footer: html`<button type="button" class="btn btn-primary" data-modal-close>Got it</button>`,
  });
}
