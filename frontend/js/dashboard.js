/** Dashboard: KPIs, charts, recent activity and rule-based next steps. */
import {
  bootPage, $, html, setHTML, icon, ringSvg, animateIn, setupCharts, chartTheme, statusColor,
  onThemeChange, relativeTime, emptyState, chartUnavailable, pluralize,
} from './app.js';
import { api } from './api.js';
import {
  computeSkillGap, profileCompletion, learningProgress, averageSkillLevel, careerReadiness, applicationStats,
} from './ai-sim.js';
import { SKILL_CATEGORIES, APPLICATION_STATUSES } from './data.js';

let charts = [];

bootPage('dashboard', async () => {
  const snap = await api.getSnapshot();
  const m = metrics(snap);
  renderHeader(snap, m);
  renderReadiness(m);
  renderKpis(m);
  renderCharts(snap, m);
  renderActivity(snap);
  renderNextSteps(snap, m);
  animateIn();
  onThemeChange(() => renderCharts(snap, m));
});

function metrics(s) {
  const gap = s.activeJob ? computeSkillGap(s.skills, s.activeJob.analysis) : null;
  const profile = profileCompletion(s.profile, s.skills);
  const learning = learningProgress(s.roadmap);
  const avgSkill = averageSkillLevel(s.skills);
  const readiness = careerReadiness({
    compatibility: gap?.compatibility ?? null, profileScore: profile.score, learningPercent: learning.percent, avgSkillLevel: avgSkill,
  });
  return { gap, profile, learning, avgSkill, readiness, skillsCount: s.skills.length, apps: applicationStats(s.applications) };
}

function renderHeader(s, m) {
  const first = s.profile.fullName.split(/\s+/)[0];
  $('#greeting').textContent = first ? `Welcome back, ${first}` : 'Welcome to CareerPilot AI';
  const sub = $('#greeting-sub');
  if (s.activeJob) {
    setHTML(sub, html`Targeting <strong class="text-ink">${s.activeJob.title}</strong>${s.activeJob.company ? html` at ${s.activeJob.company}` : ''}
      · ${m.gap.compatibility ?? 0}% prototype compatibility${s.demo ? html` · <span class="badge badge-warning">Demo data</span>` : ''}`);
  } else {
    setHTML(sub, html`Add a target job in the <a class="link" href="job-analyzer.html">Job Analyzer</a> to unlock skill-gap insights.`);
  }
}

function renderReadiness(m) {
  const r = m.readiness;
  const row = (label, value, weight) => html`
    <div>
      <div class="flex items-center justify-between text-sm"><span class="text-muted">${label} <span class="text-xs">(${weight})</span></span><span class="font-semibold tabular">${value === null ? '—' : `${value}%`}</span></div>
      <div class="progress progress-sm mt-1.5"><div class="progress-bar" data-value="${value ?? 0}"></div></div>
    </div>`;
  setHTML($('#readiness'), html`
    <div class="flex items-start justify-between gap-3">
      <div><h2 class="card-title">Career readiness</h2><p class="card-subtitle">Prototype metric. Not a hiring probability.</p></div>
      <span class="badge badge-brand">${icon('sparkles')}Simulated</span>
    </div>
    <div class="mt-5 flex flex-col items-center gap-6 sm:flex-row xl:flex-col xl:items-stretch">
      <div class="flex shrink-0 justify-center">${ringSvg(r.score, { label: 'ready', ariaLabel: `Career readiness ${r.score}%` })}</div>
      <div class="grid w-full flex-1 gap-3">
        ${row('Job compatibility', m.gap?.compatibility ?? null, '40%')}
        ${row('Profile completion', m.profile.score, '20%')}
        ${row('Learning progress', m.learning.percent, '20%')}
        ${row('Average skill level', m.avgSkill, '20%')}
      </div>
    </div>
    ${r.hasJob ? '' : html`<p class="hint mt-4">No target job yet, so the score is re-weighted without compatibility.</p>`}`);
}

function renderKpis(m) {
  const gaps = m.gap ? m.gap.counts.missing + m.gap.counts.partial : null;
  const kpis = [
    { label: 'Profile completion', value: m.profile.score, suffix: '%', icon: 'user-round-check', foot: m.profile.missing.length ? `Missing: ${m.profile.missing[0]}` : 'Profile complete', href: 'profile.html' },
    { label: 'Skills identified', value: m.skillsCount, icon: 'sparkles', foot: `Avg. level ${m.avgSkill}%`, href: 'profile.html#skills' },
    { label: 'Skill gaps', value: gaps, icon: 'target', foot: m.gap ? `${m.gap.counts.missing} missing · ${m.gap.counts.partial} partial` : 'No target job yet', href: 'skill-gap.html' },
    { label: 'Applications', value: m.apps.total, icon: 'send', foot: `${m.apps.active} active`, href: 'applications.html' },
    { label: 'Interviews', value: m.apps.funnel.interview, icon: 'calendar-check', foot: `${m.apps.interviewRate}% conversion`, href: 'applications.html' },
    { label: 'Learning progress', value: m.learning.percent, suffix: '%', icon: 'graduation-cap', foot: `${m.learning.doneItems}/${m.learning.totalItems} roadmap items`, href: 'roadmap.html' },
  ];
  setHTML($('#kpis'), html`${kpis.map((k) => html`
    <a href="${k.href}" class="card card-hover kpi">
      <div class="kpi-top"><span class="kpi-label">${k.label}</span><span class="kpi-icon">${icon(k.icon)}</span></div>
      <div class="kpi-value">${k.value === null
        ? '—'
        : html`<span data-count="${k.value}">0</span>${k.suffix ? html`<small>${k.suffix}</small>` : ''}`}</div>
      <div class="kpi-foot">${k.foot}</div>
    </a>`)}`);
  $('#kpis').classList.add('stagger');
}

function renderCharts(s, m) {
  charts.forEach((c) => c.destroy());
  charts = [];
  const boxes = ['#chart-skills', '#chart-pipeline', '#chart-learning'].map((id) => $(id));
  if (!setupCharts()) {
    boxes.forEach((b) => setHTML(b, chartUnavailable()));
    return;
  }
  const t = chartTheme();
  const Chart = window.Chart;

  // Skill profile (radar)
  if (!s.skills.length) {
    setHTML(boxes[0], emptyState({ icon: 'sparkles', title: 'No skills yet', message: 'Add skills to see your profile.', action: { href: 'profile.html#skills', label: 'Add skills' }, compact: true }));
  } else {
    const avg = SKILL_CATEGORIES.map((c) => {
      const list = s.skills.filter((k) => k.category === c);
      return list.length ? Math.round(list.reduce((a, k) => a + k.level, 0) / list.length) : 0;
    });
    setHTML(boxes[0], html`<canvas role="img" aria-label="${`Average skill level: ${SKILL_CATEGORIES.map((c, i) => `${c} ${avg[i]}%`).join(', ')}`}"></canvas>`);
    charts.push(new Chart($('canvas', boxes[0]), {
      type: 'radar',
      data: { labels: SKILL_CATEGORIES, datasets: [{ label: 'Average level', data: avg, backgroundColor: t.c('brand', 0.2), borderColor: t.c('brand'), pointBackgroundColor: t.c('brand'), borderWidth: 2, pointRadius: 3 }] },
      options: {
        plugins: { legend: { display: false } },
        scales: { r: { min: 0, max: 100, ticks: { stepSize: 25, display: false }, grid: { color: t.grid }, angleLines: { color: t.grid }, pointLabels: { color: t.muted, font: { size: 11 } } } },
      },
    }));
  }

  // Application pipeline (bar)
  if (!m.apps.total) {
    setHTML(boxes[1], emptyState({ icon: 'send', title: 'No applications yet', message: 'Track your first application.', action: { href: 'applications.html', label: 'Add application' }, compact: true }));
  } else {
    const counts = APPLICATION_STATUSES.map((st) => m.apps.byStatus[st]);
    setHTML(boxes[1], html`<canvas role="img" aria-label="${`Applications by status: ${APPLICATION_STATUSES.map((st, i) => `${st} ${counts[i]}`).join(', ')}`}"></canvas>`);
    charts.push(new Chart($('canvas', boxes[1]), {
      type: 'bar',
      data: { labels: APPLICATION_STATUSES, datasets: [{ label: 'Applications', data: counts, backgroundColor: APPLICATION_STATUSES.map((st) => statusColor(t, st)), borderRadius: 6, maxBarThickness: 22 }] },
      options: {
        indexAxis: 'y',
        plugins: { legend: { display: false } },
        scales: { x: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: t.grid } }, y: { grid: { display: false } } },
      },
    }));
  }

  // Learning progress (doughnut)
  if (!m.learning.totalItems) {
    setHTML(boxes[2], emptyState({ icon: 'map', title: 'No roadmap yet', message: 'Generate a roadmap from your skill gaps.', action: { href: 'skill-gap.html', label: 'Open Skill Gap' }, compact: true }));
  } else {
    const remaining = m.learning.totalHours - m.learning.doneHours;
    setHTML(boxes[2], html`<canvas role="img" aria-label="${`${m.learning.doneHours} of ${m.learning.totalHours} roadmap hours completed`}"></canvas>
      <div class="pointer-events-none absolute inset-x-0 top-0 grid place-content-center text-center" style="bottom:36px">
        <strong class="text-3xl font-bold tabular">${m.learning.percent}%</strong><span class="text-xs text-muted">${m.learning.doneHours} / ${m.learning.totalHours} h</span>
      </div>`);
    charts.push(new Chart($('canvas', boxes[2]), {
      type: 'doughnut',
      data: { labels: ['Completed hours', 'Remaining hours'], datasets: [{ data: [m.learning.doneHours, remaining], backgroundColor: [t.c('success'), t.c('muted', 0.22)], borderWidth: 0, hoverOffset: 4 }] },
      options: { cutout: '74%', plugins: { legend: { position: 'bottom' } } },
    }));
  }
}

function renderActivity(s) {
  const events = [];
  s.applications.forEach((a) => a.history.forEach((h, i) => events.push({
    at: h.at, icon: h.status === 'Offer' ? 'party-popper' : h.status === 'Rejected' ? 'circle-x' : i === 0 ? 'plus' : 'arrow-right-left',
    text: html`${i === 0 ? 'Added' : 'Moved'} <strong>${a.jobTitle}</strong> at ${a.company} ${i === 0 ? 'as' : 'to'} <span class="badge status status-${h.status}">${h.status}</span>`,
  })));
  s.savedJobs.forEach((j) => events.push({ at: j.createdAt, icon: 'briefcase', text: html`Analyzed job <strong>${j.title}</strong>${j.company ? html` at ${j.company}` : ''}` }));
  (s.roadmap?.items || []).filter((i) => i.done && i.doneAt).forEach((i) => events.push({ at: i.doneAt, icon: 'circle-check', text: html`Completed roadmap week ${i.week}: <strong>${i.skill}</strong>` }));
  if (s.profile.lastCv?.analyzedAt) events.push({ at: s.profile.lastCv.analyzedAt, icon: 'file-search', text: html`Analyzed CV · score <strong>${s.profile.lastCv.score}/100</strong>` });
  if (s.profile.updatedAt) events.push({ at: s.profile.updatedAt, icon: 'user-round', text: html`Updated career profile` });

  const list = events.filter((e) => e.at).sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 7);
  if (!list.length) {
    setHTML($('#activity'), emptyState({ icon: 'activity', title: 'No activity yet', message: 'Your actions across CareerPilot AI will appear here.', compact: true }));
    return;
  }
  setHTML($('#activity'), html`<ol class="timeline">${list.map((e) => html`
    <li class="timeline-item">
      <span class="list-icon">${icon(e.icon)}</span>
      <div class="min-w-0 flex-1 pt-1.5"><p class="text-sm">${e.text}</p><p class="text-xs text-muted mt-0.5">${relativeTime(e.at)}</p></div>
    </li>`)}</ol>`);
}

function renderNextSteps(s, m) {
  const steps = [];
  const next = s.roadmap?.items.find((i) => !i.done);
  if (!s.activeJob) steps.push({ icon: 'briefcase', title: 'Analyze a target job', text: 'Paste a job description to find your skill gaps.', href: 'job-analyzer.html' });
  if (m.profile.missing.length) steps.push({ icon: 'user-round-pen', title: 'Complete your profile', text: `Add: ${m.profile.missing.slice(0, 2).join(', ')}.`, href: 'profile.html' });
  if (s.activeJob && !s.roadmap) steps.push({ icon: 'map', title: 'Generate your roadmap', text: 'Turn your gaps into a 12-week plan.', href: 'skill-gap.html' });
  if (next) steps.push({ icon: 'graduation-cap', title: `Week ${next.week}: ${next.skill}`, text: next.objective, href: 'roadmap.html' });
  if (!s.profile.lastCv) steps.push({ icon: 'file-search', title: 'Analyze your CV', text: 'Get simulated feedback on structure and skills.', href: 'cv-analyzer.html' });
  if (m.apps.byStatus.Saved) steps.push({ icon: 'send', title: `Apply to ${pluralize(m.apps.byStatus.Saved, 'saved role')}`, text: 'They are waiting in your tracker.', href: 'applications.html' });
  steps.push({ icon: 'lightbulb', title: 'Explore project ideas', text: 'Portfolio projects ranked by your gaps.', href: 'projects.html' });

  setHTML($('#next-steps'), html`<ul class="grid gap-2.5">${steps.slice(0, 4).map((st) => html`
    <li><a href="${st.href}" class="flex items-start gap-3 rounded-xl border border-line p-3 transition hover:border-brand/40 hover:bg-surface-2">
      <span class="kpi-icon">${icon(st.icon)}</span>
      <span class="min-w-0"><span class="block text-sm font-semibold">${st.title}</span><span class="block text-xs text-muted mt-0.5">${st.text}</span></span>
    </a></li>`)}</ul>`);
}
