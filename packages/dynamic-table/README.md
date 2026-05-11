# @catylast/dynamic-table

A flexible, theme-aware data table component for the Catylast component
library. Built on TanStack Table v8 — TanStack drives the headless state
machine (sorting, expansion, selection, sizing, pinning), and we own all the
markup, styles, and accessibility wiring.

## Install

```bash
# pnpm
pnpm add @catylast/dynamic-table @catylast/primitives @catylast/tokens

# npm
npm install @catylast/dynamic-table @catylast/primitives @catylast/tokens

# yarn
yarn add @catylast/dynamic-table @catylast/primitives @catylast/tokens
```

## Use

```tsx
import {
  DynamicTable,
  type ColumnDef,
} from "@catylast/dynamic-table";

type Issue = { id: string; summary: string; status: string };

const columns: ColumnDef<Issue>[] = [
  { accessorKey: "summary", header: "Title", size: 320 },
  { accessorKey: "status", header: "Status", size: 120 },
];

<DynamicTable<Issue>
  columns={columns}
  data={issues}
  pinnedColumns={["summary"]}
  enableSelection
  enableExpansion
  getRowChildren={(row) => row.children}
  density="standard"
  onSelectionChange={(rows) => console.log(rows)}
/>;
```

## Features (v0.1)

- Sticky/pinned columns (left side; horizontal scroll for the rest)
- Hierarchical row expansion with depth-based indentation
- Multi-row selection with header indeterminate state
- Per-column sorting (click header)
- Per-column resizing (drag the right edge of a header)
- Density modes (`compact` / `standard` / `comfortable`)
- Loading and empty state slots
- Generic over row data shape — full TypeScript inference for cells
- Token-driven theming — light / dark / system

## Coming next

- Group / section header rows
- Row virtualization (`@tanstack/react-virtual`)
- Inline row creator slot
- First-class right-click ContextMenu integration

## Performance note

Pass `columns` and `data` as stable references — wrap with `useMemo` if you
build them inside a component. TanStack Table re-derives its row models
whenever these change.
