# 02 — Current Catalyst `/release-hub/releases` Discovery

**Date:** 2026-06-23. Source: code archaeology (no screenshots used — functional discovery per CLAUDE.md).

## Route registration

`src/routes/FullAppRoutes.tsx`

```tsx
// line 85
const ReleasesBacklogCanonical = lazy(() => import("../pages/releasehub/ReleasesBacklogCanonical"));
// line 735
<Route path="/release-hub/releases" element={<S><ReleasesBacklogCanonical /></S>} />
```

- `<S>` = Suspense wrapper. **No `<ModuleGuard>` and no permission guard on this route** — contrast `/release-hub/overview` (line 734) which is wrapped in `<ModuleGuard moduleCode="releases">`. Gap flagged in `05` + `07` Q4.
- Redirects that land here: `/releasehub/all-releases`, `/releasehub/all` → `/release-hub/releases` (FullAppRoutes lines 761, 767).
- Release detail route: `/release-hub/:releaseId` → `<ReleaseDetailPage />` (line ~759).

## Page component

`src/pages/releasehub/ReleasesBacklogCanonical.tsx` (56 lines)

- Default export `ReleasesBacklogCanonical()`.
- Imports:
  - `Spinner` from `@atlaskit/spinner`
  - `BacklogPage` from `@/modules/project-work-hub/pages/BacklogPage.atlaskit`
  - `useReleasesSource` from `@/modules/project-work-hub/adapters/releasesDataSource`
  - `ProjectPageHeader` from `@/components/layout/ProjectPageHeader`
- Behavior: calls `useReleasesSource()` → if null shows centered `<Spinner size="large">` → else renders the **canonical `BacklogPage`** with:
  - `projectId="RELEASES"`, `projectKey="RELEASES"`, `displayName="Releases"`, `baseUrl="/release-hub"`
  - `dataSource={adapterWithChrome}` where `adapterWithChrome` adds a `ChromeHeader` (`<ProjectPageHeader projectKey="RELEASES" hubType="release" />`) and an `allowedColumnIds` allowlist: `key, request_type, status, category, target_date, assignee`.

This explains the live page: breadcrumb + title "Releases", the standard backlog search/filter/group toolbar, and a JiraTable. The "Work / Status / Assignee" columns the user sees are the BacklogPage default-visible subset of that allowlist.

## Table implementation

- **Canonical `JiraTable`** — `src/components/shared/JiraTable/` (`JiraTable.tsx` ~132KB, plus `cells.tsx`, `editors.tsx`, `ColumnHeaderMenu.tsx`, `BulkFooterBar.tsx`, `ToolbarMenuButton.tsx`, `flags.tsx`, `ResizeColumnDialog.tsx`). Mounted indirectly through `BacklogPage`. No hand-rolled table.

## Search / filter / group toolbar

- Provided by `BacklogPage` (the shared toolbar used by `/project-hub/:key/backlog` and `/product-hub/:key/backlog`). Same component — search box, filter dropdown, group-by control, column manager, inline create, bulk actions, Ask Caty. Not bespoke to releases.

## Empty state

- Inherited from `BacklogPage`'s empty/loading handling. `ReleasesBacklogCanonical` only renders its own `@atlaskit/spinner` while the adapter is still resolving (`adapter === null`). The empty *table* state is BacklogPage's.

## Create button behavior

- Backlog inline create. `useReleasesSource().onCreate({ title })` inserts into `rh_releases`:
  ```
  { name: title, status: 'draft', source: 'catalyst', target_date: <today>, created_at, updated_at }
  ```
  `target_date` is set because it is **NOT NULL** on `rh_releases` (legacy migration). No rich create form on this surface — the rich `CreateReleaseModal` (see `04`) is used elsewhere in Release Operations, not wired into this backlog page.

## Data source adapter (key file)

`src/modules/project-work-hub/adapters/releasesDataSource.ts` (282 lines) — `useReleasesSource(): BacklogDataSource | null`

- **Reads** `rh_releases` (`.neq('status','cancelled').order('updated_at',desc).limit(2000)`), then joins `profiles` for `release_manager_id → full_name`.
- `RELEASE_SELECT` = `id, name, version, status, health, release_type, target_env, target_date, planned_release_date, readiness_pct, source, jira_key, updated_at, created_at, product_id, release_manager_id`.
- Maps each row → `BacklogStory` via `releaseToBacklogStory` (`issue_type:'Release'`, `request_type:release_type`, `category:target_env`, etc.).
- **9-stage status model** `RELEASE_STATUSES`: `draft, planned, in_readiness, ready_for_signoff, approved, scheduled, deploying, monitoring, completed` (mirrors the release kanban).
- **Mutations:** update (`RELEASE_PATCH_MAP`: title→name, status→status, target_date→planned_release_date, request_type→release_type, category→target_env, delivery_manager_id→release_manager_id); delete = **soft-retire** (`status='cancelled'`, no `deleted_at` col); create as above.
- `entityKind: 'release'` — row click short-circuits to `/release-hub/:id` (`ReleaseDetailPage`, 8 tabs) instead of `CatalystDetailRouter`.
- `resolveItemType: () => 'Release'` → teal stopwatch icon.

## Page shell / layout

- App shell `src/components/layout/CatalystShell.tsx`.
- Release Operations sidebar `src/components/layout/ReleaseHubSidebar.tsx` — `buildReleaseHubSections()`:
  - Section "Releases": **`{ id:'backlog', title:'Releases', path:'/release-hub/releases', icon:List, exact:true }`**, plus Board, Work, Timeline, Calendar.
  - Other sections: Dashboard (overview), Change Management (Change Records, SOP Templates, Sign-off Queue, Freeze Windows, Production Events).
- Per-page chrome: `ProjectPageHeader` (breadcrumb + title), injected via the adapter's `ChromeHeader`.

## Permission checks on Release Operations

- `/release-hub/overview` → `<ModuleGuard moduleCode="releases">`.
- `/release-hub/releases` (this page) → **none** (only `<S>` suspense). Inconsistent. No row-level role gate in the adapter mutations either (relies on `rh_releases` RLS — see `05`).

## Orphaned / adjacent code

- `src/pages/releasehub/AllReleasesPage.tsx` — header comment claims it owns `/release-hub/releases`, but it is imported as `RH21AllReleasesPage` and is **not referenced by any active `<Route>`** (legacy `/releasehub/all-releases` now redirects to the canonical page). Treat as dead/legacy; confirm before deleting (CLAUDE.md deletion rule).
