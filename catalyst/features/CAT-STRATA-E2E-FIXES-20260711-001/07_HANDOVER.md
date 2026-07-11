# 07 — HANDOVER

## Done (committed to main, verified)
- Slice 1 `a02b9c569`: 001, 002, 005, 007 (frontend) — verified live.
- Slice 2 `86a6e7c33`: 004 + 008 (staging migrations, verified), 003 (role gate).
- Pre-work: fixed the corrupt-Vite-dep-cache boot failure (`rm -rf node_modules/.vite`).

7 of 9 defects fully resolved. 003 also had an environmental component (boot cache) — the
Delivery-Objective now creates fine; the committed change closes the latent role-gate gap.

## Remaining — two dedicated follow-ups

### 006 — Risk + standalone Blocker authoring (FEATURE, not a fix)
Scope for a fresh slice:
- Schema (staging first): new `strata_risks` table — project_card_id FK, title, description,
  severity, likelihood, status, owner_id, mitigation, dates; RLS mirroring strata_milestones;
  `strata_create_risk` / `strata_update_risk` / `strata_archive_risk` RPCs + audit events.
- Blocker: schema already supports it via `strata_dependencies.is_blocker` — add a standalone
  "New blocker" entry point (a dependency-create prefilled is_blocker=true), no new table.
- UI: Risk section in ProjectCardDetailView Delivery tab (JiraTable list + StrataFormModal
  create/edit), FormKey additions `new-risk`/`edit-risk`. ADS tokens only; no hand-rolled UI.
- Decision needed: severity/likelihood taxonomy (match Jira risk matrix? 1-5 × 1-5?).

### 009 — console warnings (minor)
- Malformed React Router path `/planhub*` (find the route with a bare `*` and fix to `/planhub/*`).
- Unknown Atlaskit tokens `font.size.100` / `font.size.050` (a component passing a bad token id).
- Recharts container width/height `-1` (a chart rendered before its container has size).
- Multiple FeatureGateClients versions / React defaultProps / legacy context — mostly library-level.

## Environment caveat
Vite dep-optimize is fragile here: edits sometimes re-corrupt `node_modules/.vite` and the app
shows `Boot Error: Failed to fetch dynamically imported module`. Fix: stop dev server,
`rm -rf node_modules/.vite`, `npm run dev`. See memory `strata-boot-error-vite-cache`.
