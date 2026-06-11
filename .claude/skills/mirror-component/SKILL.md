---
name: mirror-component
version: 1.0.0
description: >-
  Extracts a canonical Catalyst table/component into a shared factory, then
  mounts an exact mirror at a destination route with only stated exceptions.
  Zero hand-rolling. Zero approximation. Read canonical source verbatim → extract
  → share → mount. Triggers on: /mirror-component, "mirror this table", "mirror
  this component", "same table as X", "exact copy of X at Y".
author: Vikram × Claude, 2026-06-11
metadata:
  category: component-sharing
  tags: [mirror, extract, share, jiratatable, canonical, no-drift]
  maturity: stable
---

# mirror-component v1.0 — Canonical Component Mirror

---

## ⚠️ HARD RULES — READ BEFORE ANY CODE

1. **NEVER hand-roll columns, props, CSS, or empty states.** Every value must be copied verbatim from the canonical source file. If you cannot locate the source line, READ MORE of the file — do not guess.
2. **Extract first, mount twice.** Before writing destination code, extract the shared factory. The source page must import from the shared module too — not have its own local copy.
3. **The exception list is exhaustive.** Anything not in the exception list is identical in the mirror. Do not add, remove, or change anything not explicitly listed.
4. **Read the full `<JiraTable ...>` (or equivalent) render block** before writing a single line. Count every prop. Extract every prop. Then delete only the excepted ones.
5. **Ask before assuming.** If data source for the destination is unclear, ask. Do not invent a data hook.
6. **canEdit:()=>false is NOT an exception unless stated.** If the user says read-only, apply it. If not stated, ask.
7. **Shared module lives in `src/modules/project-work-hub/shared/` (or nearest shared/ sibling to the source file).** Named `<ComponentName>Factory.ts`.

---

## Soft Announcement

When this skill fires, emit BEFORE anything else:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🪞 mirror-component v1.0 · Canonical Component Mirror
Source: {source route or file}
Destination: {destination route}
Exceptions: {list or "none stated — will ask"}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Self-Criticism (read before every run — do not skip)

These are known failure modes in previous mirror attempts. Guard against all of them:

| Failure | Guard |
|---|---|
| Building destination from memory/approximation | NEVER write a column or prop without citing the source line number |
| Using a different data type for destination | Confirm data type matches canonical or explicitly discuss the delta |
| Missing JiraTable props (virtualization, column reorder, density, etc.) | Read the FULL `<JiraTable ...>` block — count props before/after extraction |
| Hand-rolling empty state | Copy empty state JSX verbatim from canonical source |
| Different localStorage keys causing column width/order drift | Extract key constants into shared module |
| Forgetting to update the canonical source to import from shared factory | Both pages must import from shared — no local copies |
| Treating `canEdit:()=>false` as the only difference | Run the full drift checklist (Phase 3) even when exceptions seem obvious |
| Creating a new data type for destination ("JqlResultRow" trap) | If canonical uses `BacklogItem`, destination uses `BacklogItem` — same type, new fetch |

---

## Recommendations (apply to every mirror task)

### R1 — Shared-first convention (enforce going forward)
Column definitions MUST NOT live inside a page component at creation time. Every new table goes into `shared/<Name>Columns.ts` immediately. Pages import — never define locally. This makes mirroring a zero-cost operation.

### R2 — Column factory signature
```ts
export function buildXColumns<T>(adapter: {
  // one getter per field the columns access
  getKey: (r: T) => string
  getSummary: (r: T) => string
  // ...
  onOpen: (r: T) => void
  canEdit: (r: T) => boolean
}): Column<T>[]
```
Generic over row type `T` — works for `BacklogItem`, `JqlResultRow`, `BusinessRequest`, anything.

### R3 — JiraTable defaults constant
```ts
// shared/backlogTableDefaults.ts
export const BACKLOG_TABLE_DEFAULTS = {
  enableGroupCreateButton: false,
  enableStickyCreateFooter: true,
  rowsPerPage: 0,
  page: 1,
  enableVirtualization: true,
  enableColumnReorder: true,
  density: 'comfortable',
} as const;
```
Destination spreads this and overrides only exceptions.

### R4 — Type reuse, not type creation
If source uses `BacklogItem`, destination fetches rows and maps them to `BacklogItem`. Do NOT create a parallel type (`JqlResultRow`, `FilterRow`, etc.) for destination convenience — that is the root cause of all drift.

### R5 — localStorage key namespacing
Extract `COL_WIDTHS_KEY`, `COL_ORDER_KEY`, `COL_VISIBILITY_KEY` into shared constants so both pages persist independently but with predictable, non-colliding keys:
```ts
export const BACKLOG_COL_WIDTHS_KEY   = 'catalyst-backlog-col-widths';
export const BACKLOG_COL_ORDER_KEY    = 'catalyst-backlog-col-order';
// Mirror uses its own namespace:
export const FILTER_COL_WIDTHS_KEY   = 'catalyst-filter-col-widths';
```

---

## Phases

### Phase 0 — Intake

Emit announcement block. Then ask the following questions if not already provided in the invocation:

```
I need 4 things before starting:

1. SOURCE: Which file/route is the canonical component? (e.g. BacklogPage at /project-hub/:key/backlog)
   → If a screenshot was shared, I will locate the file from the route shown.

2. DESTINATION: Which file/route gets the mirror? (e.g. FilterPreviewPage at /project-hub/:key/filters)

3. DATA SOURCE: How does the destination fetch its rows?
   Options:
   a) Same hook as source (e.g. useBacklogItems) — different projectKey
   b) Different hook (name it)
   c) Different table in Supabase (name it + required columns)
   d) JQL/filter query — maps rows to canonical type
   → If (c) or (d): I will map rows to the canonical row type, not create a new type.

4. EXCEPTIONS: What is intentionally different?
   Common exceptions:
   - No sticky create footer (read-only)
   - canEdit: () => false
   - No drag-to-rank handles
   - Different page title / breadcrumb
   → State only the exceptions. Everything else will be identical.
```

Do not proceed to Phase 1 until all 4 are answered.

---

### Phase 1 — Locate canonical source

```bash
# From route → find file
grep -rn "path=.*{route}" src/routes/
# OR from screenshot: identify the route, then grep
find ~/catalyst/src -name "*.tsx" | xargs grep -l "{ComponentName}"
```

Read the file. Locate:
- The row type definition (`interface BacklogItem`, etc.) — note the file + line
- The `columns = useMemo(...)` block — note start line + end line
- The `<JiraTable ...>` render block — note start line + end line
- All localStorage keys referenced
- The data-fetch hook(s) used

Print a summary:
```
Canonical source located:
  File: src/modules/.../BacklogPage.atlaskit.tsx
  Row type: BacklogItem (line 291)
  Columns block: lines 2173–2800
  JiraTable render: lines 3615–3820
  localStorage keys: COL_WIDTHS_KEY (line 142), COL_ORDER_KEY (line 143)
  Data hooks: useBacklogStories (line 450), useBacklogEpics (line 460)
```

---

### Phase 2 — Drift audit (before any code)

Read the destination file if it already exists. Produce the full drift table:

| Drift item | Source (canonical) | Destination (current) | Action |
|---|---|---|---|
| Column `comments` | makeCommentsCell | absent | ADD |
| JiraTable `enableVirtualization` | true | absent | ADD |
| Row type | BacklogItem | JqlResultRow | REPLACE |
| ... | ... | ... | ... |

Get explicit confirmation before Phase 3.

---

### Phase 3 — Extract shared factory

Create `src/modules/project-work-hub/shared/<SourceName>Columns.ts`:

```ts
// AUTO-EXTRACTED from <SourceFile> on <date>
// DO NOT EDIT manually — edit the source and re-run /mirror-component

import { ... } from '@/components/shared/JiraTable';
import type { Column } from '@/components/shared/JiraTable';

export interface <RowType>Adapter<T> {
  getKey: (r: T) => string
  getSummary: (r: T) => string
  // ... one per field accessed by any column
  onOpen: (r: T) => void
  canEdit: (r: T) => boolean
}

export function build<SourceName>Columns<T>(adapter: <RowType>Adapter<T>): Column<T>[] {
  // VERBATIM copy of columns useMemo body from <SourceFile>:<startLine>
  // with row field accesses replaced by adapter.get*() calls
  return [
    // ... copied verbatim
  ];
}

export const <SOURCE_NAME>_TABLE_DEFAULTS = {
  // VERBATIM copy of all non-data JiraTable props from <SourceFile>:<JiraTableLine>
  enableGroupCreateButton: false,
  enableStickyCreateFooter: true,
  rowsPerPage: 0,
  page: 1,
  enableVirtualization: true,
  enableColumnReorder: true,
  // ... every prop that is not data-dependent
} as const;
```

Also create `src/modules/project-work-hub/shared/<SourceName>StorageKeys.ts`:
```ts
export const <SOURCE>_COL_WIDTHS_KEY  = 'catalyst-<source>-col-widths';
export const <SOURCE>_COL_ORDER_KEY   = 'catalyst-<source>-col-order';
export const <SOURCE>_COL_VIS_KEY     = 'catalyst-<source>-col-visibility';
export const <DEST>_COL_WIDTHS_KEY    = 'catalyst-<dest>-col-widths';
export const <DEST>_COL_ORDER_KEY     = 'catalyst-<dest>-col-order';
export const <DEST>_COL_VIS_KEY       = 'catalyst-<dest>-col-visibility';
```

---

### Phase 4 — Update canonical source to use shared factory

In `<SourceFile>`:
- Replace the `columns = useMemo(...)` body with `build<SourceName>Columns({ getKey: r => r.key, ... })`
- Replace localStorage key string literals with imported constants
- Import from shared module

Run TypeScript check:
```bash
cd ~/catalyst && npx tsc --noEmit 2>&1 | head -40
```

Source page must still work identically. Zero behavioral change.

---

### Phase 5 — Build destination

In destination file:
1. Import `build<SourceName>Columns`, `<SOURCE_NAME>_TABLE_DEFAULTS`, storage keys
2. Fetch rows and map to canonical row type (per Phase 0 Q3 answer)
3. Build columns: `const columns = useMemo(() => build<SourceName>Columns({ getKey: r => r.key, ..., canEdit: () => false }), [])`
4. Copy the `<JiraTable ...>` render block verbatim from source
5. Apply exceptions: delete/replace only the props that are in the exception list
6. Replace data props (`data=`, `groups=`) with destination data
7. Replace localStorage keys with destination-namespaced keys
8. Replace empty state JSX with source's empty state JSX verbatim (unless exception states otherwise)

---

### Phase 6 — Verify

```bash
cd ~/catalyst && npx tsc --noEmit 2>&1 | head -40
```

Then enumerate every prop on the destination `<JiraTable ...>` and verify each is either:
- **Same** as source (copy confirmed), or
- **Different** (explicitly in exception list)

Print verification table:
```
Prop verification:
  columns              ✅ shared factory
  enableVirtualization ✅ true (same)
  enableColumnReorder  ✅ true (same)
  stickyCreateFooter   ✅ OMITTED (exception: read-only)
  density              ✅ state-controlled (same)
  groups / onToggleGroup ✅ present (same)
  getRowHasChildren    ✅ present (same)
  canEdit              ✅ () => false (exception: read-only)
  emptyView            ✅ same JSX
  ...
```

Any prop not appearing in this table = missed drift. Fix before declaring done.

---

### Phase 7 — Commit

```bash
git add src/modules/.../shared/<SourceName>Columns.ts \
        src/modules/.../shared/<SourceName>StorageKeys.ts \
        <SourceFile> \
        <DestinationFile>
git commit -m "refactor: extract <SourceName> column factory + mirror to <Destination>

- build<SourceName>Columns() shared factory in shared/<SourceName>Columns.ts
- <SourcePage> migrated to use shared factory (zero behavioral change)
- <DestinationPage> mounts exact mirror: same columns, same JiraTable props
- exceptions: {list exceptions here}
- storage keys namespaced to prevent cross-page localStorage collision

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

Ask user to confirm push to main:
```
Mirror complete. Ready to push to main so other developers get the shared factory.
Confirm with "push" or "yes push".
```

---

## Output contract

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🪞 mirror-component v1.0 · COMPLETE
Source: {file}:{lines} → Shared factory: {shared/file}
Destination: {file}
Exceptions applied: {N} | Props verified: {M} ✅
TypeScript: PASS | Drift items remaining: 0
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Anti-patterns (instant reject — redo from Phase 1)

- Writing a column definition without citing `source file:line`
- Creating a new row type for the destination
- Copying JiraTable props from memory instead of from the source file
- Skipping Phase 4 (source must also use the shared factory)
- Leaving any local column definition in the source page after extraction
- Hand-writing empty state JSX instead of copying from source
- Declaring done without the Phase 6 prop verification table
