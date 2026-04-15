

# View Settings Panel — Kanban Board

## Summary
Build a "View Settings" popover panel triggered from a new three-dots (•••) button in the KanbanBoardPage toolbar. The panel controls card field visibility, detail-open mode, quick filter bar visibility, and swimlane expand/collapse — all persisted per-user per-project via a new DB table.

---

## Database

**New table: `kanban_view_settings`**

| Column | Type | Default |
|--------|------|---------|
| id | uuid | gen_random_uuid() |
| user_id | uuid FK auth.users | NOT NULL |
| project_key | text | NOT NULL |
| open_in_sidebar | boolean | false |
| show_quick_filters | boolean | false |
| show_work_suggestions | boolean | true |
| visible_fields | jsonb | `{"cardCover":true,"workType":true,"workItemKey":true,"epic":true,"linkedWorkItems":false,"priority":true,"assignee":true,"fixVersions":true}` |
| created_at | timestamptz | now() |
| updated_at | timestamptz | now() |

- UNIQUE constraint on `(user_id, project_key)`
- RLS: authenticated users can SELECT/INSERT/UPDATE their own rows (`user_id = auth.uid()`)
- Upsert via `ON CONFLICT (user_id, project_key) DO UPDATE`

---

## New Files

### 1. `src/components/kanban/ViewSettingsPanel.tsx`
- Popover panel (absolute positioned, 320px width, right-aligned to trigger)
- NOCTURNE dark / light tokens from `kanban-tokens.ts`
- Three sections with dividers:
  - **Top toggles**: Open in sidebar, Quick filters, Work suggestions — each a toggle switch
  - **Fields**: 8 toggles (Card cover, Work type, Work item key, Epic, Linked work items, Priority, Assignee, Fix versions)
  - **Swimlanes**: "Expand all" and "Collapse all" as clickable text actions
- Close on outside click (useEffect listener) and Escape key
- Focus trap within panel
- All toggles fire `onChange` immediately (no Save button)

### 2. `src/hooks/useKanbanViewSettings.ts`
- React Query hook fetching from `kanban_view_settings` by `user_id` + `project_key`
- `useMutation` for upsert with optimistic updates via `queryClient.setQueryData`
- Returns `{ settings, updateSettings }` with debounced save (300ms)
- Default settings object if no row exists yet

---

## Modified Files

### 3. `src/pages/project-hub/KanbanBoardPage.tsx`
**Toolbar changes (line ~611-618):**
- After `GroupByBtn`, add a `MoreHorizontal` (•••) icon button
- On click, toggle `showViewSettings` state
- Render `<ViewSettingsPanel>` anchored to the button

**State additions:**
- `const { settings, updateSettings } = useKanbanViewSettings(key, currentUserData);`
- `const [showViewSettings, setShowViewSettings] = useState(false);`

**Detail panel mode (line ~726-735):**
- When `settings.openInSidebar` is true, render `CatalystDetailRouter` in a side-panel layout (right drawer, ~480px) instead of full modal
- When false, keep current full modal behavior

**Swimlane expand/collapse:**
- Add `collapsedSwimlanes` state managed as a `Set<string>`
- "Expand all" → clear the set; "Collapse all" → add all group keys
- Pass `defaultOpen` to `SwimlaneRow` as `!collapsedSwimlanes.has(g.groupKey)`

### 4. `src/components/kanban/WorkItemCard.tsx`
**Field visibility:**
- Accept new prop: `visibleFields: Record<string, boolean>`
- Conditionally render each field section:
  - `workType` → `JiraIssueTypeIcon` in footer
  - `workItemKey` → issue key text in footer
  - `priority` → `PriorityBars` in footer
  - `assignee` → avatar in footer
  - `epic` → epic label badge
  - `fixVersions` → fix version badge
  - `linkedWorkItems` → (no current linked items indicator; hidden safely when off)
  - `cardCover` → (no cover image currently; toggle is safe no-op for now)
- When a field is off, the element is not rendered (no empty gap — flex layout adjusts automatically)

### 5. `src/components/kanban/SortableCard.tsx`
- Pass `visibleFields` through to `WorkItemCard`

### 6. `src/components/kanban/KanbanSwimlane.tsx`
- Accept and pass `visibleFields` to `SortableCard`

### 7. `src/components/kanban/KanbanColumn.tsx`
- Accept and pass `visibleFields` to `SortableCard`

---

## Propagation Path

```text
KanbanBoardPage
  ├─ useKanbanViewSettings(projectKey, userId) → settings
  ├─ ViewSettingsPanel (popover from ••• button)
  ├─ DroppableColumn → SortableCard → WorkItemCard (visibleFields)
  └─ SwimlaneRow → SortableCard → WorkItemCard (visibleFields)
```

---

## Design Tokens

Panel uses existing `KanbanThemeTokens`:
- Background: `tk.surfaceBg`
- Border: `1px solid tk.border`
- Section headers: `fontSize: 13, fontWeight: 600, color: tk.textPrimary, fontFamily: Sora`
- Toggle labels: `fontSize: 13, color: tk.textSecondary, fontFamily: Inter`
- Toggle switches: Custom CSS toggle (green `#36B37E` when on, grey `tk.chipBg` when off, × icon when off matching screenshot)
- Dividers: `1px solid tk.borderSubtle`
- Border radius: 8px on panel
- Shadow: `0 4px 16px rgba(0,0,0,0.12)` light / `0 4px 16px rgba(0,0,0,0.5)` dark
- Panel width: 320px

---

## Execution Order

1. DB migration: create `kanban_view_settings` + RLS + seed defaults
2. `useKanbanViewSettings` hook
3. `ViewSettingsPanel` component
4. Wire into `KanbanBoardPage` toolbar (••• button + panel render)
5. Pass `visibleFields` through column/swimlane/card chain
6. Wire `WorkItemCard` conditional field rendering
7. Wire sidebar vs modal detail open mode
8. Wire swimlane expand/collapse all

