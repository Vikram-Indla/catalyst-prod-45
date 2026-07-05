# CAT-STRATA-20260705-001 — Canonical Discovery

> Consolidated from Lane 1 (repo/screens), Lane 3 (components), Lane 4 (executive UX). Full evidence in 12_AGENT_OUTPUTS.md.

## Canonical components identified

| Component | File path | Fit verdict | Notes |
|---|---|---|---|
| JiraTable + editor suite | src/components/shared/JiraTable/ | KEEP (mandatory for list surfaces) | TanStack columns, selection, sort, keyboard nav, resize/reorder, groups, density, inline editors |
| StatusLozenge + statusPalette | src/components/shared/StatusLozenge/, src/components/catalyst-detail-views/shared/sections/statusPalette.ts | KEEP | Colors LOCKED; STRATA state labels (live/draft/pending/locked) must map through it or @atlaskit/lozenge |
| DangerConfirmModal | src/components/shared/DangerConfirmModal.tsx | KEEP | Destructive confirms (delete config version, supersede snapshot) |
| EmptyState | src/components/ads/EmptyState.tsx | KEEP | default + compact variants |
| PageContainer | src/components/shared/PageContainer.tsx | KEEP | standard/wide/full; STRATA dense surfaces likely `wide` |
| @atlaskit/pragmatic-drag-and-drop | src/components/kanban/PragmaticBoard.tsx (pattern) | KEEP | Canonical DnD — dashboard widget reorder, map canvas assists |
| CatyIconCTA / CatyPulseIcon | src/components/ui/ | KEEP | Only sanctioned AI CTA for the advisory layer |
| @xyflow/react ^12.10.2 | package.json (unused) | KEEP (candidate) | Strategy Map Canvas; needs ADS token styling pass in Phase 2 |
| react-resizable-panels ^2.1.9 | package.json (unused) | KEEP (candidate) | Split panes / evidence drawers |
| recharts + framer-motion + date-fns | package.json | KEEP | Charts; per repo memory: extend existing stack, never add vis-timeline |
| CatalystDetailPanel / DrawerPanel | src/components/shared/ | PARTIAL | Drawer patterns exist but surface-specific; evidence-drawer design decided in Phase 2 |
| MetricCard / SurfaceCard | src/components/dashboard/, src/components/shared/ | DISCARD as-is | Non-ADS tokens; STRATA KPI tile to be designed in Phase 2 on ADS primitives |
| DocumentComments / BlockNote / Tiptap | src/components/knowledge-hub/, deps | PARTIAL | Commentary UX candidates; decide in Phase 2 |
| @atlaskit form suite (textfield, select, datetime-picker, inline-edit, toggle, tokens ^13.0.1) | package.json | KEEP | Admin config engine fields |

## Canonical screens identified

| Route/Page | File path | Fit verdict | Notes |
|---|---|---|---|
| Release Command Center | src/pages/releasehub/CommandCenterPage.tsx | BENCHMARK | Gold-standard executive overview (KPI cards + drilldowns) |
| Project Dashboard | src/pages/project-hub/ProjectDashboardPage.tsx | BENCHMARK | 12-col DnD widget grid; registry pattern must become config-driven for STRATA |
| Release Detail | src/pages/releasehub/ReleaseDetailPage.tsx | BENCHMARK | Lifecycle tracker + tabs — model for scorecard/snapshot detail shells |
| StrategyRoom + strategyhub pages | src/modules-dormant/strategy*/ | DISCARD (replace) | Prototype residue per blueprint Appendix E |
| Admin pages | src/pages/admin/AdminAccessPage.tsx | ANTI-PATTERN | CRUD-grade; STRATA admin must be a control plane |

## JiraTable evaluation
- Applies to this feature: **YES** — KPI library, scorecard lines, initiative/project registers, upload run/validation error lists, action register.
- Verdict: **MANDATORY** for those list surfaces.
- Evidence: full capability inventory in 12_AGENT_OUTPUTS.md Lane 3 (src/components/shared/JiraTable/JiraTable.tsx, editors.tsx).

## Storybook components reviewed
| Component | MCP query | Verdict |
|---|---|---|
| — | catalyst-storybook MCP **unauthenticated in this session** | BLOCKED — must be queried during Phase 2 before any non-canonical component is proposed. Fallback evidence gathered from source + package.json instead. |
