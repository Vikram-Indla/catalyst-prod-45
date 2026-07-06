# CAT-KANBAN-FLAG-COMMENT-20260703-001

**Feature Work ID:** `CAT-KANBAN-FLAG-COMMENT-20260703-001`
**Branch:** `detail-view`
**Owner:** Vikram
**Started:** 2026-07-03

## One-line

When a work item is flagged or unflagged, record it as a special-format entry in the Activity section (visible in **All** and **Comments** tabs as a comment, and in **All** and **History** tabs as a history event) — Jira parity.

## Scope

- **In:** `ph_issues` (Project Hub work items). All 5 kanban modes route flag toggle through the existing `AddFlagModal`, but the comment + history recording is wired only for the `ph_issues` table this iteration (the other 4 mode tables — `business_requests`, `tasks`, `rh_releases`, `tm_test_cases` — have no `ph_activity_log` / `ph_comments` integration yet).
- **Out:** No changes to flag/unflag UI. No new tab in Activity. No modal design changes.

## Reading order

1. `01_OBJECTIVE.md`
2. `03_PLAN_LOCK.md`
3. `sessions/`

## Rules

- ADS tokens only. No hex, no `rgb()`, no Tailwind color utilities, no inline `style={{ color: 'green' }}`.
- No hand-rolled UI. Reuse `FlagFilledIcon` from `@atlaskit/icon/core/flag-filled`.
- Zero-assumption rendering: when the optional note is empty, do not render the body line.
