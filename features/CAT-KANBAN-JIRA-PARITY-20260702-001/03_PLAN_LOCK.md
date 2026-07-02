# PLAN LOCK — Kanban Jira Parity, Slice 6a: fix epic-key click-to-open

**Status:** SUPERSEDED — root cause disproven before implementation, see `08_DRIFT_LOG.md`.
Kept for the record; do not implement against this version. See `03b_PLAN_LOCK_REVISED.md`.
**Approved by:** Vikram, 2026-07-02 (approval was for the wrong root cause, superseded same day)
**Timebox:** 2 hours from approval
**Slice:** 6a of N (epic-color population is a separate slice, 6b — not in this Plan Lock)

---

## OBJECTIVE

Clicking an epic's key text in the Group:Epic swimlane header opens that epic's detail panel
(`CatalystViewEpic` via `CatalystDetailRouter`), matching the rest of the app's `openDetail`
pattern. Confirmed broken this session (see `04_EXECUTION_LOG.md` Round 6): click lands on the
correct DOM node but fires zero network requests and mounts zero `[role="dialog"]`.

**Done** = clicking the epic key on any board (any hub mode) opens the epic's `CatalystViewEpic`
panel, live-verified via Chrome MCP (dialog present, correct epic key in header), with zero
regression to swimlane collapse/expand (the thing Round 5 already verified working).

---

## NON-SCOPE

- Epic color/status population (separate slice, 6b — Jira API sync work, already scoped in
  `07_HANDOVER.md` NEXT EXACT PROMPT, not touched here)
- Any change to `CatalystDetailRouter.tsx` type-resolution logic — not implicated by evidence
- Any change to `CatalystViewEpic` itself
- Restructuring `SwimlaneHeader` beyond what's needed to un-nest the interactive elements

---

## ROOT CAUSE (evidence, not yet 100% confirmed at the fiber level)

`SwimlaneHeader.tsx:28-56` renders the whole row as a single `<button onClick={onToggle}>`, and
`labelNode` (Board.tsx's epic-key `<span role="link" onClick={openDetail...}>`) is passed in as
a *child of that button*. Live evidence (Chrome MCP, `document.elementFromPoint` +
`read_network_requests` + `[role="dialog"]` count):

- Click target confirmed = the `span[role="link"]` itself, not a sibling/overlay.
- Zero Supabase requests fire (the `ph_issues` type-lookup query in `CatalystDetailRouter.tsx:84-97`
  never runs).
- Zero `[role="dialog"]` elements exist after the click.

This means `openDetail()` itself is never invoked — the nested-button structure is the leading
suspect but needs confirming by testing the fix live, not by further static reasoning.

---

## CANONICAL COMPONENTS SELECTED

| Component | File | Why selected |
|---|---|---|
| `SwimlaneHeader` (existing) | `src/features/kanban-board/components/SwimlaneHeader.tsx` | Already the canonical swimlane row — fixing in place, not forking |
| `CatalystDetailRouter` / `CatalystViewEpic` | existing | Already the canonical epic detail surface, used everywhere else via `openDetail` — no new component needed |

No new components. This is a structural fix to existing markup, not a UI change.

---

## FILES TO MODIFY

| File | Change type | Change summary |
|---|---|---|
| `src/features/kanban-board/components/SwimlaneHeader.tsx` | edit | Stop nesting `labelNode` inside the `<button>`. Likely: wrap chevron+toggle in its own `<button>` (or keep outer as a `<div role="button">` styled identically) so `labelNode`'s own interactive children are siblings, not descendants, of the toggle control. Exact markup change TBD during implementation — must preserve identical visual layout (flex row, same gaps/padding) and identical hover/collapse behavior. |
| `src/features/kanban-board/components/Board.tsx` | edit (maybe) | Only if the `labelNode` click handler needs adjusting once it's no longer inside a button (e.g. no longer needs `e.stopPropagation()` for collapse-suppression, or needs it for a different reason) |

---

## FILES FORBIDDEN

- `src/components/catalyst-detail-views/CatalystDetailRouter.tsx` — not implicated, do not touch
- `src/components/catalyst-detail-views/epic/CatalystViewEpic.tsx` — not implicated, do not touch
- `src/store/globalSearchStore.ts` — not implicated, do not touch
- `src/components/layout/CatalystShell.tsx` — not implicated, do not touch
- `src/features/kanban-board/components/PortalMenu.tsx`'s `SIZES.MENU_ITEM_HEIGHT` — standing forbidden file per `07_HANDOVER.md`
- `src/components/layout/ProjectPageHeader.tsx` — standing forbidden file per `09_DECISIONS.md` #4

---

## UI/UX RULES

- All colors: ADS tokens only (`var(--ds-*)` / `token()`) — no new colors introduced, this is a
  structural fix only
- No visual change: swimlane row must look pixel-identical before/after (same padding, gaps,
  hover background, chevron position) — this is a click-wiring fix, not a redesign
- Dark mode: verify by reload-into-dark (existing hover/token usage already dark-safe, just
  confirm no regression)

---

## DATA/BACKEND RULES

- No DB changes. No new columns, no migration.
- No new data fetching — reuses the existing `CatalystDetailRouter` type-lookup query
  (`ph_issues` by `issue_key`), unchanged.

---

## INTEGRATION/WIRING RULES

- `useGlobalSearchStore.getState().openDetail({ id: g.key })` call itself is correct (matches the
  canonical pattern used in 15+ other call sites, confirmed via `grep -rn openDetail`) — the fix
  is purely about making sure the click event reaches that call, not about changing the call.
- Must preserve: right-click context menu (Round 5 #5), swimlane collapse/expand click target,
  hover-reveal create button — none of these should regress.

---

## PARALLEL EXECUTION PLAN

Single-file structural fix, small enough that parallel discovery agents are overkill (Four
Universal Rules — simplicity first). Skipping the full 7-agent fan-out for this slice; will
re-engage parallel agents if the fix turns out to require touching more than the 2 files above.

**Execution:**
1. Restructure `SwimlaneHeader.tsx` so the epic-key `role="link"` span is not a DOM descendant
   of the collapse-toggle `<button>`
2. Live Chrome MCP verify: click epic key → dialog opens with correct epic
3. Live Chrome MCP verify: click elsewhere in the row (chevron, label, count) → swimlane still
   collapses/expands
4. Live Chrome MCP verify: right-click a card still opens context menu (unrelated but adjacent,
   Round 5 regression check)
5. `npx tsc --noEmit -p .`, `npm run lint:colors:gate`, `npm run audit:ads:gate`

---

## SCREENSHOT CHECKLIST

- [ ] Before: swimlane row, epic key visible, no panel
- [ ] After: click epic key → detail panel open screenshot
- [ ] Collapse/expand still works (2 screenshots: expanded, collapsed)
- [ ] Dark mode reload-into-dark screenshot
- [ ] Adjacent regression: right-click card context menu still works

---

## VALIDATION COMMANDS

```bash
npx tsc --noEmit -p .
npm run lint:colors:gate
npm run audit:ads:gate
```

---

## STOP CONDITIONS

Stop and raise RED FLAG if:

- The fix requires touching `CatalystDetailRouter.tsx` or `CatalystShell.tsx` (would mean the
  root cause is elsewhere, not the nested-button structure)
- Any visual regression to swimlane row layout
- Swimlane collapse/expand breaks
- Right-click context menu (Round 5) regresses
- Slice exceeds 2 hours

---

## DRIFT/REBASELINE RULES

If this Plan Lock is superseded mid-slice: stop, document in `08_DRIFT_LOG.md`, get rebaseline
approval, mark this file SUPERSEDED, open a new Plan Lock.
