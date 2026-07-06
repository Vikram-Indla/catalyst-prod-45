# Validation Evidence

- `npx tsc --noEmit -p tsconfig.app.json`: 183 errors before and after (baseline unchanged, no new errors introduced).
- `npx vite build`: OOMs on this machine regardless of changes (known local resource constraint, matches prior session notes on Node 20 tooling limits) — not caused by this change; tsc is the standard verification method used in this repo.
- Chrome MCP live check against localhost:8080 dev server:
  - Hub switcher (⌘ grid icon) now renders exactly 10 hubs across Discover / Build & Ship / Knowledge, no "Plan" row, shortcuts run ⌘1–⌘9 + ⌘− with no gap at ⌘0.
  - Navigating to `/planhub` cleanly redirects to `/tasks/overview` (Tasks Dashboard renders normally) — no dead link, no console errors.
  - No console errors on load or navigation.
- Repo-wide grep confirms no remaining imports of deleted paths (`components/planhub`, `modules/plan`, `modules-dormant/planhub`, `types/planhub.types`, `hooks/planhub*`, `PlanHubSidebar`) except the auto-generated `usage-map.generated.ts`.
