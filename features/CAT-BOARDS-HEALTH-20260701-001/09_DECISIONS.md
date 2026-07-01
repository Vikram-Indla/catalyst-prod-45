# Decisions

## Council verdict 2026-07-01

### D-001: Health column added to boards table
**Decision:** Add Health column (status dot + count) to the boards list table.  
**Why:** Without it, users must click every board to discover problems — the icon alone is not a discovery mechanism.  
**How to apply:** Dot = worst risk band on that board. Count = number of attention items. Both derived from `useBoardInsights`.

### D-002: Always-visible icons, capped at 3
**Decision:** ⬡ (health) + ⚙ (edit) + 🗑 (delete) always visible. No hover-reveal.  
**Why:** User explicitly required always-visible. Cap at 3 icons prevents toolbar noise. Health column carries ambient signal so icon is drill-down only.

### D-003: Split panel 38/62, local state only
**Decision:** Left 38% boards list, right 62% insights. Managed by local `selectedBoardId` state. No URL change, no router push, no full-page re-render.  
**Why:** Keeps board list visible for switching. Local state = instant open/close.

### D-004: Active row marker required
**Decision:** When panel is open, the triggering row gets blue left border + "VIEWING HEALTH ↗" sub-label.  
**Why:** Without it, users lose track of which board's health is showing (Fresh Eyes caught this).

### D-005: Board switching in-place
**Decision:** Clicking ⬡ on a different row swaps the panel without close/reopen.  
**Why:** Friction reduction — core use case is comparing boards.

### D-006: Responsive fallback below 1280px
**Decision:** Below 1280px, panel becomes full-overlay slide-over instead of split.  
**Why:** Split becomes unusable at narrow viewports.

### D-007: Data discovery blocks implementation
**Decision:** Field map must be confirmed before any scoring code is written.  
**Why:** All signal families depend on what columns actually exist in ph_issues and board join tables.

### D-008: useBoardInsights is a standalone hook
**Decision:** Pure data transform: fetch → score → rank. No UI dependency. Configurable weights in a separate constants module.  
**Why:** Scorer must be reusable for future portfolio view and unit-testable in isolation.

### D-009: Deep link on every attention card
**Decision:** Every attention item card has "Open ↗" that navigates to the work item detail.  
**Why:** Recommended actions that require navigating away are useless without a direct link.

### D-010: No AI narrative in Phase 1
**Decision:** AI summary layer is an extension point only. Phase 1 = deterministic scoring only.  
**Why:** Must prove the scoring model works with real data before adding AI summarization.
