# Backlog Table — Jira-parity work log

> Handover doc for the grouped backlog table (product-hub + project-hub `/…/backlog`).
> Written 2026-07-01. Read before resuming this surface.

## Goal

Make the Catalyst grouped backlog **look and behave exactly like Jira's grouped
list view** — group headers, dividers, sticky behavior, hover affordances,
row drag-reorder, and the inline-create row (type / date / assignee / Create).

## Key files

| File | Role |
|---|---|
| `src/components/shared/BacklogTable/BacklogTable.tsx` | **Forked copy of `JiraTable`** (~3900 lines). ALL table-level backlog work lives here so the 29 other `JiraTable` consumers are untouched. |
| `src/components/shared/BacklogTable/index.ts` | Barrel — exports `BacklogTable`, re-exports types from `../JiraTable/types`. |
| `src/modules/project-work-hub/pages/BacklogPage.atlaskit.tsx` | Consumer. Renders `<BacklogTable>`; owns grouping, inline-create submit, drag components. |

Routes: `/product-hub/<KEY>/backlog` (dataSource adapter) and
`/project-hub/BAU/backlog` (supabase `ph_issues`, full Jira types).

## Why a separate BacklogTable (not JiraTable)

User: "zameen asmaan ka farq" between Jira and ours. Forked so backlog can be
tuned to exact Jira parity without regressing the other 29 `JiraTable` screens.
`JiraTable.tsx` still has some early cosmetic group edits from before the fork —
**deferred decision** whether to revert those (see Open items).

## What was done

### 1. White-screen crash fixes
- **Grouping crashed** (`Rendered fewer hooks than expected`): `useVirtualizer`
  was called conditionally. Fixed → called UNCONDITIONALLY (`count: useVirtual ? rows.length : 0`), then `const virtualizer = useVirtual ? _virtualizer : null`.
- **Duplicate `const` crash**: a `replace_all` added `renderInsertAboveRow` to
  BOTH the props destructure AND a deps array → duplicate declaration → white
  screen. Rule learned: cast-read props (`(props as any).x`) must NOT also be
  destructured.
- SWC parse errors twice: backticks inside injected CSS template literals break
  the SWC plugin. **Never put backticks in `style.textContent` template strings.**

### 2. Grouped view Jira parity
- Semantic group ordering (status workflow order, not A–Z), count = plain number.
- Group header left-aligned (`text-align:left`, `justify-content:flex-start`),
  removed the group select-all checkbox.
- Horizontal row dividers + **vertical** column dividers (incl. after checkbox col).
- Sticky per-group `<tbody>` so headers replace each other on scroll (not stack).
- Injected `<style id="backlog-table-focus-css">` — must ALWAYS update
  `textContent` (the inject-once/return-early pattern left stale CSS on HMR).

### 3. Performance
- Virtualization (`@tanstack/react-virtual`) always on (was `={!groupedRows}`).

### 4. Row hover bg
- Row = subtle hover; only the Work cell (`td[data-col-id="key"]`) gets the
  darker `--ds-background-neutral-hovered`.

### 5. Hover affordances (drag grip + insert "+") — PORTAL pattern
The row scroll viewport (`.jira-table-viewport`, `overflow:auto`) clips anything
on/outside the table's left border, and the card has a rounded/overflow clip.
So both affordances are **portaled to `document.body`** (`position:fixed`),
driven by `floatAfford` state + `data-hz` zone (`onRowZoneMove`: top ≤8px → `top`,
else `center`).

- **Insert "+"** (top-hover): portaled box centred on the row's TOP-LEFT corner
  (where top divider meets left border) + full-width blue insert line
  (`--ds-border-brand`) + "Create" tooltip.
- **Drag grip** (center-hover): portaled box centred on the LEFT border,
  vertically centred on the row. Icon color `--ds-icon-subtle`.

#### Drag-reorder architecture (IMPORTANT — do not "simplify" back)
Portaling the grip broke dragging because pdnd's `draggable({element: tr, dragHandle})`
needs the drag origin INSIDE the `<tr>`; a body-portal grip is outside it, so
`handle.closest('tr')` returned null and nothing registered. Iteration history:
in-cell (works but wrong position/shifts checkbox) → `right:100%` (off-edge,
scroll-clipped, invisible) → gutter+negative-left (clipped by card edge / added
empty band). **Final working design:**

- `DragHandleGrip` (BacklogPage): the portaled grip is its **OWN pdnd draggable**
  (`draggable({ element: gripEl })`), carrying only `{ rowId }`. Drag starts
  straight from the visible box — like clicking the "+". Has the compact drag
  preview (`setCustomNativeDragPreview` → type icon + title) and tints/dims the
  source row (found via `[data-drag-row-id="…"]`).
- `RowDropAnchor` (BacklogPage): invisible in-cell span per row; registers the
  `<tr>` as a pdnd **drop target** via `closest('tr')` (works in-cell) + draws
  the blue top/bottom insert line.
- Global `monitorForElements` (existing, ~line 2735) matches `source.rowId` →
  `target.rowId` + `closestEdge` → reorder.
- BacklogTable wiring: `renderRowDragHandle` → portal (center zone);
  `renderRowDropAnchor` (cast prop) → in-cell; each data-row `<tr>` carries
  `data-drag-row-id={rowId}` (both renderBodyRow + virtual paths).

### 6. Inline-create row (Jira parity — img39–43)
`InlineGroupCreateRow` (BacklogPage) already had type dropdown, due-date picker,
assignee picker, and Create button (used by the sticky footer). It was **never
rendered** — `renderGroupInlineRow` wasn't passed. Wired:
- Group-header "+" (`onAddToGroup`) → `renderGroupInlineRow(gid)` opens the form
  at group top.
- Row "+" (`onInsertAbove`) → `renderInsertAboveRow(row)` (new cast prop) opens
  the form **directly above the clicked row** (`insertAboveRowId` state; the
  table pushes it as a full-width row right before that data row in BOTH grouped
  and non-grouped loops via `pushInsertAboveRow`).
- Default issue type = clicked row's type via `rowTypeToCreatable(row.type)`
  (above Epic → Epic, between Stories → Story).
- Submit → `dataSource.onCreate` OR `ph_issues` insert; status inherits the
  group/row (groupBy=status → row.status).
- Styling: active form has 2px `--ds-border-focused` blue border (img45); the
  type-picker trigger gets blue border + `--ds-background-selected` bg when open
  (img46); Create turns primary/blue when text entered (img43).

## Guardrails obeyed
- **ADS tokens only** — every color is `var(--ds-*)` / `token()`, no hex/rgba.
  My changes added 0 new violations. Pre-existing color count = 69 (67 baseline
  + a +2 copied ctxMenu shadow `rgba(9,30,66,0.25)` at BacklogTable ~L3208 that
  is NOT my code — resolve at commit: annotate `ads-scanner:ignore` or rebaseline).
- No hand-rolled tables — forked the canonical `JiraTable`.

## Open items / deferred
- Wire the OTHER backlogs (tasks / incidents / story surfaces) to `BacklogTable`
  (user approved "all backlogs"; only the main backlog is wired so far).
- Revert (or keep) the early cosmetic group edits in `JiraTable.tsx` — decide.
- Color gate +2 (copied shadow) — annotate or rebaseline before committing.
- Not committed yet — commit gate requires Feature Work ID + session log +
  explicit go (per CLAUDE.md).
- `.jira-row-drag-affordance` CSS in BacklogTable is now unused (grip moved to
  portal) — harmless, can be pruned.

## Verify after resuming
```
npx tsc --noEmit -p tsconfig.json        # clean
npm run lint:colors                       # no NEW hex from backlog files
```
Manual (Cmd+Shift+R): hover row center → grip on left border, drag → reorders
with blue line; hover row top → "+" at corner + blue line → opens create form
above that row; group "+" → create at group top; type/date/assignee pickers open.
