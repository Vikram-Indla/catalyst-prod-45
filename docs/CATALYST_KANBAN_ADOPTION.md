# CatalystKanban — Adoption Protocol

**Status:** Canonical as of April 2026  
**Reference implementation:** ProductHub (`/producthub/kanban`)  
**Pending migration:** ProjectHub BAU boards, IncidentHub, Team Boards, Program Board  
**Owner:** Delivery Manager (Vikram)  
**Design benchmark:** Jira Cloud software boards

---

## 1. Why one primitive

Before April 2026 every Hub shipped its own Kanban clone — its own DnD
engine, its own card markup, its own filter bar, its own dark-mode
overrides. Adding a status column meant editing up to eight files in
parallel and keeping four CSS trees in sync. `CatalystKanban` collapses
that into a **single hub-agnostic primitive** plus a **small adapter per
Hub**.

**Outcomes:**

- One DnD engine (Atlaskit Pragmatic) — no more dnd-kit / react-beautiful-dnd sprawl
- One card spec (`KanbanCardData`) — Product, Project, Incident render the same visual card
- One filter bar (Atlaskit-native) — Search · Multi-select · Group · Sort · Density · Active chips
- One theme source (`@atlaskit/tokens` for chrome, `KANBAN_TOKENS` for board surfaces)
- One migration path — each new Hub is ~150 LOC of adapter glue, zero CSS

---

## 2. Architecture at a glance

```
┌────────────────── Hub page (thin adapter) ──────────────────┐
│   const cards = hubRows.map(hubToKanbanCard)                │
│   const mutation = useMutation({ mutationFn: updateStatus })│
│                                                             │
│   <CatalystKanban                                           │
│     cards={cards}                                           │
│     columns={HUB_COLUMNS}                                   │
│     statusToColumnId={hubStatusToColumnId}                  │
│     columnIdToStatus={hubColumnIdToStatus}                  │
│     filterFields={HUB_FILTER_FIELDS}                        │
│     groupByOptions={HUB_GROUP_BY}                           │
│     sortOptions={HUB_SORT}                                  │
│     onCardClick={openDetail}                                │
│     onStatusChange={(card, status) => mutation.mutate(…)}   │
│     storageKey="producthub" />                              │
└─────────────────────────────────────────────────────────────┘
           │                                    │
           ▼                                    ▼
   ┌──────────────┐                   ┌──────────────────────┐
   │  FilterBar   │ ← Atlaskit:       │ CatalystKanbanBoard  │
   │   Search     │    Popup, Select, │   DnD: Pragmatic     │
   │   Filters    │    Dropdown-menu, │   Columns · Cards    │
   │   Group/Sort │    Lozenge,       │   (KanbanCardData)   │
   │   Density    │    Textfield      │                      │
   │   Chips      │                   └──────────────────────┘
   └──────────────┘
```

**File map** (`src/components/kanban/`):

| File | Responsibility |
|---|---|
| `catalyst-types.ts` | `KanbanCardData`, filter/group/sort schema types, `CatalystKanbanProps` |
| `CatalystKanban.tsx` | Orchestrator — state, filtering, sorting, grouping, drop monitor |
| `CatalystKanbanBoard.tsx` | Pure renderer — columns + drop targets (one per swimlane) |
| `CatalystKanbanCard.tsx` | Draggable card bound to `KanbanCardData` |
| `kanban-tokens.ts` | Theme tokens (Nocturne Geist light/dark) + density presets |
| `densityPrefs.ts` | localStorage density read/write (supports scoped keys) |
| `filters/FilterBar.tsx` | Primary row + meta row + active-chip row |
| `filters/SearchField.tsx` | `@atlaskit/textfield` + ⌘K affordance |
| `filters/MultiSelectFilter.tsx` | `@atlaskit/popup` + `@atlaskit/select` (multi) |
| `filters/MenuButton.tsx` | `@atlaskit/dropdown-menu` for group / sort / density |
| `filters/ActiveFilterChips.tsx` | `@atlaskit/lozenge` with removable × |
| `adapters/*.ts` | One file per Hub — `hubToKanbanCard` + column/filter/sort defs |

---

## 3. Design principles

### 3.1 Filter anatomy (two-tier + chips)

```
┌─ Primary row ─────────────────────────────────────────────────┐
│ 🔍 Search   [Dept ▼] [Quarter ▼] [Priority ▼] [Health ▼] … +New │
├─ Meta row ────────────────────────────────────────────────────┤
│ Group: Dept ▼   Sort: Score ▼   Density: Comfortable ▼        │
├─ Active chips (conditional) ──────────────────────────────────┤
│ FILTERS  [Dept: Finance ×] [Quarter: Q2 2026 ×]   Clear all   │
└───────────────────────────────────────────────────────────────┘
```

**Rules:**

1. **Primary row is always visible** — search and the Hub's business
   filters. Users must never dig through a menu to find search.
2. **Meta row is always visible** — group/sort/density are view
   mutators, not filters; they live on a dedicated row so they don't
   "disappear" when a filter becomes active.
3. **Active chips appear below the meta row**, not above. The meta row
   stays in a stable position as filters toggle; chips wrap below.
4. **One click, one action** — clicking × on a chip removes that single
   (field, value) pair. "Clear all" is the bulk escape hatch.
5. **URL persistence is optional.** If the page wraps CatalystKanban
   with `useBoardUrlState`, state round-trips through the URL. If not,
   filters are component-local.

### 3.2 Card anatomy (Jira parity)

```
┌────────────────────────────────────────────────┐
│ Title (2-line clamp)                   🚩      │ ← weight 400
│ [PRIMARY LOZENGE]  [Secondary lozenge]         │ ← epic · fix-version
│ ⭐ KEY-42 · 3d                    ▓▓▓  [AV]   │ ← type · key · meta · priority · avatar
└────────────────────────────────────────────────┘
```

**Non-negotiables:**

- Type icon comes from `JiraIssueTypeIcon` (canonical SVGs per CLAUDE.md §11).
- Priority bars come from `shared/PriorityIndicator.PriorityBars`.
- Lozenges use `@atlaskit/lozenge` appearances — never custom colors.
- Status colors stay on the board columns (dot indicator), NOT on the card.

### 3.3 Swimlane vs flat mode

- **Flat** (`groupBy === 'none'`): single horizontal strip of columns.
- **Swimlane**: N horizontal strips, one per bucket, with collapsible headers.
- A single top-level `monitorForElements` reconciles every drop
  regardless of swimlane count — no double-fire, no cross-lane
  corruption. Dropping across swimlanes only changes status; the
  grouping attribute of the card stays untouched.

### 3.4 Density

Three presets (`compact | dense | comfortable`) powered by
`DENSITY_CONFIG`. Scoped per Hub via the `storageKey` prop:
`localStorage.catalyst-kanban:${storageKey}:density`.

### 3.5 Tokens

- **Chrome** (filter bar triggers, chips, popovers) — `@atlaskit/tokens`
- **Board surfaces** (column bg, card bg, drag shadow, drop highlight) —
  `KANBAN_TOKENS` (Nocturne Geist hex). Migrate to Atlaskit tokens as
  they grow equivalent coverage.

---

## 4. Adoption protocol — migrating a Hub

### Step 1 — Write the adapter

Create `src/components/kanban/adapters/<hub>Adapter.ts`. Required exports:

```ts
export const HUB_COLUMNS: KanbanColumnDef[] = [ … ];           // lifecycle
export function hubStatusToColumnId(status: string): string | null;
export function hubColumnIdToStatus(columnId: string): string | null;
export function hubRowToKanbanCard(row: HubRow): KanbanCardData;

export const HUB_FILTER_FIELDS: KanbanFilterFieldDef[] = [ … ];
export const HUB_GROUP_BY: KanbanGroupByOption[] = [ { id: 'none', … }, … ];
export const HUB_SORT: KanbanSortOption[] = [ … ];
```

**Checklist** (per CLAUDE.md §5 + §7):

- [ ] Column headers are UPPERCASE (column `name`).
- [ ] No HSL anywhere — hex only in color derivations.
- [ ] Status colors follow the 3-lozenge guardrail.
- [ ] Priority is null when the Hub has no concept of priority.
- [ ] `primaryLozenge` / `secondaryLozenge` use Atlaskit appearances (`default | inprogress | success | moved | new | removed`).

### Step 2 — Write the Hub page

```tsx
export default function HubKanbanPage() {
  const { data } = useHubBacklog();
  const rows = data ?? [];
  const cards = useMemo(() => rows.map(hubRowToKanbanCard), [rows]);

  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: ({ id, status }) => updateHubStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...] }),
    onError: () => toast.error('Failed to update status'),
  });

  return (
    <>
      <CatalystPageHeader title="… Kanban" subtitle="…" />
      <CatalystKanban
        cards={cards}
        columns={HUB_COLUMNS}
        statusToColumnId={hubStatusToColumnId}
        columnIdToStatus={hubColumnIdToStatus}
        filterFields={HUB_FILTER_FIELDS}
        groupByOptions={HUB_GROUP_BY}
        sortOptions={HUB_SORT}
        onCardClick={openDetail}
        onStatusChange={(c, s) => mutation.mutate({ id: c.id, status: s })}
        storageKey="<hubKey>"
      />
    </>
  );
}
```

### Step 3 — Delete the old implementation

- [ ] Delete the Hub's own `kanban/` component folder (board, column,
      card, toolbar, filter-bar, context-menu, quick-add, swimlane).
- [ ] Delete any Hub-specific DnD hook (`useKanbanDragDrop` etc).
- [ ] Delete the Hub's bespoke kanban CSS if it isn't referenced by
      other pages.
- [ ] Remove imports from route registry / sidebar if the old page
      file was deleted.

### Step 4 — Verify (CLAUDE.md §3 L37)

- [ ] `npx tsc --noEmit` passes.
- [ ] Page loads at `/…hub/kanban`.
- [ ] Light mode: computed column bg = `rgb(248, 248, 248)`.
- [ ] Dark mode: computed column bg = `rgb(17, 17, 17)`.
- [ ] Drag a card between columns → status persists after refresh.
- [ ] Filter row renders all hub filter fields; chips appear; clear
      all empties them.
- [ ] Group by a field → swimlanes render; drops still persist.
- [ ] Density toggle → cards resize.

### Step 5 — Atlaskit dependency sanity (CLAUDE.md §1)

If the adapter introduces a new `@atlaskit/*` dependency:

1. Add to `package.json` dependencies at the same version range as
   sibling Atlaskit packages.
2. Add to `vite.config.ts` `optimizeDeps.include`.
3. Import canonically; no need to run `bun install` (auto-sync handles it).

---

## 5. Current hub status

| Hub | Route | Status | Adapter |
|---|---|---|---|
| ProductHub | `/producthub/kanban` | ✅ migrated | `initiativeAdapter.ts` |
| IncidentHub (Hub) | `/incident-hub/kanban` | ✅ migrated (read-only — see adapter header) | `incidentAdapter.ts` |
| ProjectHub BAU | `/project-hub/:key/boards` | 🟡 runs on legacy `PragmaticBoard` — migration tracked | TBD `phIssueAdapter.ts` |
| IncidentHub (Release) | `/release/incidents/kanban` | 🔴 richer legacy impl (`modules/incidents/kanban`) | TBD |
| Team Boards | `/team/kanban-boards/:boardId` | 🔴 legacy | TBD `teamBoardAdapter.ts` |
| Program Board | `/program/…` | 🔴 legacy | TBD `programAdapter.ts` |
| StrategyHub / ReleaseHub / TestHub / TaskHub / PlanHub / WikiHub | — | no kanban today | opt-in via adapter |

---

## 6. What NOT to do

- ❌ Don't add `style={{ background: '#...' }}` inside card renderers
  (CLAUDE.md §3 L38).
- ❌ Don't create parallel Kanban components per Hub. Write an adapter
  instead.
- ❌ Don't duplicate `.dark` blocks in `index.css` for Kanban chrome
  (CLAUDE.md §3 L35). Use Atlaskit tokens.
- ❌ Don't introduce new DnD libraries. Atlaskit Pragmatic is the
  single engine.
- ❌ Don't couple CatalystKanban to any specific data store. All
  Supabase calls live in the Hub page's mutation hook.
