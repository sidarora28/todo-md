# ToDo.md — Contributor Guide

This file is for developers contributing to ToDo.md. It explains the architecture and conventions.

## Architecture

**Single-server Node.js app** — no build step, no framework, no database.

```
server.js          → Express server, all API endpoints (~2300 lines)
ide.html           → Entry point for the web IDE
ide/               → Frontend code (vanilla JS, ES modules)
  app.js           → IDE bootstrap
  components/      → UI components (FileTree, Editor, Dashboard, etc.)
  services/        → AutoSaver
  styles/          → CSS (VS Code Dark+ theme)
  utils/           → Monaco Editor setup
dashboard.html     → Standalone dashboard view
setup.js           → Interactive setup wizard
docs/API.md        → API endpoint documentation
```

## How the Server Works

- Express serves static files from the project root
- API endpoints handle file CRUD, task syncing, LLM inference, and dashboard data generation
- All data is stored as plain `.md` files on disk — no database
- LLM calls go through OpenRouter (optional, requires API key in `.env`)

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

## Conventions

- No build step. No TypeScript. No framework. Keep it simple.
- Server stays as a single file unless it gets unwieldy.
- Frontend uses vanilla JS with ES modules.
- Test manually: start the server, use the IDE, check the dashboard.
