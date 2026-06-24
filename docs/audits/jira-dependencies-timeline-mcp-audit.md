# Jira Dependencies + Timeline — Discovery Audit

Date: 2026-06-24
Author: Claude (Catalyst session)
Spec: `jira-dependencies-timeline-evidence-pack/00-CLAUDE-CODE-PROMPT.md`

## 1. Evidence reviewed

Screenshot pack (`~/Downloads/jira-dependencies-timeline-evidence-pack/`):

| # | File | Jira state captured |
|---|------|---------------------|
| 01 | dependencies-canvas-overview | Canvas: filter bar, `+ Add dependency`, cards, `blocks` connectors, zoom bar |
| 02 | timeline-dependencies-saved-view-dropdown | Saved-view menu (Dependencies/Basic/Capacity/Top-level + Manage/Create) |
| 03 | timeline-blocked-by-column-popover | `Blocked by` aggregate → "Dependencies (blocked by)" popover |
| 04 | timeline-blocks-column-popover | `Blocks` aggregate → "Dependencies (blocks)" popover |
| 05 | timeline-row-dependency-card | Row card: Type / Work item / Status / Assignee / Lead time (→ replace w/ "Dependency added") |
| 06 | timeline-add-dependency-inline-picker | Inline type select + "Choose a work item..." picker |
| 07 | timeline-filtered-dependencies-for-work-item | "Filter by dependencies of <key>" collapses rows |
| 08 | catalyst-current-timeline-show-dependencies-gap | Current Catalyst kebab: dead `Show dependencies` / `Show hierarchy` |

**Jira MCP probe:** Source instance is `ministryofinvesment.atlassian.net` — a DIFFERENT Atlassian site than the configured Catalyst MCP (`digital-transformation.atlassian.net`). Live MCP probe of the source plan was NOT attempted/authorized for this site. Per spec §2.8, screenshots are the authoritative fallback evidence. No behavior invented beyond what the 8 screenshots show.

## 2. Catalyst current state — files + routes

| Concern | File | State |
|---|------|-------|
| Dependencies route | `FullAppRoutes.tsx:1067` → `DependenciesPageLazy` | Live |
| Dependencies page | `src/pages/project-hub/DependenciesPage.tsx` | **Built, data-backed** |
| Canvas diagram | `src/components/project-hub/dependencies/DependenciesDiagram.tsx` | **Built** — React Flow v12, bezier edges + `blocks` labels, hover-delete, zoom bar (−/%/+/Fit), status pills, type icons, dates |
| Empty state | `DependenciesEmptyState.tsx` | Built |
| Add modal | `AddDependencyModal.tsx` | **Built** — type select + 2 issue pickers, validates self-dep + duplicate |
| Timeline route | `FullAppRoutes.tsx:1065` → `ProjectHubTimelinePage` | Live |
| Timeline page | `src/pages/project-hub/timeline/ProjectHubTimelinePage.tsx` | Data adapter over shared `TimelineView` |
| Shared timeline | `src/components/shared/Timeline/TimelineView.tsx` (76 KB) | Canonical, used by project/product/release/incident hubs. **Gantt** (sidebar tree + bars), NOT a Jira-Plans column table |
| Dead menu | `TimelineView.tsx:982-983` | `Show hierarchy` + `Show dependencies` → `onClick={closeDropdown}` (no-op) |

## 3. Database path (the real store)

**Canonical table: `public.ph_issue_dependencies`** — migration `20260624120000_create_ph_issue_dependencies.sql` (git-tracked), verified live on STAGING (`cyijbdeuehohvhnsywig` = the dev-app DB `localhost:8080` connects to).

```
id BIGSERIAL PK
project_key TEXT
source_issue_key TEXT  FK → ph_issues(issue_key) ON DELETE CASCADE
target_issue_key TEXT  FK → ph_issues(issue_key) ON DELETE CASCADE
dependency_type TEXT   CHECK in ('blocks','is_blocked_by')
created_by UUID        FK → profiles(id)
created_at / updated_at / deleted_at (soft delete)
```
- Partial unique idx `ph_issue_deps_unique_live (source,target,type) WHERE deleted_at IS NULL` → duplicate prevention.
- `source_not_target` CHECK → self-dependency prevention (DB layer).
- RLS: SELECT all authenticated; INSERT own; UPDATE/DELETE creator-or-admin.
- View `vw_ph_issue_dependencies_bidirectional` → derives the inverse edge.

**Live state (staging):** table exists, **1 real row** (`BAU-4466 blocks BAU-4419`), BAU has 1553 issues, 2087 jira-sourced issues. Canvas is renderable today. `created_at` satisfies the spec's "Dependency added" column (replaces Jira "Lead time").

## 4. CONFLICT — two divergent dependency stores (spec §9 stop condition)

| Store | Used by | Shape |
|---|---|---|
| `ph_issue_dependencies` (table) | Canvas page + Add modal | Clean relational rows, queryable, has `created_at` |
| `raw_json.fields.issuelinks` (JSON blob) | `TimelineView` existing `onAddDependency`/`onRemoveDependency` (`ProjectHubTimelinePage.tsx:330-349`) | Jira issuelinks array inside `ph_issues.raw_json` |

The timeline's *existing* dependency mutations write to a **different** store than the canvas. If the new timeline dependency mode uses issuelinks, **canvas and timeline will show different dependencies** — a parity + single-source-of-truth violation (CLAUDE.md "single source of truth", "don't fork").

**Recommendation:** Use `ph_issue_dependencies` as the single source of truth for the timeline dependency mode (columns, popovers, row card, inline add). Treat `raw_json.issuelinks` as the separate "Linked work items" concept (it is rendered in detail-view `LinkedWorkItemsSection`, per CLAUDE.md hierarchy map). This requires Vikram's confirmation — §9.

## 5. Gaps to build (timeline dependency mode)

| ID | Gap | Spec | Effort |
|---|---|---|---|
| A | Wire dead `Show dependencies` menu → activate dependency mode | §4.7, §8.25 | S |
| B | `Blocked by` / `Blocks` columns in timeline sidebar (Gantt → add columns) | §4.3 | L |
| C | Aggregate popovers ("Dependencies (blocked by)" / "(blocks)") | §4.4 | M |
| D | Row dependency card + inline add picker (Type/Work item/Status/Assignee/Dependency added) | §4.5, §4.6 | L |
| E | Show/filter flows (`Show dependencies for <key>` → canvas focus; `Filter by dependencies of <key>`) | §4.7 | M |
| F | Saved-view selector (Dependencies/Basic/Capacity/Top-level) | §4.2 | M–L (no saved-view framework exists for shared TimelineView; `useTimelineView.ts` is the legacy/unrelated Gantt service) |
| G | Canvas focus query param `?focus=<key>` / `?linkType=` | §5.4 | S |

`Show hierarchy` is currently also dead — spec §4.7 requires it keep/work without regression; today it is a no-op so there is nothing to regress, but wiring it is out of declared scope unless requested.

## 6. Component mapping (reuse-first, ADS)

| Surface | Canonical Catalyst component |
|---|---|
| Status lozenge | `StatusPill` + `statusToLozenge` (already used by canvas) |
| Issue type icon | `JiraIssueTypeIcon` (`@/lib/jira-issue-type-icons`) |
| Popover (overflow-safe) | PortalMenu pattern (CLAUDE.md 2026-06-13) / `@atlaskit/popup` only outside overflow:hidden |
| Select / picker | `@atlaskit/select` (as AddDependencyModal) |
| Avatar | `@atlaskit/avatar` |
| `+ Add dependency` (transparent) | `@atlaskit/button` appearance="subtle"/default — NOT primary (spec §6) |
| Trash/remove | `@/lib/atlaskit-icons` |

## 7. Risks

1. **Shared-component blast radius (P0):** `TimelineView.tsx` powers 4 hubs. A dependency mode must be gated (prop/flag) so product/release/incident timelines do not regress. Verify each after change (CLAUDE.md regression-sweep).
2. **Gantt ≠ table:** Jira's dependency timeline (03-07) is a column table; Catalyst's is a Gantt with a sidebar tree. The `Blocked by`/`Blocks` columns are net-new sidebar columns, not a restyle.
3. **Saved-view framework absent:** full Jira "Manage/Create saved views" CRUD is large and unscoped; a view-MODE selector that actually drives columns is the minimal honest implementation.
4. **Light-mode + existing timeline interactions** (drag dates, reorder, inline create) must not regress.

## 8. Decision points requiring Vikram (before build)

1. **Store:** Confirm `ph_issue_dependencies` as single source of truth for timeline dependency mode (vs the existing issuelinks path). [Recommended]
2. **Saved-view scope:** View-MODE selector that drives columns (recommended) vs full saved-view persistence/CRUD framework.
3. **Shared-component gating:** Dependency mode gated to project-hub timeline only (recommended) vs enabled across all hubs.
4. **Build cadence:** This is a multi-feature build on a 76 KB canonical component. Confirm staged commits per sub-feature (A→G) under TDD, vs one large PR.
