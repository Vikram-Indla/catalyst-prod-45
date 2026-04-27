# SHIP DECISION — BAU list (groupBy=status)

Date: 2026-04-27
Auditor: Claude (jira-compare skill v3, Cowork session)
Surface: Full BAU list page at `/project-hub/BAU/backlog?groupBy=status`
Iterations run: 2

## Verdict

**SHIPPABLE** for in-session CLAUDE-CODE scope. All 8 in-scope CLAUDE-CODE patches landed and verified via Chrome MCP DOM probe + wiring test. Two external handoffs remain (LOVABLE + DESIGN-CRITIQUE) — they are tracked, scoped, and unblocked.

## Audit closure summary

| Tag | Count | Status |
|-----|-------|--------|
| [CLAUDE CODE] P0 | 1 (#2) | ✓ shipped + verified |
| [CLAUDE CODE] P1 | 6 (#3, #4, #5, #6, #7, #8) | ✓ shipped + verified |
| [CLAUDE CODE] P2 | 1 (#10) | ✓ shipped + verified |
| [CLAUDE CODE] P-A11Y | 1 (#12, folded into #5) | ✓ shipped + verified |
| [LOVABLE] | 1 (#1 avatar strip + Add people) | handoff emitted |
| [DESIGN-CRITIQUE] | 1 (#9 top-right CTAs) | handoff emitted |
| [A11Y] | 2 (#11, #13) | deferred — depend on #1 landing |

## Acceptance checks (final)

- [x] Toolbar split into LEFT (Search + Filter) and RIGHT (Group + View Options + More Actions + count + maximize) clusters with flex spacer between.
- [x] Group: Status pill anchors to far right of toolbar (probe: groupBtnX=1559 on a 1880px-wide grid).
- [x] Page title is "Senaei BAU" (not "Senaei BAU Backlog").
- [x] Type column header reads "Type" (visible text doubles as accessible name).
- [x] Column widths: Parent ≥ 280px (observed 400px); Summary ≥ 360px (observed 508px).
- [x] No regression on Lozenge / Avatar / PriorityBars group-header rendering (verified — chevron + lozenge intact).
- [x] No regression on inline-edit popups (carryover, no code touched).
- [x] No regression on sticky bottom + Create row.
- [x] `?groupBy=status` URL contract intact; round-trip status→priority→status verified.
- [x] White-card border-radius is 8px (probe: `getComputedStyle(grid).borderRadius === "8px"`).
- [x] More Actions menu opens with Refresh + Export to CSV; Refresh wired to TanStack Query invalidation.
- [x] View Options menu opens with Density (Compact / Comfortable) + Layout (List) groups.
- [ ] AvatarGroup ≤7 visible + `+N` overflow chip — **deferred to LOVABLE handoff #1**.
- [ ] AvatarGroup +N aria-label — **deferred to LOVABLE handoff #1** (a11y row #13).

## Files touched (final)

1. `src/modules/project-work-hub/pages/BacklogPage.atlaskit.tsx`
   - import additions: `MoreHorizontal`, `SlidersHorizontal`, `RefreshCw`, `Download` from lucide-react
   - import cleanup: removed unused `DropdownItem`, `DropdownItemGroup`
   - `pageTitle` const: dropped " Backlog" suffix
   - Type column: `label: '' → 'Type'`, `width: 3 → 8`
   - Summary column: `width: 22 → 33`
   - Parent column: `width: 12 → 26`
   - Updated column: `defaultVisible: true → false`
   - `DEFAULT_VISIBLE_COLUMNS` array: removed `'created'` and `'updated'`
   - Added `handleRefreshBacklog` callback + `toolbarIconButtonStyle` shared style
   - Added `toolbarViewOptionsButton` and `toolbarMoreActionsButton` JSX consts (rewired to ToolbarMenuButton helper after iter-1 portal-empty regression)
   - Toolbar JSX: restructured into LEFT cluster + flex spacer + RIGHT cluster; GroupByControl moved to right cluster
   - Added `ToolbarMenuButton` helper component (bespoke portal pattern, mirrors GroupByControl)

2. `src/components/shared/JiraTable/JiraTable.tsx`
   - White-card `borderRadius: 6 → 8`

## Lessons captured

Two lessons surfaced during this audit that should be appended to `SKILL.md §19` on the next maintenance pass:

### L20 — `defaultVisible` on column schema is NOT the source of truth on this surface
**Date:** 2026-04-27
**Pattern:** Setting `defaultVisible: false` on a column in the schema does not hide it on first load if the consumer also has a `DEFAULT_VISIBLE_COLUMNS` array. JiraTable's column-picker treats `defaultVisible` as the picker's seed, but BacklogPage initializes `visibleColumns` state from a hardcoded array. Updating only the schema flag while leaving the array untouched gives the appearance of a fix without the behavior of one.
**Rule:** When changing default-visibility for a JiraTable consumer, audit BOTH the column schema's `defaultVisible` flag AND any `DEFAULT_VISIBLE_COLUMNS` const that initializes the consumer's state. If they disagree, the array wins on first render.

### L21 — `@atlaskit/dropdown-menu` is NOT safe inside the Project Hub backlog toolbar
**Date:** 2026-04-27
**Pattern:** Wrapping a trigger with `<DropdownMenu>` from `@atlaskit/dropdown-menu` in the BacklogPage toolbar fires `aria-expanded=true` correctly but renders an EMPTY portal — `atlaskitPortalCount=0`, no `role="menu"` content in DOM, body innerText doesn't include any menu item label. Same failure mode that drove GroupByControl's bespoke portal rewrite (line ~2162).
**Rule:** On Project Hub Backlog (and any other surface where GroupByControl uses a bespoke portal), do NOT use `@atlaskit/dropdown-menu` for new toolbar menus. Use the `ToolbarMenuButton` helper (BacklogPage.atlaskit.tsx line ~2363) which mirrors the GroupByControl pattern: `ReactDOM.createPortal` mounted to `<body>` with position computed from the trigger rect. The helper preserves Atlaskit-only mandate (role=menu/menuitem, ADS tokens for color/spacing, keyboard nav).

## Handoffs to drive next

1. **LOVABLE — `LOVABLE-01-avatar-strip-add-people.md`** — paste into Lovable to add `@atlaskit/avatar-group` + "Add people" CTA on toolbar LEFT.
2. **DESIGN-CRITIQUE — `DESIGN-CRITIQUE-09-top-right-ctas.md`** — invoke `/design:design-critique` skill with this brief to decide whether to add Jira's "Give feedback" / "Enter full screen" top-right CTAs.

After both land, re-run `/jira-compare` on this surface for a final iter-3 pass to close #11 and #13.

---

## Iter-3 continuation closure (2026-04-27, evening session)

Three new findings (F-NEW-1..F-NEW-4) were processed in a continuation conversation
opened from a Phase 9 Context Handoff. Outcome:

| Finding | Status | Evidence |
|---|---|---|
| F-NEW-1 page chrome bg #E9F2FE | ✓ closed (already patched) | Re-probe: Catalyst chrome rgb(233,242,254) at edge coords matches Jira's depth-1 chrome layer; both surfaces walked via ancestor chain (L24). |
| F-NEW-2 inline create at group header | handoff emitted | LOVABLE-F-NEW-2-inline-create-group.md — Jira testid `business-list.common.ui.create-issue-plus-button.child-create-button-wrapper` baked in. |
| F-NEW-3 issue chevron uniform slot | handoff emitted | CC-F-NEW-3-issue-chevron-uniform.md — spec corrected: Jira renders chevron slot on EVERY issue row (not just parents); 12 sample buttons captured at uniform x=121 (L25). |
| F-NEW-4 full-page geometry parity | queued | F-NEW-4-run-regression.md — auto-chains to /regression skill on the same surface. |

Phase 8 wiring smoke (iter-3 continuation, no source touched):
  - Page title "Senaei BAU" ✓
  - H1 fontWeight 653 ✓
  - Card border-radius 8px ✓
  - Group By / More Actions / View Options / Sticky Create — all present ✓
  - 23 group rows + 816 issue rows render correctly ✓
  - F-NEW-3 finding confirmed: group rows have 0 buttons (text-only `▾`)

New lessons appended to skill (proposed §19):
  - L24 — chrome bg lives on inner div, not body; ancestor-chain probe required
  - L25 — re-probe before generating downstream handoffs; spec text drifts from live DOM
  - L26 — patches/iter<n>.md exists ≠ patch is in source; trust the DOM

Continuation files:
  - patches/iter3-continuation.md
  - handoffs/LOVABLE-F-NEW-2-inline-create-group.md
  - handoffs/CC-F-NEW-3-issue-chevron-uniform.md
  - handoffs/F-NEW-4-run-regression.md

**Final iter-3 verdict:** SHIPPABLE. Auto-chaining to /regression per Vikram's
Phase 0 confirmation.
