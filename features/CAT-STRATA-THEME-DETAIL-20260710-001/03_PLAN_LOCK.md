# Plan Lock — Slice 1: Edit-from-detail + business-readable audit
CAT-STRATA-THEME-DETAIL-20260710-001

## Objective
Make `StrataStrategyElementDetailPage.tsx` a real workspace for the two
capabilities that already have working mutations but no detail-page entry
point: editing the Theme and its Charter, and reading a human-readable audit
trail instead of raw `RPC:*`/`INSERT` strings.

## Non-scope (this slice)
- No Objectives list, no OKR performance, no Project Cards, no execution
  summary, no governance, no baseline/version, no "Map edges" rename. Those
  are Slices 2–4.
- No new mutations. Reuse `strategyApi.updateElement` and
  `strategyApi.upsertCharter` (domain/index.ts:165-187) — the same calls
  Strategy Room's row menu already uses.
- No new routes.

## 2-hour timebox
Yes — this is UI wiring + one shared-component extraction + one formatter
function. No schema change.

## Canonical components selected
- `StrataFormModal` (existing, used by Strategy Room's edit/charter modals) —
  reused as-is, not reimplemented.
- `StrataPanel`, `EmptyState`, `Lozenge` (existing, already used on detail page).
- `StrataPageShell`'s `headerActions`/`toolbarActions` props (exist, currently
  unused by this page) — this is the mount point for Edit/Charter buttons.

## Canonical screens selected
- `StrataStrategyElementDetailPage.tsx` (target of the edit)
- `StrataStrategyRoomPage.tsx` (source of the modals to extract/share)

## Files to modify
1. `src/modules/strata/components/shared.tsx` — extract the "edit-element"
   and "charter" `StrataFormModal` configs out of `StrataStrategyRoomPage.tsx`
   into exported, reusable functions/components so both pages call identical
   UI and identical mutations (no parallel implementation).
2. `src/modules/strata/pages/StrataStrategyRoomPage.tsx` — replace its inline
   edit/charter modal definitions with calls to the newly shared component.
3. `src/modules/strata/pages/StrataStrategyElementDetailPage.tsx` — add
   `headerActions` (Edit Theme, Edit Charter buttons, permission-gated) to
   `StrataPageShell`; wire them to the shared modal component; remove the
   "from the Strategy Room row menu" empty-state copy since editing is now
   available directly.
4. `src/modules/strata/components/format.ts` — add an `formatAuditAction`
   (or extend `labelize`) function that maps raw audit `action` values
   (`RPC:upsert_theme_charter`, `INSERT`, `UPDATE`, `RPC:update_element`,
   `RPC:promote_element`, `RPC:retire_element`) to business labels ("Charter
   updated", "Theme created", "Theme updated", "Theme promoted", "Theme
   retired"). Unmapped actions fall back to the raw string, never invented text.
5. `StrataStrategyElementDetailPage.tsx` audit render (`:221-226`) — use the
   new formatter instead of raw `a.action`.

## Files forbidden
- No changes to `supabase/migrations/` in this slice (no schema change needed).
- No changes to `StrataExecutionPage.tsx`, `ProjectCardDetailView.tsx`,
  governance tables/components — out of scope for Slice 1.

## UI/UX rules
- ADS tokens only — no hex/rgb/Tailwind color utilities (per CLAUDE.md hard
  stop). Reuse existing `StrataPanel`/`StrataPageShell` styling, do not
  hand-roll new buttons/menus — use existing ADS `Button`/`DropdownMenu`
  primitives already used elsewhere in the STRATA module.
- Permission-gate Edit actions the same way `ProjectCardDetailView.tsx` gates
  its write actions (`WRITE_ROLES`) — confirm the equivalent role-check used
  in `StrataStrategyRoomPage.tsx`'s row menu and mirror it exactly, do not
  invent a new permission model.
- No Schedule Gate action added to this page (explicitly banned at Theme level).

## Data/backend rules
- Zero new RPCs. Zero new tables. Zero schema changes.
- Mutations must go through the same `strategyApi.updateElement` /
  `strategyApi.upsertCharter` functions already used by Strategy Room — not
  reimplemented inline.
- Audit formatting is presentation-only; raw `action` values in the DB are
  untouched.

## Integration/wiring rules
- Row menu (Strategy Room) and detail page must call the identical shared
  modal component/function — verified by code (single definition, two call
  sites), not just visual similarity.
- On successful edit, detail page must refetch (`useStrategyElementBySlug`
  invalidate) so changes are visible without manual refresh.

## Parallel execution plan
Given this is a contained UI-wiring slice touching 4 files with a clear
extraction target, single-threaded implementation is appropriate — no
parallel-agent fan-out needed for the build itself. Screenshot verification
and lint/typecheck run after.

## Screenshot checklist
1. Theme detail page — header now shows Edit + Charter actions.
2. Click Edit → modal opens pre-filled with current Theme fields.
3. Save → toast/success feedback, page reflects new values without manual refresh.
4. Click Edit Charter → modal opens pre-filled with current Hypothesis/Scope/Value thesis.
5. Save → Charter card reflects new values.
6. Audit card — before/after showing raw `RPC:update_element` replaced with "Theme updated" (or equivalent business label).
7. Strategy Room row menu — Edit/Charter still work identically (regression check).

## Validation commands
```
npm run typecheck   # or tsc --noEmit, per package.json script name
npm run lint
npm run lint:colors:gate
npm run audit:ads:gate
npm run build
```
(exact script names to be confirmed against package.json before running)

## Stop conditions
- If `StrataFormModal` extraction reveals hidden coupling to
  `StrataStrategyRoomPage.tsx` local state that can't cleanly generalize →
  stop, report, do not force it with prop-drilling hacks.
- If permission/role check for edit access isn't found or is ambiguous →
  stop and ask rather than assume open access.
- One correction loop max on any blocker; then accept/split/rebuild/stop+revert.

## Drift/rebaseline rules
Any deviation from this file list or non-scope requires a new Plan Lock
version logged in `08_DRIFT_LOG.md`, not silent expansion.
