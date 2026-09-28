/** Career profile: personal details, summary, education, links and the skills editor. */
import {
  bootPage, $, $$, html, raw, setHTML, icon, toast, confirmDialog, showFieldErrors, setLoading, ringSvg, animateIn,
  refreshShell, debounce, pluralize, emptyState, prefersReducedMotion,
} from './app.js';
import { api, ValidationError } from './api.js';
import { SKILLS, SKILL_CATEGORIES, ROLE_PROFILES } from './data.js';
import { profileCompletion, findRole, findSkill, skillStatus } from './ai-sim.js';

const EXPERIENCE_LEVELS = ['Student', 'Entry level', 'Mid level', 'Senior', 'Lead'];
const STATUS_BADGE = { strong: ['badge-success', 'Strong'], partial: ['badge-warning', 'Partial'], missing: ['badge-danger', 'Beginner'] };

let profile;
let skills = [];
let dirty = false;

bootPage('profile', async () => {
  const snap = await api.getSnapshot();
  profile = snap.profile;
  skills = snap.skills;
  renderPersonal();
  renderSummary();
  renderEducation(profile.education.length ? profile.education : [{}]);
  renderLinks();
  bindProfileForm();
  initSkills();
  renderSkills();
  renderCompletion();
  renderRoleSkills();
  if (location.hash === '#skills') $('#skills').scrollIntoView();
});

/* ---------- Profile form ---------- */

function field({ id, label, value = '', required = false, type = 'text', placeholder = '', attrs = '', hint = '', cls = '' }) {
  return html`<div class="field ${cls}">
    <label class="label" for="${id}">${label}${required ? html`<span class="req" aria-hidden="true">*</span>` : ''}</label>
    <input class="input" id="${id}" name="${id}" type="${type}" value="${value || ''}" placeholder="${placeholder}"
      aria-describedby="err-${id}${hint ? ` hint-${id}` : ''}"${required ? raw(' required aria-required="true"') : ''}${raw(attrs ? ` ${attrs}` : '')}>
    ${hint ? html`<p class="hint" id="hint-${id}">${hint}</p>` : ''}
    <p class="field-error" id="err-${id}" data-error-for="${id}"></p>
  </div>`;
}

function renderPersonal() {
  setHTML($('#personal-fields'), html`
    ${field({ id: 'fullName', label: 'Full name', value: profile.fullName, required: true, placeholder: 'Your name', attrs: 'autocomplete="name"' })}
    ${field({ id: 'headline', label: 'Headline', value: profile.headline, placeholder: 'e.g. CSE Graduate · Aspiring ML Engineer' })}
    ${field({ id: 'targetRole', label: 'Target role', value: profile.targetRole, placeholder: 'e.g. Data Analyst', attrs: 'list="role-list" autocomplete="off"', hint: 'Used for CV suggestions and project ranking.' })}
    <div class="field">
      <label class="label" for="experienceLevel">Experience level</label>
      <select class="select" id="experienceLevel" name="experienceLevel">
        <option value="">Select…</option>
        ${EXPERIENCE_LEVELS.map((l) => html`<option${l === profile.experienceLevel ? raw(' selected') : ''}>${l}</option>`)}
      </select>
    </div>
    ${field({ id: 'location', label: 'Location', value: profile.location, placeholder: 'City, Country', attrs: 'autocomplete="address-level2"' })}
    <datalist id="role-list">${ROLE_PROFILES.map((r) => html`<option value="${r.title}"></option>`)}</datalist>`);
}

function renderSummary() {
  const ta = $('#summary');
  const count = $('#summary-count');
  ta.value = profile.summary || '';
  const update = () => { count.textContent = `${ta.value.length} / 1200`; };
  ta.addEventListener('input', update);
  update();
}

function eduField(i, key, label, value, placeholder, cls = '', inputmode = '') {
  const id = `edu-${i}-${key}`;
  return html`<div class="field ${cls}">
    <label class="label" for="${id}">${label}</label>
    <input class="input" id="${id}" name="${id}" value="${value || ''}" placeholder="${placeholder}" aria-describedby="err-${id}"${raw(inputmode ? ` inputmode="${inputmode}" maxlength="4"` : '')}>
    <p class="field-error" id="err-${id}" data-error-for="${id}"></p>
  </div>`;
}

function renderEducation(list) {
  const box = $('#education-list');
  if (!list.length) {
    setHTML(box, html`<p class="text-sm text-muted">No education entries. Select <strong>Add</strong> to create one.</p>`);
    return;
  }
  setHTML(box, html`${list.map((e, i) => html`
    <fieldset class="rounded-2xl border border-line p-4" data-edu="${i}">
      <legend class="sr-only">Education entry ${i + 1}</legend>
      <div class="grid gap-3 sm:grid-cols-2">
        ${eduField(i, 'degree', 'Degree / program', e.degree, 'B.Sc. in Computer Science & Engineering', 'sm:col-span-2')}
        ${eduField(i, 'institution', 'Institution', e.institution, 'University or school', 'sm:col-span-2')}
        ${eduField(i, 'startYear', 'Start year', e.startYear, '2020', '', 'numeric')}
        ${eduField(i, 'endYear', 'End year', e.endYear, '2024', '', 'numeric')}
        ${eduField(i, 'grade', 'Grade (optional)', e.grade, 'CGPA 3.60 / 4.00', 'sm:col-span-2')}
      </div>
      <div class="mt-3 flex justify-end">
        <button type="button" class="btn btn-ghost btn-sm" data-remove-edu="${i}">${icon('trash-2')}Remove entry</button>
      </div>
    </fieldset>`)}`);
}

function readEducation() {
  return $$('[data-edu]').map((fs) => {
    const i = fs.dataset.edu;
    const v = (k) => $(`[name="edu-${i}-${k}"]`, fs)?.value || '';
    return { degree: v('degree'), institution: v('institution'), startYear: v('startYear'), endYear: v('endYear'), grade: v('grade') };
  });
}

function renderLinks() {
  const l = profile.links;
  const attrs = 'inputmode="url" autocomplete="url"';
  setHTML($('#link-fields'), html`
    ${field({ id: 'link-linkedin', label: 'LinkedIn', value: l.linkedin, type: 'url', placeholder: 'https://linkedin.com/in/…', attrs })}
    ${field({ id: 'link-github', label: 'GitHub', value: l.github, type: 'url', placeholder: 'https://github.com/…', attrs })}
    ${field({ id: 'link-portfolio', label: 'Portfolio', value: l.portfolio, type: 'url', placeholder: 'https://…', attrs })}`);
}

function markDirty(on) {
  dirty = on;
  $('#save-status').textContent = on ? 'You have unsaved changes.' : 'Changes are saved in this browser only.';
}

function bindProfileForm() {
  const form = $('#profile-form');
  form.addEventListener('input', () => { if (!dirty) markDirty(true); });

  $('#add-education').addEventListener('click', () => {
    const list = [...readEducation(), {}];
    renderEducation(list);
    $(`#edu-${list.length - 1}-degree`)?.focus();
    markDirty(true);
  });
  $('#education-list').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-remove-edu]');
    if (!btn) return;
    const list = readEducation();
    list.splice(Number(btn.dataset.removeEdu), 1);
    renderEducation(list);
    $('#add-education').focus();
    markDirty(true);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('#save-profile');
    const fd = new FormData(form);
    setLoading(btn, true);
    try {
      profile = await api.saveProfile({
        fullName: fd.get('fullName'), headline: fd.get('headline'), location: fd.get('location'),
        targetRole: fd.get('targetRole'), experienceLevel: fd.get('experienceLevel'), summary: fd.get('summary'),
        education: readEducation(),
        links: { linkedin: fd.get('link-linkedin'), github: fd.get('link-github'), portfolio: fd.get('link-portfolio') },
      });
      showFieldErrors(form, {});
      markDirty(false);
      toast('Profile saved');
      renderCompletion();
      renderRoleSkills();
      refreshShell();
    } catch (err) {
      if (err instanceof ValidationError) showFieldErrors(form, err.fields);
      toast(err.message, { type: 'error' });
    } finally {
      setLoading(btn, false);
    }
  });
}

/* ---------- Insights ---------- */

function renderCompletion() {
  const c = profileCompletion(profile, skills);
  const box = $('#completion');
  setHTML(box, html`
    <h2 class="card-title" id="sec-completion">Profile completion</h2>
    <p class="card-subtitle">Complete profiles give better recommendations.</p>
    <div class="my-5 flex justify-center">${ringSvg(c.score, { label: 'complete', size: 148, ariaLabel: `Profile ${c.score}% complete` })}</div>
    ${c.missing.length
      ? html`<p class="mb-2 text-sm font-semibold">Still missing</p>
        <ul class="bullets">${c.missing.map((m) => html`<li>${icon('circle-dashed', 'text-muted')}<span>${m}</span></li>`)}</ul>`
      : html`<div class="notice notice-success">${icon('circle-check')}<p>Your profile is complete. Nice work!</p></div>`}`);
  animateIn(box);
}

function renderRoleSkills() {
  const box = $('#role-skills');
  const role = findRole(profile.targetRole);
  if (!role) {
    setHTML(box, html`<h2 class="card-title" id="sec-role">Typical skills for your role</h2>
      <p class="card-subtitle mt-1">Set a target role (for example "${ROLE_PROFILES[0].title}") and save to see the skills employers usually list.</p>`);
    return;
  }
  const have = new Map(skills.map((s) => [s.name.toLowerCase(), s]));
  setHTML(box, html`
    <h2 class="card-title" id="sec-role">Typical skills: ${role.title}</h2>
    <p class="card-subtitle">From the built-in role profile. Select a missing skill to add it.</p>
    <div class="chip-list mt-4">${role.skills.map((n) => {
      const s = have.get(n.toLowerCase());
      return s
        ? html`<span class="chip chip-${skillStatus(s.level)}">${icon('check')}${n}<small>${s.level}%</small></span>`
        : html`<button type="button" class="chip" data-suggest="${n}">${icon('plus')}${n}</button>`;
    })}</div>`);
  $$('[data-suggest]', box).forEach((b) => b.addEventListener('click', () => {
    $('#skill-name').value = b.dataset.suggest;
    syncCategory();
    $('#skills').scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
    $('#skill-level').focus({ preventScroll: true });
  }));
}

/* ---------- Skills editor ---------- */

function syncCategory() {
  const s = findSkill($('#skill-name').value);
  if (s) $('#skill-category').value = s.category;
}

function updateRange(input, out) {
  input.style.setProperty('--pct', `${input.value}%`);
  if (out) out.textContent = `${input.value}%`;
}

function initSkills() {
  setHTML($('#skill-dictionary'), html`${SKILLS.map((s) => html`<option value="${s.name}"></option>`)}`);
  setHTML($('#skill-category'), html`${SKILL_CATEGORIES.map((c) => html`<option>${c}</option>`)}`);
  setHTML($('#skill-filter'), html`<option value="">All categories</option>${SKILL_CATEGORIES.map((c) => html`<option>${c}</option>`)}`);

  const form = $('#skill-form');
  const name = $('#skill-name');
  const level = $('#skill-level');
  const out = $('#skill-level-out');
  name.addEventListener('input', syncCategory);
  level.addEventListener('input', () => updateRange(level, out));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const rec = await api.saveSkill({ name: name.value, category: $('#skill-category').value, level: level.value });
      skills.push(rec);
      showFieldErrors(form, {});
      form.reset();
      updateRange(level, out);
      renderSkills(rec.id);
      renderCompletion();
      renderRoleSkills();
      toast(`${rec.name} added at ${rec.level}%`);
      name.focus();
    } catch (err) {
      if (err instanceof ValidationError) showFieldErrors(form, err.fields);
      else toast(err.message, { type: 'error' });
    }
  });

  $('#skill-search').addEventListener('input', debounce(() => renderSkills(), 120));
  $('#skill-filter').addEventListener('change', () => renderSkills());

  const list = $('#skill-list');
  list.addEventListener('input', (e) => {
    const r = e.target.closest('[data-level]');
    if (!r) return;
    r.style.setProperty('--pct', `${r.value}%`);
    setLevelBadge(r.closest('[data-skill]').querySelector('[data-level-badge]'), Number(r.value));
  });
  list.addEventListener('change', async (e) => {
    const r = e.target.closest('[data-level]');
    if (!r) return;
    const s = skills.find((k) => k.id === r.dataset.level);
    try {
      const rec = await api.saveSkill({ ...s, level: r.value });
      Object.assign(s, rec);
      $('#skill-live').textContent = `${s.name} saved at ${s.level}%`;
      renderRoleSkills();
    } catch (err) {
      toast(err.message, { type: 'error' });
    }
  });
  list.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-delete-skill]');
    if (!btn) return;
    const s = skills.find((k) => k.id === btn.dataset.deleteSkill);
    const ok = await confirmDialog({ title: `Remove ${s.name}?`, message: 'This skill will be removed from your profile and future analyses.', confirmLabel: 'Remove', danger: true });
    if (!ok) return;
    try {
      await api.deleteSkill(s.id);
      skills = skills.filter((k) => k.id !== s.id);
      renderSkills();
      renderCompletion();
      renderRoleSkills();
      toast(`${s.name} removed`);
    } catch (err) {
      toast(err.message, { type: 'error' });
    }
  });
}

function setLevelBadge(el, level) {
  const [cls, label] = STATUS_BADGE[skillStatus(level)];
  el.className = `badge ${cls} w-28 shrink-0 justify-center tabular`;
  el.textContent = `${level}% · ${label}`;
}

function renderSkills(highlightId) {
  const q = $('#skill-search').value.trim().toLowerCase();
  const cat = $('#skill-filter').value;
  $('#skill-count').textContent = pluralize(skills.length, 'skill');
  const box = $('#skill-list');
  if (!skills.length) {
    setHTML(box, emptyState({ icon: 'sparkles', title: 'No skills yet', message: 'Add your first skill above, or extract skills from your CV.', action: { href: 'cv-analyzer.html', label: 'Analyze CV', icon: 'file-search' }, compact: true }));
    return;
  }
  const list = skills
    .filter((s) => (!cat || s.category === cat) && (!q || s.name.toLowerCase().includes(q)))
    .sort((a, b) => b.level - a.level || a.name.localeCompare(b.name));
  if (!list.length) {
    setHTML(box, emptyState({ icon: 'search-x', title: 'No matching skills', message: 'Try another search term or category.', compact: true }));
    return;
  }
  setHTML(box, html`<ul>${list.map((s) => {
    const [cls, label] = STATUS_BADGE[skillStatus(s.level)];
    return html`<li class="list-row flex-wrap sm:flex-nowrap${s.id === highlightId ? ' fade-in' : ''}" data-skill="${s.id}">
      <div class="min-w-0 flex-1 basis-[calc(100%-56px)] sm:basis-auto">
        <p class="text-sm font-semibold">${s.name}${s.demo ? html` <span class="badge badge-outline ml-1">demo</span>` : ''}</p>
        <p class="text-xs text-muted">${s.category}</p>
      </div>
      <button type="button" class="icon-btn icon-btn-sm order-2 sm:order-3" data-delete-skill="${s.id}" aria-label="Remove ${s.name}">${icon('trash-2')}</button>
      <div class="order-3 flex w-full items-center gap-3 sm:order-2 sm:w-80">
        <label class="sr-only" for="lvl-${s.id}">Level for ${s.name}</label>
        <input type="range" class="range" id="lvl-${s.id}" min="0" max="100" step="5" value="${s.level}" style="--pct:${s.level}%" data-level="${s.id}">
        <span class="badge ${cls} w-28 shrink-0 justify-center tabular" data-level-badge>${s.level}% · ${label}</span>
      </div>
    </li>`;
  })}</ul>`);
}
