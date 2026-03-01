# Contributing to ToDo.md

Thanks for your interest in contributing! Here's how to get started.

## Setup

```bash
git clone https://github.com/sidarora28/todo-md.git
cd todo-md
npm install
npm start
```

Open http://localhost:3000 to see the IDE.

To run the Electron desktop app in dev mode:

```bash
npm run electron:dev
```

## Code Style

- **No build step.** No TypeScript, no bundler, no framework.
- **Server** is a single `server.js` file (Express).
- **Frontend** uses vanilla JS with ES modules in `ide/`.
- **Desktop** uses Electron in `electron/`.
- **Backend** (Vercel) lives in `backend/` — deployed separately.
- Keep it simple. Avoid adding dependencies unless absolutely necessary.

## Project Structure

```
server.js           → Express server, all API endpoints
ide.html            → Web IDE entry point
ide/                → Frontend code (vanilla JS, ES modules)
electron/           → Electron desktop app (main process, preload, windows)
backend/            → Vercel-hosted backend (auth, billing, AI proxy)
  api/              → Serverless API endpoints
  lib/              → Shared utilities (auth, supabase client)
  public/           → Landing page, download page, signup page
.github/workflows/  → CI/CD (build + release on version tags)
docs/API.md         → API reference
```

See [.claude/instructions.md](.claude/instructions.md) for a detailed architecture guide.

## Making Changes

1. Fork the repo and create a branch from `main`
2. Make your changes
3. Test manually — start the server, use the IDE, check the dashboard
4. For Electron changes, test with `npm run electron:dev`
5. Open a pull request with a clear description of what you changed and why

## What to Work On

- Check [open issues](https://github.com/sidarora28/todo-md/issues) for bugs and feature requests
- Small improvements and bug fixes are always welcome
- For larger changes, open an issue first to discuss the approach

## Questions?

Open an issue — happy to help.
