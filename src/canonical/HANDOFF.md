# Canonical Field System — Developer Handoff

> **Scope:** ProjectHub Backlog, Kanban, AllWork — and how to replicate these to ReleaseHub, TestHub, IncidentHub, and any future hub.

---

## 1. What Is the Canonical Field System?

A **canonical field** is a work-item data field (Status, Assignee, Priority, etc.) that has a single source-of-truth implementation used across every hub surface. When you wire up a new hub table, you pull from this set of field factories instead of writing your own cell renderers.

**Three files own the entire system:**

| File | Role |
|------|------|
| `src/canonical/field-registry.ts` | Field IDs, render modes, compliance tiers, manifest registry |
| `src/components/shared/JiraTable/cells.tsx` | Read-mode cell factory functions |
| `src/components/shared/JiraTable/editors.tsx` | Write-mode (inline edit) factory functions |

Everything else (Backlog columns, Kanban card fields, AllWork list) is a **consumer** — it imports from these three files and wires data in.

---

## 2. Field IDs

Every field has a stable string ID from `FIELD_ID` in `field-registry.ts`. Use these — never bare strings — when defining column schemas:

```ts
import { FIELD_ID } from '@/canonical/field-registry';
import { JiraTable, makeKeyCell, makeAssigneeCell } from '@/components/shared/JiraTable';

const columns = [
  { id: FIELD_ID.KEY,      label: 'Key',      cell: makeKeyCell(...) },
  { id: FIELD_ID.ASSIGNEE, label: 'Assignee', cell: makeAssigneeCell(...) },
];
```

**Why:** Column visibility state, URL persistence (`?cols=f:key,f:assignee`), analytics events, and jira-compare audits all key off these IDs. Consistent IDs = consistent UX across hubs without extra plumbing.

---

## 3. Field Catalogue

### 3.1 Read-Mode Cells (`cells.tsx`)

| FIELD_ID | Factory | ADS | Description |
|----------|---------|-----|-------------|
| `f:key` | `makeKeyCell(getKey, onOpen?, getHref?)` | ✅ | Issue key link. Left-click → panel; Ctrl+click → new tab. Focused state = full-width blue border. |
| `f:summary` | `makeSummaryCell(getSummary)` | ✅ | Truncated text, `title` tooltip on overflow. Color: `--ds-text-subtle`. |
| `f:type` | `makeTypeIconCell(getIcon)` | ✅ | 20×20 icon wrapper. Caller passes any ReactNode icon. |
| `f:status` | `makeStatusCell(getStatus, appearanceFor, labelFor?)` | ⚠️ bypass | `StatusPill` with DOM-probed Jira hex. See §6 for color map. |
| `f:assignee` | `makeAssigneeCell(getAssignee)` | ⚠️ fix needed | AK Avatar + name. `getAssignee` returns `{name, avatarUrl}` or `null`. |
| `f:parent` | `makeParentCell(getParent)` | ⚠️ bypass | Green chip (`#B3DF72`) with type icon + key + label. |
| `f:priority` | `makePriorityCell(getPriority)` | ✅ | 4 vertical bar segments. Levels: critical/highest=danger, high/medium=warning, low/lowest=success. |
| `f:labels` | `makeLabelsCell(getLabels)` | ✅ | Outlined chips. `getLabels` returns `string[]` or `null`. |
| `f:created` | `makeDateCell(getISO)` | ✅ | Calendar icon + formatted date. |
| `f:updated` | `makeDateCell(getISO)` | ✅ | Same factory, different accessor. |
| `f:due_date` | `makeDateCell(getISO)` | ✅ | Same factory, editable via `makeDateEditCell`. |
| `f:comments` | `makeCommentsCell(getCount, onOpen?)` | ✅ | Chat icon + blue dot badge when count > 0. Clicking opens detail panel. |

**ADS legend:** ✅ = fully token-compliant · ⚠️ bypass = DOM-probed Jira hex override (intentional) · ⚠️ fix needed = has hardcoded value to migrate

### 3.2 Write-Mode Editors (`editors.tsx`)

| FIELD_ID | Edit Factory | Notes |
|----------|-------------|-------|
| `f:status` | `makeStatusEditCell(opts)` / `makeStatusEditCellAkPopup(opts)` | Self-rolled portal popup (ADS-ISSUE: @atlaskit/popup portal bug) |
| `f:summary` | `makeSummaryInlineEditCell(opts)` | `@atlaskit/inline-edit` |
| `f:assignee` | `makeAssigneeEditCell(opts)` | Avatar picker in portal popup |
| `f:priority` | `makePriorityEditCell(opts)` | Portal dropdown with AK icons |
| `f:parent` | `makeParentEditCell(opts)` | Async search picker |
| `f:due_date` | `makeDateEditCell(opts)` | `@atlaskit/datetime-picker` |
| `f:labels` | `makeLabelsEditCell(opts)` | Multi-select tag input |

### 3.3 Structural Columns (not fields)

These are layout primitives built into `JiraTable` — you don't wire them via factories:

| ID | Purpose |
|----|---------|
| `__checkbox` | Row selection checkbox (auto-added when `selectable={true}`) |
| `__caret` | Expand/collapse for hierarchy rows |
| `__drag` | Drag handle column (shifts `nth-child` selectors by 1) |
| `__actions` | `makeRowActionsCell` — ⋯ hover menu |

---

## 4. How to Wire a New Hub Table

Follow these steps to add canonical fields to a new hub (e.g., ReleaseHub):

### Step 1 — Define your row type

```ts
// release-hub/types.ts
export interface ReleaseRow {
  id: string;
  key: string | null;
  summary: string;
  status: string | null;
  assignee: { name: string; avatarUrl?: string } | null;
  createdAt: string | null;
}
```

### Step 2 — Build your column schema using FIELD_ID + factory functions

```ts
// release-hub/columns.ts
import { FIELD_ID } from '@/canonical/field-registry';
import {
  makeKeyCell,
  makeSummaryCell,
  makeStatusCell,
  makeAssigneeCell,
  makeDateCell,
} from '@/components/shared/JiraTable';
import type { Column } from '@/components/shared/JiraTable';
import type { ReleaseRow } from './types';

export const RELEASE_STATUS_APPEARANCE = (s: string | null) => {
  if (!s) return 'default' as const;
  if (['released', 'shipped'].includes(s.toLowerCase())) return 'success' as const;
  if (['in progress'].includes(s.toLowerCase())) return 'inprogress' as const;
  return 'default' as const;
};

export function buildReleaseColumns(
  onOpen: (row: ReleaseRow) => void,
  getHref: (row: ReleaseRow) => string,
): Column<ReleaseRow>[] {
  return [
    {
      id: FIELD_ID.KEY,
      label: 'Key',
      width: 8,
      alwaysVisible: true,
      cell: makeKeyCell(r => r.key, onOpen, getHref),
    },
    {
      id: FIELD_ID.SUMMARY,
      label: 'Summary',
      flex: true,
      alwaysVisible: true,
      cell: makeSummaryCell(r => r.summary),
    },
    {
      id: FIELD_ID.STATUS,
      label: 'Status',
      width: 12,
      defaultVisible: true,
      cell: makeStatusCell(r => r.status, RELEASE_STATUS_APPEARANCE),
    },
    {
      id: FIELD_ID.ASSIGNEE,
      label: 'Assignee',
      width: 14,
      defaultVisible: true,
      cell: makeAssigneeCell(r => r.assignee),
    },
    {
      id: FIELD_ID.CREATED,
      label: 'Created',
      width: 10,
      defaultVisible: false,
      cell: makeDateCell(r => r.createdAt),
    },
  ];
}
```

### Step 3 — Mount JiraTable

```tsx
// release-hub/ReleaseHubPage.tsx
import { JiraTable, FlagsHost } from '@/components/shared/JiraTable';
import { buildReleaseColumns } from './columns';

export function ReleaseHubPage() {
  const { data, isLoading } = useReleaseItems();
  const columns = buildReleaseColumns(
    row => setFocused(row.id),
    row => `/release-hub?issue=${row.key}`,
  );

  return (
    <>
      <FlagsHost />
      <JiraTable
        columns={columns}
        data={data}
        getRowId={r => r.id}
        onRowClick={row => setFocused(row.id)}
        isLoading={isLoading}
        ariaLabel="Release items"
      />
    </>
  );
}
```

That's it. No bespoke cell code. The canonical factories handle all visual states, Atlaskit compliance, and Jira parity.

---

## 5. Render Modes (Table vs Card vs Inline)

The same canonical field appears in three contexts. Current architecture uses **separate implementations** per surface. Target architecture uses a single component with a `mode` prop — this migration is in progress for Assignee first.

| Mode | Surface | Current status |
|------|---------|----------------|
| `table-cell` | BacklogPage, AllWorkTable | ✅ Uses canonical factories |
| `card-badge` | KanbanBoardPage cards | ✅ Registered in FIELD_MANIFESTS via KANBAN_FIELD_MAP |
| `card-inline` | WorkListPanel (AllWork list cards) | ✅ ADS-compliant (@atlaskit/icon, no Lucide) |

### card-badge (Kanban) surface-overrides

Two fields use deliberate surface-specific renderers on Kanban cards — these are documented overrides, not compliance gaps:

| Field | Override | Reason |
|-------|---------|--------|
| `f:priority` | `PriorityIcon` (SVG chevrons) | Jira Kanban shows directional chevrons, not the 4-bar table style |
| `f:assignee` | `KanbanAvatar` + `AssigneePickerPopover` | Density-aware avatar-only display; no name text on cards per Jira parity |
| `f:epic_link` | Epic chip (`tk.epicLozengeBg/Text`) | Reads from KANBAN_TOKENS, not StatusPill — card chip vs table parent chip |

**When implementing a new hub card view:** check `KANBAN_FIELD_MAP` in `useKanbanViewSettings.ts` for the pattern — surface-specific visibility keys map to canonical `FIELD_ID` constants. Follow the same pattern for any new card visibility system.

---

## 6. StatusPill Color Map

`StatusPill` uses DOM-probed Jira colors — not ADS tokens, because ADS token resolution differs from Jira's theme. These values are intentional Jira-parity bypasses (measured 2026-05-07).

| Appearance | Background | Text | Use for |
|------------|-----------|------|---------|
| `success` | `rgb(179, 223, 114)` | `rgb(41, 42, 46)` | Done, Closed, Released |
| `inprogress` | `rgb(143, 184, 246)` | `rgb(41, 42, 46)` | In Progress, In Dev |
| `default` | `rgb(221, 222, 225)` | `rgb(41, 42, 46)` | To Do, Backlog, Blocked, On Hold |
| `moved` | `rgb(243, 214, 100)` | `rgb(41, 42, 46)` | On Hold (when yellow-categorized) |
| `removed` | `rgb(255, 143, 115)` | `rgb(41, 42, 46)` | Rejected, Cancelled |
| `new` | `rgb(184, 172, 246)` | `rgb(41, 42, 46)` | New, Proposed |

**Rule:** Always DOM-probe `getComputedStyle` for any new status category before assigning an appearance. Never assume "Blocked = red" — category-to-color is project-specific config in Jira.

---

## 7. Atlaskit Compliance Rules

All canonical fields MUST follow this token precedence:

```
1. @atlaskit/tokens  token()        — all semantic color/space/typography
2. var(--ds-*)       CSS variables  — fallback when JS token() can't be used
3. var(--cp-*)       CSS variables  — Catalyst-specific only (no ADS equivalent)
4. Hardcoded hex     BANNED         — unless: dated DOM-probe Jira-parity override
```

**Banned primitives in canonical fields:**
- Lucide icons — use `@atlaskit/icon/glyph/*`
- `react-select` directly — use `@atlaskit/select`
- `@atlaskit/popup` (until portal bug fixed) — use self-rolled portal pattern from `makeStatusEditCell`

**Required annotation for bypasses:**

```ts
// ADS-ISSUE: @atlaskit/popup portal empties on re-render — 2026-05-08
// Self-rolled portal pattern used until upstream fix. See AllProjectsTable.tsx:19-22.
```

---

## 8. Change Propagation Gate

### When a field changes layout or token only

Make the change directly in `cells.tsx` or `editors.tsx`. No gate required. Run jira-compare on the affected surface before merging.

### When a field changes structurally (new prop, new sub-element, new behavior)

1. **Grep all render sites:**
   ```bash
   grep -r "FIELD_ID\.ASSIGNEE\|makeAssigneeCell\|AssigneeCell" src/ --include="*.tsx" --include="*.ts"
   ```

2. **Classify each site:**
   - ✅ Accept: site should get the new behavior → update the shared factory
   - ✋ Override: site has a documented surface-specific reason → add `// surface-override: <reason>` comment and keep the site's local behavior

3. **Update `FIELD_MANIFESTS` in `field-registry.ts`** if the change affects `modes`, `editable`, or `adsCompliance`.

4. **Run jira-compare** on each hub surface listed in `FIELD_MANIFESTS[FIELD_ID.X].usedBy`.

### Accepting a structural change from a "mirror" surface

If Kanban's card Assignee gets a structural improvement (e.g., tooltip on long names), evaluate:

| Question | If yes | If no |
|---------|--------|-------|
| Does it improve all modes? | Promote to canonical factory, remove from Kanban bespoke | Keep as surface override with comment |
| Does it depend on card-specific density? | Add as `card-badge` conditional inside canonical | Keep as surface override |
| Does it break Jira parity in table-cell mode? | Reject — run jira-compare first | Proceed |

---

## 9. Hub Replication Checklist

When replicating the work-item table to a new hub:

- [ ] Define `HubRow` type with fields matching `FIELD_ID` constants
- [ ] Import `buildXxxColumns()` structure from Step 2 pattern — never reinvent cell renderers
- [ ] Add the new hub to `HubSurface` union in `field-registry.ts`
- [ ] Add the hub to `usedBy` in each `FIELD_MANIFESTS` entry it consumes
- [ ] Run a jira-compare audit on a representative issue before marking complete
- [ ] Verify column picker works (set `columnVisibility` + `onColumnVisibilityChange`)
- [ ] Verify keyboard navigation: Arrow keys, Enter → open panel, Esc → close panel
- [ ] Verify dark mode: all cells use `token()` or `var(--ds-*)`, no hardcoded hex
- [ ] Verify density: `density="compact"` used in split-panel views (≥1120px), `"comfortable"` standalone

---

## 10. Kanban Token Reference

Kanban surfaces use `KANBAN_TOKENS` from `src/components/kanban/kanban-tokens.ts` for theming. Key values (light mode):

| Token key | Value | Usage |
|-----------|-------|-------|
| `cardBg` | `var(--ds-surface, #FFFFFF)` | Card background |
| `cardShadowRest` | `rgba(9,30,66,.25) 0 1px 2px` | Card elevation at rest |
| `cardHoverShadow` | `rgba(9,30,66,.31) 0 2px 4px` | Card elevation on hover |
| `surfaceAlt` | `#F8F8F8` | Column background |
| `textPrimary` | `#292A2E` | Card title, metadata |
| `textMuted` | `#505258` | Issue key, secondary info |

Density presets via `DENSITY_CONFIG`:

| Preset | cardPad | titleSize | avatarSize | Use |
|--------|---------|-----------|------------|-----|
| `comfortable` | `12px` | `14px` | `24px` | Default / Jira parity |
| `dense` | `8px 10px` | `13px` | `22px` | Compact boards |
| `compact` | `6px 8px` | `12px` | `20px` | Max density |

---

## 11. Files to Read Before Contributing

| File | Why |
|------|-----|
| `src/canonical/field-registry.ts` | Field IDs, manifests, compliance tiers |
| `src/components/shared/JiraTable/cells.tsx` | All read-mode cell factories + StatusPill |
| `src/components/shared/JiraTable/editors.tsx` | All write-mode editor factories |
| `src/components/shared/JiraTable/types.ts` | Column, CellProps, JiraTableProps interfaces |
| `src/components/kanban/kanban-tokens.ts` | Kanban theme tokens + density config |
| `CLAUDE.md` (project root) | jira-compare lessons — must read before touching any cell |

---

*Last updated: 2026-05-08. Append updates at top of the jira-compare lessons section in CLAUDE.md — not here.*
