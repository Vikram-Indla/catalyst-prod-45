# Dashboard Jira Parity — Session 3 Handover

**Date:** 2026-06-08
**Surface:** `/project-hub/:key/dashboard`
**Branch:** `main`
**Reference docs:**
- `jira-dashboard-426-feature-registry.md` — 426 feature checklist (P0/P1/P2/P3)
- `jira-dashboard-configure-panel-spec.md` — configure panel spec (D1-D14)
- `dashboard-jira-parity-session2-handover.md` — prior session state

---

## Session 3 Status — What Shipped

4 commits on `main`:

| Commit | Scope | Registry items closed |
|--------|-------|----------------------|
| `da6983efd` | Fix "Change layout" dropdown rendering at (0,0) — self-rolled `LayoutDropdown` replaces broken `@atlaskit/dropdown-menu` popup positioning | A25 |
| `821ec3511` | Configure panel: number of results, columns-to-display (drag-reorder + delete + add), auto-refresh checkbox + interval | D5, D6, D7, D8, D9, D10, D11 |
| `1775955ff` | `PaginationFooter` component wired into QA Defects and Production Incidents widgets | E10, E11 |
| `ecd0a7a0e` | Column filtering in QA Defects + Production Incidents (`head.cells` + row `cells` arrays both filter to `resolveColumns(gadgetType, settings.columns)`) | D6 wiring |

**New files:**
- `src/components/project-hub/dashboard/gadgetColumns.ts` — per-gadget column registry (QA: 12 columns, Incidents: 12 columns, Demand: 7 columns)
- `src/components/project-hub/dashboard/PaginationFooter.tsx` — reusable "1-N of M" + prev/next buttons

**Changed files:**
- `src/components/ads/Button.tsx` — added `forwardRef` so `triggerRef` from `@atlaskit/dropdown-menu` propagates to underlying `AkButton` (general improvement, fixes ref forwarding bug)
- `src/hooks/useGadgetSettings.ts` — `GadgetSettings` extended with `columns: string[] | null`, `numResults: number`, `autoRefresh: boolean`, `autoRefreshMinutes: number`; `DEFAULT_GADGET_SETTINGS` + `isDefaultSettings` updated
- `src/components/project-hub/dashboard/GadgetSettingsPanel.tsx` — 3 new UI sections + new `ColumnsSection` component (drag-drop HTML5, trash delete, + Add column dropdown)
- `src/pages/project-hub/ProjectDashboardPage.tsx` — new `LayoutDropdown` component (self-rolled `position:absolute` dropdown), `Change layout` `DropdownMenu` removed
- `src/components/project-hub/dashboard/widgets/QADefectsWidget.tsx` — page state, pagination footer, column filtering, 6 extra column renderers (reporter, created, updated, fixVersion, labels, resolution)
- `src/components/project-hub/dashboard/widgets/ProductionIncidentsWidget.tsx` — same as QA

---

## Architecture Notes

### Configure panel data flow

```
GadgetSettingsPanel
  └── ColumnsSection (settings.columns, gadgetType)
        ↓ saves to localStorage via useGadgetSettings.save()
        ↓ broadcasts catalyst-gadget-settings-changed event
        ↓
useGadgetSettings('qa', projectKey) in widget
        ↓ settings.columns
        ↓
resolveColumns('qa', settings.columns) → string[]
        ↓
head.cells.filter() + rows[].cells.filter()
        ↓
ResizableDynamicTable renders only active columns
```

### Column registry pattern

`gadgetColumns.ts` exports per-gadget `GadgetColumnDef[]` with `defaultVisible` flags. `resolveColumns(gadgetType, savedColumns)`:
- `savedColumns === null` → return default columns from registry
- otherwise → filter saved IDs against registry (drops removed/renamed columns gracefully)

Widget renders ALL possible column cells in row, then filters by `activeColumns`. Header cells filter identically. Adding new column = add 1 entry to registry + 1 cell to row template.

### Pagination

Pure client-side slicing: `rows.slice(page * pageSize, (page + 1) * pageSize)`. No server pagination. `pageSize` from `settings.numResults` (default 10, max 50). Page state local to widget (`useState(0)`).

**Footer NEVER resets on data change** — bug: if user is on page 3 and data shrinks to 1 page, footer disables both buttons but page stays at 3. Fix needed (see pending items below).

### LayoutDropdown — why self-rolled?

`@atlaskit/dropdown-menu` v15.x renders its popup via `@atlaskit/popup` (Popper.js). In `AtlaskitPageShell` header context, popup renders at viewport (0,0) regardless of trigger position. Tested fixes that DIDN'T work:
- `forwardRef` on `Button` (still no positioning)
- `AkButton` direct (no positioning)
- `placement="bottom-start"` + `shouldRenderToParent` (no positioning)

Root cause unknown — likely Popper boundary detection vs. flex space-between container. Self-rolled `position: absolute` dropdown with `mousedown` outside-click handler mirrors `GadgetSettingsPanel` pattern and works correctly.

---

## P0 Pending — Must Fix Next Session

### P0-A: Column wiring quality issues

**A1. Resizable column widths don't update on column add/remove.**
`defaultWidths` + `minWidths` props on `ResizableDynamicTable` only list 6 original columns. Adding "Reporter" or "Labels" — auto-sizes via Atlaskit DynamicTable default (works but inconsistent with other columns). Need:
- Add `defaultWidths` entries for all 12 columns in QA + 12 in Incidents
- Bump `widgetKey` suffix to `v4` ONLY if persisted widths block the new columns

**A2. Column drag-reorder uses HTML5 `draggable` with no visual feedback.**
Drop indicator (line above target row) missing. Currently relies on `background: 'var(--ds-background-selected)'` on the dragged item only — user can't see where it will land. Fix:
- Add `dragOverIdx: number | null` state alongside `dragIdx`
- Render 2px blue line above the row when `dragOverIdx === idx`
- Update `onDragOver` to track which row is targeted

**A3. Pagination footer doesn't reset on data change / filter change.**
If user filters down to fewer items, `page` stays at old value. Add:
```tsx
useEffect(() => { setPage(0); }, [rows.length, settings.statusFilter, settings.assigneeFilter, /* etc */]);
```
Or simpler: clamp `page` to `Math.max(0, totalPages - 1)` in render.

**A4. Auto-refresh setting is saved but NOT implemented.**
`settings.autoRefresh` + `settings.autoRefreshMinutes` persist to localStorage. No widget reads them. Need:
- New hook `useAutoRefresh(enabled, intervalMin, callback)` — `setInterval` calls `callback()` every N min
- Each widget: `useAutoRefresh(settings.autoRefresh, settings.autoRefreshMinutes, () => queryClient.invalidateQueries([widgetQueryKey]))`
- Cleanup on unmount / settings change

### P0-B: Configure panel UX gaps

**B1. "Saved filter" dropdown (D3) deferred.**
Vikram: "for filters catalyst will use existing filter functionality." Need to confirm what this means. Options:
- Reuse `/project-hub/:key/filters` filter system (FilterCreatePage)
- Hook gadget settings to read from a project-level filter
- Just remove the field from the spec
Action: ask Vikram before next session.

**B2. "Advanced Search" link (D4) deferred.** Same as B1.

**B3. Column picker has no search.** With 12 columns it's fine, but ItemsByStatus / Scope Change / Demand might have 20+ later. Add search input above the available-columns dropdown when length > 8.

**B4. Column registry only covers 3 of 10 widgets.**
- ✅ QA Defects, Production Incidents, Demand Fulfilment have entries
- ❌ Overdue, On Hold, Items by Status, Scope Change, Release Health, Team Workload, Time in Status — `getColumnsForGadget()` returns `null`, ColumnsSection renders nothing
- For chart/KPI widgets (Items by Status, Scope Change) → correct, leave null
- For Overdue, On Hold (table-ish) → add registry entries + wire widgets

### P0-C: DnD widget reorder (Session 2 carryover)

**C1. Pragmatic DnD wired but no drop indicator.**
`DashboardWidgetGrid` uses `@atlaskit/pragmatic-drag-and-drop` for widget reorder in edit mode. Drag works. Drop target visual feedback missing (no blue line, no ghost card). Vikram noted this in session 2 handover. Pattern to mirror: `BacklogPage` row reorder uses Atlaskit's `attachClosestEdge` + `extractClosestEdge` from `@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge` and renders a `DropIndicator` from `@atlaskit/pragmatic-drag-and-drop-react-drop-indicator/box`.

**C2. Drag handle position inconsistent.**
Widget drag handles render in widget header. Jira renders drag handle on the LEFT edge of card (vertical strip) on hover only. Visual spec needs Vikram approval before changing.

---

## P1 Pending — Should Fix

### P1-A: Pagination polish

- Add page-size selector ("10 ▾") next to the page count text. Currently page-size only changeable via gear → configure panel. Jira shows inline selector.
- Add "First / Last" buttons (« ») in addition to prev/next when totalPages > 5
- Keyboard nav: ArrowLeft / ArrowRight focused on pagination = prev/next

### P1-B: Sort indicators (E12, E14)

ResizableDynamicTable uses Atlaskit DynamicTable's built-in sort. Sort arrow icon renders but is small/grey. Jira shows a more prominent blue arrow + the column header label turns bold when active. Need:
- DOM-probe Jira's sort arrow styling (use `mcp__Claude_in_Chrome__javascript_tool` on a Jira list view)
- Override Atlaskit's sort arrow via CSS in `dashboard.css` or `ResizableDynamicTable.tsx`

### P1-C: Saved column-set presets

After P0-A1 lands, users will customize column lists per gadget. Add:
- "Save as preset" in the gadget settings footer
- Preset dropdown ("My defaults" / "Compact" / "Detailed") above the column list
- Stored as `catalyst_gadget_presets_${projectKey}_${gadget}` in localStorage

### P1-D: Apply column settings to UWV / detail expansion

When user clicks "View all ↗" footer or expand button, widget opens UWV (universal work view) with the same filters. UWV doesn't currently consume `settings.columns`. Need:
- `openUWV()` call in widget passes `columns: settings.columns`
- UWV renders only those columns by default

### P1-E: Solo mode (focus mode) column behavior

When widget enters solo mode (`soloWidgetId === widgetId`), widget gets full viewport width. Currently still uses same column set. Solo mode could:
- Show ALL columns from registry by default (override `settings.columns`)
- Or show a "Show all columns" toggle in solo header

---

## P2 Pending — Nice to Have

- Auto-refresh visual indicator (small spinner pulse in widget header when refresh fires)
- Column resize persistence per gadget (currently `widgetKey` is per-widget, columns stored in user's `ResizableDynamicTable` localStorage by `widgetKey`)
- "Reset columns" link in configure panel (already have "Default columns" reset button — verify still works after A2)
- Export widget data as CSV (per Jira's 3-dot menu in list view)
- Print-friendly view (Jira: `?print=true` query param)

---

## P3 — Long-term / Out of Scope This Quarter

- Custom widget gadgets (user-defined SQL queries)
- Cross-project dashboards (currently per-project)
- Shared dashboards (`/dashboard/:id` URL, RLS-gated)
- Dashboard templates (clone Jira's template gallery)
- Slack / Teams digest delivery

---

## How to Resume

**1. Verify Session 3 work still works:**
```
http://localhost:8080/project-hub/BAU/dashboard
→ Edit mode → "Change layout" dropdown renders below button ✓
→ Edit mode → widget bodies visible ✓
→ Click gear on QA Defects → see Number of results, Columns to display, Auto refresh sections ✓
→ Drag a column row → it moves ✓
→ Trash icon → column removed ✓
→ + Add column → dropdown shows hidden columns ✓
→ Pagination footer "1-10 of 10" at bottom of QA Defects table ✓
```

**2. Start with P0-A3 (pagination reset)** — single useEffect, low risk, blocks any further pagination work.

**3. Then P0-A4 (auto-refresh)** — net-new hook, no existing code to break.

**4. Then P0-A2 (drop indicator)** — small DnD polish, makes column reorder UX professional.

**5. Defer P0-A1 (column widths)** until Vikram tests A2 / A3 / A4 — column widths feel like polish.

**6. ASK Vikram before P0-B1 / P0-B2** — saved filter integration scope unclear.

**7. ASK Vikram before P0-C1 / P0-C2** — DnD visual spec needs his approval.

---

## Files To Read First Next Session

1. `src/components/project-hub/dashboard/gadgetColumns.ts` — column registry
2. `src/components/project-hub/dashboard/GadgetSettingsPanel.tsx` — search "ColumnsSection" at line 1314
3. `src/components/project-hub/dashboard/widgets/QADefectsWidget.tsx` — `activeColumns` + row cells filter pattern
4. `src/hooks/useGadgetSettings.ts` — extended interface
5. `src/components/project-hub/dashboard/PaginationFooter.tsx` — pagination component
6. `src/pages/project-hub/ProjectDashboardPage.tsx` — LayoutDropdown self-rolled pattern

## Live Reference

Jira BAU dashboard (DOM-probe for sort arrows, column widths, pagination chrome):
`https://digital-transformation.atlassian.net/jira/dashboards/10020`

Use Chrome MCP tab reuse (existing tab on localhost:8080 + a separate tab on the Jira URL).

---

## Acceptance Criteria for "Configure Panel Done"

Each row of D-series in `jira-dashboard-configure-panel-spec.md` must:
- Render in panel for table-based gadgets (QA, Incidents, Overdue, OnHold)
- Persist to localStorage
- Apply to widget render output on Apply
- Reset on "Clear all"
- Not crash for chart-based gadgets (Items by Status, Scope Change — registry returns null → section hides)

Session 3 closes D5-D11 for QA + Incidents. Sessions 4+ need to extend coverage to remaining table widgets and resolve P0-A1 through P0-A4.
