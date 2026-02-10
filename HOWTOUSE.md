# How to Use ToDo.md

A complete guide to getting the most out of ToDo.md. Read this after you've run the setup wizard and have the IDE open in your browser.

---

## The Philosophy

Every task you do is usually part of something bigger -- a project, a goal, an area of your life you're trying to move forward. ToDo.md is built around this idea.

**Projects are the strategic layer.** They hold the big picture: what are you trying to achieve? What are the milestones? How far along are you? You don't look at these every day, but they keep you grounded when you need to step back and ask "why am I doing all this?"

**Your daily file is the tactical layer.** This is where the real work happens. Every morning, ToDo.md scans all your projects, finds everything that's due today or overdue, and builds a single focused list. You open it, work through it, check things off. That's your day.

**The system connects them automatically.** Check off a task in your daily file, and it's marked done in the project. Add a task to quick capture, and it's filed into the right project. You work at the tactical level, and the strategic level stays in sync without you thinking about it.

```
Projects (strategic)          Your Day (tactical)
┌─────────────────┐          ┌─────────────────┐
│ Newsletter       │ ──────> │ Today's Tasks     │
│  - milestones    │          │  □ Write draft    │
│  - progress      │          │  □ Review metrics │
│  - goals         │          │  □ Call dentist   │
├─────────────────┤          │  □ Buy groceries  │
│ App Redesign     │ ──────> │                   │
│  - milestones    │          │ Overdue           │
│  - progress      │          │  □ Send invoice   │
├─────────────────┤          └─────────────────┘
│ Personal         │ ──────>        ▲
└─────────────────┘                 │
                              tasks.md (quick capture)
                              inbox.md (scratchpad)
```

---

## Table of Contents

1. [Your First 5 Minutes](#your-first-5-minutes)
2. [The Daily File](#the-daily-file)
3. [Quick Capture (tasks.md)](#quick-capture-tasksmd)
4. [Inbox (inbox.md)](#inbox-inboxmd)
5. [Projects](#projects)
6. [Task Format Reference](#task-format-reference)
7. [AI Features](#ai-features)
8. [Without AI](#without-ai)
9. [Tips and Tricks](#tips-and-tricks)
10. [FAQ](#faq)

---

## Your First 5 Minutes

When you open the IDE (http://localhost:3000/ide.html), you'll see three panels:

- **Left** -- File tree. This is your workspace. Click any file to open it.
- **Center** -- Editor. This is where you read and edit files. It works like VS Code.
- **Right** -- Dashboard. Shows task counts, project progress, and your daily briefing.

**Start here:**

1. Click on `tasks.md` in the file tree. This is your quick capture file.
2. Add a task: `- [ ] Try out ToDo.md | 2026-02-15 | your-project-name`
3. Press `Ctrl+S` (or `Cmd+S` on Mac) to save.
4. Look in your project folder in the file tree -- the task should appear in the monthly file.
5. Open the `daily/` folder and click today's file. If the task is due today, it's there.

That's the core loop. Everything else builds on this.

---

## The Daily File

**Location:** `daily/YYYY-MM-DD.md` (e.g., `daily/2026-02-10.md`)

This is your working file for the day. You'll spend most of your time here.

**How it works:**

- Every time you open the IDE or the dashboard refreshes, the system scans all your projects for tasks that are due today or overdue.
- It builds a single file organized by urgency: overdue first, then today's tasks.
- Each task shows which project it belongs to so you have context.

**What it looks like:**

```markdown
# Monday, February 10, 2026

## Overdue
- [ ] Send invoice to client (freelance)
- [ ] Finish budget report (finance)

## Today
- [ ] Write newsletter draft (newsletter)
- [ ] Review pull request (open-source)
- [ ] Call dentist (personal)
```

**Checking off tasks:**

Change `- [ ]` to `- [x]`:

```markdown
- [x] Call dentist (personal)
```

Save the file, and the task is automatically marked as done in the project's monthly file too. You never need to update things in two places.

---

## Quick Capture (tasks.md)

**Location:** `tasks.md` (root of your workspace)

This is your inbox for actionable items. When you think of something that needs doing, dump it here.

### Syntax

```
- [ ] Task name | due date | project
```

| Part | Required? | Example |
|------|-----------|---------|
| `- [ ]` | Yes | Always start with this (dash, space, open bracket, space, close bracket) |
| Task name | Yes | `Write newsletter draft` |
| `\|` due date | Optional | `2026-02-15` (must be YYYY-MM-DD format) |
| `\|` project | Optional | `newsletter` (must match a project folder name) |

### Examples

```markdown
- [ ] Write project proposal | 2026-02-15 | work-project
- [ ] Buy groceries | 2026-02-11
- [ ] Research hosting options
```

### What happens when you save

1. Each task is matched to a project (by the project name you specified, or by AI auto-detection if you have AI enabled, or filed under "others" if neither).
2. The task is added to that project's monthly task file with full metadata (priority defaults to medium, status defaults to todo).
3. The line in `tasks.md` gets a ~~strikethrough~~ so you can see it's been processed.
4. Once 50+ completed tasks pile up, older ones are auto-archived to keep the file clean.

---

## Inbox (inbox.md)

**Location:** `inbox.md` (root of your workspace)

Not everything is a task yet. The inbox is for raw thoughts, ideas, links, half-formed plans -- anything you want to capture without committing to action.

### How to use it

Just type. No special format needed.

```markdown
## 2026-02-10

- Had an idea about a weekly review email for the newsletter
- Check out that article Sarah shared about productivity systems
- What if we added dark mode to the app?
```

### What happens automatically

- **Date headers** are inserted when you save, so entries are organized by day.
- **Auto-archiving** -- Entries older than 30 days are moved to an archive to keep the file manageable.

### When to use inbox vs tasks.md

| Use inbox.md when... | Use tasks.md when... |
|----------------------|----------------------|
| It's a thought or idea | It's something you need to do |
| You're not sure if it's actionable | You know the action and roughly when |
| You want to capture it quickly and think later | You want it to sync to a project |

---

## Projects

**Location:** `projects/your-project-name/`

Each project is a folder containing:

```
projects/
  newsletter/
    PROJECT.md          ← Project overview (goals, milestones, progress)
    tasks/
      2026-02.md        ← Monthly task file (February 2026)
      2026-03.md        ← Monthly task file (March 2026)
  app-redesign/
    PROJECT.md
    tasks/
      2026-02.md
```

### PROJECT.md

This is the strategic view of your project. It has two parts:

**1. Frontmatter (the settings between `---` lines):**

```yaml
---
type: project
status: active
target-date: ongoing
---
```

| Field | Valid values |
|-------|-------------|
| `status` | `active`, `paused`, `complete` |
| `target-date` | A date like `2026-06-01`, or `ongoing` for open-ended projects |

**2. Body (free-form markdown):**

```markdown
# Newsletter

## Goal
Grow subscriber base to 1,000 and publish weekly.

## Milestones
- [x] Set up email platform
- [ ] Reach 500 subscribers
- [ ] Launch paid tier

## Progress
Tasks: 5/12 complete (42%)

## Notes
Running notes and updates go here.
```

### Creating a new project

**In the IDE:** Click the `+` button in the file tree to create a new folder under `projects/`. Add a `PROJECT.md` and a `tasks/` subfolder.

**Through the setup wizard:** Re-run `npm run setup` and it will skip already-completed steps, letting you add new projects.

### Monthly task files

These live in `projects/your-project/tasks/` and are named by month (e.g., `2026-02.md`). They're created automatically when tasks are synced from `tasks.md`.

---

## Task Format Reference

This is the complete reference for task metadata in monthly task files.

### A task block looks like this:

```markdown
---
### Write newsletter draft
due: 2026-02-15
priority: high
status: todo
tags: [writing, newsletter]
created: 2026-02-10

Write the February issue. Focus on the new subscriber onboarding series.

**Notes:**
Added outline on Feb 10.

---
```

### Field reference

| Field | Required | Valid values | Default |
|-------|----------|-------------|---------|
| `due` | No | `YYYY-MM-DD` (e.g., `2026-02-15`) | Empty (no due date) |
| `priority` | No | `high`, `medium`, `low` | `medium` |
| `status` | Yes | `todo`, `in-progress`, `done` | `todo` |
| `tags` | No | `[tag1, tag2]` | `[]` |
| `created` | Auto | `YYYY-MM-DD` | Set automatically |
| `completed` | Auto | `YYYY-MM-DD` | Set when status changes to `done` |

### Completing a task

Change `status: todo` to `status: done`. On the next sync, the task moves from "Active Tasks" to "Completed Tasks" in the monthly file, and a `completed:` date is added.

### Task lifecycle

```
tasks.md (quick capture)
    ↓ save
project/tasks/2026-02.md (Active Tasks, status: todo)
    ↓ change status to done
project/tasks/2026-02.md (Completed Tasks, status: done)
    ↓ also reflected in
daily/2026-02-10.md (checked off)
```

---

## AI Features

AI features require an API key from one of three providers. The setup wizard walks you through this, or you can add it to the `.env` file anytime.

### Smart Search

Open the search panel in the IDE and type a question in plain English:

- "What's overdue?"
- "Show me high priority tasks for the newsletter"
- "Summarize my project backlog as a prioritized roadmap"
- "What did I complete last week?"

The AI reads your workspace files and gives you a contextual answer. For small workspaces (under 50 files), it reads everything. For larger ones, it pre-filters by keywords first.

### Auto Project Inference

When you add a task to `tasks.md` without specifying a project:

```markdown
- [ ] Write newsletter draft | 2026-02-15
```

AI looks at your existing projects and matches the task to the best fit based on the title. "Write newsletter draft" would get matched to the `newsletter` project. Without AI, unmatched tasks go to an "others" folder.

### Daily Briefings

Instead of a plain task list, the dashboard shows a personalized morning narrative:

> "Good morning! You have 3 tasks due today and 1 overdue from yesterday. Your Newsletter project is 42% complete -- you're making steady progress. Today's focus: finishing the newsletter draft and reviewing the app redesign wireframes. The client invoice from last week is still outstanding."

The tone rotates daily: encouraging, direct, reflective, energetic, calm.

### Supported providers

| Provider | Model | How to get a key |
|----------|-------|------------------|
| **OpenAI** | GPT-4o | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) |
| **Anthropic** | Claude Sonnet | [console.anthropic.com](https://console.anthropic.com) |
| **OpenRouter** | Any model | [openrouter.ai/keys](https://openrouter.ai/keys) (free $1 credit) |

---

## Without AI

Everything works without an API key. Here's what you get:

| Feature | With AI | Without AI |
|---------|---------|------------|
| Search | Natural language questions | Keyword search with relevance scoring |
| Daily briefing | Personalized narrative | Task summary with motivational quote |
| Project inference | Auto-matches tasks to projects | Tasks go to "others" unless you specify |
| Task sync | Same | Same |
| Daily file | Same | Same |
| Dashboard | Same | Same |

The motivational quotes rotate from a curated collection of 100 -- Stoic philosophy, modern wisdom, and everything in between.

---

## Tips and Tricks

**Auto-save:** The IDE saves your work automatically after 10 seconds of inactivity. You can also press `Ctrl+S` / `Cmd+S` to save immediately.

**Task sync happens on save:** When you save `tasks.md`, a daily file, or a monthly task file, the system syncs changes across all related files. This is instant.

**New month, new file:** Monthly task files are created automatically. When February ends and March begins, new tasks go into `2026-03.md`. Completed tasks from February stay in `2026-02.md` as a record.

**Project names in tasks.md:** Use the folder name, not the display name. If your project folder is `app-redesign`, write `app-redesign` in the task, not "App Redesign".

**Re-run setup anytime:** `npm run setup` is safe to re-run. It skips steps that are already complete (dependencies installed, .env exists, projects exist) and lets you add new projects or change your AI provider.

**Your files are always yours:** Every piece of data is a `.md` file on your hard drive. You can open them in any text editor (VS Code, Obsidian, Typora, even Notepad). The IDE is convenient, not required.

---

## FAQ

**Is my data sent anywhere?**
No. Everything runs locally on your computer. The only external call is to your AI provider (if you set one up), and that only happens when you use search or request a daily briefing. Your files never leave your machine.

**Can I use this on my phone?**
Not directly -- it runs as a local server on your computer. But since all data is plain markdown files, you could sync the folder with Dropbox, iCloud, or Git and read/edit them with any markdown app on your phone.

**What if I break a file?**
Markdown is just text. If something looks wrong, you can always open the file and fix it. There's no database to corrupt. If a file gets truly mangled, delete it and the system will regenerate what it can (daily files, monthly task files from tasks.md).

**How do I back up my data?**
The entire `projects/`, `daily/`, `tasks.md`, and `inbox.md` are your data. Copy the folder, push it to a Git repo, or sync it with any cloud storage. Since it's just files, any backup method works.

**Can I use my own text editor instead of the IDE?**
Yes. The server watches for file changes. Edit files in VS Code, Obsidian, or any editor -- just make sure the server is running (`npm start`) so syncing still works.

**How do I add an AI key later?**
Open the `.env` file in your ToDo.md folder and add:
```
LLM_PROVIDER=openai
LLM_API_KEY=sk-your-key-here
```
Restart the server (`Ctrl+C`, then `npm start`). The provider is auto-detected from the key prefix if you don't set `LLM_PROVIDER`.

**How do I stop the server?**
Click the terminal window where the server is running and press `Ctrl+C`. Or just close the terminal window.

**Can multiple people use the same workspace?**
It's designed for personal use. Multiple people editing the same files could cause conflicts. For team task management, each person should have their own ToDo.md instance.

**How do I delete a project?**
Delete the project's folder from `projects/` (either in the IDE file tree or in your file explorer). The tasks in that project won't appear in your daily file anymore.

**What happens if I don't use it for a week?**
Nothing breaks. When you come back, the daily file will regenerate with all your overdue tasks. The inbox auto-archives entries older than 30 days. Everything else stays exactly as you left it.
