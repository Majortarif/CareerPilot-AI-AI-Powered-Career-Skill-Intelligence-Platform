/**
 * CareerPilot AI — simulated "AI" engine.
 *
 * Everything in this file is deterministic, rule-based logic running in the browser.
 * There is no machine-learning model, no LLM and no network call. The same input
 * always produces the same output (see ai-sim.test.js).
 */
import { SKILLS, ROLE_PROFILES, PROJECTS, SAMPLE_CV_TEXT, APPLICATION_STATUSES } from './data.js';

/* ------------------------------------------------------------------------- */
/* Small helpers                                                             */
/* ------------------------------------------------------------------------- */

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const asciiLower = (s) => s.replace(/[A-Z]/g, (c) => c.toLowerCase());

/** djb2 string hash — used to pick deterministic variations. */
export function hashString(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
  return h;
}

const SKILL_INDEX = new Map(SKILLS.map((s) => [s.name.toLowerCase(), s]));

/** Look up a dictionary skill by name (case-insensitive). */
export function findSkill(name) {
  return SKILL_INDEX.get(String(name || '').trim().toLowerCase()) || null;
}

/** Category for a skill name, falling back to "Tools" for custom skills. */
export function categoryOf(name) {
  return findSkill(name)?.category || 'Tools';
}

/** Match a free-text job title to a known role profile. */
export function findRole(title) {
  const t = ` ${String(title || '').toLowerCase()} `;
  if (!t.trim()) return null;
  for (const role of ROLE_PROFILES) {
    if (role.title.toLowerCase() === t.trim()) return role;
  }
  for (const role of ROLE_PROFILES) {
    if (role.match.some((m) => new RegExp(`(^|[^a-z])${escapeRegex(m)}([^a-z]|$)`).test(t))) return role;
  }
  return null;
}

/* ------------------------------------------------------------------------- */
/* Skill extraction                                                          */
/* ------------------------------------------------------------------------- */

let MATCHERS = null;

function buildMatchers() {
  const list = [];
  for (const skill of SKILLS) {
    const cs = skill.cs || [];
    const csLower = new Set(cs.map((t) => t.toLowerCase()));
    const insensitive = new Set(
      [skill.name, ...(skill.aliases || [])].map((t) => t.toLowerCase()).filter((t) => !csLower.has(t)),
    );
    insensitive.forEach((term) => list.push({ term, skill, caseSensitive: false }));
    cs.forEach((term) => list.push({ term, skill, caseSensitive: true }));
  }
  // Longest terms first so "React Native" wins over "React", "Tailwind CSS" over "CSS", etc.
  list.sort((a, b) => b.term.length - a.term.length || cmp(a.term, b.term));
  for (const m of list) {
    // Short terms (C, R, Go, JS, ML) get stricter boundaries to avoid false positives.
    const short = m.term.length <= 2;
    const before = short ? '(?<![A-Za-z0-9+#_&.\\-])' : '(?<![A-Za-z0-9+#_&.])';
    const after = short ? '(?![A-Za-z0-9+#_&\\-])' : '(?![A-Za-z0-9+#_&])';
    m.re = new RegExp(before + escapeRegex(m.term) + after, 'g');
  }
  return list;
}

/**
 * Extract dictionary skills from free text.
 * Word-boundary safe (handles C++, C#, Node.js, CI/CD…). Longest match wins and is masked.
 * @param {string} text
 * @returns {{name:string, category:string, count:number}[]} sorted by count, then first appearance
 */
export function extractSkills(text) {
  if (!text || typeof text !== 'string') return [];
  if (!MATCHERS) MATCHERS = buildMatchers();
  let orig = text.replace(/\s+/g, ' ');
  let lower = asciiLower(orig);
  const found = new Map();

  for (const m of MATCHERS) {
    const hay = m.caseSensitive ? orig : lower;
    m.re.lastIndex = 0;
    const hits = [];
    let r;
    while ((r = m.re.exec(hay)) !== null) hits.push([r.index, r[0].length]);
    if (!hits.length) continue;
    for (const [i, len] of hits) {
      const pad = ' '.repeat(len);
      orig = orig.slice(0, i) + pad + orig.slice(i + len);
      lower = lower.slice(0, i) + pad + lower.slice(i + len);
    }
    const key = m.skill.name;
    const entry = found.get(key) || { name: key, category: m.skill.category, count: 0, first: Infinity };
    entry.count += hits.length;
    entry.first = Math.min(entry.first, hits[0][0]);
    found.set(key, entry);
  }

  return [...found.values()]
    .sort((a, b) => b.count - a.count || a.first - b.first)
    .map(({ name, category, count }) => ({ name, category, count }));
}

const STOPWORDS = new Set(`a about above across after again against all also am an and any are as at be because been before being
below between both but by can could did do does doing down during each etc few for from further had has have having he her here
hers him his how i if in into is it its itself just me more most my no nor not of off on once only or other our ours out over own
same she should so some such than that the their theirs them then there these they this those through to too under until up us very
was we were what when where which while who whom why will with would you your yours yourself able across also among around based
being using use used work working works team teams years year experience experiences including include includes new well within per
via strong good great skills skill knowledge understanding ability role job company looking join help like make makes making get
must required requirements preferred plus nice qualifications responsibilities bonus familiarity etc. e.g. i.e. one two three
level levels day days week weeks month months time clear clean our's you'll we're it's they're who're what's other others
role's candidate candidates position opportunity environment ideal equivalent related relevant least minimum hands-on`.split(/\s+/));

/**
 * Most frequent meaningful terms in a text.
 * @param {string} text
 * @param {number} [limit=12]
 * @returns {{term:string, count:number}[]}
 */
export function extractKeywords(text, limit = 12) {
  const counts = new Map();
  const tokens = String(text || '').toLowerCase().match(/[a-z][a-z0-9+#]*(?:[.\-/][a-z0-9+#]+)*/g) || [];
  for (const t of tokens) {
    if (t.length < 3 || STOPWORDS.has(t)) continue;
    counts.set(t, (counts.get(t) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || cmp(a[0], b[0]))
    .slice(0, limit)
    .map(([term, count]) => ({ term, count }));
}

/* ------------------------------------------------------------------------- */
/* CV analysis                                                               */
/* ------------------------------------------------------------------------- */

const CV_SECTIONS = [
  { id: 'summary', label: 'Professional summary', core: true,
    re: /^((professional|career)\s+)?(summary|profile|objective|about(\s+me)?)$/i },
  { id: 'education', label: 'Education', core: true,
    re: /^(education|academic\s+(background|qualifications)|qualifications)$/i },
  { id: 'experience', label: 'Work experience', core: true,
    re: /^((work|professional|relevant)\s+)?(experience|employment(\s+history)?|work\s+history|internships?)$/i },
  { id: 'projects', label: 'Projects', core: true,
    re: /^(((personal|academic|selected|key)\s+)?projects|portfolio)$/i },
  { id: 'skills', label: 'Skills', core: true,
    re: /^(((technical|core|key)\s+)?(skills|competencies)(\s*(&|and)\s*tools)?|technologies|tech\s+stack|tools)$/i },
  { id: 'certifications', label: 'Certifications', core: false,
    re: /^(certifications?|certificates|licenses(\s*(&|and)\s*certifications)?|courses|training)$/i },
];

const ACTION_VERBS = ['achieved', 'analyzed', 'analysed', 'architected', 'automated', 'built', 'collaborated', 'created',
  'delivered', 'deployed', 'designed', 'developed', 'engineered', 'implemented', 'improved', 'increased', 'launched', 'led',
  'managed', 'mentored', 'optimized', 'optimised', 'presented', 'published', 'reduced', 'researched', 'streamlined', 'trained'];

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE_RE = /\+?\d[\d\s().-]{7,}\d/;
const LINK_RE = /(linkedin\.com|github\.com|behance\.net|dribbble\.com|https?:\/\/|www\.)/i;
const QUANT_RE = /\b\d+(?:\.\d+)?\s?(?:%|percent\b|x\b|k\+?|\+)|\$\s?\d/gi;

function detectCvSections(text) {
  const found = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim().replace(/^[#*\-•\s]+/, '');
    if (!line || line.length > 60) continue;
    const head = (line.includes(':') ? line.split(':')[0] : line).trim();
    if (head.length > 40) continue;
    for (const s of CV_SECTIONS) if (s.re.test(head)) found[s.id] = true;
  }
  return found;
}

/**
 * Analyze a CV. The prototype never reads PDF contents: when only file metadata is given,
 * the built-in sample CV profile is analyzed instead. Nothing is uploaded anywhere.
 * @param {{text?:string, fileMeta?:{name:string,size:number,type?:string}, targetRole?:string}} input
 */
export function analyzeCV(input = {}) {
  const pasted = String(input.text || '').trim();
  const usedSample = !pasted;
  const text = usedSample ? SAMPLE_CV_TEXT : pasted;
  const source = pasted ? 'text' : input.fileMeta ? 'file' : 'sample';
  const lowerText = text.toLowerCase();

  const skills = extractSkills(text);
  const skillsByCategory = {};
  for (const s of skills) (skillsByCategory[s.category] ||= []).push(s.name);
  const categoryCount = Object.keys(skillsByCategory).length;

  const sectionsFound = detectCvSections(text);
  const hasEmail = EMAIL_RE.test(text);
  const hasPhone = PHONE_RE.test(text);
  const hasLinks = LINK_RE.test(text);
  const sections = Object.fromEntries(CV_SECTIONS.map((s) => [s.id, !!sectionsFound[s.id]]));
  sections.contact = hasEmail || hasPhone;
  sections.links = hasLinks;

  const wordCount = (text.match(/\S+/g) || []).length;
  const quantified = (text.match(QUANT_RE) || []).length;
  const actionVerbs = ACTION_VERBS.filter((v) => new RegExp(`\\b${v}\\b`, 'i').test(lowerText)).length;
  const softSkills = skills.filter((s) => s.category === 'Soft skills');

  const coreSections = CV_SECTIONS.filter((s) => s.core);
  const coreFound = coreSections.filter((s) => sections[s.id]).length + (sections.contact ? 1 : 0);
  const score = Math.round(
    (coreFound / (coreSections.length + 1)) * 45 +
    (sections.links ? 8 : 0) +
    (sections.certifications ? 5 : 0) +
    (Math.min(skills.length, 15) / 15) * 20 +
    (Math.min(categoryCount, 5) / 5) * 10 +
    (Math.min(quantified, 4) / 4) * 7 +
    (Math.min(actionVerbs, 8) / 8) * 5,
  );

  // Strengths
  const strengths = [];
  if (skills.length >= 10) strengths.push(`Broad technical toolkit: ${skills.length} skills detected across ${categoryCount} categories.`);
  const topCategory = Object.entries(skillsByCategory)
    .filter(([c]) => c !== 'Soft skills')
    .sort((a, b) => b[1].length - a[1].length || cmp(a[0], b[0]))[0];
  if (topCategory && topCategory[1].length >= 3) strengths.push(`Strong ${topCategory[0]} foundation (${topCategory[1].slice(0, 4).join(', ')}).`);
  if (quantified >= 2) strengths.push(`Uses measurable results: ${quantified} quantified achievements found.`);
  if (actionVerbs >= 5) strengths.push(`Action-oriented writing with ${actionVerbs} strong action verbs.`);
  if (sections.projects) strengths.push('Includes a projects section, which is valuable for early-career roles.');
  if (sections.links) strengths.push('Links to an online presence (GitHub, LinkedIn or portfolio).');
  if (sections.certifications) strengths.push('Lists certifications or courses that show continuous learning.');
  if (softSkills.length >= 2) strengths.push(`Mentions soft skills in context (${softSkills.slice(0, 3).map((s) => s.name).join(', ')}).`);
  if (!strengths.length) strengths.push('A clear starting point. Add more detail so strengths can be surfaced.');

  // Suggestions
  const suggestions = [];
  for (const s of coreSections) if (!sections[s.id]) suggestions.push(`Add a "${s.label}" section so recruiters can scan it quickly.`);
  if (!sections.contact) suggestions.push('Add contact details (email and phone) at the top.');
  if (quantified < 2) suggestions.push('Quantify your impact, e.g. "improved model accuracy by 12%" or "served 500+ users".');
  if (actionVerbs < 3) suggestions.push('Start bullet points with action verbs such as built, designed, optimized or led.');
  if (wordCount < 200) suggestions.push(`Your CV looks short (${wordCount} words). Aim for roughly 350–700 words.`);
  if (wordCount > 1000) suggestions.push(`Your CV is long (${wordCount} words). Consider trimming it to 1–2 pages.`);
  if (!softSkills.length) suggestions.push('Show soft skills through examples (e.g. collaboration in a team project).');
  if (!sections.links) suggestions.push('Add GitHub, LinkedIn or portfolio links so reviewers can see your work.');
  const role = findRole(input.targetRole);
  if (role) {
    const have = new Set(skills.map((s) => s.name.toLowerCase()));
    const missingForRole = role.skills.filter((n) => !have.has(n.toLowerCase())).slice(0, 4);
    if (missingForRole.length) suggestions.push(`For ${role.title} roles, consider highlighting ${missingForRole.join(', ')} if you have experience with them.`);
  }
  if (!suggestions.length) suggestions.push('Tailor the summary and top skills to each job you apply for.');

  const missingInfo = [
    ...coreSections.filter((s) => !sections[s.id]).map((s) => s.label),
    ...(sections.contact ? [] : ['Contact details']),
    ...(sections.links ? [] : ['Professional links']),
    ...(sections.certifications ? [] : ['Certifications (optional)']),
  ];

  return {
    source,
    usedSample,
    fileMeta: input.fileMeta ? { name: String(input.fileMeta.name), size: Number(input.fileMeta.size) || 0, type: input.fileMeta.type || '' } : null,
    score: clamp(score, 0, 100),
    stats: { wordCount, skillCount: skills.length, categoryCount, quantified, actionVerbs, sectionCount: Object.values(sections).filter(Boolean).length },
    skills,
    skillsByCategory,
    sections,
    missingInfo,
    strengths: strengths.slice(0, 6),
    suggestions: suggestions.slice(0, 7),
    keywords: extractKeywords(text, 14),
  };
}

/* ------------------------------------------------------------------------- */
/* Job description analysis                                                  */
/* ------------------------------------------------------------------------- */

const JD_HEADERS = [
  { ctx: 'preferred', re: /^(preferred(\s+(skills|qualifications|experience))?|nice[\s-]to[\s-]haves?|bonus(\s+points)?|good\s+to\s+have|pluses|desired|desirable|extra\s+credit)\b/i },
  { ctx: 'required', re: /^(requirements?|required(\s+(skills|qualifications|experience))?|must[\s-]haves?|(minimum\s+|basic\s+)?qualifications|what\s+you('|’)?ll\s+(need|bring)|what\s+we('|’)?re\s+looking\s+for|who\s+you\s+are|skills(\s*(&|and)\s*experience)?|you\s+have|about\s+you)\b/i },
  { ctx: 'responsibilities', re: /^((key\s+)?responsibilities|what\s+you('|’)?ll\s+do|what\s+you\s+will\s+do|your\s+role|duties|day[\s-]to[\s-]day|your\s+impact|in\s+this\s+role)\b/i },
  { ctx: 'other', re: /^(about(\s+(us|the\s+(company|team|role)))?|benefits|perks|why\s+join(\s+us)?|what\s+we\s+offer|role\s+overview|overview|the\s+company|salary|compensation|location)\b/i },
];
const BULLET_RE = /^\s*([-*•·▪‣◦]|\d+[.)])\s+/;
const PREFERRED_CUE = /\b(preferred|nice[\s-]to[\s-]have|bonus|a\s+plus|plus\s+if|desirable|ideally|good\s+to\s+have|familiarity|exposure\s+to|advantage(ous)?|optional)\b/i;
const REQUIRED_CUE = /\b(required|requires?|must|mandatory|essential|need(s|ed)?\s+to|proficien(t|cy)|strong|solid|expert(ise)?|hands[\s-]on|minimum|at\s+least)\b/i;
const EXPERIENCE_RE = /(\d{1,2})\s*(?:\+|plus)?\s*(?:(?:-|–|to)\s*(\d{1,2})\s*)?\+?\s*(?:years?|yrs?)\b/gi;

function detectJdHeader(line) {
  const cleaned = line.replace(BULLET_RE, '').replace(/^#+\s*/, '').trim();
  const colon = cleaned.indexOf(':');
  const head = (colon > -1 ? cleaned.slice(0, colon) : cleaned).trim();
  const rest = colon > -1 ? cleaned.slice(colon + 1).trim() : '';
  const words = head.split(/\s+/).length;
  if (head.length > 50 || (words > 5 && colon === -1)) return null;
  for (const h of JD_HEADERS) if (h.re.test(head)) return { ctx: h.ctx, rest };
  return null;
}

function seniorityFrom(title, experience) {
  const t = String(title).toLowerCase();
  if (/\bintern(ship)?\b/.test(t)) return 'Internship';
  if (/\b(junior|jr\.?|entry|graduate|trainee|associate)\b/.test(t)) return 'Entry level';
  if (/\b(lead|principal|staff|head|director)\b/.test(t)) return 'Lead';
  if (/\b(senior|sr\.?)\b/.test(t)) return 'Senior';
  if (experience) {
    if (experience.min <= 1) return 'Entry level';
    if (experience.min >= 5) return 'Senior';
  }
  return 'Mid level';
}

/**
 * Analyze a job description into required/preferred skills, responsibilities and metadata.
 * Required vs preferred is decided by section headers and cue words ("must", "nice to have"…).
 * @param {{title?:string, company?:string, description?:string}} job
 */
export function analyzeJob({ title = '', company = '', description = '' } = {}) {
  const lines = String(description).split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const required = new Map();
  const preferred = new Map();
  const responsibilities = [];
  const verbBullets = [];
  let ctx = 'none';

  const add = (map, s) => {
    const e = map.get(s.name) || { name: s.name, category: s.category, count: 0 };
    e.count += s.count;
    map.set(s.name, e);
  };

  extractSkills(title).forEach((s) => add(required, s));

  for (const raw of lines) {
    let line = raw;
    const header = detectJdHeader(line);
    if (header) {
      ctx = header.ctx;
      line = header.rest;
      if (!line) continue;
    }
    const isBullet = BULLET_RE.test(line);
    const content = line.replace(BULLET_RE, '').trim();
    const skills = extractSkills(content);

    let kind;
    if (PREFERRED_CUE.test(content) || ctx === 'preferred') kind = 'preferred';
    else if (ctx === 'other') kind = REQUIRED_CUE.test(content) ? 'required' : 'preferred';
    else kind = 'required';
    skills.forEach((s) => add(kind === 'required' ? required : preferred, s));

    if (ctx === 'responsibilities' && content.length > 12) responsibilities.push(content.replace(/[.;]$/, ''));
    else if (isBullet && ctx === 'none' && /^[A-Z][a-z]+(e|s|d)?\b/.test(content)) verbBullets.push(content.replace(/[.;]$/, ''));
  }

  for (const name of required.keys()) preferred.delete(name);
  const sortSkills = (map) => [...map.values()].sort((a, b) => b.count - a.count);
  const requiredSkills = sortSkills(required);
  const preferredSkills = sortSkills(preferred);
  const all = [...requiredSkills, ...preferredSkills];

  let experience = null;
  let m;
  EXPERIENCE_RE.lastIndex = 0;
  while ((m = EXPERIENCE_RE.exec(description)) !== null) {
    const min = Number(m[1]);
    const max = m[2] ? Number(m[2]) : null;
    if (min > 30) continue;
    if (!experience || min < experience.min) experience = { min, max };
  }
  if (experience) experience.label = experience.max ? `${experience.min}–${experience.max} years` : `${experience.min}+ years`;

  const role = findRole(title);
  return {
    title: String(title).trim(),
    company: String(company).trim(),
    role: role ? role.title : null,
    seniority: seniorityFrom(title, experience),
    experience,
    requiredSkills,
    preferredSkills,
    technologies: all.filter((s) => s.category !== 'Soft skills').map((s) => s.name),
    softSkills: all.filter((s) => s.category === 'Soft skills').map((s) => s.name),
    responsibilities: (responsibilities.length ? responsibilities : verbBullets).slice(0, 10),
    keywords: extractKeywords(description, 12),
    stats: {
      wordCount: (String(description).match(/\S+/g) || []).length,
      requiredCount: requiredSkills.length,
      preferredCount: preferredSkills.length,
    },
  };
}

/* ------------------------------------------------------------------------- */
/* Skill gap                                                                 */
/* ------------------------------------------------------------------------- */

export const GAP_THRESHOLDS = { strong: 70, partial: 30 };
const STATUS_VALUE = { strong: 1, partial: 0.5, missing: 0 };

/** 🟢 strong ≥ 70 · 🟡 partial 30–69 · 🔴 missing < 30 or absent */
export function skillStatus(level) {
  if (level === null || level === undefined || Number.isNaN(Number(level))) return 'missing';
  if (level >= GAP_THRESHOLDS.strong) return 'strong';
  if (level >= GAP_THRESHOLDS.partial) return 'partial';
  return 'missing';
}

const namesOf = (list) => (list || []).map((s) => (typeof s === 'string' ? s : s.name)).filter(Boolean);

/**
 * Compare user skills with job skills.
 * Compatibility = (0.7 × requiredScore + 0.3 × preferredScore) × 100, with Strong = 1, Partial = 0.5, Missing = 0.
 * If a job lists only required (or only preferred) skills, the available group carries the full weight.
 * @param {{name:string, level:number, category?:string}[]} userSkills
 * @param {{requiredSkills?:any[], preferredSkills?:any[], required?:any[], preferred?:any[]}} jobSkills
 */
export function computeSkillGap(userSkills = [], jobSkills = {}) {
  const required = namesOf(jobSkills.requiredSkills || jobSkills.required);
  const requiredSet = new Set(required.map((n) => n.toLowerCase()));
  const preferred = namesOf(jobSkills.preferredSkills || jobSkills.preferred).filter((n) => !requiredSet.has(n.toLowerCase()));
  const userMap = new Map(userSkills.map((s) => [String(s.name).toLowerCase(), s]));

  const items = [
    ...required.map((n) => ({ n, type: 'required' })),
    ...preferred.map((n) => ({ n, type: 'preferred' })),
  ].map(({ n, type }) => {
    const u = userMap.get(n.toLowerCase());
    const level = u ? clamp(Math.round(Number(u.level) || 0), 0, 100) : null;
    const status = skillStatus(level);
    return { skill: n, category: u?.category || categoryOf(n), type, userLevel: level, status, value: STATUS_VALUE[status] };
  });

  const avg = (arr) => (arr.length ? arr.reduce((s, i) => s + i.value, 0) / arr.length : null);
  const requiredScore = avg(items.filter((i) => i.type === 'required'));
  const preferredScore = avg(items.filter((i) => i.type === 'preferred'));
  let compatibility = null;
  if (requiredScore !== null && preferredScore !== null) compatibility = Math.round((0.7 * requiredScore + 0.3 * preferredScore) * 100);
  else if (requiredScore !== null) compatibility = Math.round(requiredScore * 100);
  else if (preferredScore !== null) compatibility = Math.round(preferredScore * 100);

  const counts = { strong: 0, partial: 0, missing: 0 };
  items.forEach((i) => counts[i.status]++);
  return { items, counts, requiredScore, preferredScore, compatibility, total: items.length };
}

/* ------------------------------------------------------------------------- */
/* Learning roadmap                                                          */
/* ------------------------------------------------------------------------- */

const PHASES = ['Foundations', 'Applied practice', 'Build & ship'];
const PHASE_HOURS = [6, 7, 8];

const ROADMAP_TEMPLATES = {
  Programming: {
    objective: ['Understand {skill} syntax, data types and control flow', 'Write clean, modular {skill} code with error handling', 'Use {skill} to ship a small, tested tool'],
    practice: ['Complete 10 short {skill} exercises on strings, lists and functions', 'Refactor an old script into {skill} modules and add unit tests', 'Solve 5 medium problems and compare with idiomatic solutions'],
    miniProject: ['Command-line unit converter written in {skill}', 'File organizer script with logging in {skill}', 'Publish a small {skill} utility on GitHub with a README'],
  },
  'ML/AI': {
    objective: ['Learn the core concepts and workflow of {skill}', 'Train and evaluate models with {skill} on a real dataset', 'Package a {skill} model so others can use it'],
    practice: ['Follow the official {skill} tutorial and summarise the key ideas', 'Run 3 experiments, compare metrics and document the trade-offs', 'Add an evaluation report and a simple inference script'],
    miniProject: ['Baseline notebook using {skill} on a public dataset', 'Model comparison report with {skill} and clear charts', 'Serve a {skill} model behind a small API or demo UI'],
  },
  Data: {
    objective: ['Understand {skill} fundamentals and common use-cases', 'Apply {skill} to clean, query or analyze a real dataset', 'Turn {skill} work into insights someone can act on'],
    practice: ['Work through 15 guided {skill} exercises', 'Answer 10 business questions with {skill} on an open dataset', 'Write a short insight summary with 3 key findings'],
    miniProject: ['Cheat sheet of the {skill} operations you use most', 'Exploratory analysis notebook powered by {skill}', 'Mini case study: question → {skill} analysis → recommendation'],
  },
  Web: {
    objective: ['Learn the building blocks of {skill}', 'Build interactive, accessible features with {skill}', 'Ship a responsive {skill} project to production'],
    practice: ['Recreate 3 small UI components with {skill}', 'Build one feature end-to-end with {skill}, including loading and error states', 'Audit performance and accessibility, then fix the top issues'],
    miniProject: ['Static landing page using {skill}', 'Notes app built with {skill}', 'Deploy a {skill} portfolio piece with a live link'],
  },
  'Cloud/DevOps': {
    objective: ['Understand what {skill} solves and its core concepts', 'Automate a real workflow with {skill}', 'Operate a small service reliably with {skill}'],
    practice: ['Complete the {skill} getting-started guide in a sandbox', 'Script a repeatable setup with {skill} and document each step', 'Add health checks, logs and a rollback plan'],
    miniProject: ['Hello-world deployment using {skill}', 'Containerize or automate an existing project with {skill}', 'One-click deploy pipeline for a portfolio app using {skill}'],
  },
  Tools: {
    objective: ['Get comfortable with the core features of {skill}', 'Use {skill} in a realistic day-to-day workflow', 'Show confident {skill} usage in a portfolio artifact'],
    practice: ['Follow a beginner {skill} walkthrough and take notes', 'Use {skill} daily on a small project for a week', 'Teach one {skill} workflow to a friend or write a how-to'],
    miniProject: ['Personal {skill} cheat sheet', 'Small team-style project managed with {skill}', 'Portfolio case study showing your {skill} workflow'],
  },
  'Soft skills': {
    objective: ['Understand what strong {skill} looks like at work', 'Practice {skill} in low-stakes situations', 'Demonstrate {skill} with concrete evidence'],
    practice: ['Read 2 articles on {skill} and write 3 personal takeaways', 'Apply {skill} in a group project or community meetup', 'Ask a peer or mentor for feedback on your {skill}'],
    miniProject: ['Write a STAR story that shows {skill}', 'Prepare a 3-minute talk and practise it with a friend', 'Add a concrete {skill} example to your CV and LinkedIn'],
  },
};

function importanceOf(g) {
  const typeWeight = g.type === 'required' ? 2 : 1;
  const statusWeight = g.status === 'missing' ? 1 : 0.6 + ((GAP_THRESHOLDS.strong - (g.userLevel || 0)) / 100) * 0.4;
  return typeWeight * statusWeight;
}

function phasePlan(status, weeks) {
  if (status === 'missing') return [[0], [0, 2], [0, 1, 2]][weeks - 1];
  return [[1], [1, 2]][weeks - 1];
}

function makeItem(g, week, phaseIdx, compact = false) {
  const tpl = ROADMAP_TEMPLATES[g.category] || ROADMAP_TEMPLATES.Tools;
  const fill = (s) => s.replaceAll('{skill}', g.skill);
  const soft = g.category === 'Soft skills';
  let hours = compact ? (phaseIdx === 0 ? 6 : 4) : PHASE_HOURS[phaseIdx];
  if (soft) hours = Math.max(2, Math.round(hours / 2));
  return {
    id: `w${week}-${slug(g.skill)}-${phaseIdx}`,
    week,
    type: 'skill',
    skill: g.skill,
    category: g.category,
    priority: g.type,
    gapStatus: g.status,
    phase: PHASES[phaseIdx],
    objective: fill(tpl.objective[phaseIdx]),
    practice: fill(tpl.practice[phaseIdx]),
    miniProject: fill(tpl.miniProject[phaseIdx]),
    hours,
    done: false,
  };
}

function extraWeeks(count, focus) {
  if (count <= 0) return [];
  const top = focus.slice(0, 3).map((g) => g.skill);
  const withInterview = count >= 3;
  const withReview = count >= 2;
  const capstoneWeeks = count - (withInterview ? 1 : 0) - (withReview ? 1 : 0);
  const out = [];
  for (let i = 1; i <= capstoneWeeks; i++) {
    out.push({
      type: 'capstone', skill: capstoneWeeks > 1 ? `Capstone project (part ${i}/${capstoneWeeks})` : 'Capstone project',
      category: 'Portfolio', priority: 'required', gapStatus: null, phase: 'Capstone',
      objective: `Combine ${top.join(', ')} in one portfolio project`,
      practice: i === 1 ? 'Scope an MVP, set up the repo and build the core feature' : 'Polish, test and write a README with screenshots',
      miniProject: 'An end-to-end project that mirrors the target job', hours: 10,
    });
  }
  if (withInterview) out.push({
    type: 'career', skill: 'Interview preparation', category: 'Career', priority: 'required', gapStatus: null, phase: 'Career',
    objective: 'Explain your new skills clearly under interview conditions',
    practice: 'Do two mock interviews and answer 20 role-specific questions',
    miniProject: 'Record a 3-minute walkthrough of your capstone project', hours: 6,
  });
  if (withReview) out.push({
    type: 'career', skill: 'Review & apply', category: 'Career', priority: 'required', gapStatus: null, phase: 'Career',
    objective: 'Consolidate what you learned and turn it into applications',
    practice: 'Update your CV, LinkedIn and portfolio, then apply to 5 matching roles',
    miniProject: 'Publish a short write-up of your learning journey', hours: 5,
  });
  return out;
}

/**
 * Build a week-by-week learning roadmap from skill-gap items.
 * Missing/partial skills are ordered by importance (required > preferred, missing > partial)
 * and spread across `weeks`. Spare weeks become capstone, interview and review weeks.
 * @param {object[]|{items:object[]}} gaps computeSkillGap().items (or the whole result)
 * @param {number} [weeks=12]
 * @returns {object[]} items with week, skill, objective, practice, miniProject, hours, done
 */
export function buildRoadmap(gaps, weeks = 12) {
  const items = Array.isArray(gaps) ? gaps : gaps?.items || [];
  const total = clamp(Math.round(Number(weeks) || 12), 4, 24);
  // Ties keep the job-description order (most mentioned first), which is itself deterministic.
  const focus = items
    .filter((g) => g.status && g.status !== 'strong')
    .map((g, idx) => ({ ...g, importance: importanceOf(g), idx }))
    .sort((a, b) => b.importance - a.importance || a.idx - b.idx);
  if (!focus.length) return [];

  if (focus.length >= total) {
    return focus.map((g, i) => makeItem(g, Math.floor((i * total) / focus.length) + 1, g.status === 'missing' ? 0 : 1, true));
  }

  const alloc = focus.map(() => 1);
  const cap = (g) => (g.status === 'missing' ? 3 : 2);
  let remaining = total - focus.length;
  let progressed = true;
  while (remaining > 0 && progressed) {
    progressed = false;
    for (let i = 0; i < focus.length && remaining > 0; i++) {
      if (alloc[i] < cap(focus[i])) { alloc[i]++; remaining--; progressed = true; }
    }
  }

  const out = [];
  let week = 1;
  focus.forEach((g, i) => phasePlan(g.status, alloc[i]).forEach((p) => out.push(makeItem(g, week++, p))));
  extraWeeks(remaining, focus).forEach((x) => {
    const w = week++;
    out.push({ ...x, id: `w${w}-${slug(x.skill)}`, week: w, done: false });
  });
  return out;
}

/* ------------------------------------------------------------------------- */
/* Project recommendations                                                   */
/* ------------------------------------------------------------------------- */

const DIFFICULTY_ORDER = { Beginner: 0, Intermediate: 1, Advanced: 2 };

/**
 * Rank curated projects by overlap with skill gaps and the target role.
 * @param {string} targetRole
 * @param {object[]} gaps computeSkillGap().items
 * @param {{category?:string, difficulty?:string, technology?:string, objective?:string, query?:string}} [filters]
 */
export function recommendProjects(targetRole, gaps = [], filters = {}) {
  const role = findRole(targetRole);
  const gapWeight = new Map();
  (Array.isArray(gaps) ? gaps : gaps?.items || []).forEach((g) => {
    if (g.status === 'missing') gapWeight.set(g.skill.toLowerCase(), 2);
    else if (g.status === 'partial') gapWeight.set(g.skill.toLowerCase(), 1);
  });
  const q = String(filters.query || '').trim().toLowerCase();

  return PROJECTS
    .filter((p) => !filters.category || p.category === filters.category)
    .filter((p) => !filters.difficulty || p.difficulty === filters.difficulty)
    .filter((p) => !filters.technology || p.technologies.includes(filters.technology))
    .filter((p) => !filters.objective || p.objectives.includes(filters.objective))
    .filter((p) => !q || `${p.title} ${p.summary} ${p.technologies.join(' ')}`.toLowerCase().includes(q))
    .map((p) => {
      const matchedGaps = p.technologies.filter((t) => gapWeight.has(t.toLowerCase()));
      const gapScore = matchedGaps.reduce((s, t) => s + gapWeight.get(t.toLowerCase()), 0);
      const roleMatch = !!role && p.roles.includes(role.id);
      const score = gapScore * 2 + (roleMatch ? 3 : 0);
      const match = score >= 8 ? 'Top match' : score >= 4 ? 'Good match' : 'Explore';
      return { ...p, score, matchedGaps, roleMatch, match };
    })
    .sort((a, b) => b.score - a.score || DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty] || cmp(a.title, b.title));
}

/* ------------------------------------------------------------------------- */
/* Derived metrics                                                           */
/* ------------------------------------------------------------------------- */

/** Profile completion score (0–100) and the list of missing items. */
export function profileCompletion(profile = {}, skills = []) {
  const p = profile || {};
  const checks = [
    ['Full name', 10, !!p.fullName?.trim()],
    ['Headline', 10, !!p.headline?.trim()],
    ['Location', 5, !!p.location?.trim()],
    ['Target role', 15, !!p.targetRole?.trim()],
    ['Experience level', 5, !!p.experienceLevel],
    ['Summary (40+ characters)', 15, String(p.summary || '').trim().length >= 40],
    ['Education', 15, (p.education || []).some((e) => e.degree?.trim() && e.institution?.trim())],
    ['At least 5 skills', 15, skills.length >= 5],
    ['A professional link', 10, Object.values(p.links || {}).some((v) => v && String(v).trim())],
  ];
  return {
    score: checks.reduce((s, [, w, ok]) => s + (ok ? w : 0), 0),
    missing: checks.filter((c) => !c[2]).map((c) => c[0]),
  };
}

/** Roadmap progress by hours and items. */
export function learningProgress(roadmap) {
  const items = roadmap?.items || [];
  const totalHours = items.reduce((s, i) => s + (Number(i.hours) || 0), 0);
  const doneHours = items.filter((i) => i.done).reduce((s, i) => s + (Number(i.hours) || 0), 0);
  return {
    totalItems: items.length,
    doneItems: items.filter((i) => i.done).length,
    totalHours,
    doneHours,
    percent: totalHours ? Math.round((doneHours / totalHours) * 100) : 0,
  };
}

/** Average skill level (0–100). */
export function averageSkillLevel(skills = []) {
  if (!skills.length) return 0;
  return Math.round(skills.reduce((s, k) => s + (Number(k.level) || 0), 0) / skills.length);
}

/**
 * Prototype "career readiness" metric:
 * 40% job compatibility + 20% profile completion + 20% learning progress + 20% average skill level.
 * Without an analyzed job, the remaining parts are re-weighted.
 */
export function careerReadiness({ compatibility = null, profileScore = 0, learningPercent = 0, avgSkillLevel = 0 } = {}) {
  const parts = [[profileScore, 0.2], [learningPercent, 0.2], [avgSkillLevel, 0.2]];
  if (compatibility !== null && compatibility !== undefined) parts.push([compatibility, 0.4]);
  const wsum = parts.reduce((s, [, w]) => s + w, 0);
  return { score: Math.round(parts.reduce((s, [v, w]) => s + v * w, 0) / wsum), hasJob: parts.length === 4 };
}

const STAGE_RANK = { Saved: 0, Applied: 1, Screening: 2, Interview: 3, Offer: 4, Rejected: 1, Withdrawn: 1 };

/** Highest pipeline stage an application reached (0 Saved … 4 Offer). */
export function stageReached(app) {
  const statuses = [app.status, ...(app.history || []).map((h) => h.status)];
  return Math.max(0, ...statuses.map((s) => STAGE_RANK[s] ?? 0));
}

/** Application counts, funnel and conversion rates. */
export function applicationStats(apps = []) {
  const byStatus = Object.fromEntries(APPLICATION_STATUSES.map((s) => [s, 0]));
  apps.forEach((a) => { byStatus[a.status] = (byStatus[a.status] || 0) + 1; });
  const reached = [0, 0, 0, 0, 0];
  apps.forEach((a) => { const r = stageReached(a); for (let i = 0; i <= r; i++) reached[i]++; });
  const applied = reached[1];
  return {
    total: apps.length,
    byStatus,
    active: byStatus.Applied + byStatus.Screening + byStatus.Interview,
    funnel: { applied, screening: reached[2], interview: reached[3], offer: reached[4] },
    interviewRate: applied ? Math.round((reached[3] / applied) * 100) : 0,
    offerRate: applied ? Math.round((reached[4] / applied) * 100) : 0,
  };
}

/* ------------------------------------------------------------------------- */
/* Assistant                                                                 */
/* ------------------------------------------------------------------------- */

const INTENTS = [
  { id: 'skills', words: ['skill', 'skills', 'gap', 'gaps', 'missing', 'lack', 'strong', 'weak', 'weakness', 'compatib', 'match', 'fit'] },
  { id: 'roadmap', words: ['roadmap', 'learn', 'study', 'plan', 'week', 'next step', 'course', 'what should i do'] },
  { id: 'cv', words: ['cv', 'resume', 'résumé', 'curriculum'] },
  { id: 'interview', words: ['interview', 'prepare', 'preparation', 'question', 'behavioral', 'behavioural', 'star method', 'hr'] },
  { id: 'applications', words: ['application', 'applied', 'apply', 'tracker', 'status', 'offer', 'rejected', 'job hunt', 'follow up', 'follow-up'] },
  { id: 'projects', words: ['project', 'portfolio', 'build', 'idea', 'ideas'] },
  { id: 'progress', words: ['progress', 'analytics', 'stats', 'ready', 'readiness', 'doing', 'overview', 'summary', 'dashboard'] },
  { id: 'help', words: ['help', 'what can you do', 'commands', 'features', 'how does this work', 'who are you'] },
  { id: 'greeting', words: ['hi', 'hello', 'hey', 'salam', 'assalamu', 'good morning', 'good evening', 'thanks', 'thank you'] },
];

const SUGGESTIONS = {
  skills: ['Build my learning roadmap', 'Suggest a portfolio project', 'How ready am I?'],
  roadmap: ['What skills am I missing?', 'Suggest a portfolio project', 'Give me interview tips'],
  cv: ['What skills am I missing?', 'Give me interview tips', 'How are my applications going?'],
  interview: ['What skills am I missing?', 'How can I improve my CV?', 'Show my roadmap progress'],
  applications: ['Give me interview tips', 'How ready am I?', 'What skills am I missing?'],
  projects: ['Show my roadmap progress', 'What skills am I missing?', 'How can I improve my CV?'],
  progress: ['What skills am I missing?', 'Show my roadmap progress', 'How are my applications going?'],
  help: ['What skills am I missing?', 'Show my roadmap progress', 'Suggest a portfolio project'],
  greeting: ['What skills am I missing?', 'How can I improve my CV?', 'Give me interview tips'],
  fallback: ['What skills am I missing?', 'Show my roadmap progress', 'Give me interview tips'],
};

const INTERVIEW_QUESTIONS = [
  'Tell me about a project you are proud of. What was your exact contribution?',
  'Describe a time you had to learn a new tool quickly. How did you approach it?',
  'Walk me through how you would debug a model or feature that suddenly performs worse.',
  'Tell me about a disagreement in a team and how you resolved it.',
  'How would you explain a technical result to a non-technical stakeholder?',
  'What is one mistake you made on a project, and what did you change afterwards?',
];

function detectIntent(message) {
  const norm = ` ${String(message || '').toLowerCase().replace(/[^a-z0-9/+#\s'-]/g, ' ').replace(/\s+/g, ' ')} `;
  let best = null;
  let bestScore = 0;
  for (const intent of INTENTS) {
    let score = 0;
    for (const w of intent.words) {
      const re = w.length < 4 || w.includes(' ')
        ? new RegExp(`\\s${escapeRegex(w)}(?=[\\s'-])`)
        : new RegExp(`\\s${escapeRegex(w)}`);
      if (re.test(norm)) score++;
    }
    if (intent.id === 'greeting' && score) score = 0.5; // only wins when nothing else matches
    if (score > bestScore) { best = intent.id; bestScore = score; }
  }
  return best || 'fallback';
}

const listOr = (arr, empty = 'none yet') => (arr.length ? arr.join(', ') : empty);

/**
 * Rule-based assistant reply using the user's stored data.
 * Returns simple markdown-like text (**bold**, "- " bullets) that the UI renders safely.
 * @param {string} message
 * @param {{profile?:object, skills?:object[], applications?:object[], roadmap?:object, activeJob?:object}} context
 * @returns {{text:string, intent:string, suggestions:string[]}}
 */
export function assistantReply(message, context = {}) {
  const intent = detectIntent(message);
  const profile = context.profile || {};
  const skills = context.skills || [];
  const apps = context.applications || [];
  const roadmap = context.roadmap || null;
  const job = context.activeJob || null;
  const gap = job?.analysis ? computeSkillGap(skills, job.analysis) : null;
  const firstName = String(profile.fullName || '').trim().split(/\s+/)[0] || '';
  const role = profile.targetRole || job?.title || '';
  const lines = [];

  switch (intent) {
    case 'skills': {
      if (!gap) {
        const top = [...skills].sort((a, b) => b.level - a.level || cmp(a.name, b.name)).slice(0, 5).map((s) => s.name);
        lines.push(`You have **${skills.length} skills** in your profile${top.length ? `. Your strongest are ${top.join(', ')}` : ''}.`);
        lines.push('', 'To see gaps, analyze a job description in the **Job Analyzer** and I will compare it with your skills.');
      } else {
        const by = (st) => gap.items.filter((i) => i.status === st).map((i) => i.skill);
        const priorities = gap.items.filter((i) => i.status !== 'strong' && i.type === 'required').slice(0, 3).map((i) => i.skill);
        lines.push(`For **${job.title}**${job.company ? ` at ${job.company}` : ''} your prototype compatibility is **${gap.compatibility ?? 0}%**.`);
        lines.push(`- 🟢 Strong: ${listOr(by('strong'))}`, `- 🟡 Partial: ${listOr(by('partial'))}`, `- 🔴 Missing: ${listOr(by('missing'))}`);
        lines.push('', priorities.length
          ? `Focus first on **${priorities.join(', ')}**. The job lists them as required.`
          : 'All required skills are strong. Polish the preferred ones next.');
        lines.push('', '_Prototype score. Not a hiring probability._');
      }
      break;
    }
    case 'roadmap': {
      const items = roadmap?.items || [];
      if (!items.length) {
        lines.push("You don't have a roadmap yet. Open **Skill Gap** and choose **Generate roadmap**. I'll spread your gaps across 12 weeks.");
      } else {
        const p = learningProgress(roadmap);
        const next = items.find((i) => !i.done);
        lines.push(`You've completed **${p.doneItems}/${p.totalItems}** roadmap items (**${p.percent}%** of planned hours).`);
        if (next) lines.push('', `Up next: **Week ${next.week}: ${next.skill}** (${next.phase})`, `- Objective: ${next.objective}`, `- Practice: ${next.practice}`, `- Mini project: ${next.miniProject}`);
        else lines.push('', 'Every item is done. Great work! Time to update your CV and apply.');
      }
      break;
    }
    case 'cv': {
      const cv = profile.lastCv;
      if (cv) {
        lines.push(`Your last CV analysis (${cv.label || 'CV'}) scored **${cv.score}/100** in this prototype.`);
        if (cv.suggestions?.length) lines.push('', 'Top suggestions:', ...cv.suggestions.slice(0, 3).map((s) => `- ${s}`));
      } else {
        lines.push("I haven't seen a CV analysis yet. Try the **CV Analyzer**. Meanwhile, some quick wins:");
        lines.push('- Start each bullet with an action verb (built, designed, optimized).', '- Quantify impact with numbers or percentages.',
          `- Put the skills most relevant to ${role || 'your target role'} near the top.`, '- Add GitHub, LinkedIn or portfolio links.');
      }
      break;
    }
    case 'interview': {
      const strong = [...skills].filter((s) => s.level >= GAP_THRESHOLDS.strong && s.category !== 'Soft skills')
        .sort((a, b) => b.level - a.level || cmp(a.name, b.name)).map((s) => s.name);
      const missing = gap ? gap.items.filter((i) => i.status === 'missing').map((i) => i.skill) : [];
      const q = INTERVIEW_QUESTIONS[hashString(`${message}|${role}`) % INTERVIEW_QUESTIONS.length];
      lines.push(`Interview prep for **${role || 'your target role'}**:`);
      lines.push('- Prepare 3 STAR stories (Situation, Task, Action, Result): teamwork, a hard problem, and measurable impact.');
      lines.push(`- Be ready to explain ${strong[0] || 'your strongest skill'} fundamentals and a project where you used it.`);
      lines.push(`- Expect a question on ${missing[0] || 'a skill you are still learning'}. Explain honestly how you are learning it; your roadmap helps.`);
      lines.push('- Research the company and prepare 2 thoughtful questions for the interviewer.');
      lines.push('', `Practice question: **"${q}"**`);
      break;
    }
    case 'applications': {
      if (!apps.length) {
        lines.push('No applications tracked yet. Add your first one in the **Application Tracker**.');
        break;
      }
      const st = applicationStats(apps);
      lines.push(`You're tracking **${st.total} applications**: ${st.active} active, ${st.funnel.interview} reached interview and ${st.funnel.offer} with an offer.`);
      lines.push(`- Interview conversion: **${st.interviewRate}%** of applications`);
      lines.push(`- Offer rate: **${st.offerRate}%**`);
      const staleCutoff = Date.now() - 10 * 864e5;
      const stale = apps.filter((a) => a.status === 'Applied' && new Date(a.updatedAt || a.createdAt).getTime() < staleCutoff).map((a) => a.company);
      if (stale.length) lines.push(`- Consider a polite follow-up with: ${stale.slice(0, 3).join(', ')}`);
      if (st.byStatus.Saved) lines.push(`- ${st.byStatus.Saved} saved role(s) are waiting for you to apply.`);
      break;
    }
    case 'projects': {
      const recs = recommendProjects(role, gap?.items || []).slice(0, 3);
      lines.push(`Based on your target role${role ? ` (**${role}**)` : ''} and skill gaps, try:`);
      recs.forEach((p) => lines.push(`- **${p.title}** (${p.difficulty}, ~${p.weeks} wk): practises ${listOr(p.matchedGaps.length ? p.matchedGaps : p.technologies.slice(0, 3))}`));
      lines.push('', 'See all ideas in **Project Recommendations**.');
      break;
    }
    case 'progress': {
      const pc = profileCompletion(profile, skills).score;
      const lp = learningProgress(roadmap).percent;
      const r = careerReadiness({ compatibility: gap?.compatibility ?? null, profileScore: pc, learningPercent: lp, avgSkillLevel: averageSkillLevel(skills) });
      lines.push(`Here's your snapshot${firstName ? `, ${firstName}` : ''}:`);
      lines.push(`- Career readiness: **${r.score}%** (prototype metric)`, `- Profile completion: **${pc}%**`, `- Learning progress: **${lp}%**`, `- Applications tracked: **${apps.length}**`);
      if (!r.hasJob) lines.push('', 'Analyze a target job to include compatibility in your readiness score.');
      break;
    }
    case 'greeting':
      lines.push(`Hi${firstName ? ` ${firstName}` : ''}! 👋 I'm your simulated career assistant. Ask me about skill gaps, your roadmap, your CV, interviews, applications or project ideas.`);
      break;
    case 'help':
      lines.push("I'm a **simulated assistant**. I use simple rules and the data saved in this browser, not a language model. You can ask about:");
      lines.push('- your skill gaps for a target job', '- your learning roadmap and what to do next', '- improving your CV', '- interview preparation', '- how your applications are going', '- portfolio project ideas');
      break;
    default:
      lines.push("I'm not sure I understood that. I'm a rule-based prototype, so I work best with questions like the ones below.");
  }

  return { text: lines.join('\n'), intent, suggestions: SUGGESTIONS[intent] || SUGGESTIONS.fallback };
}
