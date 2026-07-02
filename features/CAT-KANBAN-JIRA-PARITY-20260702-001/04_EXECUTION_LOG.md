# EXECUTION LOG

## Round 1 — Group-by-Epic swimlane styling (code-read only)
- Fixed: epic name font-weight 500→400, epic key font-size two-tier mismatch, "Group: Epic"
  menu gated by `showEpic` prop.
- Files: `SwimlaneHeader.tsx`, `Board.tsx`, `Toolbar.tsx`

## Round 2 — Functional P0 (live DOM probe)
- Found + fixed: clicking "+ Create" in one epic swimlane opened the SAME create form in all
  47 swimlanes simultaneously (global `openCreateCol` state, no per-group scoping). Live-verified
  47→1 after fix.
- Files: `KanbanPage.tsx`, `Board.tsx`

## Round 3 — Hover-reveal (user-requested) + 11 confirmed fixes after live Jira cross-check
- Card radius 8→4px, due-date year included, due-date chip font/height, swimlane count text
  12px+same-color-as-name, chevron scaled to 12px, epic key font 12px/weight-500, epic swatch
  10→20px, type-selector chevron added, removed auto-fill-to-today on date, column bg swapped
  to `elevation.surface.sunken` token (was hardcoded `rgba(5,21,36,0.06)`).
- Files: `constants.ts`, `Card.tsx`, `SwimlaneHeader.tsx`, `Board.tsx`, `InlineCreateCard.tsx`,
  `styles.css` (hover-reveal `.kb-create-trigger`)

## Round 4 (Cycle 2) — polish pass, 4 items
- Card footer issue-key color/size (12px/grey → 14px/near-black), assignee trigger shows
  "Unassigned" text, context-menu row padding/height (36px/`0 12px` → 32px/`8px 20px`).
- Column-header uppercase was already correct — that inventory finding was stale, no action.
- Files: `Card.tsx`, `InlineCreateCard.tsx`, `SubmenuItem.tsx`, `CardContextMenu.tsx`

## View Settings panel truncation fix
- Root cause: `PortalMenu.tsx`'s shared `SIZES.DROPDOWN_MAX_HEIGHT` (400px) capped View
  Settings' ~413px content, forcing scroll. Added optional `maxHeight` prop (default unchanged
  for every other dropdown), View Settings passes 520px. Confirmed docked-sidebar redesign
  (matching Jira's actual architecture) explicitly rejected — floating dropdown kept.

## Round 5 — Slice B (no DB): shipped
- #5 Right-click on a card opens the same context menu as the "..." button. `Card.tsx` only —
  ref on the menu-slot wrapper, `onContextMenu` dispatches `.click()` on the trigger.
  Live-verified working.
- #4 Epic swimlane key is now a separate clickable target (`role="link"`) that calls
  `useGlobalSearchStore.getState().openDetail({ id: g.key })` and stops propagation so the
  swimlane never collapses. Live-verified: never breaks collapse. **Whether the detail panel
  actually opens for a given epic key was NOT confirmed** — see Pending below.

## Round 5 — Slice A: DB migration + staging reconciliation (see 08_DRIFT_LOG.md for the incident)
- Added `ph_issues.epic_color`, `epic_status`, `epic_status_category` (nullable, additive).
- Wired: `useKanbanData.ts` (SELECT + mapping) → `types.ts` (`BoardIssue.parentColor` etc.,
  optional) → `Board.tsx` (real color/status when present via `Lozenge`, hashed/no-lozenge
  fallback when null — which is 100% of rows right now, population not done).
- Regenerated `src/integrations/supabase/types.ts` from the linked staging project.
- Live-verified: zero visual/functional regression, board renders identically pre/post.

## Investigation: epic color population (not implemented, scoped only)
- Confirmed via live authenticated fetch against the real Jira REST API: epic color is
  **not** on the issue's own fields (checked all 89 fields on MMS-208 via
  `/rest/api/3/issue/MMS-208?fields=*all`) and **not** on a child issue's `parent` stub.
  It lives at `GET /rest/agile/1.0/epic/{key}` → `{"color":{"key":"color_13"},
  "issueColor":{"key":"purple"}}` — a fixed-palette key, not a hex value.
- This means populating `epic_color` needs: (a) one extra Agile API call per distinct epic
  during sync (not free from the existing child-issue payload), (b) a static palette
  key→hex/token lookup table (Atlassian's epic colors are a fixed, documented set).
- Touches 4 sync entry points: `supabase/functions/wh-jira-sync/index.ts`,
  `wh-jira-bulk-sync`, `jira-manual-sync`, `jira-webhook-receiver`. Real rate-limit
  consideration (N epics = N extra calls per sync run). Not started — needs its own Plan Lock.
