/** Analytics: five theme-aware charts with demo vs. real data labels. */
import {
  bootPage, $, $$, html, setHTML, icon, setupCharts, chartTheme, statusColor, onThemeChange, emptyState, chartUnavailable, animateIn,
} from './app.js';
import { api } from './api.js';
import { applicationStats, averageSkillLevel, learningProgress, skillStatus } from './ai-sim.js';
import { APPLICATION_STATUSES, SKILL_CATEGORIES } from './data.js';

const DAY = 864e5;
let charts = [];
let snap;

bootPage('analytics', async () => {
  snap = await api.getSnapshot();
  renderSources();
  renderSummary();
  renderCharts();
  animateIn();
  onThemeChange(renderCharts);
});

/* ---------- Data source labels ---------- */

function sourceOf(records) {
  if (!records.length) return { kind: 'none', label: 'No data' };
  const demo = records.filter((r) => r.demo).length;
  if (demo === records.length) return { kind: 'demo', label: 'Demo data' };
  if (!demo) return { kind: 'real', label: 'Your data' };
  return { kind: 'mixed', label: `Mixed: ${demo} demo, ${records.length - demo} yours` };
}

const SRC_BADGE = { demo: 'badge-warning', real: 'badge-success', mixed: 'badge-accent', none: 'badge-outline' };
const srcBadge = (s) => html`<span class="badge ${SRC_BADGE[s.kind]}">${icon(s.kind === 'demo' ? 'flask-conical' : s.kind === 'real' ? 'user-round-check' : 'layers')}${s.label}</span>`;

function renderSources() {
  const sources = {
    applications: sourceOf(snap.applications),
    skills: sourceOf(snap.skills),
    roadmap: snap.roadmap ? sourceOf([snap.roadmap]) : { kind: 'none', label: 'No data' },
  };
  $$('[data-src]').forEach((el) => setHTML(el, srcBadge(sources[el.dataset.src])));
  const all = [...snap.applications, ...snap.skills, ...(snap.roadmap ? [snap.roadmap] : [])];
  const overall = sourceOf(all);
  setHTML($('#data-source'), html`<div class="flex flex-col items-start gap-1 sm:items-end">${srcBadge(overall)}
    <p class="text-xs text-muted">${overall.kind === 'demo' || overall.kind === 'mixed' ? html`Sample records are labelled. <a class="link" href="settings.html#data">Manage demo data</a>` : 'Charts use the data saved in this browser.'}</p></div>`);
}

/* ---------- Summary ---------- */

function renderSummary() {
  const st = applicationStats(snap.applications);
  const responded = st.funnel.applied ? Math.round((st.funnel.screening / st.funnel.applied) * 100) : 0;
  const lp = learningProgress(snap.roadmap);
  const items = [
    ['Applications', st.total, '', 'send'],
    ['Response rate', responded, '%', 'reply'],
    ['Interview rate', st.interviewRate, '%', 'calendar-check'],
    ['Offer rate', st.offerRate, '%', 'party-popper'],
    ['Avg. skill level', averageSkillLevel(snap.skills), '%', 'gauge'],
    ['Learning done', lp.percent, '%', 'graduation-cap'],
  ];
  setHTML($('#summary'), html`${items.map(([label, value, suffix, ic]) => html`<div class="card kpi">
    <div class="kpi-top"><span class="kpi-label">${label}</span><span class="kpi-icon">${icon(ic)}</span></div>
    <div class="kpi-value"><span data-count="${value}">0</span>${suffix ? html`<small>${suffix}</small>` : ''}</div></div>`)}`);
  $('#summary').classList.add('stagger');
}

/* ---------- Charts ---------- */

function weekStart(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); // Monday
  return x;
}

function canvas(box, label) {
  setHTML(box, html`<canvas role="img" aria-label="${label}"></canvas>`);
  return $('canvas', box);
}

function renderCharts() {
  charts.forEach((c) => c.destroy());
  charts = [];
  const boxes = { time: $('#c-time'), status: $('#c-status'), funnel: $('#c-funnel'), skills: $('#c-skills'), learning: $('#c-learning') };
  if (!setupCharts()) {
    Object.values(boxes).forEach((b) => setHTML(b, chartUnavailable()));
    return;
  }
  const t = chartTheme();
  const Chart = window.Chart;
  const apps = snap.applications;
  const noApps = () => emptyState({ icon: 'send', title: 'No applications yet', message: 'Track applications to see this chart.', action: { href: 'applications.html', label: 'Open tracker' }, compact: true });

  // 1. Applications over time
  const dated = apps.filter((a) => a.appliedOn);
  if (!dated.length) {
    setHTML(boxes.time, noApps());
  } else {
    const thisWeek = weekStart(new Date());
    const starts = Array.from({ length: 12 }, (_, i) => new Date(thisWeek.getTime() - (11 - i) * 7 * DAY));
    const counts = starts.map(() => 0);
    let before = 0;
    dated.forEach((a) => {
      const idx = Math.round((weekStart(`${a.appliedOn}T00:00:00`) - starts[0]) / (7 * DAY));
      if (idx >= 0 && idx < 12) counts[idx]++;
      else if (idx < 0) before++;
    });
    let run = before;
    const cumulative = counts.map((c) => (run += c));
    const labels = starts.map((d) => d.toLocaleDateString('en', { month: 'short', day: 'numeric' }));
    charts.push(new Chart(canvas(boxes.time, `Applications per week over the last 12 weeks: ${counts.join(', ')}`), {
      data: {
        labels,
        datasets: [
          { type: 'bar', label: 'Submitted that week', data: counts, backgroundColor: t.c('brand', 0.75), borderRadius: 6, maxBarThickness: 26, order: 2 },
          { type: 'line', label: 'Cumulative', data: cumulative, borderColor: t.c('accent'), backgroundColor: t.c('accent', 0.12), fill: true, tension: 0.35, pointRadius: 2, borderWidth: 2, yAxisID: 'y1', order: 1 },
        ],
      },
      options: {
        interaction: { mode: 'index', intersect: false },
        plugins: { legend: { position: 'bottom' } },
        scales: {
          x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 6 } },
          y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: t.grid }, title: { display: true, text: 'Per week' } },
          y1: { beginAtZero: true, position: 'right', ticks: { precision: 0 }, grid: { display: false }, title: { display: true, text: 'Total' } },
        },
      },
    }));
  }

  // 2. Status distribution
  const st = applicationStats(apps);
  if (!apps.length) {
    setHTML(boxes.status, noApps());
  } else {
    const statuses = APPLICATION_STATUSES.filter((s) => st.byStatus[s]);
    charts.push(new Chart(canvas(boxes.status, `Status distribution: ${statuses.map((s) => `${s} ${st.byStatus[s]}`).join(', ')}`), {
      type: 'doughnut',
      data: { labels: statuses, datasets: [{ data: statuses.map((s) => st.byStatus[s]), backgroundColor: statuses.map((s) => statusColor(t, s, 0.9)), borderColor: t.surface, borderWidth: 2, hoverOffset: 6 }] },
      options: { cutout: '64%', plugins: { legend: { position: 'bottom' } } },
    }));
  }

  // 3. Interview conversion funnel
  if (!st.funnel.applied) {
    setHTML(boxes.funnel, noApps());
  } else {
    const stages = ['Applied', 'Screening', 'Interview', 'Offer'];
    const values = [st.funnel.applied, st.funnel.screening, st.funnel.interview, st.funnel.offer];
    const pctOf = (v) => Math.round((v / st.funnel.applied) * 100);
    charts.push(new Chart(canvas(boxes.funnel, `Conversion funnel: ${stages.map((s, i) => `${s} ${values[i]} (${pctOf(values[i])}%)`).join(', ')}`), {
      type: 'bar',
      data: { labels: stages, datasets: [{ label: 'Applications reaching stage', data: values, backgroundColor: stages.map((s) => statusColor(t, s, 0.85)), borderRadius: 6, maxBarThickness: 30 }] },
      options: {
        indexAxis: 'y',
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => ` ${ctx.raw} applications · ${pctOf(ctx.raw)}% of applied` } } },
        scales: { x: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: t.grid } }, y: { grid: { display: false } } },
      },
    }));
  }

  // 4. Skill distribution
  if (!snap.skills.length) {
    setHTML(boxes.skills, emptyState({ icon: 'sparkles', title: 'No skills yet', message: 'Add skills to your profile.', action: { href: 'profile.html#skills', label: 'Add skills' }, compact: true }));
  } else {
    const band = (b) => SKILL_CATEGORIES.map((c) => snap.skills.filter((s) => s.category === c && skillStatus(s.level) === b).length);
    const cats = SKILL_CATEGORIES.map((c) => c.replace('Soft skills', 'Soft'));
    charts.push(new Chart(canvas(boxes.skills, `Skills per category: ${SKILL_CATEGORIES.map((c) => `${c} ${snap.skills.filter((s) => s.category === c).length}`).join(', ')}`), {
      type: 'bar',
      data: {
        labels: cats,
        datasets: [
          { label: 'Strong (70+)', data: band('strong'), backgroundColor: t.c('success', 0.85), borderRadius: 4 },
          { label: 'Partial (30–69)', data: band('partial'), backgroundColor: t.c('warning', 0.85), borderRadius: 4 },
          { label: 'Beginner (<30)', data: band('missing'), backgroundColor: t.c('danger', 0.8), borderRadius: 4 },
        ],
      },
      options: {
        plugins: { legend: { position: 'bottom' } },
        scales: { x: { stacked: true, grid: { display: false }, ticks: { maxRotation: 0, autoSkip: false, font: { size: 10.5 } } }, y: { stacked: true, beginAtZero: true, ticks: { precision: 0 }, grid: { color: t.grid } } },
      },
    }));
  }

  // 5. Learning progress per week
  const items = snap.roadmap?.items || [];
  if (!items.length) {
    setHTML(boxes.learning, emptyState({ icon: 'map', title: 'No roadmap yet', message: 'Generate one from your skill gaps.', action: { href: 'skill-gap.html', label: 'Open Skill Gap' }, compact: true }));
  } else {
    const weeks = [...new Set(items.map((i) => i.week))].sort((a, b) => a - b);
    const done = weeks.map((w) => items.filter((i) => i.week === w && i.done).reduce((s, i) => s + i.hours, 0));
    const open = weeks.map((w) => items.filter((i) => i.week === w && !i.done).reduce((s, i) => s + i.hours, 0));
    charts.push(new Chart(canvas(boxes.learning, `Roadmap hours completed per week: ${weeks.map((w, i) => `week ${w} ${done[i]} of ${done[i] + open[i]}`).join(', ')}`), {
      type: 'bar',
      data: {
        labels: weeks.map((w) => `W${w}`),
        datasets: [
          { label: 'Completed hours', data: done, backgroundColor: t.c('success', 0.85), borderRadius: 4 },
          { label: 'Remaining hours', data: open, backgroundColor: t.c('muted', 0.3), borderRadius: 4 },
        ],
      },
      options: {
        plugins: { legend: { position: 'bottom' } },
        scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, beginAtZero: true, grid: { color: t.grid }, title: { display: true, text: 'Hours' } } },
      },
    }));
  }
}
