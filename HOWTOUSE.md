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

1. [Walkthrough: A Real Day with ToDo.md](#walkthrough-a-real-day-with-todomd)
2. [Syntax Reference](#syntax-reference)
3. [AI Features](#ai-features)
4. [Without AI](#without-ai)
5. [Tips and Tricks](#tips-and-tricks)
6. [FAQ](#faq)

---

## Walkthrough: A Real Day with ToDo.md

Let's walk through a complete use case from scratch — setting up projects, adding tasks, working through your day, and tracking progress. This is how ToDo.md is meant to be used.

### Step 1: Create your projects

Projects represent the big things in your life — work goals, side projects, personal areas. Open the IDE and create a few project folders under `projects/`:

```
projects/
  newsletter/
  app-redesign/
  personal/
```

Each project needs a `PROJECT.md` and a `tasks/` folder. Here's what `newsletter/PROJECT.md` looks like:

```markdown
---
type: project
status: active
target-date: ongoing
---

# Newsletter

## Goal
Grow subscriber base to 1,000 and publish weekly.

## Milestones
- [ ] Set up email platform
- [ ] Reach 500 subscribers
- [ ] Launch paid tier

## Progress
Tasks: 0/0 complete (0%)

## Notes
Running notes and updates go here.
```

This is your strategic view. You set it up once and come back to it when you need to zoom out and think about the bigger picture.

### Step 2: Add today's tasks in the daily file

Open the `daily/` folder in the file tree and click today's file. This is your working document — where you'll spend most of your time.

Add tasks for today directly here:

```markdown
# Monday, February 10, 2026

## Today
- [ ] Write February newsletter draft (newsletter)
- [ ] Sketch wireframes for onboarding screens (app-redesign)
- [ ] Book dentist appointment (personal)
- [ ] Buy groceries for the week (personal)
```

Save. Each task syncs back to the right project's monthly file automatically. You're writing in one place, and the system organizes everything behind the scenes.

**The daily file is for today.** If it's due today, it goes here.

### Step 3: Schedule future tasks through tasks.md

Got tasks that aren't for today? That's what `tasks.md` is for. Open it and add tasks with future due dates:

```markdown
- [ ] Review subscriber analytics | 2026-02-12 | newsletter
- [ ] Audit current drop-off points in signup funnel | 2026-02-11 | app-redesign
- [ ] Read chapter 3 of Design of Everyday Things | 2026-02-15 | personal
```

Press `Ctrl+S` to save. What happens:

- Each task gets filed into the right project's monthly task file.
- The lines in `tasks.md` get a ~~strikethrough~~ to show they've been processed.
- When the due date arrives, the task automatically appears in that day's daily file.

**Think of it this way:** The daily file is your "right now." `tasks.md` is your "later." Both feed into the same project system.

### Step 4: Capture ideas in inbox.md

Not everything is a task yet. Maybe you had a thought in a meeting, saw an interesting article, or want to explore an idea later. That's what `inbox.md` is for.

Open it and just type. No special format needed:

```markdown
## 2026-02-10

- Had an idea about a weekly review email for the newsletter
- Check out that article Sarah shared about productivity systems
- What if we added dark mode to the app?
```

Save. Date headers are added automatically, and entries older than 30 days are auto-archived so the file stays clean.

**The full capture spectrum:**

| What you have | Where it goes |
|--------------|---------------|
| A task for today | Daily file (`daily/`) |
| A task for a future date | `tasks.md` |
| An idea, thought, or note without a date | `inbox.md` |

When a thought in the inbox becomes actionable, move it to `tasks.md` or add it to today's daily file.

### Step 5: Complete tasks right from the daily file

This is the fastest way to get things done. You don't need to open any project file — just check off tasks right here in today's file.

You made the dentist call and bought groceries. Change `[ ]` to `[x]`:

```markdown
- [x] Book dentist appointment (personal)
- [x] Buy groceries for the week (personal)
```

Save. That's it. Two things happen automatically:

1. Those tasks are marked as `status: done` in the `personal` project's monthly file.
2. The project's completion percentage updates.

You checked off two tasks in one file, and two project files updated themselves. This is the core of ToDo.md — **you work in the daily file, the system handles the rest.**

### Step 6: Check the dashboard

Look at the dashboard panel on the right side of the IDE. You can see:

- **Task counts** — 2 done today, 2 remaining, 2 more coming this week
- **Project progress** — Newsletter at 0%, App Redesign at 0%, Personal at 50% for this month
- **Daily briefing** — If you have AI enabled, you get a personalized narrative about your day. If not, you get a motivational quote.

### Step 7: Manage tasks from the project files

Sometimes you need to make changes at the project level — reschedule something, change priority, add context. Open `projects/newsletter/tasks/2026-02.md`:

```markdown
---
### Write February newsletter draft
due: 2026-02-10
priority: high
status: todo
tags: [writing]
created: 2026-02-10

Write the February issue focusing on subscriber onboarding.

**Notes:**

---
```

Want to push it to tomorrow? Change `due: 2026-02-10` to `due: 2026-02-11`. Save. Tomorrow's daily file will pick it up. Want to bump it to high priority? Already done. Need to add notes? Write under `**Notes:**`. This is where you manage the details.

### Step 8: Search across everything

Open the search panel. If you have AI enabled, try:

- `"what's overdue?"` — Finds all tasks past their due date across every project.
- `"show me newsletter tasks"` — Pulls everything related to the newsletter.
- `"summarize my week"` — Gets a narrative overview of what's due, what's done, and what needs attention.
- `"what should I focus on today?"` — AI looks at priorities, deadlines, and your workload to suggest what matters most.

Without AI, keyword search still works — type "newsletter" and you'll get every file that mentions it, ranked by relevance.

### The pattern

That's a full day with ToDo.md:

1. **Morning** — Open the daily file. Everything due today is already there.
2. **During the day** — Check off tasks as you go. Add new ones to `tasks.md` when they come up.
3. **When needed** — Open project files to reschedule, reprioritize, or add context.
4. **Zoom out** — Check the dashboard or use search to get the big picture.

The daily file keeps you focused on what's in front of you. The project files keep the strategic view intact. The system keeps them in sync.

---

## Syntax Reference

### tasks.md format

```
- [ ] Task name | due date | project
```

| Part | Required? | Example |
|------|-----------|---------|
| `- [ ]` | Yes | Always start with this (dash, space, open bracket, space, close bracket) |
| Task name | Yes | `Write newsletter draft` |
| `\|` due date | Optional | `2026-02-15` (must be YYYY-MM-DD format) |
| `\|` project | Optional | `newsletter` (must match a project folder name) |

### PROJECT.md frontmatter

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

### Task metadata (in monthly task files)

A task block looks like this:

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
daily file (today's tasks)  ──┐
                               ├──> project/tasks/2026-02.md (Active Tasks)
tasks.md (future tasks)     ──┘          ↓ change status to done
                                  project/tasks/2026-02.md (Completed Tasks)
                                         ↓ also reflected in
                                  daily file (checked off)
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
