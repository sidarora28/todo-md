# Changelog

## 1.1.0 (2026-02-19)

### Desktop App
- Electron desktop app for macOS (.dmg) and Windows (.exe)
- Native menus, setup wizard, and OS-standard config storage
- Auto-updates via GitHub Releases (electron-updater)
- GitHub Actions CI/CD pipeline — builds triggered on version tags

### Accounts & Billing
- User accounts via Supabase auth with free 14-day trial
- Stripe billing integration (monthly, annual, lifetime plans)
- Managed AI proxy — subscribers use AI features without their own API key
- Usage tracking with daily rate limits per plan

### Website (todomd.app)
- Landing page with features, pricing, and app preview
- Download page with OS detection and platform-specific links
- Web signup page for creating a free trial account
- Success/cancel pages for Stripe checkout flow

## 1.0.0 (2026-02-10)

Initial release.

- Web IDE with Monaco editor, file tree, and auto-save
- Dashboard with project progress, overdue tasks, and daily focus
- Quick capture via `tasks.md` with auto project sync
- Daily planning files auto-generated from task due dates
- AI-powered search and project inference (optional, via OpenAI, Anthropic, or OpenRouter)
- Project management with milestones and progress tracking
- Inbox capture and processing
- Interactive setup wizard
