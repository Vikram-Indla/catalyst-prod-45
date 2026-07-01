# Session 003 — Phase 3A: Board Slug Routes

**Date:** 2026-07-01
**Feature Work ID:** CAT-SLUGS-UNIVERSAL-20260701-001

## What was done

Phase 3A: boards-only route param migration from `:boardId` (UUID) to `:boardSlug`.

### Changes

| File | Change |
|---|---|
| `src/types/board.ts` | Added `slug: string` to `Board` interface (propagates to `BoardListItem`) |
| `src/hooks/useBoards.ts` | Added `slug: b.slug ?? b.id` to data mapping |
| `src/hooks/useBoardBySlug.ts` | **NEW** — dual-mode resolution hook (accepts slug OR UUID for backward compat) |
| `src/routes/FullAppRoutes.tsx` | 4 route params renamed: `:boardId` → `:boardSlug` |
| `src/features/kanban-board/KanbanPage.tsx` | Reads `boardSlug` param, resolves via `useBoardBySlug`, syncs to `activeBoardId` state |
| `src/pages/project-hub/MapStatusesPage.tsx` | Reads `boardSlug`, resolves via `useBoardBySlug`, passes `board?.id` to `useMapStatuses` |
| `src/pages/project-hub/ProjectBoardSettingsPage.tsx` | Reads `boardSlug`, queries by `slug` (or `id` for UUID backward compat) |
| `src/components/boards/BoardManagerPage.tsx` | Nav calls use `row.slug` / `b.slug` instead of `.id` |
| `src/components/boards/BoardSettingsDrawer.tsx` | Map-statuses nav uses `board.slug` |
| `src/components/boards/BoardCard.tsx` | Clipboard URL uses `board.slug` |
| `src/components/filters/FilterKebabMenu.tsx` | Uses `existingBoard.data?.slug` for nav; new board insert selects `id, slug`; nav uses `board.slug ?? board.id` |

### Key decisions
- `useBoardBySlug` is dual-mode: accepts slug OR UUID (auto-detects via `isValidUUID`). This gives backward compat before Phase 4 permanent redirects land.
- `KanbanPage` resolves slug → id via `useEffect` + `useBoardBySlug`, then passes UUID to `useKanbanData` (no change to data layer).
- `FilterKebabMenu` line 205 (`boardId` from `createKanban.mutateAsync`) left as UUID — works via dual-mode hook, separate task to update mutation return type.

## Validation
- TypeScript: **0 errors**
- `npm run lint:colors:gate`: **PASS** (67 = baseline)
- `npm run audit:ads:gate`: **PASS** (all categories at baseline)
- No stray `:boardId` in the 4 target routes

## Next
- Phase 3B (sprints): investigate `ph_jira_sprints` vs `sprints` table (sprint detail page uses former)
- Phase 3C (releases): ReleaseDetailPage + 8+ nav sites
- Phase 3D (incidents): IncidentDetailPage needs `ph_issues.incident_key` support
- Phase 4: UUID→slug permanent redirects outside CatalystShell
