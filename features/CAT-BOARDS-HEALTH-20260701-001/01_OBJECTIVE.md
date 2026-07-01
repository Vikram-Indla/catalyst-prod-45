# Objective

## Problem
Managers overseeing multiple Catalyst Kanban boards have no way to see which boards have execution problems without clicking into each one. There is no ambient health signal on the boards list.

## Goal
Surface board-level execution intelligence on the boards list page via:
1. A Health column (dot + count) visible without any click
2. A drill-down split panel (Board Insights) triggered by a health icon click

## Success criteria
- Clicking ⬡ on any board row opens the right-panel insights view without page navigation
- Each attention item shows: key, title, type, status, priority, assignee, risk band, primary reason, recommended action, deep link
- Panel closes and restores full-width boards list
- Switching boards swaps panel in-place (no close/reopen)
- Scoring engine is isolated (`useBoardInsights` hook), configurable, and unit-tested
- Zero bare hex colors / Tailwind color utilities — ADS tokens only
- Works at 1280px min-width; below that, panel becomes full-overlay slide-over

## Non-scope
- Portfolio/cross-board health view (Phase 2, future)
- URL-based deep links to the panel state
- AI narrative layer (extension point only, not implemented in Phase 1)
- Changes to the board page itself (kanban surface)
- New Supabase schema (use existing columns only; surface capability gaps where fields missing)
