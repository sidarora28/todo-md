# ToDo.md — Contributor Guide

This file is for developers contributing to ToDo.md. It explains the architecture and conventions.

## Architecture

ToDo.md has three main parts: the **app** (Node.js server + web IDE), the **Electron desktop wrapper**, and the **Vercel backend** (auth, billing, AI proxy).

```
server.js              → Express server, all API endpoints (~2300 lines)
ide.html               → Entry point for the web IDE
ide/                   → Frontend code (vanilla JS, ES modules)
  app.js               → IDE bootstrap
  components/          → UI components (FileTree, Editor, Dashboard, etc.)
  services/            → AutoSaver
  styles/              → CSS (VS Code Dark+ theme)
  utils/               → Monaco Editor setup
setup.js               → Interactive setup wizard (for self-hosted)

electron/              → Desktop app (Electron)
  main.js              → Main process: windows, IPC, embedded server
  preload.js           → Context bridge (IPC security)
  config.js            → OS-standard config storage
  menu.js              → Native app menu
  updater.js           → Auto-update via electron-updater
  login.html           → Sign in / create account window
  setup.html           → First-launch setup (choose data directory)
  settings.html        → User settings window
  icons/               → App icons (PNG)

backend/               → Vercel-hosted backend
  api/
    auth/
      signup.js        → Free trial account creation (no Stripe)
      create-account.js → Post-payment account creation
      status.js        → Check auth status & usage
    billing/
      checkout.js      → Stripe checkout session
      portal.js        → Stripe billing portal link
    webhooks/
      stripe.js        → Stripe webhook handler
    ai/
      proxy.js         → Managed LLM proxy (rate limited per plan)
  lib/
    auth.js            → JWT verification via Supabase
    supabase.js        → Supabase admin client
  public/              → Landing page + static pages
    index.html         → Marketing site (todomd.app)
    download.html      → Download page (OS detection)
    signup.html        → Web signup (free trial)
    success.html       → Post-payment success
    cancel.html        → Payment canceled
    css/style.css      → Shared stylesheet
    js/                → Page-specific JS
  vercel.json          → Vercel routing config
  supabase-schema.sql  → Database schema (profiles + usage tables)

.github/workflows/
  build-and-release.yml → CI/CD: build Electron on tag push

docs/API.md            → API endpoint documentation
```

## How the Server Works

- Express serves static files from the project root
- API endpoints handle file CRUD, task syncing, LLM inference, and dashboard data generation
- All data is stored as plain `.md` files on disk — no database
- LLM calls support OpenAI, Anthropic, and OpenRouter (optional, requires API key in `.env`)

## How the Desktop App Works

- `electron/main.js` is the main process — creates windows and starts the embedded Express server
- The server runs on a random available port; the main window loads `http://localhost:{port}`
- Auth uses Supabase directly: `signUp()` / `signInWithPassword()` via IPC
- Tokens and config are stored in OS-standard locations via `electron/config.js`
  - macOS: `~/Library/Application Support/todo-md/`
  - Windows: `%APPDATA%/todo-md/`
  - Linux: `~/.config/todo-md/`
- Auto-updates pull from GitHub Releases via `electron-updater`
- Build/packaging handled by `electron-builder` (config in `package.json` → `build`)

## Auth & Billing Flow

1. User creates account (in-app or on website) → Supabase `auth.users` row created
2. Supabase trigger `handle_new_user` auto-creates a `profiles` row with `plan='trial'`, `trial_ends_at = now + 14 days`
3. During trial, AI proxy allows 100 requests/day
4. After trial expires, user must subscribe via Stripe (monthly, annual, or lifetime)
5. Stripe webhook updates `profiles.plan` to `'active'` or `'lifetime'`
6. Subscription cancellation → Stripe fires `customer.subscription.deleted` → plan set to `'expired'`

Database schema: `backend/supabase-schema.sql`

## File Formats

### PROJECT.md
```yaml
---
type: project
status: active | paused | complete
target-date: YYYY-MM-DD | ongoing
---
# Project Name
## Goal / ## Milestones / ## Progress / ## Notes
```

### Monthly Task File (tasks/YYYY-MM.md)
```markdown
# Project Name - Month Year

## Active Tasks

---
### Task Title (start with verb)
due: YYYY-MM-DD
priority: high | medium | low
status: todo | in-progress | blocked
tags: [tag1, tag2]
created: YYYY-MM-DD

Description and notes.
---

## Completed Tasks
(Same format with status: done and completed: YYYY-MM-DD)
```

### Quick Capture (tasks.md)
```
- [ ] Task name | YYYY-MM-DD | project-key
```

## How the IDE Works

- `ide/app.js` bootstraps the 3-panel layout
- `FileTree` component fetches the file list from `/api/files`
- `Editor` component uses Monaco Editor loaded from CDN
- `AutoSaver` saves after 10 seconds of inactivity via `/api/files/:path`
- `DashboardWidget` reads from `/api/dashboard-data`
- Saving certain files triggers server-side sync (tasks.md → monthly files, daily files → monthly files)

## Adding Features

1. **New API endpoint** — Add to `server.js`, document in `docs/API.md`
2. **New IDE component** — Create in `ide/components/`, import in `ide/app.js`
3. **New file type** — Add handling in the server's file save endpoint
4. **New backend endpoint** — Add to `backend/api/`, update `backend/vercel.json` if new route pattern
5. **New Electron window** — Add HTML in `electron/`, create/manage in `electron/main.js`

## Conventions

- No build step. No TypeScript. No framework. Keep it simple.
- Server stays as a single file unless it gets unwieldy.
- Frontend uses vanilla JS with ES modules.
- Backend endpoints are individual serverless functions (Vercel convention).
- Test manually: start the server, use the IDE, check the dashboard.
- For Electron: `npm run electron:dev` runs in dev mode (skips auth).
