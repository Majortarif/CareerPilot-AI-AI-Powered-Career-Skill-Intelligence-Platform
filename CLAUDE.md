# CLAUDE.md — CareerPilot AI

> Master instruction file for Claude Code. Read this fully before writing any code.
> It defines what to build, in what order, how to containerize it, and how to document it honestly.

---

## 1. Project Summary

**CareerPilot AI** is an AI-inspired career and skill intelligence platform.
Users manage a career profile, analyze a CV, analyze job descriptions, see skill gaps, follow a learning roadmap, get portfolio project ideas, track job applications, and view analytics.

**Owner:** Tariful Hoque (CSE Graduate | ML & AI | Data Science | UI/UX)
**Repo:** https://github.com/Majortarif/careerpilot-ai
**Email:** tarifulhoque347@gmail.com
**LinkedIn:** https://www.linkedin.com/in/tariful-hoque-582321259
**Portfolio:** https://tarifulhoqueportfoloi.netlify.app/
**License text:** "This project is created for educational, portfolio, and demonstration purposes. © 2026 Tariful Hoque"

---

## 2. The Two Stages (read carefully)

The project is built in two stages. **Documentation must always match the stage that is actually finished.**

| Stage | Name | What exists | Docker service(s) |
|-------|------|-------------|-------------------|
| **A** | Frontend Prototype | Static HTML + Tailwind + Vanilla JS + Chart.js + LocalStorage. Simulated AI (deterministic logic). No backend. | `web` (nginx) |
| **B** | Full-Stack Extension | Adds a real REST API + PostgreSQL. Frontend switches from LocalStorage to API through a data-access layer. | `web`, `api`, `db` |

### Hard rules
1. **Build Stage A completely first.** It must be deployable on its own.
2. **Stage B is added only after Stage A passes its checklist.** Do not mix them halfway.
3. While only Stage A exists, the README must say: *frontend prototype, no backend, no database, no real authentication, no external AI API, simulated AI.*
4. Only after Stage B is implemented and tested may the README mention a backend, database, or auth — and only exactly what was built.
5. Even in Stage B, the AI stays **rule-based/deterministic** unless a real LLM/ML integration is actually added. Never call it "real AI".
6. Never document files, screenshots, URLs, or features that do not exist.

---

## 3. Tech Stack

### Stage A (frontend)
- HTML5 (multi-page, semantic)
- Tailwind CSS (CDN acceptable for prototype; optional local build later)
- Vanilla JavaScript (ES modules)
- Chart.js
- Lucide Icons
- LocalStorage
- nginx (static serving in Docker)

### Stage B (backend, added later)
- **FastAPI** (Python 3.12) — chosen to match the owner's Python/ML background and to leave room for real ML later
- **PostgreSQL 16**
- SQLAlchemy 2 + Alembic migrations
- JWT authentication (argon2/bcrypt password hashing)
- Pydantic v2 validation
- Docker Compose orchestration

Do **not** add other technologies without a written reason in `PROJECT_REPORT.md`.

---

## 4. Repository Structure

### Final target (Stage A + B)

```text
careerpilot-ai/
├── CLAUDE.md
├── README.md
├── PROJECT_REPORT.md
├── LICENSE
├── .gitignore
├── .dockerignore
├── docker-compose.yml
├── .env.example
│
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── index.html
│   ├── dashboard.html
│   ├── profile.html
│   ├── cv-analyzer.html
│   ├── job-analyzer.html
│   ├── skill-gap.html
│   ├── roadmap.html
│   ├── projects.html
│   ├── applications.html
│   ├── analytics.html
│   ├── assistant.html
│   ├── settings.html
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   ├── app.js            # shell, nav, theme, toasts, modals
│   │   ├── storage.js        # LocalStorage wrapper (versioned keys)
│   │   ├── api.js            # data-access layer (Stage B swaps backend here)
│   │   ├── data.js           # demo data + skill dictionary
│   │   ├── ai-sim.js         # deterministic "AI" simulation logic
│   │   ├── dashboard.js
│   │   ├── profile.js
│   │   ├── cv-analyzer.js
│   │   ├── job-analyzer.js
│   │   ├── skill-gap.js
│   │   ├── roadmap.js
│   │   ├── projects.js
│   │   ├── applications.js
│   │   ├── analytics.js
│   │   ├── assistant.js
│   │   └── settings.js
│   └── assets/               # screenshots/GIF added by owner
│
└── backend/                  # Stage B only
    ├── Dockerfile
    ├── requirements.txt
    ├── alembic.ini
    ├── alembic/
    └── app/
        ├── main.py
        ├── config.py
        ├── database.py
        ├── models.py
        ├── schemas.py
        ├── security.py
        ├── deps.py
        └── routers/
            ├── auth.py
            ├── profile.py
            ├── skills.py
            ├── jobs.py
            ├── applications.py
            ├── roadmap.py
            └── analytics.py
```

**During Stage A**, only create `frontend/`, root docs, and Docker files for `web`. Do not create `backend/` yet.

---

## 5. Build Process (follow in order)

Each step ends with a **checkpoint**. Do not continue if a checkpoint fails.

### Step 0 — Init
- Create repo folders, `.gitignore`, `.dockerignore`, `LICENSE`, empty `PROJECT_REPORT.md`.
- Checkpoint: `git status` clean structure.

### Step 1 — Design system (`css/style.css` + `app.js`)
- CSS variables for colors, radius, shadows, spacing in `:root` and `[data-theme="dark"]`.
- Theme toggle (dark default, persisted).
- App shell: responsive sidebar (desktop), bottom/hamburger nav (mobile), top bar.
- Shared components: card, button, input, badge, table, modal, toast, skeleton loader, empty state, error state.
- Checkpoint: shell renders on all pages, theme switches, no horizontal overflow at 360px.

### Step 2 — Storage + data layer
- `storage.js`: `get(key, fallback)`, `set(key, value)`, `remove(key)`, `exportAll()`, `importAll()`, `resetAll()`. All wrapped in try/catch.
- Namespaced, versioned keys:

| Key | Content |
|-----|---------|
| `cp:v1:profile` | education, target role, summary |
| `cp:v1:skills` | `[{name, level 0-100, category}]` |
| `cp:v1:applications` | application records |
| `cp:v1:savedJobs` | analyzed/saved job descriptions |
| `cp:v1:roadmap` | roadmap items + completion |
| `cp:v1:assistant` | chat history |
| `cp:v1:theme` | `dark` \| `light` |
| `cp:v1:settings` | preferences |
| `cp:v1:demo` | `true` while demo data is active |

- `api.js`: every page talks to `api.*` only (never `localStorage` directly). In Stage A it wraps `storage.js`. In Stage B it calls the REST API.
- Checkpoint: data survives reload; reset restores clean state.

### Step 3 — Simulated AI engine (`ai-sim.js`, `data.js`)
Deterministic, no network. Must be clearly labelled "simulated" in the UI.

- **Skill dictionary** (`data.js`): ~120 skills, each with `name`, `aliases`, `category` (Programming, ML/AI, Data, Web, Cloud/DevOps, Tools, Soft skills).
- **`extractSkills(text)`**: lowercase, tokenize, match names/aliases (word-boundary safe, e.g. `C++`, `Node.js`).
- **`analyzeCV(text | fileMeta)`**: prototype reads the PDF only as metadata (name, size). Uses a **sample CV profile** or pasted text for extraction. Returns skills, strengths, suggestions, missing sections, keywords. Never uploads anywhere.
- **`analyzeJob({title, company, description})`**: extracts required vs preferred skills (by cue words such as "required", "must", "preferred", "nice to have"), technologies, responsibilities (bullet lines), keywords, experience years (regex).
- **`computeSkillGap(userSkills, jobSkills)`**:
  - 🟢 Strong: user level ≥ 70
  - 🟡 Partial: 30 ≤ level < 70
  - 🔴 Missing: not present or < 30
  - Compatibility = `(0.7 * requiredScore + 0.3 * preferredScore) * 100`, where Strong = 1, Partial = 0.5, Missing = 0.
  - UI note: *"Prototype compatibility score. Not a hiring probability."*
- **`buildRoadmap(gaps, weeks = 12)`**: order missing/partial skills by importance, spread across weeks. Each item: `week, skill, objective, practice, miniProject, hours, done`.
- **`recommendProjects(targetRole, gaps)`**: filter a curated project list (`data.js`) by role, category (AI/ML, Data, Web, Full Stack, Analytics), difficulty, technology, learning objective; rank by gap overlap.
- **`assistantReply(message, context)`**: intent matching via keywords (skills, roadmap, CV, interview, applications, projects); templated replies using the user's stored data; typing animation in UI.
- Checkpoint: same input always yields the same output (write a small console test).

### Step 4 — Pages (build in this order)
1. `index.html` — landing (hero, features, flow, CTA, "Prototype" notice)
2. `dashboard.html` — KPIs (Career Readiness, Profile Completion, Skills Identified, Skill Gaps, Applications, Interviews, Learning Progress), 3 charts, recent activity
3. `profile.html` — education, target role, skills editor with levels
4. `cv-analyzer.html` — drag & drop PDF zone, scanning animation, results (skills, strengths, suggestions, missing info, keywords). Banner: *"Simulated. No document is uploaded to any server."*
5. `job-analyzer.html` — title, company, description input → structured output; save job
6. `skill-gap.html` — Strong/Partial/Missing table + compatibility ring
7. `roadmap.html` — 12-week list, toggle completion, animated progress
8. `projects.html` — filterable recommendation cards
9. `applications.html` — CRUD, statuses (Saved, Applied, Screening, Interview, Offer, Rejected, Withdrawn), search, filter, sort, kanban or table view
10. `analytics.html` — applications over time, status distribution, skill distribution, learning progress, interview conversion; **label demo vs. real data**
11. `assistant.html` — chat UI with suggestion chips
12. `settings.html` — theme, export/import JSON, reset data, toggle demo data

- Every page needs: loading state, empty state, error state, accessible forms (labels, focus, ARIA where needed).
- Checkpoint after each page: works at 360px, 768px, 1440px; keyboard navigable.

### Step 5 — Animation & interaction pass
Subtle, professional, respects `prefers-reduced-motion`.
- Page entrance, section reveal (IntersectionObserver), fade/slide transitions
- KPI count-up, animated progress bars, chart draw-in, card hover lift
- Scan/processing animation, typing indicator, assistant message transitions
- Button/card hover, tooltip, toast, modal, toggle transitions
- Roadmap completion transitions
- Checkpoint: no layout shift, no jank, animations disabled under reduced-motion.

### Step 6 — Dockerize Stage A
See section 6.
- Checkpoint: `docker compose up --build` serves the app at `http://localhost:8080`, healthcheck green.

### Step 7 — Stage A QA
Run the testing checklist (section 9). Fix everything before Stage B.

### Step 8 — Documentation (Stage A)
- Generate `README.md` following section 8 (Stage A wording).
- Write `PROJECT_REPORT.md`: goals, architecture, decisions, limitations, what was learned.

### Step 9 — Stage B (only after Steps 0–8 pass)
See section 7.

---

## 6. Docker — Stage A

### `frontend/Dockerfile`
```dockerfile
FROM nginx:1.27-alpine

RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY . /usr/share/nginx/html

# non-root friendly, minimal image
EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -qO- http://localhost/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
```

### `frontend/nginx.conf`
```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;

    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    location = /healthz {
        access_log off;
        return 200 "ok";
        add_header Content-Type text/plain;
    }

    location ~* \.(css|js|png|jpg|jpeg|gif|svg|ico|woff2?)$ {
        expires 7d;
        add_header Cache-Control "public";
    }

    location / {
        try_files $uri $uri/ =404;
    }
}
```

### `.dockerignore`
```text
.git
node_modules
*.md
!README.md
.env
.DS_Store
backend
```

### `docker-compose.yml` (Stage A)
```yaml
services:
  web:
    build: ./frontend
    container_name: careerpilot-web
    ports:
      - "8080:80"
    restart: unless-stopped
```

### Run
```bash
docker compose up --build -d
# open http://localhost:8080
docker compose logs -f web
docker compose down
```

Without Docker:
```bash
cd frontend
python -m http.server 8000
# open http://localhost:8000
```

---

## 7. Stage B — Backend, Database, Compose

> Start only after Stage A is complete and documented.

### Goals
- Real user accounts (register/login, JWT)
- Per-user data isolation
- PostgreSQL persistence replacing LocalStorage
- Same UI, same simulated-AI logic (moved to the API or kept client-side — document whichever is chosen)

### Data model (PostgreSQL)
- `users(id, email unique, password_hash, created_at)`
- `profiles(user_id fk, full_name, education, target_role, summary)`
- `skills(id, user_id fk, name, level, category)`
- `jobs(id, user_id fk, title, company, description, analysis jsonb, created_at)`
- `applications(id, user_id fk, job_title, company, status, applied_on, notes, updated_at)`
- `roadmap_items(id, user_id fk, week, skill, objective, practice, mini_project, hours, done)`
- `assistant_messages(id, user_id fk, role, content, created_at)`

### API (prefix `/api/v1`)
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/auth/register` | create account |
| POST | `/auth/login` | returns JWT |
| GET/PUT | `/profile` | read/update profile |
| GET/POST/PUT/DELETE | `/skills` | skills CRUD |
| POST | `/jobs/analyze` | analyze job description |
| GET/POST | `/jobs` | saved jobs |
| GET | `/skill-gap?job_id=` | gap result |
| GET/PUT | `/roadmap` | roadmap + completion |
| GET/POST/PUT/DELETE | `/applications` | tracker CRUD |
| GET | `/analytics/summary` | chart data |
| GET | `/health` | liveness |

Rules:
- Every query filters by the authenticated `user_id`.
- Validate all input with Pydantic; never build SQL by string concatenation.
- Passwords hashed (argon2 or bcrypt); JWT secret from env; CORS restricted to known origins.
- Alembic for all schema changes; no manual DDL.

### `backend/Dockerfile`
```dockerfile
FROM python:3.12-slim
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
RUN useradd -m appuser
USER appuser

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD python -c "import urllib.request;urllib.request.urlopen('http://localhost:8000/api/v1/health')" || exit 1

CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
```

### `backend/requirements.txt`
```text
fastapi
uvicorn[standard]
sqlalchemy>=2
psycopg[binary]
alembic
pydantic>=2
pydantic-settings
python-jose[cryptography]
passlib[argon2]
email-validator
```

### `.env.example`
```env
POSTGRES_USER=careerpilot
POSTGRES_PASSWORD=change_me
POSTGRES_DB=careerpilot
DATABASE_URL=postgresql+psycopg://careerpilot:change_me@db:5432/careerpilot
JWT_SECRET=change_me_to_a_long_random_string
JWT_EXPIRE_MINUTES=60
CORS_ORIGINS=http://localhost:8080
```
Never commit a real `.env`.

### `docker-compose.yml` (Stage B)
```yaml
services:
  db:
    image: postgres:16-alpine
    container_name: careerpilot-db
    env_file: .env
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $${POSTGRES_USER} -d $${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  api:
    build: ./backend
    container_name: careerpilot-api
    env_file: .env
    depends_on:
      db:
        condition: service_healthy
    ports:
      - "8000:8000"
    restart: unless-stopped

  web:
    build: ./frontend
    container_name: careerpilot-web
    depends_on:
      - api
    ports:
      - "8080:80"
    restart: unless-stopped

volumes:
  pgdata:
```

In `nginx.conf` add a reverse proxy so the browser talks to one origin:
```nginx
location /api/ {
    proxy_pass http://api:8000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

### Frontend migration
- Only `api.js` changes: replace LocalStorage calls with `fetch('/api/v1/...')`, JWT stored in memory (or httpOnly cookie if implemented).
- Add `login.html` / `register.html`.
- Keep LocalStorage only for theme/settings.

### Stage B checkpoints
- `docker compose up --build` starts `db`, `api`, `web` healthy.
- Register → login → create data → reload → data persists.
- Second user cannot see first user's data.
- `/docs` (FastAPI Swagger) matches the API table.

---

## 8. README Generation Rules

Generate `README.md` for the **current stage only**. Premium, product-style, concise, scannable.

### Required sections, in order
1. **Hero** — centered HTML block: `# 🚀 CareerPilot AI`, subtitle *AI-Powered Career & Skill Intelligence Platform*, tagline blockquote, badges (HTML5, Tailwind CSS, JavaScript, Chart.js, LocalStorage, Responsive, Frontend Prototype), buttons `[🌐 Live Demo](YOUR_LIVE_DEMO_URL)` and `[📂 View Source](https://github.com/Majortarif/careerpilot-ai)`.
2. **✨ Product Preview** — `![CareerPilot AI Preview](assets/careerpilot-preview.gif)` (or `<!-- Add product preview GIF here -->` if missing) + expected `assets/` tree.
3. **About the Project** — the problem (unclear skills, missing skills, job requirements, what to learn, portfolio choices, application management, progress tracking).
4. **Core User Flow** — Mermaid flowchart: Career Profile → CV Upload → CV Analysis → Skill Extraction → Target Job → Job Description Analysis → Skill Gap → Learning Roadmap → Project Recommendations → Application Tracking → Career Analytics. Label as the intended product experience / prototype flow.
5. **Features** — table (Career Profile, CV Analyzer, Job Analyzer, Skill Gap, Skill Intelligence, Career Roadmap, Project Recommendations, Application Tracker, Analytics, AI Assistant, Settings).
6. **🤖 AI Experience** — frontend AI simulation layer, no LLM API, deterministic logic, structured demo data, rule-based recommendations, simulated states. Include the note:
   > **Prototype Notice:** AI analysis shown in the current version is simulated and should not be interpreted as real machine-learning or LLM inference.
7. **Dashboard**, 8. **CV Analyzer** (note: simulated, no backend upload), 9. **Job Description Analyzer** (simulated), 10. **Skill Gap Intelligence** (🟢🟡🔴 + example table + "not a hiring probability"), 11. **Career Roadmap** (12-week, fields, LocalStorage), 12. **Project Recommendations**, 13. **Application Tracker** (7 statuses, CRUD/search/filter/sort), 14. **Analytics** (5 charts, demo vs real data), 15. **UI / UX**, 16. **Animation & Interaction System**.
17. **Tech Stack** table, 18. **Frontend Architecture** (Mermaid; state clearly there is no backend layer), 19. **LocalStorage Architecture** (not secure storage), 20. **Project Structure** (real tree only).
21. **Responsiveness**, 22. **Accessibility**, 23. **Installation** (git clone, `python -m http.server 8000`, open `http://localhost:8000`, plus Docker option), 24. **Deployment** (Cloudflare Pages recommended; also Netlify, GitHub Pages, Vercel static, Docker/nginx; flow diagram; `YOUR_LIVE_DEMO_URL`).
25. **Limitations** — no backend, PostgreSQL, real auth, real AI API, server-side PDF processing, cloud DB, real-time sync, multi-user isolation, secure document storage. Framed as intentional prototype limits.
26. **Future Roadmap** — Phase 1 ✅ (frontend prototype, responsive UI, LocalStorage, simulated AI, analytics, tracking); Phase 2 ⬜ (Next.js, backend APIs, PostgreSQL, Supabase, auth, secure CV storage, real PDF processing, real AI/LLM, cloud deploy, multi-user).
27. **What I Learned**, 28. **Testing Checklist**, 29. **Screenshot Gallery** (only existing files, otherwise clear placeholders), 30. **🌐 Live Demo** (`[🚀 Open CareerPilot AI](YOUR_LIVE_DEMO_URL)`), 31. **Author**, 32. **License**.

### Author block
**Tariful Hoque** — CSE Graduate | Machine Learning & AI | Data Science | UI/UX
Email: tarifulhoque347@gmail.com · LinkedIn: https://www.linkedin.com/in/tariful-hoque-582321259 · Portfolio: https://tarifulhoqueportfoloi.netlify.app/ · GitHub: https://github.com/Majortarif

### Style rules
- Premium, modern, technical, product-oriented, concise, honest, recruiter- and developer-friendly.
- Recruiter should understand the project in 30 seconds; first screen must be impressive.
- **Use:** "AI-inspired career intelligence interface", "Frontend prototype", "Simulated AI experience", "Product prototype", "Designed for future full-stack expansion".
- **Never use:** "Revolutionary AI platform", "100% AI-powered", "Production-ready AI", "Real AI intelligence" (unless technically true).
- Do not invent screenshot URLs, deployment URLs, technologies, or features.
- Use `YOUR_LIVE_DEMO_URL` until a real URL exists.
- When Stage B ships, update: badges, tech stack, architecture diagram, limitations, future roadmap, installation (Docker Compose), and remove statements that are no longer true.

### Pre-publish README audit
1. Every feature described exists in the code.
2. No invented technologies.
3. No backend or real-AI claims (Stage A).
4. No invented screenshots or URLs.
5. Only real files appear in the structure tree.
6. Terminology is consistent (Simulated AI, Frontend prototype).

---

## 9. Testing Checklist

- [ ] Navigation (all pages, active state, mobile menu)
- [ ] Responsive layout (360 / 768 / 1440 / 1920)
- [ ] Theme switching + persistence
- [ ] Profile editing
- [ ] LocalStorage persistence (reload, export/import, reset)
- [ ] CV analyzer interaction (drag & drop, invalid file type, processing animation)
- [ ] Job analyzer interaction (empty input error, valid input)
- [ ] Skill gap calculation (deterministic, correct statuses)
- [ ] Roadmap progress
- [ ] Application CRUD
- [ ] Search / filter / sort
- [ ] Analytics charts (render, resize, theme colors, demo label)
- [ ] AI assistant
- [ ] Mobile layout (no horizontal overflow, touch targets ≥ 44px)
- [ ] Empty states
- [ ] Error states
- [ ] Keyboard navigation and focus visibility
- [ ] `prefers-reduced-motion` respected
- [ ] `docker compose up --build` works from a clean clone
- [ ] Container healthcheck passes

Stage B additionally:
- [ ] Register / login / logout
- [ ] Data isolation between two users
- [ ] Data persists after `docker compose down && up` (volume)
- [ ] Invalid JWT rejected (401)
- [ ] Input validation errors return 422 with clear messages

---

## 10. Deployment

### Static (Stage A) — recommended: Cloudflare Pages
```text
GitHub Repository → Cloudflare Pages → Build / Deploy → Live Website
```
- Build command: none
- Output directory: `frontend`
- Alternatives: Netlify, GitHub Pages, Vercel (static)

### Docker on a VPS (Stage A or B)
```bash
git clone https://github.com/Majortarif/careerpilot-ai.git
cd careerpilot-ai
cp .env.example .env      # Stage B: edit secrets
docker compose up --build -d
```
Put a reverse proxy with HTTPS (Caddy or nginx + Certbot) in front of port 8080.

### Stage B hosting note
Static hosts cannot run the API. Use a VPS/container platform for `api` + `db` (or managed Postgres), and point the frontend at it.

---

## 11. Code Quality Rules

- No frameworks in Stage A. No build step required.
- ES modules, small focused functions, JSDoc on public helpers.
- No inline event handlers; use `addEventListener`.
- Escape all user text before inserting into the DOM (prevent XSS). Prefer `textContent`.
- Never store secrets in the frontend.
- Consistent naming: files kebab-case, JS camelCase, CSS classes via Tailwind utilities + a few custom component classes.
- Commit in small steps with clear messages (`feat:`, `fix:`, `docs:`, `chore:`).

---

## 12. Definition of Done

**Stage A done when:**
- All 12 pages work, responsive, accessible, animated with restraint.
- Simulated AI is deterministic and clearly labelled.
- Data persists via LocalStorage; export/import/reset work.
- `docker compose up --build` serves the site with a passing healthcheck.
- README and PROJECT_REPORT are honest and complete.

**Stage B done when:**
- `db`, `api`, `web` run via Compose; auth and CRUD work with per-user isolation.
- Frontend uses `api.js` against the REST API.
- README updated to reflect the real implementation, nothing more.

---

## 13. Instructions to Claude Code

1. Read this file fully. Confirm the current stage before coding.
2. Work step by step; announce each step; run its checkpoint before moving on.
3. Prefer working, tested code over extra features.
4. If a requirement conflicts with honesty rules in section 2 or 8, honesty wins.
5. Ask the owner only for things you cannot decide (live demo URL, screenshots, real deployment target). Use placeholders otherwise.
6. After finishing a stage, update `README.md` and `PROJECT_REPORT.md` to match reality.
