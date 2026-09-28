/** Application tracker: CRUD, search, filter, sort, table and kanban views. */
import {
  bootPage, $, $$, html, raw, setHTML, icon, toast, openModal, confirmDialog, showFieldErrors, setLoading,
  emptyState, fmtDate, relativeTime, debounce, pluralize,
} from './app.js';
import { api, ValidationError } from './api.js';
import { APPLICATION_STATUSES } from './data.js';

const STAGE = Object.fromEntries(APPLICATION_STATUSES.map((s, i) => [s, i]));
let apps = [];
let view = 'table';

bootPage('applications', async () => {
  const snap = await api.getSnapshot();
  apps = snap.applications;
  view = snap.settings.applicationsView === 'kanban' ? 'kanban' : 'table';
  setHTML($('#status-filter'), html`<option value="">All statuses</option>${APPLICATION_STATUSES.map((s) => html`<option>${s}</option>`)}`);
  bindToolbar();
  bindBody();
  render();
});

/* ---------- Toolbar ---------- */

function bindToolbar() {
  $('#add-app').addEventListener('click', () => openForm());
  $('#q').addEventListener('input', debounce(render, 150));
  $('#status-filter').addEventListener('change', render);
  $('#sort-by').addEventListener('change', render);
  $$('[data-view]').forEach((b) => b.addEventListener('click', () => {
    view = b.dataset.view;
    api.saveSettings({ applicationsView: view });
    render();
  }));
  $('#status-strip').addEventListener('click', (e) => {
    const b = e.target.closest('[data-status-chip]');
    if (!b) return;
    const sel = $('#status-filter');
    sel.value = sel.value === b.dataset.statusChip ? '' : b.dataset.statusChip;
    render();
  });
}

function filtered() {
  const q = $('#q').value.trim().toLowerCase();
  const status = $('#status-filter').value;
  const sort = $('#sort-by').value;
  const list = apps.filter((a) => (!status || a.status === status)
    && (!q || `${a.jobTitle} ${a.company} ${a.location} ${a.notes}`.toLowerCase().includes(q)));
  const by = {
    updated: (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt),
    applied: (a, b) => (b.appliedOn || '').localeCompare(a.appliedOn || ''),
    company: (a, b) => a.company.localeCompare(b.company) || a.jobTitle.localeCompare(b.jobTitle),
    status: (a, b) => STAGE[a.status] - STAGE[b.status] || new Date(b.updatedAt) - new Date(a.updatedAt),
  }[sort];
  return [...list].sort(by);
}

/* ---------- Rendering ---------- */

function render() {
  $$('[data-view]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === view)));
  renderStrip();
  const body = $('[data-page-body]');
  if (!apps.length) {
    setHTML(body, html`<div class="card">${emptyState({ icon: 'send', title: 'No applications yet', message: 'Add the roles you are interested in or have applied to. Everything stays in this browser.', action: { label: 'Add your first application', icon: 'plus' } })}</div>`);
    $('[data-state-action]', body).addEventListener('click', () => openForm());
    return;
  }
  const list = filtered();
  $('#apps-live').textContent = `${pluralize(list.length, 'application')} shown`;
  if (view === 'kanban') renderKanban(body, list);
  else renderTable(body, list);
}

function renderStrip() {
  const active = $('#status-filter').value;
  setHTML($('#status-strip'), html`${APPLICATION_STATUSES.map((s) => {
    const n = apps.filter((a) => a.status === s).length;
    return html`<button type="button" class="chip status-${s} ${active === s ? 'chip-brand' : ''}" data-status-chip="${s}" aria-pressed="${active === s}">
      <span class="dot" style="color:rgb(var(--st))"></span>${s}<small class="tabular">${n}</small></button>`;
  })}`);
}

const statusBadge = (s) => html`<span class="badge status status-${s}"><span class="dot"></span>${s}</span>`;

function renderTable(body, list) {
  if (!list.length) return renderNoResults(body);
  setHTML(body, html`<div class="card"><div class="table-wrap"><table class="table table-stack">
    <caption class="sr-only">Job applications</caption>
    <thead><tr><th scope="col">Role</th><th scope="col">Status</th><th scope="col">Applied</th><th scope="col" class="hidden xl:table-cell">Updated</th><th scope="col" class="hidden xl:table-cell">Location</th><th scope="col"><span class="sr-only">Actions</span></th></tr></thead>
    <tbody>${list.map((a) => html`<tr class="fade-in">
      <td class="td-main">
        <p class="font-semibold">${a.jobTitle}${a.demo ? html` <span class="badge badge-outline ml-1">demo</span>` : ''}</p>
        <p class="text-sm text-muted">${a.company}</p>
        ${a.notes ? html`<p class="mt-1 max-w-[16rem] truncate text-xs text-muted" title="${a.notes}">${a.notes}</p>` : ''}
      </td>
      <td data-label="Status">${statusBadge(a.status)}</td>
      <td data-label="Applied" class="whitespace-nowrap text-sm">${fmtDate(a.appliedOn)}</td>
      <td data-label="Updated" class="hidden whitespace-nowrap text-sm text-muted xl:table-cell">${relativeTime(a.updatedAt)}</td>
      <td data-label="Location" class="hidden text-sm xl:table-cell">${a.location || '—'}</td>
      <td data-label="Actions" class="whitespace-nowrap text-right">
        ${a.url ? html`<a class="icon-btn icon-btn-sm" href="${a.url}" target="_blank" rel="noopener noreferrer" aria-label="Open job posting for ${a.jobTitle}">${icon('external-link')}</a>` : ''}
        <button type="button" class="icon-btn icon-btn-sm" data-edit="${a.id}" aria-label="Edit ${a.jobTitle} at ${a.company}">${icon('pencil')}</button>
        <button type="button" class="icon-btn icon-btn-sm" data-delete="${a.id}" aria-label="Delete ${a.jobTitle} at ${a.company}">${icon('trash-2')}</button>
      </td>
    </tr>`)}</tbody></table></div></div>`);
}

function renderKanban(body, list) {
  const status = $('#status-filter').value;
  const cols = status ? [status] : APPLICATION_STATUSES;
  if (!list.length && $('#q').value.trim()) return renderNoResults(body);
  setHTML(body, html`<p class="hint mb-3">Drag cards between columns, or use the "Move to" menu on each card.</p>
    <div class="kanban" role="list" aria-label="Application board">${cols.map((s) => {
      const items = list.filter((a) => a.status === s);
      return html`<section class="kanban-col" data-col="${s}" role="listitem" aria-label="${s}: ${pluralize(items.length, 'application')}">
        <header class="kanban-col-head"><span class="flex items-center gap-2 status-${s}"><span class="dot" style="color:rgb(var(--st))"></span>${s}</span><span class="badge tabular">${items.length}</span></header>
        ${items.length ? items.map((a) => html`<article class="kanban-card fade-in" draggable="true" data-card="${a.id}">
          <p class="text-sm font-semibold">${a.jobTitle}</p>
          <p class="text-xs text-muted">${a.company}${a.location ? ` · ${a.location}` : ''}</p>
          <p class="mt-2 text-xs text-muted">${a.appliedOn ? `Applied ${fmtDate(a.appliedOn)}` : `Added ${relativeTime(a.createdAt)}`}</p>
          <div class="mt-3 flex items-center gap-1.5">
            <label class="sr-only" for="move-${a.id}">Move ${a.jobTitle} to status</label>
            <select class="select" id="move-${a.id}" data-move="${a.id}" style="min-height:36px;padding-top:4px;padding-bottom:4px;font-size:12.5px">
              ${APPLICATION_STATUSES.map((st) => html`<option${st === a.status ? raw(' selected') : ''}>${st}</option>`)}
            </select>
            <button type="button" class="icon-btn icon-btn-sm" data-edit="${a.id}" aria-label="Edit ${a.jobTitle} at ${a.company}">${icon('pencil')}</button>
          </div>
        </article>`) : html`<p class="px-1 py-6 text-center text-xs text-muted">No applications</p>`}
      </section>`;
    })}</div>`);
}

function renderNoResults(body) {
  setHTML(body, html`<div class="card">${emptyState({ icon: 'search-x', title: 'No matching applications', message: 'Try a different search term or status filter.', action: { label: 'Clear filters', icon: 'filter-x' } })}</div>`);
  $('[data-state-action]', body).addEventListener('click', () => {
    $('#q').value = '';
    $('#status-filter').value = '';
    render();
  });
}

/* ---------- Events (delegated, bound once) ---------- */

function bindBody() {
  const body = $('[data-page-body]');
  body.addEventListener('click', (e) => {
    const edit = e.target.closest('[data-edit]');
    const del = e.target.closest('[data-delete]');
    if (edit) openForm(apps.find((a) => a.id === edit.dataset.edit));
    if (del) remove(del.dataset.delete);
  });
  body.addEventListener('change', (e) => {
    const sel = e.target.closest('[data-move]');
    if (sel) move(sel.dataset.move, sel.value);
  });
  body.addEventListener('dragstart', (e) => {
    const card = e.target.closest('[data-card]');
    if (!card) return;
    e.dataTransfer.setData('text/plain', card.dataset.card);
    e.dataTransfer.effectAllowed = 'move';
    card.classList.add('is-dragging');
  });
  body.addEventListener('dragend', (e) => e.target.closest?.('[data-card]')?.classList.remove('is-dragging'));
  body.addEventListener('dragover', (e) => {
    const col = e.target.closest('[data-col]');
    if (!col) return;
    e.preventDefault();
    $$('[data-col].is-dragover', body).forEach((c) => c !== col && c.classList.remove('is-dragover'));
    col.classList.add('is-dragover');
  });
  body.addEventListener('dragleave', (e) => {
    const col = e.target.closest('[data-col]');
    if (col && !col.contains(e.relatedTarget)) col.classList.remove('is-dragover');
  });
  body.addEventListener('drop', (e) => {
    const col = e.target.closest('[data-col]');
    if (!col) return;
    e.preventDefault();
    col.classList.remove('is-dragover');
    const id = e.dataTransfer.getData('text/plain');
    if (id) move(id, col.dataset.col);
  });
}

async function move(id, status) {
  const a = apps.find((x) => x.id === id);
  if (!a || a.status === status) return;
  try {
    const rec = await api.updateApplication(id, { status });
    Object.assign(a, rec);
    render();
    toast(`${a.jobTitle} moved to ${status}`);
  } catch (err) {
    toast(err.message, { type: 'error' });
    render();
  }
}

async function remove(id) {
  const a = apps.find((x) => x.id === id);
  if (!a) return;
  const ok = await confirmDialog({ title: 'Delete application?', message: `"${a.jobTitle}" at ${a.company} and its history will be permanently removed from this browser.`, confirmLabel: 'Delete', danger: true });
  if (!ok) return;
  try {
    await api.deleteApplication(id);
    apps = apps.filter((x) => x.id !== id);
    render();
    toast('Application deleted');
  } catch (err) {
    toast(err.message, { type: 'error' });
  }
}

/* ---------- Add / edit form ---------- */

function openForm(app = null) {
  const v = app || { jobTitle: '', company: '', location: '', status: 'Applied', appliedOn: '', url: '', notes: '' };
  const f = (name, label, { required = false, type = 'text', placeholder = '', attrs = '', cls = '' } = {}) => html`<div class="field ${cls}">
    <label class="label" for="app-${name}">${label}${required ? html`<span class="req" aria-hidden="true">*</span>` : ''}</label>
    <input class="input" id="app-${name}" name="${name}" type="${type}" value="${v[name] || ''}" placeholder="${placeholder}" aria-describedby="err-app-${name}"${required ? raw(' required aria-required="true"') : ''}${raw(attrs ? ` ${attrs}` : '')}>
    <p class="field-error" id="err-app-${name}" data-error-for="${name}"></p></div>`;

  const m = openModal({
    title: app ? 'Edit application' : 'Add application',
    body: html`<form id="app-form" class="grid gap-4 sm:grid-cols-2" novalidate>
      ${f('jobTitle', 'Job title', { required: true, placeholder: 'e.g. Data Analyst', cls: 'sm:col-span-2' })}
      ${f('company', 'Company', { required: true, placeholder: 'Company name', attrs: 'autocomplete="organization"' })}
      ${f('location', 'Location', { placeholder: 'Remote, city…' })}
      <div class="field">
        <label class="label" for="app-status">Status</label>
        <select class="select" id="app-status" name="status" aria-describedby="err-app-status">${APPLICATION_STATUSES.map((s) => html`<option${s === v.status ? raw(' selected') : ''}>${s}</option>`)}</select>
        <p class="field-error" id="err-app-status" data-error-for="status"></p>
      </div>
      ${f('appliedOn', 'Applied on', { type: 'date' })}
      ${f('url', 'Job posting link', { type: 'url', placeholder: 'https://…', cls: 'sm:col-span-2', attrs: 'inputmode="url"' })}
      <div class="field sm:col-span-2">
        <label class="label" for="app-notes">Notes</label>
        <textarea class="textarea" id="app-notes" name="notes" maxlength="2000" style="min-height:100px" placeholder="Contacts, interview dates, follow-ups…">${v.notes || ''}</textarea>
      </div>
      ${app?.history?.length ? html`<div class="sm:col-span-2"><p class="label mb-2">History</p><ol class="grid gap-1.5 text-sm">${app.history.map((h) => html`<li class="flex items-center gap-2">${statusBadge(h.status)}<span class="text-muted">${fmtDate(h.at)}</span></li>`)}</ol></div>` : ''}
    </form>`,
    footer: html`<button type="button" class="btn btn-secondary" data-modal-close>Cancel</button>
      <button type="submit" form="app-form" class="btn btn-primary" id="app-save">${icon('save')}${app ? 'Save changes' : 'Add application'}</button>`,
  });

  const form = $('#app-form', m.el);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    const btn = $('#app-save', m.el);
    setLoading(btn, true);
    try {
      if (app) {
        const rec = await api.updateApplication(app.id, data);
        Object.assign(app, rec);
        toast('Application updated');
      } else {
        const rec = await api.createApplication(data);
        apps.unshift(rec);
        toast(`${rec.jobTitle} at ${rec.company} added`);
      }
      m.close();
      render();
    } catch (err) {
      setLoading(btn, false);
      if (err instanceof ValidationError) showFieldErrors(form, err.fields);
      else toast(err.message, { type: 'error' });
    }
  });
}
