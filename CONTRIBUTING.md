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

## Code Style

- **No build step.** No TypeScript, no bundler, no framework.
- **Server** is a single `server.js` file (Express).
- **Frontend** uses vanilla JS with ES modules in `ide/`.
- Keep it simple. Avoid adding dependencies unless absolutely necessary.

## Making Changes

1. Fork the repo and create a branch from `main`
2. Make your changes
3. Test manually — start the server, use the IDE, check the dashboard
4. Open a pull request with a clear description of what you changed and why

## What to Work On

- Check [open issues](https://github.com/sidarora28/todo-md/issues) for bugs and feature requests
- Small improvements and bug fixes are always welcome
- For larger changes, open an issue first to discuss the approach

## Project Structure

See [CLAUDE.md](CLAUDE.md) for a detailed architecture guide.

```
server.js       → Express server, all API endpoints
ide.html        → Web IDE entry point
ide/            → Frontend code (vanilla JS, ES modules)
dashboard.html  → Standalone dashboard view
docs/API.md     → API reference
```

## Questions?

Open an issue — happy to help.
