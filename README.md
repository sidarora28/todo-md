<div align="center">

# ToDo.md

**Your tasks, your machine, plain markdown.**

A personal task management system that runs locally. No cloud, no database, no account. Just `.md` files you own forever.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node 18+](https://img.shields.io/badge/node-18%2B-green.svg)](https://nodejs.org)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

<!-- TODO: Add hero screenshot/GIF here -->
<!-- ![ToDo.md IDE](docs/images/ide-screenshot.png) -->

</div>

---

## What ToDo.md Does

ToDo.md is a personal task management system that runs on your computer. You get a browser-based editor (looks and feels like VS Code) where you manage tasks, projects, and ideas -- all stored as plain markdown files on your hard drive.

There's no sign-up, no subscription, no data leaving your machine. If you can open a text file, you can read your data. If you stop using the app, your files are still right there.

Optional AI features (search, daily briefings, auto-sorting) are available if you bring your own API key, but everything works great without them.

## Your Daily To-Do List (the main event)

Every day, ToDo.md generates a single file that is your to-do list for the day. This is where you'll spend most of your time.

The system reads through **all your projects**, finds every task that's due today or overdue, and builds a focused daily file for you automatically. You don't curate this list — it's assembled from your entire workspace.

```markdown
# Monday, February 10, 2026

## Overdue
- [ ] Finish budget report (finance)
- [ ] Reply to client email (freelance)

## Today
- [ ] Send newsletter draft (newsletter)
- [ ] Review pull request (open-source)
- [ ] Call dentist (personal)
```

**This is your working file for the day.** Check items off here, and they sync back as completed in your project files automatically. Add a new task to a project file, and today's daily list updates to include it. Everything stays in sync — you never update things in two places.

The daily file lives in `daily/` and a new one is generated each day.

## How Tasks Get There

Your daily file is auto-generated, but the tasks come from your projects. Here's how things flow in:

### tasks.md -- Quick capture

This is your inbox for actionable items. Jot down tasks in a simple format:

```
- [ ] Write project proposal | 2026-02-15 | work-project
- [ ] Buy groceries | 2026-02-11
- [ ] Research hosting options
```

When you save, tasks automatically route to the right project folder. No project specified? AI figures out the best match (or it defaults to "others"). Once filed, the task shows up in your daily list when its due date arrives.

Processed tasks get a strikethrough so you can see what's been filed. Older completed tasks auto-archive after 50 pile up.

### inbox.md -- Your scratchpad

Not everything is a task yet. Dump thoughts, ideas, half-formed plans, links, and notes here. Don't worry about organizing it — date headers are inserted automatically, and entries older than 30 days are auto-archived so the file stays clean.

When a thought becomes actionable, move it to `tasks.md`.

### How they connect

**Inbox** is for raw thoughts. **tasks.md** turns them into actionable items filed under projects. **Your daily file** pulls it all together — the system reads every project and builds your to-do list for today. Check things off in the daily file, and changes flow back to the project files automatically.

## Projects

Each project gets its own folder under `projects/` with:

- **PROJECT.md** -- The project overview: goals, milestones, progress, and notes
- **tasks/YYYY-MM.md** -- Monthly task files with active and completed tasks

Tasks have metadata you'd expect: due date, priority (high/medium/low), status (todo/in-progress/blocked/done), and tags. When a task is marked done, it moves to the "Completed Tasks" section with a completion date.

You can create projects through the setup wizard, the IDE, or the API.

## Dashboard

Open `dashboard.html` for a bird's-eye view of everything. It shows:

- **Project progress** -- See all your projects and their tasks at a glance
- **Task counts** -- How many tasks are overdue, due today, and due this week
- **Morning briefing** -- An AI-written personalized narrative about your day with highlights and a motivational quote (the tone rotates daily: encouraging, direct, reflective, energetic, calm)
- **Motivational quotes** -- If you don't have an AI key, you still get a curated quote from a collection of 100 (Stoic philosophy, modern wisdom, and everything in between)

The dashboard auto-refreshes every 30 seconds.

## AI Features (Optional)

AI features are powered by your own API key. Three providers are supported: **OpenAI** (GPT-4o), **Anthropic** (Claude), and **OpenRouter** (any model). You pick one.

Here's what AI adds:

- **Smart Search** -- Ask questions in plain English: "what's overdue?", "show me high priority tasks for the newsletter project", "summarize my project backlog as a prioritized roadmap". For small workspaces (under 50 files), the full context is sent to the LLM for precise answers. For larger workspaces, keyword pre-filtering narrows things down first, then the LLM refines the results.

- **Auto Project Inference** -- When you add tasks to `tasks.md` without specifying a project, AI matches them to the right project based on the task title and your existing projects.

- **Daily Briefings** -- Instead of just a list of tasks, you get a personalized morning summary with context about your workload, specific task and project mentions, and actionable highlights.

**Everything works without AI.** You get keyword search with relevance scoring, static daily summaries with motivational quotes, and manual project assignment. No features are locked behind an API key.

## Quick Start

```bash
git clone https://github.com/sidarora28/todo-md.git
cd todo-md
npm run setup
```

The setup wizard walks you through everything: checking Node.js, installing dependencies, picking an AI provider (optional), creating your first projects, and adding your first tasks.

Or if you want to skip the wizard:

```bash
npm install && npm start
```

Then open **http://localhost:3000**.

## Configuration

AI is configured through a `.env` file. Copy the example and add your key:

```bash
cp .env.example .env
```

You can either set `LLM_PROVIDER` and `LLM_API_KEY` explicitly, or just set `LLM_API_KEY` -- the provider is auto-detected from the key prefix (`sk-` for OpenAI, `sk-ant-` for Anthropic, `sk-or-v1-` for OpenRouter).

See [.env.example](.env.example) for all options.

## How It's Built

For the curious (and contributors):

- **Server** -- Single Node.js file (`server.js`, Express), no build step, no framework, no database
- **Frontend** -- Vanilla JS with ES modules, Monaco editor (the same editor engine as VS Code)
- **Data** -- Plain `.md` files on disk. That's it.
- **API** -- REST endpoints for file CRUD, task syncing, dashboard data, and AI search

Full details: [API Reference](docs/API.md) | [Contributor Guide](CLAUDE.md)

## Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

[MIT](LICENSE)
