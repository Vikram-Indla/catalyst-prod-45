# Phase F Survey — `SubtasksPanel`

**Date:** 2026-04-19
**Author:** Claude (on Vikram's instruction)
**Status:** Survey only — NO edits to `SubtasksPanel` yet. Waiting for Vikram's approval of scope below before any changes.

---

## 1. HEADLINE

The handover's premise ("SubtasksPanel hasn't been migrated — need F.b header chrome, F.c status-pill Lozenge, F.d body → JiraTable") is **partially stale**. `SubtasksPanel/index.tsx` is already extensively Atlaskit. The real un-migrated surface area is narrower than expected, and the originally-planned F.d (body → JiraTable) would be a **regression** — the body is already on `@atlaskit/dynamic-table`, which is Atlassian's canonical table primitive. JiraTable is the TanStack-based clone we use elsewhere; moving off the real thing onto the clone is the wrong direction.

Revised Phase F below.

---

## 2. CANONICAL COMPONENT

**Live / canonical:** `src/modules/project-work-hub/components/SubtasksPanel/index.tsx` (1,035 lines, named export `SubtasksPanel`).

**Imported by 8 consumers** — every drawer surface plus the issue-view page:

| # | Consumer | Path |
|---|---|---|
| 1 | CatalystViewEpic | `catalyst-detail-views/epic/CatalystViewEpic.tsx` |
| 2 | CatalystViewFeature | `catalyst-detail-views/feature/CatalystViewFeature.tsx` |
| 3 | CatalystViewTask | `catalyst-detail-views/task/CatalystViewTask.tsx` |
| 4 | CatalystViewSubtask | `catalyst-detail-views/subtask/CatalystViewSubtask.tsx` |
| 5 | CatalystViewIncident | `catalyst-detail-views/incident/CatalystViewIncident.tsx` |
| 6 | CatalystViewDefect | `catalyst-detail-views/defect/CatalystViewDefect.tsx` |
| 7 | CatalystViewBusinessRequest | `catalyst-detail-views/business-request/CatalystViewBusinessRequest.tsx` |
| 8 | IssueContentView | `components/workhub/issue-view/IssueContentView.tsx` |
| 9 | StoryDetailModal | `modules/project-work-hub/components/dialogs/StoryDetailModal.tsx` |

**Adjacent files in the same tree:**
- `SubtasksPanelV2.tsx` (717 lines) — **explicitly deprecated** per its file-header doc comment ("DEPRECATED (Apr 2026). Pending removal."). The three strategic wins it carried (AlertDialog, role=grid keyboard nav, per-row DescriptionPopover) have been ported into V1. Only referenced by its own smoke test. Safe to delete once V1 has equivalent integration test.
- `BoardView.tsx`, `BulkEditBar.tsx`, `DescriptionPopover.tsx`, `HeaderOverflowMenu.tsx`, `InlineCreateWithAI.tsx`, `RowActionsMenu.tsx`, `ViewToggle.tsx` — sub-components of V1.
- `cells/`, `popovers/`, `hooks/` dirs — cell/popover primitives and data hooks.
- `atlaskitTheme.ts`, `hierarchy.ts`, `reorder.ts`, `schemas.ts`, `sort.ts` — shared helpers.

**Other file named `SubtasksPanel`:** `src/components/workhub/issue-view/sections/SubtasksPanel.tsx` — a separate Jira-native HTML-table implementation with its own `@/lib/subtasks-provider` abstraction. **Grep for `issue-view/sections/SubtasksPanel` returns zero importers.** Appears to be dead code. ⚠️ flagged — see open question 1 below.

---

## 3. WHAT'S ALREADY ATLASKIT (surprisingly a lot)

| Area | Primitive in use |
|---|---|
| Table body / header / sort click / DnD rank | `@atlaskit/dynamic-table` |
| Status pill + 3-colour guardrail mapping | `@atlaskit/lozenge` (via `cells/StatusCell.tsx`) |
| Header overflow menu (Hide done / Sort / Bulk edit / View in search) | `@atlaskit/dropdown-menu` + `@atlaskit/popup` nested submenu |
| Row actions (Open / Rename / Delete) | `@atlaskit/dropdown-menu` |
| Assignee avatar | `@atlaskit/avatar` |
| Assignee / Priority / Status popovers | `@atlaskit/popup` |
| Inline-create AI summary input | `@atlaskit/textfield` |
| Description type hook | `@atlaskit/adf-utils` |
| Theme sync | `@atlaskit/tokens` (`setGlobalTheme`) |

StatusCell already maps the 3-colour guardrail correctly: `done → success`, `in_progress → inprogress`, everything else → `default`. The `removed`/`new`/`moved` Atlaskit appearances are deliberately never used. CLAUDE.md §5 compliant.

---

## 4. WHAT'S NOT YET MIGRATED

| # | Surface | Current | Target |
|---|---|---|---|
| 1 | Delete confirm (single) | shadcn `@/components/ui/alert-dialog` AlertDialog, lines 975–988 of `index.tsx` | `@atlaskit/modal-dialog` (same pattern as E.1 + H) |
| 2 | Delete confirm (bulk) | shadcn AlertDialog, lines 991–1004 | `@atlaskit/modal-dialog` |
| 3 | Header icon buttons (▼ collapse · ⊞ view toggle container · ⋯ overflow · ⊞ column picker · + add) | plain `<button className="sp-icon-btn">` / `.sp-collapse-btn` / `.sp-icon-btn--add` | `@atlaskit/button` IconButton + Tooltip |
| 4 | ColumnPicker dropdown | hand-rolled `<div>` dropdown w/ custom CSS (`sp-colpicker-*`) | `@atlaskit/dropdown-menu` DropdownItemCheckboxGroup |
| 5 | TypeSelector chip (inline-create) | hand-rolled `<div>` dropdown (`sp-type-selector-*`) | `@atlaskit/dropdown-menu` DropdownItemGroup |
| 6 | InlineSummaryEditor (rename row) | raw `<input>` + custom CSS | `@atlaskit/inline-edit` + `@atlaskit/textfield` (same pattern as drawer title, Phase C) |
| 7 | DescriptionPopover | shadcn `@/components/ui/popover` | `@atlaskit/popup` (trivial — rest of panel is already on it) |
| 8 | Row actions button (⋯) | plain `<button className="sp-row-actions-btn">` | `@atlaskit/button` IconButton (inside the existing DropdownMenu trigger) |
| 9 | Empty-state CTA ("+ Create subtask") | plain `<button className="sp-empty-cta">` | `@atlaskit/button` Button |
| 10 | Progress bar | hand-rolled `<div>` track + fill | `@atlaskit/progress-bar` (low priority — current has a11y) |

Row-height / table density and row shape are fine — they come from DynamicTable + `SubtasksPanel.css` and match Jira.

---

## 5. REVISED PHASE F SCOPE (proposed)

Dropping the original F.b/F.c/F.d (they're either done or would regress) and replacing with surface-granular slices:

| Slice | Scope | Risk | Pattern reuse |
|---|---|---|---|
| **F.a** | Survey (this doc) | — | — |
| **F.b** | Delete confirms (single + bulk) → `@atlaskit/modal-dialog` | Low — two isolated call sites | E.1, H |
| **F.c** | Header icon buttons → `@atlaskit/button` IconButton + Tooltip | Low — visual only | Drawer Phase B |
| **F.d** | ColumnPicker + TypeSelector dropdowns → `@atlaskit/dropdown-menu` | Low–Medium — custom keyboard behaviour in ColumnPicker needs re-testing | HeaderOverflowMenu, RowActionsMenu |
| **F.e** | InlineSummaryEditor → `@atlaskit/inline-edit` + `@atlaskit/textfield` | Medium — has its own save/cancel keyboard wiring and bluring commit semantics; care needed on Enter=commit, Esc=cancel parity | Phase C drawer title |
| **F.f** | DescriptionPopover shadcn Popover → `@atlaskit/popup` | Low | — |
| **F.g** | Empty-state CTA + row-actions trigger → `@atlaskit/button` | Trivial | — |
| **F.h** | Progress bar → `@atlaskit/progress-bar` | Low; **optional / deferrable** | — |

Suggested execution order: **F.b → F.c → F.d → F.g → F.f → F.e → F.h.** Start with the modal-dialog pass (matches the drawer's finished modal work), then the polish surfaces (chrome, dropdowns, buttons), then the heavier inline-edit swap, then optional progress bar.

Each slice should be surgical per CLAUDE.md §10 — **one sub-component, one file, one concern**. No F.e-before-F.c blending.

---

## 6. INFRASTRUCTURE CHECK

Per CLAUDE.md §1 adoption protocol, every new `@atlaskit/*` package must be in `package.json` deps AND `vite.config.ts optimizeDeps.include`. Current panel uses:
- `@atlaskit/dynamic-table` ✅
- `@atlaskit/lozenge` ✅
- `@atlaskit/dropdown-menu` ✅
- `@atlaskit/popup` ✅
- `@atlaskit/avatar` ✅
- `@atlaskit/textfield` ✅
- `@atlaskit/tokens` ✅
- `@atlaskit/adf-utils` ✅

**Proposed F slices introduce:**
- `@atlaskit/modal-dialog` — ✅ already in deps (drawer session)
- `@atlaskit/button` — ✅ already in deps (drawer Phase B)
- `@atlaskit/inline-edit` — ✅ already in deps (drawer Phase C)
- `@atlaskit/progress-bar` — NEW (only if F.h goes ahead; skip otherwise)

No new packages required for F.b–F.g. F.h would require the adoption-protocol dance for one package.

---

## 7. OPEN QUESTIONS FOR VIKRAM

1. **`src/components/workhub/issue-view/sections/SubtasksPanel.tsx`** — unreferenced in `src/`. Appears to be dead code alongside its `@/lib/subtasks-provider` abstraction. Delete now (similar to the `CatalystChildWorkItemsTable` pass we just did), defer until after Phase F, or is it wired somewhere I'm missing (e.g. dynamic import, storybook story)?
2. **`SubtasksPanelV2.tsx`** — file header says "pending removal, safe to delete once V1 has an equivalent integration test." Do you want me to write the V1 integration test (~1–2 hours) so we can drop V2, or leave both for now?
3. **F.h progress bar** — worth doing? It's the lowest-value slice and requires a new package. Recommendation: skip until Phase 4 measurements prove Jira's version differs materially.
4. **F.e inline-edit risk** — the current InlineSummaryEditor has subtle semantics (blur commits, Enter commits, Esc cancels, click-stop-propagation so the row-click handler doesn't re-fire). Replacing with `@atlaskit/inline-edit` is higher-risk than the others. Confirm you want this inside Phase F rather than a separate later phase?
5. **Consumer parity** — any reason to de-risk by doing F.b/F.c on the drawer-only path and waiting for Phase 4 verification before touching the non-drawer consumers (IssueContentView)? Or just go straight through all 9 consumers since they share one source file?

---

## 8. SESSION NOTES (unrelated to survey, for the record)

Already completed this session alongside the survey:
- Deleted the two dead `CatalystChildWorkItemsTable` trees (6 files, ~400 LOC). TSC clean.
- Bumped StoryDetailModal sidebar widths to match CatalystViewBase (default 280→380, max 480→600, min 220 unchanged). Added doc comment pinning the rationale to the Jira BAU-5419 measurement.
- Fixed a drift in CatalystViewBase itself: the resize clamp was raised to 600 last session but the inline `maxWidth: 480` on the sidebar div was missed. Fixed to 600.
- TSC clean after all changes: `tsc --noEmit -p tsconfig.app.json` → exit 0, 0 errors.

---

**End of survey. Awaiting approval on §5 scope and §7 open questions before any `SubtasksPanel` edits.**
