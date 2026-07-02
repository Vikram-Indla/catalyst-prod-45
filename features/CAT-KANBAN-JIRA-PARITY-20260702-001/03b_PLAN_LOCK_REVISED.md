# PLAN LOCK — Kanban Jira Parity, Slice 6a-revised: fix silent no-op detail-panel open for soft-deleted parents

**Status:** SHIPPED — live-verified, gates clean
**Approved by:** Vikram, 2026-07-02
**Timebox:** 2 hours from approval
**Slice:** 6a-revised (supersedes `03_PLAN_LOCK.md`; epic-color population is still separate, 6b)

---

## OBJECTIVE

`SwimlaneHeader`/`Board.tsx` epic-key click wiring is confirmed CORRECT (live-verified against
BAU-5851, a non-deleted epic — panel opens fine). No fix needed there. The real bug: when
`openDetail({id})` is called without an explicit `itemType`/`entityKind` for an item whose
`ph_issues` row is soft-deleted (`deleted_at` set), `CatalystDetailRouter.tsx`'s type-lookup
query excludes it (`.is('deleted_at', null)`), returns `null`, and the component's
still-loading guard (lines 180-182) can't distinguish "still fetching" from "fetched, found
nothing" — so it renders `null` forever. No dialog, no error, no feedback. Confirmed via SQL:
36 of 416 distinct live-referenced parent keys in `ph_issues` are soft-deleted — not an edge
case.

**Done** = clicking any `openDetail({id})` target that resolves to a soft-deleted (or otherwise
not-found) row shows a visible, honest state — not a silent dead click. Per CLAUDE.md
zero-assumption-rendering: don't fabricate a fake type/view for a deleted item; render an
explicit "not found" state instead of nothing.

---

## NON-SCOPE

- Un-deleting or restoring any soft-deleted `ph_issues` rows — not this slice's call, data
  question for Vikram if it matters
- Epic-color population (separate slice, 6b)
- `SwimlaneHeader.tsx` / `Board.tsx` — confirmed working, no change
- Any other `openDetail` call site's behavior beyond the shared `CatalystDetailRouter` fix (fixing
  the router fixes every caller at once — that's the point of it being canonical/shared)

---

## ROOT CAUSE (confirmed, not hypothesis)

`src/components/catalyst-detail-views/CatalystDetailRouter.tsx`:
- Lines 84-97: `useQuery` looks up `issue_type` from `ph_issues` filtered by
  `.is('deleted_at', null)` — correctly excludes soft-deleted rows from the *type* lookup, but
  the query's `data` being `null` is overloaded to mean both "still loading" and "not found."
- Lines 179-182:
  ```ts
  // While we're looking up the type, don't render anything
  if (!resolved && !itemType) {
    return null;
  }
  ```
  This doesn't check `isLoading`/`isFetching` — it only checks whether a type was resolved. A
  finished query that legitimately found nothing hits the exact same branch as a query still in
  flight. Permanent silent `null`.

Live evidence: BAU-3726 (`deleted_at = 2026-06-24 08:05:02+00`, `issue_type = 'Feature'`) → dead
click. BAU-5851 (`deleted_at = null`, `issue_type = 'Epic'`) → opens correctly.

---

## CANONICAL COMPONENTS SELECTED

| Component | File | Why selected |
|---|---|---|
| `CatalystDetailRouter` (existing) | `src/components/catalyst-detail-views/CatalystDetailRouter.tsx` | Already the single canonical router for every `openDetail` call site (20+ callers per `grep -rn openDetail`) — fixing here fixes it everywhere, no new component |

No new components. No new "not-found" UI component either unless the canonical empty-state
pattern used elsewhere in the codebase doesn't fit — check for an existing `EmptyState`/`NotFound`
pattern already used in a modal/panel context before hand-rolling anything (CLAUDE.md hand-rolled
UI ban).

---

## FILES TO MODIFY

| File | Change type | Change summary |
|---|---|---|
| `src/components/catalyst-detail-views/CatalystDetailRouter.tsx` | edit | Distinguish "query still in flight" (`isLoading`/`isFetching`, keep returning `null`/spinner) from "query settled with no result" (render a visible not-found state instead of `null`). Use the query's own `isLoading` flag from the existing `useQuery` call (currently only `data` is destructured — need to also pull `isLoading` or `isFetching`). |

---

## FILES FORBIDDEN

- `src/features/kanban-board/components/SwimlaneHeader.tsx` — confirmed correct, do not touch
- `src/features/kanban-board/components/Board.tsx` — confirmed correct, do not touch
- `src/store/globalSearchStore.ts` — not implicated
- Any `CatalystView*` component (`CatalystViewEpic`, `CatalystViewStory`, etc.) — the fix is
  entirely in the router's own render-gate, not in what happens once a type IS resolved
- `src/components/layout/CatalystShell.tsx` — not implicated

---

## UI/UX RULES

- Not-found state: ADS tokens only, no hand-rolled empty-state — check for an existing canonical
  empty-state component/pattern first (search `EmptyState`, `@atlaskit/empty-state`, or how other
  modals in this codebase show "not found")
- Should render inside the same modal/panel chrome (title bar, close button) so the user can
  dismiss it normally — not a bare unstyled message
- Copy: honest and specific — e.g. "This item was deleted" or "Item not found," not a generic
  error banner that implies something crashed
- Dark mode: verify by reload-into-dark

---

## DATA/BACKEND RULES

- No DB changes, no migration
- No change to the `.is('deleted_at', null)` filter itself — soft-deleted items should stay
  excluded from normal resolution (that's correct), the fix is purely about the fallback render
  state when exclusion means "not found"
- Zero-assumption-rendering: do NOT default `resolved` to `'story'` to paper over a not-found
  case — that would render fabricated Story-shaped UI for a non-existent/deleted item, which is
  exactly the "lie" CLAUDE.md bans. Show an explicit not-found state instead.

---

## INTEGRATION/WIRING RULES

- Every existing `openDetail` caller (20+ sites, `grep -rn openDetail src`) gets this fix for
  free — no caller-side changes needed, this is a shared-component fix by design
- Must preserve: normal open flow for valid items (regression check — BAU-5851 and BAU-6054
  paths from this session's testing must still work identically after the fix)

---

## PARALLEL EXECUTION PLAN

Single-file fix. Skipping full 7-agent fan-out (Four Universal Rules — simplicity first,
CLAUDE.md). Will escalate to parallel agents only if the fix reveals the not-found state needs a
new shared component.

**Execution:**
1. Add `isLoading`/`isFetching` to the destructured `useQuery` result in
   `CatalystDetailRouter.tsx`
2. Change the render-gate: `if (isLoading) return null (or spinner)`; if settled with no result,
   render a not-found state instead of `null`
3. Live Chrome MCP verify: BAU-3726 click → visible not-found state (not silent)
4. Live Chrome MCP verify: BAU-5851 click → still opens correctly (no regression)
5. Live Chrome MCP verify: a card click (BAU-6054, the control case, itemType passed explicitly
   so this code path isn't even hit) → still opens correctly (no regression from an unrelated
   caller convention)
6. `npx tsc --noEmit -p .`, `npm run lint:colors:gate`, `npm run audit:ads:gate`

---

## SCREENSHOT CHECKLIST

- [x] Before: BAU-3726 click → nothing happens (baseline repro) — see `04_EXECUTION_LOG.md` Round 6
- [x] After: BAU-3726 click → visible not-found state ("Issue not found — This issue may have
      been deleted or the key is invalid.", ⚠️ icon, proper modal chrome)
- [x] Regression: BAU-5851 (valid epic) still opens correctly — verified post-fix
- [x] Regression: a card (valid story, BAU-6054) still opens correctly — verified post-fix
- [x] Dark mode reload-into-dark screenshot of the not-found state — clean, ADS tokens, no
      light-metaphor regression

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

- No existing canonical empty-state/not-found pattern exists in the codebase (would mean
  building new UI — needs its own sign-off per CLAUDE.md hand-rolled-UI ban, not a quick fix)
- The fix requires touching any `CatalystView*` component
- Regression on BAU-5851 or BAU-6054 open flow
- Slice exceeds 2 hours

---

## DRIFT/REBASELINE RULES

If this Plan Lock is superseded mid-slice: stop, document in `08_DRIFT_LOG.md`, get rebaseline
approval, mark this file SUPERSEDED, open a new Plan Lock.
