# Objective — CAT-SHELL-COMPACT-HEADER-20260629-002

Phase 2: Bring all product-hub list pages to ≤200px first-data-row.

## Phase 1 result
- Backlog: 194px ✅ (isSelfFramedRoute bypasses HubSurface)
- Milestones: 198px ✅ (lightweight layout, no toolbar)
- Timeline: 221px ❌
- Boards: 261px ❌
- Filters: 259px ❌

## Root cause
Backlog is in `isSelfFramedRoute` → bypasses `HubSurface(framePadding:24)`.
All other pages go through HubSurface which adds 24px top padding before AtlaskitPageShell starts.
Reducing HubSurface top padding for these routes saves 20px each.

## Target
All 5 active content pages ≤200px first-data-row.
