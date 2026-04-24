📋 CC TASK BRIEF — For You / Stable Recommended projects strip
════════════════════════════════════

CONTEXT
─────────
The "Recommended projects" strip above the tab bar is unstable — it re-derives its card list from the active tab's filtered work items (`visibleItems`), so clicking a tab changes the count and order of cards. Jira (ground truth via T2 DOM probe 2026-04-24) shows three stable cards regardless of active tab because its strip is account-scoped, not tab-scoped.

Also: on the Assigned tab the strip renders duplicates (e.g. "Portfolio" twice). The cause is incidental to the unstable derivation — moving to an account-scoped query keyed by `projects.id` removes dupes as a side effect.

Prerequisite: task #1 (plumb `projects.avatar_url`) should land first so the strip has an `avatar_url` to pass to `<Avatar>`. If it has not landed yet, do NOT block — pass `undefined` and Atlaskit's hashed-initials fallback will render until #1 ships.

TASK
────
1. Add a new `allUserProjects: Project[]` field to the return of `useForYouData`. Back it with a dedicated TanStack Query:
     - Query key: `['for-you', 'allUserProjects', userId]`
     - staleTime: 15 minutes (project membership changes slowly)
     - Supabase call: `select('id, key, name, avatar_url').from('projects')` — RLS handles the user scope.
     - Type: `Project = { id: string; key: string; name: string; avatar_url?: string | null }` — export from the same file.
2. Change `RecommendedProjectsStrip` to consume `projects: Project[]` instead of `items: WorkItem[]`:
     - Delete the `useMemo` at lines 56–75 that reduces items into cards with a per-project count.
     - Map `projects` directly into `ProjectCard`: `{ key: p.key, name: p.name, projectId: p.id, avatarUrl: p.avatar_url ?? undefined }`.
     - Sort by `name.localeCompare`, slice to `maxCards`.
     - Keep the `cards.length === 0 → return null` guard.
3. Update the caller in `ForYouPage.atlaskit.tsx:163` to pass `projects={allUserProjects}`.

FILES TO TOUCH
──────────────
  - src/hooks/useForYouData.ts  (new query + return shape)
  - src/components/for-you/atlaskit/RecommendedProjectsStrip.tsx  (prop + derivation)
  - src/pages/ForYouPage.atlaskit.tsx  (pass the new prop)

DO NOT TOUCH
────────────
  - The per-tab panels (Recommended/Assigned/Starred/Worked/Viewed) — they still take `items: WorkItem[]`.
  - The project avatar seed data. Seeding is a separate PR.
  - Any other hub's project query.
  - §11 icons — untouched.

GUARDRAILS
──────────
  - L39 (UUID guard) — the projects query uses `id` (uuid); do not pass a project key where an id is expected or vice versa.
  - CLAUDE.md §10 — one component, one file, one fix per step. This is ONE feature spanning three files because the hook ↔ strip ↔ page edits are atomic (refactoring only two of the three produces a type error on purpose).
  - Hex only / no HSL — no style edits.
  - §17 — no CSS changes.

ACCEPTANCE CRITERIA
───────────────────
  - [ ] `useForYouData()` returns `allUserProjects: Project[]`.
  - [ ] `RecommendedProjectsStrip`'s prop signature is `{ projects: Project[]; maxCards?: number }` — `items` is gone.
  - [ ] Strip renders the same cards (count, order, names) on Recommended → Assigned → Starred → Worked → Viewed.
  - [ ] No duplicate cards on any tab (verify the "Portfolio×2" repro from iteration 3 no longer reproduces).
  - [ ] Strip renders even on the Viewed tab with an empty `visibleItems` (previously returned `null`).
  - [ ] `npm run typecheck` passes.
  - [ ] No regression on the Recommended tab's rendering (mentions + rows still render identically).

VERIFICATION (after fix)
─────────────────────────
  1. Open `/` on the dev server.
  2. Click each of the 5 tabs in order and confirm the strip's card set is identical in count and order each time.
  3. On the Assigned tab, confirm no duplicate project cards appear.
  4. In DevTools React DevTools, inspect `<RecommendedProjectsStrip>` — confirm it receives `projects` (not `items`).

Send to Vikram with a screen-recording across all 5 tabs showing the strip stable.
