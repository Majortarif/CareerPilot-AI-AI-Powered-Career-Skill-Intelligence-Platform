# CareerPilot AI — Project Report

**Stage:** A (Frontend Prototype) · **Status:** implemented and browser-tested; Docker checkpoint pending (see [Verification status](#6-verification-status))
**Owner:** Tariful Hoque

---

## 1. Goals

1. Give early-career job seekers one place to understand their skills, compare them with real job requirements, plan learning and track applications.
2. Demonstrate product thinking, UI/UX and frontend engineering in a portfolio-ready prototype.
3. Be **honest**: the "AI" is a transparent, deterministic simulation, and the docs say so.
4. Prepare for a full-stack Stage B (FastAPI + PostgreSQL) without rewriting the UI.

## 2. What was built (Stage A)

- **12 pages:** landing, dashboard, profile, CV analyzer, job analyzer, skill gap, roadmap, projects, applications, analytics, assistant, settings.
- **Simulated AI engine** (`ai-sim.js`): skill extraction, CV analysis, job analysis, skill gap, roadmap builder, project ranking, assistant replies, derived metrics.
- **Data layer:** `storage.js` (versioned LocalStorage wrapper) → `api.js` (async data-access layer used by every page).
- **Demo data:** loaded on the first visit, each record flagged `demo: true`, removable from Settings.
- **Docker:** nginx image with health check, one `web` service in Compose.
- Roughly 6,400 lines of HTML/CSS/JS, with no framework and no build step.

## 3. Architecture

```text
HTML page ─▶ page module (e.g. dashboard.js)
                 ├─▶ app.js      shell, theme, toasts, modals, html`` escaping, charts theme
                 ├─▶ ai-sim.js   deterministic logic ─▶ data.js (dictionary, roles, projects, samples)
                 └─▶ api.js      data access ─▶ storage.js ─▶ LocalStorage (cp:v1:*)
```

- **Boot sequence** (`bootPage`): apply the motion preference, render the shell (sidebar, top bar, bottom nav), run `api.init()` (storage check + first-visit demo seeding), then run the page renderer. Any uncaught error becomes a page-level error state with a retry button.
- **Theme without flash:** `theme-init.js` runs synchronously in `<head>` and sets `data-theme` / `data-motion` before first paint.
- **Safe rendering:** all dynamic markup goes through an `html` tagged template that escapes every interpolated value unless it is explicitly trusted (`raw()`, nested `html`, `icon()`). Chat replies use a tiny markdown-lite renderer that escapes first and then adds `<strong>`/`<em>`/lists.
- **Stage B seam:** pages never touch LocalStorage. All record methods on `api` are async, so swapping them for `fetch('/api/v1/...')` does not change callers. Theme and settings remain in LocalStorage, as planned.

## 4. Key decisions

| Decision | Reason |
|---|---|
| Vanilla ES modules, no framework | Matches CLAUDE.md (no build step); keeps the prototype hostable anywhere |
| Tailwind Play CDN for layout utilities; components in `style.css` | CDN is allowed for the prototype. Core components use CSS variables, so the UI still degrades gracefully if the CDN is slow |
| Tailwind colours mapped to CSS variables (`bg-surface`, `text-muted`…) | One source of truth for both themes |
| Longest-match-first skill matching with masking | Prevents "React" matching inside "React Native", or "CSS" inside "Tailwind CSS" |
| Case-sensitive matching for short or ambiguous names (C, R, Go, Excel, Spark, REST, Express, ML) | Avoids false positives like "excel at", "go to", "the rest of" |
| Required vs preferred from section headings + cue words | Mirrors how job posts are written; transparent and testable |
| Compatibility weights re-normalized when a job lists only one group | Otherwise a job with no "nice to have" section could never exceed 70% |
| Ties in roadmap ordering keep job-description order | Most-mentioned skills first, still deterministic |
| `demo: true` flag per record | Lets Settings remove sample data without deleting the user's own records, and lets Analytics label sources |
| 180 ms simulated latency on page snapshots | Makes the loading states visible and realistic; easy to remove in Stage B |
| Career Readiness = 40% compatibility + 20% profile + 20% learning + 20% avg skill | Simple, explainable prototype metric, labelled "not a hiring probability" |

## 5. Deviations from CLAUDE.md (with reasons)

| Item | Reason |
|---|---|
| **Added `frontend/js/theme-init.js`** | Classic (non-module) script that must run before paint to avoid a theme flash and to configure the Tailwind CDN. ES modules are deferred, so this could not live in `app.js`. |
| **Added `frontend/js/ai-sim.test.js`** | Step 3 checkpoint ("write a small console test"). Also exposed in Settings → Developer. |
| **Added `frontend/.dockerignore`** | Compose builds with context `./frontend`, and Docker only reads `.dockerignore` from the build-context root, so the root file (kept as specified) has no effect on this build. |
| **Added `frontend/assets/favicon.svg`** | Brand icon for browser tabs. |
| **Inter font via Google Fonts** | Typography only, loaded as a stylesheet. The system font stack is the fallback. |
| **Dockerfile health check uses `127.0.0.1`** instead of `localhost` | In Alpine, busybox `wget` can resolve `localhost` to `::1`, while nginx listens on IPv4 only (`listen 80`), which would make a healthy container report unhealthy. |
| **nginx: `/healthz` uses `default_type text/plain`** instead of `add_header Content-Type` | `add_header` would add a second Content-Type header next to the default one. |
| **nginx: security headers repeated in the static-asset location** | nginx does not inherit `add_header` into a location that defines its own `add_header`, so CSS/JS would otherwise ship without the security headers. |
| **nginx: 404 for `/nginx.conf`, `/Dockerfile`, `/.dockerignore`** | `COPY . /usr/share/nginx/html` would otherwise publish the server config. |
| **Extra fields inside existing keys** (`profile.lastCv`, `settings.activeJobId`, `settings.motion`, `settings.applicationsView`) | Needed for features; no new top-level keys were added, so the documented key table stays accurate. |
| **Added `.github/workflows/pages.yml` (GitHub Actions → GitHub Pages)** | GitHub Pages is one of the static hosts listed in CLAUDE.md section 10. Pages can only serve the repo root or `/docs`, so a small official-actions workflow publishes `frontend/` instead. |
| **`.claude/` added to `.gitignore`** | Local tooling config (dev-server launcher) that does not belong in the repo. |

No other technologies were added.

## 6. Verification status

| Step | Checkpoint | Result |
|---|---|---|
| 0 Init | `git status` clean structure | ⚠️ **Not run**: git is not installed on the build machine. Files and `.gitignore` are in place. |
| 1 Design system | Shell on all pages, theme switches, no overflow at 360 px | ✅ All 12 pages, 0 px overflow at 360 px |
| 2 Storage | Data survives reload; reset restores clean state | ✅ Reload, export → import round-trip, invalid import rejected, reset keeps only theme |
| 3 Simulated AI | Same input → same output | ✅ 20/20 self-test cases pass |
| 4 Pages | 360 / 768 / 1440 px, keyboard navigable | ✅ No overflow at 360/768/1024/1440/1920; one `h1` per page; all fields labelled; no unnamed controls |
| 5 Motion | No jank, reduced-motion disables animation | ✅ Animation/transition durations collapse to ~0, reveals visible, Chart.js animation off |
| 6 Docker | `docker compose up --build` + healthcheck green | ⚠️ **Not run**: Docker is not installed on the build machine. Files are written to spec; please verify. |
| 7 QA checklist | Section 9 | ✅ All browser items; ⬜ the two Docker items |
| 8 Docs | README + report | ✅ |

**How testing was done:** the site was served with `python -m http.server` and exercised in a Chromium-based browser, using real clicks and keyboard input plus scripted checks, for example:

- CV: invalid `.png` drop is rejected (error text, shake, toast); a PDF shows metadata only; the scanning steps run; 16 new skills are added to the profile.
- Job analyzer: empty submit gives two field errors and focus on the first; a sample is analyzed and saved as the active target.
- Skill gap: status filter; adding React at 75% raises compatibility from 20% to 26%; generating a roadmap asks before replacing the existing one.
- Roadmap: toggling items updates progress (0 → 15%), the week's completion state and the current-week badge.
- Tracker: validation errors; create / edit (status history `Applied → Interview`) / search / filter / sort / board move / delete. A `<script>` payload in the job title rendered as plain text.
- Assistant: suggestion chips and typed input; replies use live data; history persists after reload; HTML in messages is escaped.
- Settings: theme radios, demo off removes only demo records, import/reset, self-test.
- Error state: with `localStorage.setItem` forced to throw, pages show "Browser storage is unavailable…" with a retry button.
- Empty states: after reset, every data page shows its empty state and demo data is not re-seeded.

**Not tested:** Firefox and Safari, real screen readers, real touch devices, the Docker image.

## 7. Limitations

- No backend, database, authentication, multi-user isolation or sync; data is per browser.
- PDF contents are not read; the PDF path always analyzes the built-in sample CV (clearly labelled in the UI).
- The "AI" is rule-based: extraction depends on the 140-skill dictionary and English phrasing; it cannot reason about context.
- LocalStorage is unencrypted and limited (~5 MB); do not store sensitive data.
- The Tailwind Play CDN compiles in the browser: fine for a prototype, slower than a built stylesheet. nginx caches CSS/JS for 7 days, so after a redeploy returning visitors may see old assets until the cache expires. Versioned filenames would fix this.
- CDN assets require an internet connection.

## 8. What was learned

- A thin, async data-access layer makes a later backend swap a local change.
- Deterministic "AI" is easier to explain, test and trust. Being explicit about simulation builds credibility instead of reducing it.
- Text matching needs care: boundaries around `+`, `#`, `.`, `/`, and masking to avoid double counting.
- CSS subtleties: an absolutely positioned `.sr-only` child can escape an `overflow:auto` wrapper unless the wrapper is positioned. Tailwind's own `.ring` utility collided with a custom class name.
- Accessibility is mostly about details: focus return after re-renders, keyboard alternatives to drag & drop, and live regions for background saves.

## 9. Next: Stage B (not started)

Per CLAUDE.md section 7: FastAPI + PostgreSQL 16 + SQLAlchemy/Alembic + JWT, Compose with `db`, `api`, `web`, and an nginx `/api/` proxy. Only `api.js` changes on the frontend, and `login.html` / `register.html` are added. The simulated AI stays rule-based unless a real model is integrated, and the docs will be updated to match exactly what ships.
