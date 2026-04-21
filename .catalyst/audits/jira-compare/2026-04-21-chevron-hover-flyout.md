# JIRA COMPARE — Top-Nav Chevron & Apps Switcher
Date: 2026-04-21 · Auditor: Claude (jira-compare skill)

## Scope (from user's screenshot)
Top-left of the global nav chrome. Two interactive controls in scope: the sidebar expand/collapse chevron (image 2) and the 2×2 grid apps-switcher icon (image 1). Everything else on the page (header right cluster, search, page body, sidebars themselves) is out of scope.

Jira ref: https://digital-transformation.atlassian.net/browse/BAU-5514
Catalyst ref: http://localhost:8080/ (code-authoritative — live DOM unreachable from Chrome MCP instance; all Catalyst claims sourced from `src/components/ja/CatalystHeader.tsx` and `src/components/layout/AppSwitcher.tsx`)
Screenshot: user-provided (image 1 = 2×2 grid icon; image 2 = chevron)

## Executive verdict

Catalyst's scoped elements are already rendered by `@atlaskit/*` primitives — no Atlaskit-mismatch P0 findings. The gap is **behavioral**: Jira's chevron supports a hover-reveal pattern (temporary full-sidebar slide-out) that Catalyst does not implement, and the user's design decision is to retire the 2×2 apps switcher and move its Hub-switcher function into the hover-revealed sidebar. Net work: one meaningful Lovable change (hover-reveal wiring + sidebar Hub-switcher section) + two small Claude Code edits (delete AppSwitcher mount + enhance chevron tooltip with `[` shortcut hint).

## P0 — Atlaskit mismatches

None in scope.

| # | Element | Jira (component) | Catalyst (today) | Fix | Spec |
|---|---------|-------------------|-------------------|-----|------|
| — | Chevron IconButton | `@atlaskit/button/new` IconButton + `@atlaskit/icon/core/sidebar-expand` | `@atlaskit/button/new` IconButton + `@atlaskit/icon/core/sidebar-expand` | None — already correct | https://atlassian.design/components/button |
| — | Apps-switcher IconButton | `@atlaskit/button/new` IconButton + `@atlaskit/icon/core/app-switcher` | `@atlaskit/button/new` IconButton + `@atlaskit/icon/core/app-switcher` | Delete (by design) — not a component-identity violation | https://atlassian.design/components/button |

Note: the sidebar **contents** revealed when the chevron is toggled (`ProjectHubSidebar`, `ReleaseHubSidebar`, etc. composed via `SidebarBase.tsx` — custom component using Lucide + Tailwind) are NOT in this audit's scope. They are a separate migration to `@atlaskit/side-navigation`.

## P1 — Parity drift (behavioral)

### P1-1 — Chevron has no hover-reveal `[LOVABLE]`

| Field | Jira (observed live) | Catalyst (per code) |
|---|---|---|
| Trigger | `onMouseEnter` on chevron → sidebar slides open in **temporary** mode | No hover handler; tooltip only |
| Duration | Persists while cursor is inside chevron OR sidebar region | N/A |
| Exit | `onMouseLeave` of combined region → sidebar collapses back (unless pinned) | N/A |
| Click | Click toggles **pinned** state (sidebar persists after mouseleave) | Click calls `cycleSidebarState()` → expanded/collapsed/hidden cycle |
| Icon rotation | Flips `SidebarExpandIcon` ↔ `SidebarCollapseIcon` based on visible state | Already correct — icon flips on state change |

**Fix:** add temporary-expansion state to the sidebar machinery in `CatalystContext` / `CatalystShell.tsx`. Wrap the chevron IconButton + sidebar region in a single mouse-enter/mouse-leave boundary. Mouse-enter sets `sidebarState = 'temporary-expanded'`; click sets `sidebarState = 'pinned-expanded'`; mouse-leave with `pinned=false` reverts to previous collapsed/hidden state. Atlaskit primitives stay the same — this is composition + state.

**Spec reference:** https://atlassian.design/components/side-navigation (for visual/motion tokens and a11y on the sidebar itself) + `cycleSidebarState()` reducer in `src/contexts/CatalystContext.tsx`.

### P1-2 — AppSwitcher (2×2 grid) should be removed `[CLAUDE CODE]`

| Field | Jira | Catalyst (today) |
|---|---|---|
| Presence | "Switch sites or apps" button at x=48, y=12, 32×32 (adjacent to chevron) | `<AppSwitcher />` mounted at line 126 of `CatalystHeader.tsx`, rendered adjacent to chevron |
| Content | Opens `@atlaskit/popup` listing Jira/Confluence/Trello/etc. + Marketplace apps | Opens `@atlaskit/popup` + `@atlaskit/menu` listing all 10 Hubs (Home → WikiHub) with colored icon frames |

**Design decision:** Catalyst has no cross-app surface equivalent to Jira's Atlassian-suite apps list. The 10 Hubs the current AppSwitcher lists are moved into the hover-revealed sidebar as a "Hubs" section at the top (mirroring how Jira's sidebar surfaces "Spaces" / "Apps" as top sections).

**Fix:** remove the `<AppSwitcher />` JSX and its import from `CatalystHeader.tsx`. Delete `src/components/layout/AppSwitcher.tsx`. Grep-clean any stray references.

## P2 — Polish

### P2-1 — Chevron tooltip missing keyboard-shortcut hint `[CLAUDE CODE]`

| Field | Jira | Catalyst (today) |
|---|---|---|
| Tooltip content | "Expand sidebar" + visible `Ctrl [` chip | "Expand sidebar" / "Hide sidebar" text only |
| Shortcut binding | `Ctrl/Cmd + [` expands, `Ctrl/Cmd + [` again collapses | `[` alone is bound in `CatalystContext` to `cycleSidebarState()` |

**Fix:** enhance the `IconButton`'s `label` prop (or wrap with `@atlaskit/tooltip` `content` + `keymap`) to include the shortcut. Verify shortcut modifier parity with Jira — Catalyst currently uses `[` alone, Jira uses `Ctrl [`. Align to `Ctrl/Cmd + [` for consistency.

**Spec:** https://atlassian.design/components/tooltip (for rendering keymap chip alongside label).

## Typography sweep (page-level, scoped surface)

Scope elements are 32×32 icon buttons — no text rendered directly. Tooltip typography inherits from `@atlaskit/tooltip` defaults → already matches Jira. No typography findings.

| Role | Jira | Catalyst | Match? |
|---|---|---|---|
| IconButton rest | (no visible text) | (no visible text) | ✓ |
| Tooltip label | `@atlaskit/tooltip` default (13px / 500 / 16px) | `@atlaskit/tooltip` default | ✓ |
| Tooltip shortcut chip | `@atlaskit/tooltip` keymap chip | Not rendered (P2-1) | ❌ |

## Tab order

Jira (observed): chevron (pos 1) → apps switcher (pos 2) → search (pos 3) → Create (pos 4) → Ask Rovo (pos 5) → ...

Catalyst (per code, CatalystHeader.tsx lines 120–135): chevron IconButton → AppSwitcher trigger → wordmark link → GlobalSearch → spacer → CreateDropdown → AskCatalystPill → NotificationsPanel → Help → SettingsMenu → ProfileMenu.

**After fix:** chevron (pos 1) → wordmark / search (pos 2). AppSwitcher removed entirely. Acceptable — matches intent.

## Scroll behaviour

Neither scoped element is scrollable. When the sidebar opens on hover, Jira's sidebar region scrolls internally while the header remains sticky. Catalyst's existing `SidebarBase` already implements internal scroll; out of this audit's scope.

## Proposed fix plan (Atlaskit-first, surgical, ordered)

1. **`src/contexts/CatalystContext.tsx`** — extend sidebar state machine to include `{ mode: 'hidden' | 'temporary' | 'pinned' }`. Add `openTemporary()`, `pin()`, `unpin()`, `closeTemporary()` actions. `cycleSidebarState()` continues to cycle `pinned` ↔ `hidden` on click.

2. **`src/components/layout/CatalystShell.tsx`** — wrap the header+sidebar region in a single `onMouseEnter` / `onMouseLeave` boundary. Mouse-enter over the 48px chevron strip → `openTemporary()`. Mouse-leave of header+sidebar combined region → `closeTemporary()` (unless pinned). Add CSS transition for the sidebar width so temporary vs pinned both animate identically.

3. **`src/components/ja/CatalystHeader.tsx`** — remove `<AppSwitcher />` (line 126) and its import (line ~8). Update the IconButton's tooltip content to include the `Ctrl/Cmd + [` shortcut.

4. **`src/components/layout/AppSwitcher.tsx`** — delete the file.

5. **Hub-switcher section at top of sidebar** — add an "All Hubs" section to `SidebarBase.tsx` (or the hub-specific sidebars via composition) that lists the 10 Hubs with the same `@atlaskit/icon/glyph` icons currently used in `AppSwitcher.tsx`. This preserves the Hub-switcher function lost when AppSwitcher is deleted. This step is the heart of the Lovable change.

6. **Grep cleanup** — `grep -rn "AppSwitcher" src/` to catch any stray references; remove.

Each step: one file, one change, one reason. No scope creep beyond the five files listed.

## Acceptance checks (for Vikram)

- [ ] Hover on the chevron → full sidebar slides open within ~150 ms; mouse-leave → collapses back.
- [ ] Click on the chevron → sidebar pins open; click again → collapses (matches current `cycleSidebarState()`).
- [ ] 2×2 apps-switcher icon is gone from the top-left. Only the chevron remains.
- [ ] Sidebar, when open, shows the 10 Hubs (Home → WikiHub) as a section at the top with colored icons.
- [ ] Chevron tooltip shows "Expand sidebar" + `Ctrl/Cmd + [` shortcut chip.
- [ ] Keyboard shortcut works: `Cmd + [` toggles sidebar (align with Jira).
- [ ] DevTools: chevron IconButton computes fonts via `--ds-*` tokens (already Atlaskit).
- [ ] `grep -rn "AppSwitcher" src/` returns only comment/history references, no live imports.

## Handoff index

- `[LOVABLE]` × 1 — hover-reveal wiring + Hub-switcher sidebar section (P1-1 + step 5)
- `[CLAUDE CODE]` × 2 — delete AppSwitcher mount/file (P1-2); enhance chevron tooltip (P2-1)
- `[RESEARCH]` × 0

## Research notes

None required — Jira's hover behavior was confirmed live via `mcp__Claude_in_Chrome__computer` hover + screenshot in Phase 2.

## Handoff blocks

See `.catalyst/audits/jira-compare/2026-04-21-chevron-hover-flyout/handoffs/` for individual copy-paste-ready prompts and briefs.
