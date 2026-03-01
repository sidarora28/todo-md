<div align="center">

# ToDo.md

**A task manager built entirely around markdown files.**

Every task is tied to a larger goal. Everything lives on your hard drive. No cloud, no lock-in — just `.md` files.

[![Download](https://img.shields.io/badge/Download-macOS%20%7C%20Windows-2dd4a8?style=for-the-badge)](https://github.com/sidarora28/todo-md/releases/latest)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node 18+](https://img.shields.io/badge/node-18%2B-green.svg)](https://nodejs.org)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

[Website](https://todomd.app) · [Download](https://github.com/sidarora28/todo-md/releases/latest) · [Documentation](HOWTOUSE.md)

</div>

---

## Why ToDo.md?

I've used hundreds of apps and built dozens of systems from scratch. None of them did what I wanted. So for the last 2 years, I went back to the basics — a notebook and pen.

That system works well day-to-day. But after a week, everything gets lost. There's no way to track past wins, failures, progress, or open items.

One thing stuck with me through all of this: **I want every task tied to a larger goal.**

> **Theme:** Increase newsletter audience
> **Goal:** 1000 new subs in 2 months
> **Tasks:** fix landing page, add tracking, prepare draft 1, ...

This helps me focus on the right things and de-prioritise the rest. But notebook and pen doesn't work for long-term goal tracking.

So I built ToDo.md — a simple task management system managed entirely via markdown files. It looks and feels like VS Code, and everything stays on your machine.

---

## How It Works

### Daily File — your to-do list for the day

There is always just **one** daily file. This is where you spend most of your time.

Every day, the system reads all your projects, finds every task that is due today or overdue, and builds a focused daily file for you.

- Check off a task here → it automatically updates the project files
- Add a new task → it maps it to the relevant project

![Daily file with overdue and today tasks](https://github.com/user-attachments/assets/bbf930a7-b14c-423c-9168-cbb81f55082e)

---

### Tasks File — quick capture for future tasks

If a task isn't due today, add it here. The system uses the syntax to map it to the right project and the due date to surface it in the daily file when it's actually due.

Once processed (tied to a project), the task gets a strikethrough so you know it's been filed. If you don't mention a project, an LLM figures out the best match — or it goes to a fallback project like "others".

![Tasks file for recording tasks with future due dates](https://github.com/user-attachments/assets/c74dbfbb-69b3-4d9e-8490-cbfcbeb083a9)

---

### Inbox — your scratchpad

Not everything is a task yet. Ideas, vague thoughts, half-formed plans, links — dump them here. Tasks from this file don't go back to a project. They just live here as ideas.

Date headers are inserted automatically and older entries auto-archive to keep things clean.

![Inbox for open-ended ideas without due dates](https://github.com/user-attachments/assets/5edeb51f-bed6-44dd-a019-268867e7b0f1)

---

### Projects — the bigger picture

Every task is tied to a project (a larger goal). Each project folder has at least two files:

**Project meta** — goals, milestones, notes. You set this up once and rarely go back. But it provides good context to the LLM for smarter task sorting and search.

![Project meta file with goals and milestones](https://github.com/user-attachments/assets/703cfa32-a47d-4497-a830-91a94f32aff0)

**Project tasks** — all tasks for the project, organized by calendar month. Active tasks at the top, completed at the bottom.

![Monthly task file under a project](https://github.com/user-attachments/assets/6c2a2738-cbbf-4af8-a21e-9c4866ee39b1)

---

### Search — find anything

Keyword search surfaces all relevant files across every project. With an LLM plugged in, you also get semantic search that understands what you're asking and summarises results.

![Search with LLM-powered and keyword-based results](https://github.com/user-attachments/assets/8a9ba09c-6fc9-479f-9235-ae4a9cef93ab)

---

### Dashboard

A bird's-eye view of everything: project progress, overdue/due today counts, and an AI-generated daily brief to keep you on track.

---

## LLM — optional, not required

Everything works end to end without an LLM. You get keyword search, static daily summaries, and manual project assignment.

If you plug in an LLM, you get: smart search (ask questions in plain English), auto project inference (tasks get filed to the right project), and personalized daily briefings.

**Your files always stay on your machine.** If you use an LLM, file contents are sent to the LLM provider for search queries only.

---

## Download

| Platform | Download |
|----------|----------|
| **macOS** (Intel & Apple Silicon) | [Download .dmg](https://github.com/sidarora28/todo-md/releases/latest) |
| **Windows** (10+) | [Download .exe](https://github.com/sidarora28/todo-md/releases/latest) |

**Free 14-day trial.** No credit card required. After the trial, [choose a plan](https://todomd.app/#pricing) to continue using AI features.

---

## Run From Source

```bash
git clone https://github.com/sidarora28/todo-md.git
cd todo-md
npm install && npm start
```

Open **http://localhost:3000**. To use your own AI provider, configure `.env` — see [.env.example](.env.example) for options.

To run the Electron desktop app in dev mode:

```bash
npm run electron:dev
```

## For Developers

- **Server** -- Single Node.js file (`server.js`, Express), no build step
- **Frontend** -- Vanilla JS, Monaco editor (same engine as VS Code)
- **Desktop** -- Electron wrapper (`electron/`) with native menus and auto-updates
- **Data** -- Plain `.md` files on disk

Full details: [API Reference](docs/API.md) | [Contributor Guide](.claude/instructions.md)

## Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

[MIT](LICENSE)
