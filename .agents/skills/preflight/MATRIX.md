# /preflight v3 — Surface → Skill Matrix

Read in Phase 3 of `/preflight`. Skills marked **Required** must appear as plan rows. Skills marked **Recommended** should appear unless explicitly excluded.

This matrix is append-only. Do not delete or rewrite rows — they encode lessons. Add a `<!-- note: ... -->` for corrections.

Last updated: 2026-05-10 (v3 — new surfaces added, Atlassian Architect Council wired in).

---

## Core Matrix

| Surface | Required skills | Recommended skills | Notes |
|---|---|---|---|
| `ui-feature` (new) | `catalyst-feature`, `ads-validator`, `design-intelligence` | `jira-compare`, `design-critique`, `impeccable`, `ui-ux-pro-max` | catalyst-feature handles TDD + Playwright; ads-validator gates token drift; design-intelligence fires in Phase 1 (1000-IQ, ADS ring-fenced). |
| `ui-bug-fix` | `regression`, `ads-validator` | `jira-compare`, `design-intelligence`, `hermes-pixel-probe` | regression scopes evidence-only; ads-validator catches token drift introduced by the fix; design-intelligence verifies the fix doesn't shift layout/ADS compliance. |
| `ui-refactor` | `ads-validator` | `save-memory`, `jira-compare`, `design-intelligence` | Branch hygiene per GOD_MODE_DELIVERY_MANUAL.md §J (gitmerge decommissioned 2026-07-08 — GUI auto-merge with no review gate); ads-validator if the refactor touches styles; design-intelligence if any visual slot changes. |
| `backend-migration` (Supabase) | `lovable-sql` (manual-required) | `save-memory` | Pre-authorized SQL migrations are autonomous per CLAUDE.md. Browser clicks need inline user OK. All schema changes go through Lovable SQL editor. RLS cascade rule: add DELETE policy on EACH child table (W3 pattern). |
| `design-only` (no code) | `design-critique`, `ads-validator`, `design-intelligence` | `impeccable`, `ui-ux-pro-max`, `huashu-design` | design-intelligence runs 7-lens ADS analysis; design-critique runs post-build H1-H10 scoring; ads-validator confirms proposed design fits token system. |
| `knowledge-save` | `save-memory` | `recall-memory`, `consolidate-memory` | save-memory writes Obsidian; consolidate-memory dedupes when corpus drifts. |
| `handover` (context end) | `save-memory` | `consolidate-memory` | One handover note per session. consolidate-memory only when CLAUDE.md exceeds 100 entries or has duplicates. |
| `atlassian-admin` (Jira / Forge config) | `manual` | `jira-compare` | Plan must mark these rows as user-only. No autonomous execution available. |
| `cross-cutting` (multiple surfaces) | union of all rows above per surface touched | union of all rows above | Plan must declare which surfaces are in scope; halt if scope balloons mid-plan. |

---

## Catalyst-Specific Surface Extensions

| Surface | Required skills | Recommended skills | Notes |
|---|---|---|---|
| `for-you` (Home / For You page) | `regression`, `ads-validator`, `jira-compare` | `design-intelligence`, `hermes-pixel-probe` | CLAUDE.md 2026-05-10: navigate via useGlobalSearchStore.openDetail, NOT /issues/:key. Recommended strip sort by visitedAt, not alpha. |
| `home-sidebar` (HomeSidebar, SidebarProjectNav) | `ads-validator`, `jira-compare` | `design-intelligence` | CLAUDE.md 2026-05-09: JiraIssueTypeIcon mandatory, no colored dots. Project key (not name) in sidebar rows. |
| `kanban-detail` (KanbanBoardPage modal) | `regression`, `jira-compare` | `design-intelligence`, `hermes-pixel-probe` | CLAUDE.md 2026-05-08: kanban modal path ≠ allwork panel path — both must be tested separately after every CatalystView* change. height:Xvh banned inside @atlaskit/modal-dialog. |
| `backlog-inline-create` (BacklogPage + InlineGroupCreateRow) | `catalyst-feature`, `ads-validator`, `jira-compare` | `design-intelligence` | CLAUDE.md 2026-05-08: inline create must be portal dropdown, not click-to-cycle. InlineCreateWithAI must render when items.length === 0 (standalone block outside rows.length > 0 guard). |
| `allwork-list` (ProjectAllWorkView) | `regression`, `ads-validator`, `jira-compare` | `design-intelligence` | CLAUDE.md 2026-04-28: URL-sync deletion must guard items.some() — delete only when stale. Epic/Feature/Task excluded from useProjectAllWorkItems query. |
| `detail-view` (CatalystView* + CatalystSidebarDetails) | `jira-compare`, `ads-validator`, `regression` | `design-intelligence`, `hermes-pixel-probe` | CLAUDE.md 2026-05-05–08: MDT Ref/Service Now#/Assessment Feature/Story Points/AI Sparkles/Development/Automation all banned. Section headers: inline h2 at 14px/600 only. Popup inside overflow:hidden → createPortal. |
| `global-search` (GlobalSearchPanel) | `regression`, `ads-validator` | `design-intelligence` | CLAUDE.md 2026-05-08: @atlaskit/popup banned on this surface (empty-portal bug). All popups → createPortal to document.body with data-filter-portal attr. Multi-select filters must use arrays. |
| `attachment-proxy` (jira-attachment-proxy Edge Function) | `regression` | — | CLAUDE.md 2026-05-05: streaming only (no arrayBuffer). Connection cache per cold-start worker. ETag passthrough mandatory. |
| `project-hub` (AllProjectsPage, AllProjectsTable) | `regression`, `ads-validator` | `jira-compare` | CLAUDE.md 2026-05-09: Notion is permanently banned from Projects module. RLS cascade: self-join bug pattern (W3). |
| `admin-surface` (AdminSidebarV2, admin/* components) | `ads-validator` | `jira-compare`, `design-intelligence` | Current admin sweep in progress (Phase C Blocks 6–8 complete per git log). |

---

## Skill Justification Slot

Every skill row in the Phase 3 plan must include a **one-line justification**. Examples:

- `ads-validator: catches token drift before merge — CLAUDE.md 2026-04-28 anti-pattern #18`
- `jira-compare: confirms parity with live Jira before declaring done — CLAUDE.md 2026-05-04`
- `regression: evidence-only audit, files defects on BAU board — CLAUDE.md 2026-04-28 v4 rewrite`
- `design-intelligence: 1000-IQ ADS ring-fenced analysis, 7 design masters + AtlasKit Architect — fires in Phase 1`
- `design-critique: H1-H10 heuristic scoring before UI declared done`
- `catalyst-feature: end-to-end TDD + Playwright loop — CLAUDE.md TDD non-negotiable`

If you can't justify a skill in one line, it doesn't belong in the plan.

---

## Halts

If a Required skill is omitted from a plan → halt synthesis and re-plan. The omission is the bug.

---

## Updating this matrix

Append-only. New surface types added at the bottom with their first observed task date. Do not delete or rewrite existing rows. For corrections: add `<!-- note: amendment {date}: ... -->` immediately after the row.
