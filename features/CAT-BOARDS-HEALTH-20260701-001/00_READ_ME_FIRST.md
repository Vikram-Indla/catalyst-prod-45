# CAT-BOARDS-HEALTH-20260701-001 — Board Health Split Panel

**Feature Work ID:** CAT-BOARDS-HEALTH-20260701-001  
**Created:** 2026-07-01  
**Status:** Plan Lock in progress

## One-liner
Split-panel Board Health / Insights for the Catalyst Boards List page.

## Entry point
`/boards` list page (boards table, currently shows Name / Admin / Primary Work Item + edit/delete icons)

## What's being built
1. Health column in the boards table (status dot + count — ambient discovery)
2. Board Health icon (⬡) always visible in each row — 3rd action icon
3. Split-panel on click: left 38% = boards list (retained), right 62% = Board Insights panel
4. Board Insights panel: summary stats row, filter bar, ranked attention items, board-level insight summary
5. Closeable — restores full-width boards list
6. Board switching: clicking ⬡ on a different row swaps panel in-place (no close/reopen)
7. `useBoardInsights(boardId)` scoring hook — deterministic, configurable, isolated from UI

## Council session verdict
Full council ran 2026-07-01. See `09_DECISIONS.md` for synthesis.

## Read order for continuation
00 → 01 → 03 → 07 → 08 → 09 → 11
