# 01 — Repo Discovery (Catalyst Filters)

> Gate 1 deliverable. Read-only. All facts file:line-grounded. Sources: 3 parallel sub-agent probes (frontend, backend, dependency/blast-radius) + live Postgres catalog (project `lmqwtldpfacrrlvdnmld`).

---

## 1. Routes (all in `src/routes/FullAppRoutes.tsx`; `App.tsx` has none)

| Path | Element | Hub |
|---|---|---|
| `/project-hub/:key/filters` | `FiltersListPage` (directory) | project |
| `/project-hub/:key/filters/create` | `FilterPreviewPage` (builder) | project |
| `/project-hub/:key/filters/:filterId` | `FilterDetailPage` (detail) | project |
| `/project-hub/filters` | `FiltersListPage` | project (keyless) |
| `/product-hub/:key/filters` | `FiltersListPage hubType="product"` | product |
| `/product-hub/:key/filters/create` | `FilterPreviewPage mode="product"` | product |
| `/product-hub/:key/filters/:filterId` | `FilterDetailPage mode="product"` | product |
| `/product-hub/filters` + `/create` | `Navigate → /product-hub/products` (RETIRED 2026-06-01) | product |
| `/incident-hub/filters` `/create` `/:filterId` | Incident wrappers → canonical trio | incident |
| `/tasks/filters` `/create` `/:filterId` | Tasks wrappers → canonical trio | tasks |
| `/project-hub/:key/dashboards/:id` | `FilterDashboardPage` (`:id`=filter_derived_views.id) | project |
| `/project-hub/:key/roadmaps/:id` | `FilterRoadmapPage` | project |

**No Releases-hub or TestHub filter route exists** (template registry references `'release'`/`'testhub'` scopes but no routes/nav).

## 2. Pages

- **Canonical trio** `src/pages/project-hub/filters/`: `FiltersListPage.tsx` (directory, Jira-probed via `/rest/api/3/filter/search`), `FilterDetailPage.tsx` (436 LOC, detail), `FilterPreviewPage.tsx` (1497 LOC, builder/create; named export). Reused by all hubs via `hubType`/`mode` props.
- **Product** `src/pages/product-hub/filters/ProductFilterPreviewPage.tsx` (mirror, `business_requests` data model).
- **Incident** `src/pages/incidenthub/Incident{FiltersList,FilterDetail,FilterPreview}Page.tsx` — thin wrappers, `ph_issues` filtered `issue_type='Production Incident'`, sentinel `projectKey='INCIDENTS'`.
- **Tasks** `src/modules/tasks/pages/Tasks{FiltersList,FilterDetail,FilterPreview}Page.tsx` — thin wrappers, `tasks` table, sentinel `projectKey='TASKS'`.
- **Derived** `src/pages/project-hub/{FilterDashboardPage,FilterRoadmapPage}.tsx`.

## 3. Components

`src/components/filters/`: `FilterKebabMenu.tsx` (793 LOC — per-filter actions, wires all 3 derived-view creators + WhatsApp), `FilterSaveModal.tsx` (336 LOC), `BasicFilterBar.tsx`, `JQLEditor.tsx`, `JQLAutocompleteDropdown.tsx`, `FilterResultsPanel.tsx` (has `dataSource` branch incl. `'tasks'`), `FilterTemplateGallery.tsx`, `FilterUsageSparkline.tsx`, `FilterVersionHistory.tsx`, `TransferOwnershipModal.tsx`.

`src/components/shared/`: `JiraBasicFilter.tsx` (exports `FilterTriggerButton`), `JiraFilterAtlaskit.tsx`, `GroupByPopover.tsx`.

**Names the master prompt expected but DON'T exist:** `GroupByControl` (→ `GroupByPopover`), `FilterChip*`, `FilterTrigger*` (→ only `FilterTriggerButton`), `FilterPreview*` component (→ only the page), `useLinkedEntities` (→ stub, §4), Releases filter route. `ColumnManager`/`FilterDropdown` exist but are **per-surface duplicates**, not shared.

## 4. Hooks

| Hook | Table | Status |
|---|---|---|
| `src/hooks/workhub/useSavedFilters.ts` | `ph_saved_filters` | **CANONICAL**, 18 importers. Exports: `useFiltersForProject` (primary list), `useCreate/Update/DeleteSavedFilter`, `useStarFilter`, `useToggleFilterSubscription`, `useCopyFilter`, `useFilterVersions`, `useRecordFilterVersion`, `useExistingBoardForFilter`, `useToggleFilterBoardLink`, `useRecordFilterUsage`, `useChangeFilterOwner`. |
| `src/hooks/useSavedFilters.ts` | `saved_filters` (legacy) | **ORPHAN** — zero importers. Dead. |
| `src/modules/tasks/hooks/useSavedFilters.ts` | `task_saved_filters` | **STUB** — empty bodies, unused. |
| `src/hooks/workhub/useJQLFilteredIssues.ts` | `ph_issues` via `applyJQLFilters` | execution path A |
| `src/hooks/workhub/useJqlResults.ts` | `ph_issues` | execution path B (older sibling) |
| `src/hooks/workhub/useFilterDerivedViews.ts` | `filter_derived_views` | `useExisting/CreateRoadmapFromFilter`, `useExisting/CreateDashboardFromFilter` |
| `src/hooks/workhub/useCreateKanbanFromFilter.ts` | `boards` + `board_columns` + `board_status_mappings` | kanban derivation |
| `src/hooks/workhub/{useFilterOptionPools,useJQLValuePool,useJQLValidation}.ts` | facets / validation | |

**`useLinkedEntities` — STUB returning `[]`** (FilterPreviewPage.tsx:600, ProductFilterPreviewPage.tsx:286). "Linked entities" UI always empty.

## 5. JQL library — DIVERGENT (confirmed)

**Forward (filterState → JQL):** THREE impls with different facet maps + ORDER BY behavior:
- `src/lib/filters/basicToJql.ts:7` (`JiraFilterValue`, no ORDER BY) → BacklogPage Basic builder.
- `src/lib/filters/filterStateToJql.ts:28` (`FilterState`, appends `ORDER BY updated DESC`, adds sprint/resolution) → Project/Product AllWork.
- `src/pages/project-hub/jira-list/components/AllWorkToolbar.tsx:964` (THIRD impl, adds parent/storyPoints/severity, no ORDER BY) → FilterSaveModal, FilterPreviewPage, ProductFilterPreviewPage.
- `src/lib/filters/catyFilterToJql.ts:11` (`CatyFilter` AI spec) → Caty AI bar.

**Reverse (JQL → filterState):** `src/lib/jql/jqlToFilterState.ts:36` (shared) — but FORKED into local duplicates at FilterPreviewPage.tsx:280 and ProductFilterPreviewPage.tsx:305 (a lib parse-fix won't reach the preview pages). Plus `src/lib/jql/jqlToJiraFilterValue.ts` → BacklogPage.

**Low-level engine** `src/lib/jql/`: `translate()` (string→`JqlFilter[]`), `tokenize`, `parseOrderBy`, `getSuggestions`, `JQL_FIELD_MAP`. Execution: `src/lib/jql-supabase.ts` `applyJQLFilters`/`applyJQLOrderBy`/`buildSupabaseQuery`.

**Two execution paths to `ph_issues`:** `useJqlResults` and `useJQLFilteredIssues`→`applyJQLFilters`.

Visibility helpers `src/lib/filters/filterVisibility.ts`: `visibilityOptions`, `hubTypeToProjectKey`, `scopeToVisibility`, `visibilityToScope`. Types `FilterVisibilityScope`, `FilterHubType` (`project|product|incident|tasks`).

Template registry `src/lib/filters/filterTemplates.ts`: hub-scoped (`HubTemplateScope = project|product|release|testhub|tasks`).

## 6. Navigation

"Filters" nav item in: `ProjectHubSidebar.tsx:121`, `ProductHubSidebar.tsx:67`, `IncidentHubSidebar.tsx:59`, `TasksSidebar.tsx:56`. (Older `SidebarProjectNav.tsx:54` labels it "Project Filters".) No Releases/TestHub nav entry.

---

## 7. Backend (live Postgres catalog — authoritative)

### `ph_saved_filters` — 27 cols, 10 rows
`id, name, user_id, is_shared, filter_config(jsonb), page(text), created_at, updated_at, description, jql_query, viewers_config(jsonb), editors_config(jsonb), starred_by_user_ids(array), owner_id, used_by_board_ids(array), hub_scope, last_used_at, use_count, health_status, project_key, subscriber_ids(array), jira_filter_id, jira_owner_name, jira_owner_account_id, share_permissions(jsonb), edit_permissions(jsonb), product_key`

### `ph_filter_versions` — 6 cols, 11 rows
`id, filter_id, jql_query, result_count, changed_by, changed_at`. Immutable (no UPDATE policy).

### `filter_derived_views` — 9 cols, 2 rows
`id, source_filter_id, type, title, owner_id, shared_default_config(jsonb), visibility, created_at, updated_at`.

### RLS (live policy bodies)
- **`ph_saved_filters_select`**: `user_id=auth.uid() OR owner_id=auth.uid() OR viewers_config->>'type' IN (everyone/org/organization/global/loggedin/authenticated) OR (type='project' AND ph_saved_filter_is_project_member(project_key,auth.uid())) OR (type='product' AND ph_saved_filter_is_product_member(product_key,auth.uid())) OR (type='specific' AND viewers_config->'user_ids' ? auth.uid())`. **Clean, helper-fn-based, no jwt anti-pattern.**
- **`ph_saved_filters_insert`**: CHECK `user_id=auth.uid()`.
- **`ph_saved_filters_update`**: `user_id=auth.uid() OR owner_id=auth.uid()`. ⚠️ **Does NOT honor `editors_config`** — specific editors cannot write. (Gap G4.)
- **`ph_saved_filters_delete`**: `user_id OR owner_id`.
- `ph_filter_versions_{select,insert,delete}`: gated via parent filter ownership/shared. Insert CHECK `changed_by=auth.uid()`.
- `fdv_{select,insert,update,delete}`: owner-based; select also `visibility='org' AND user_can_see_filter(source_filter_id,auth.uid())`.

### Indexes
- `ph_saved_filters`: `user_id`, `health_status`, `hub_scope`, `last_used_at DESC`, `project_key`, GIN `subscriber_ids`, UNIQUE `jira_filter_id`. **Missing: `owner_id`, `product_key`, GIN `starred_by_user_ids`, GIN `viewers_config`.**
- `ph_filter_versions`: `(filter_id, changed_at DESC)`.
- `filter_derived_views`: partial `(source_filter_id, owner_id) WHERE type='roadmap'`. (No dashboard-type partial.)
- `boards`: partial `filter_id WHERE filter_id IS NOT NULL`.

### Edge functions
- `generate-whatsapp-summary/` — AI WhatsApp update from filter context.
- `jira-filter-sync/` — syncs Jira saved filters → ph_saved_filters (`jira_filter_id`).
- `jql-validate/` — validates a JQL string.
- `standup-summary/` — mirrors whatsapp pattern.

### Feature flags (`src/lib/featureFlags.ts`, all default FALSE, project-hub only)
`ENABLE_FILTER_TO_KANBAN`, `ENABLE_FILTER_TO_ROADMAP`, `ENABLE_FILTER_TO_DASHBOARD`, `ENABLE_FILTER_WHATSAPP_AI_SUMMARY`. **No `caty-ai-query` flag** — Caty JQL gen ungated (rides `ENABLE_AI`).

### Derived-view wiring
`FilterKebabMenu.tsx` orchestrates: `useCreateKanbanFromFilter` (writes `boards` w/ `filter_id`), `useCreateRoadmapFromFilter`, `useCreateDashboardFromFilter`. Board↔filter link editable in `BoardSettingsDrawer.tsx:134`. Adapters: `filterBoardSource.ts`, `filterRoadmapSource.ts` (`jqlRowsToRoadmapGroups`), `filterDashboardSource.ts` (`jqlRowsToDashboardMetrics`).

---

## 8. Stop-condition check (master prompt §12) — ALL CLEAR
- Filters module present ✅
- Supabase schema confirmed ✅ (live catalog)
- Canonical components found ✅ (JiraTable, canonical trio, FilterKebabMenu)
- Routes do not conflict with targets ✅ (targets already exist)
- RLS safe + clear ✅ (one editor-write gap noted, non-blocking)
- Feature flags present ✅
- Build/test tooling: Vite + Vitest (repo standard) ✅
- No risk to other modules from discovery (read-only) ✅

**No stop conditions hit. Cleared to proceed to Gate 2 on `proceed`.**
