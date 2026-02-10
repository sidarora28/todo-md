<div align="center">

# ToDo.md

**Markdown-first task management with a built-in web IDE.**

Your tasks live as plain `.md` files. Edit them in a VS Code-like browser IDE with a dashboard, AI-powered search, and automatic task syncing.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node 18+](https://img.shields.io/badge/node-18%2B-green.svg)](https://nodejs.org)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

<!-- TODO: Add hero screenshot/GIF here -->
<!-- ![ToDo.md IDE](docs/images/ide-screenshot.png) -->

</div>

---

## Features

- **Web IDE** — Monaco editor (same as VS Code) in your browser with syntax highlighting, file tree, and auto-save
- **Dashboard** — See what's due today, overdue tasks, and project progress at a glance
- **Plain Markdown** — All data stored as `.md` files. No database, no lock-in
- **Quick Capture** — Jot tasks in `tasks.md`, they auto-sync to the right project
- **Daily Focus** — Auto-generated daily files with today's tasks and overdue items
- **AI Search** — Natural language search across all your tasks (optional, via OpenRouter)
- **Project Tracking** — Organize tasks by project with milestones and progress bars
- **Zero Dependencies** — Just Node.js. No build step, no framework, no compile

## Quick Start

```bash
git clone https://github.com/sidarora28/todo-md.git
cd todo-md
npm install && npm start
```

Open **http://localhost:3000** — that's it.

Want a guided setup? Run `npm run setup` instead.

## How It Works

```
Browser (IDE + Dashboard)
        ↕ REST API
   Node.js Server
        ↕ Read/Write
  Plain .md files on disk
```

**Projects** live in `projects/<name>/` with a `PROJECT.md` and monthly task files.
**Quick capture** goes to `tasks.md` — on save, tasks auto-route to the right project.
**Daily files** in `daily/` are auto-generated with today's due and overdue tasks.

## Configuration

AI features (smart search, auto project inference) are optional. Add an OpenRouter API key:

```bash
cp .env.example .env
# Edit .env and add your key from https://openrouter.ai/keys
```

Everything works without it — you just get keyword search and manual project assignment instead.

## Documentation

- [API Reference](docs/API.md) — Full REST API documentation
- [CLAUDE.md](CLAUDE.md) — Architecture guide for contributors

## Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions and guidelines.

## License

[MIT](LICENSE)
