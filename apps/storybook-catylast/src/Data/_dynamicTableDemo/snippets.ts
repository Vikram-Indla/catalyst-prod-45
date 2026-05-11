/**
 * Source-code snippets shown in Storybook's "Show code" panel.
 *
 * Each story renders a working interactive instance for the canvas, but
 * "Show code" is overridden via `parameters.docs.source.code` to display a
 * curated, consumer-style usage example instead of the demo internals.
 */

const ISSUE_TYPE = `type Issue = {
  id: string;
  key: string;
  summary: string;
  status: "To do" | "In progress" | "In review" | "Done";
  priority: "Low" | "Medium" | "High" | "Critical";
  storyPoints?: number;
};`;

export const basicSnippet = `import {
  DynamicTable,
  type ColumnDef,
} from "@catylast/dynamic-table";

${ISSUE_TYPE}

const columns: ColumnDef<Issue>[] = [
  { accessorKey: "key", header: "Key", size: 110 },
  { accessorKey: "summary", header: "Title", size: 360 },
  { accessorKey: "status", header: "Status", size: 140 },
  { accessorKey: "priority", header: "Priority", size: 110 },
  { accessorKey: "storyPoints", header: "Points", size: 80 },
];

<DynamicTable<Issue> columns={columns} data={issues} />`;

export const sortableSnippet = `// Sorting is enabled by default. Click any header to toggle:
//   unsorted → ascending → descending → unsorted.
// A chevron indicator next to the header reflects the current sort direction.
// Disable per column with \`enableSorting: false\` on its ColumnDef, or
// globally with \`enableSorting={false}\` on the table.

<DynamicTable<Issue>
  columns={columns}
  data={issues}
  enableSorting               /* default — shown for clarity */
/>`;

export const pinnedColumnsSnippet = `// Pinned columns stay visible during horizontal scroll. The last pinned
// column gets a 1px right-edge divider that separates the sticky and
// scrolling regions.

<DynamicTable<Issue>
  columns={columns}
  data={issues}
  pinnedColumns={["summary"]}    /* one or more column IDs */
/>`;

export const selectionSnippet = `// Add a leading checkbox column for multi-row selection. The header
// checkbox toggles all rows. Partial selection shows an indeterminate
// state announced as \`aria-checked="mixed"\`.

const [selected, setSelected] = useState<Issue[]>([]);

<DynamicTable<Issue>
  columns={columns}
  data={issues}
  enableSelection
  onSelectionChange={setSelected}
/>`;

export const expansionSnippet = `// Hierarchical row expansion. Tell the table how to find a row's children;
// a chevron toggle is auto-injected into the first column and children
// indent by 24px per depth level.
//
// Always pass \`getRowId\` so expanded state survives data refreshes.

type Issue = {
  id: string;
  key: string;
  summary: string;
  children?: Issue[];      /* parent → children */
};

<DynamicTable<Issue>
  columns={columns}
  data={issues}
  enableExpansion
  getRowChildren={(row) => row.children}
  getRowId={(row) => row.id}
/>`;

export const columnVisibilitySnippet = `// Adds a "Configure columns" gear in the toolbar. Each menu item is a
// column; click to toggle visibility. The selection column is always
// excluded from the toggle menu.

<DynamicTable<Issue>
  columns={columns}
  data={issues}
  enableColumnVisibility
  defaultColumnVisibility={{ priority: false }}   /* optional initial state */
/>`;

export const customCellsSnippet = `import { Avatar, Badge } from "@catylast/primitives";
import { color, radius, space } from "@catylast/tokens";

// Every column's \`cell\` returns any React node. Compose primitives freely.

const columns: ColumnDef<Issue>[] = [
  {
    accessorKey: "summary",
    header: "Title",
    size: 380,
    cell: ({ row }) => (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
        <TypeIcon type={row.original.type} />
        <code>{row.original.key}</code>
        <span>{row.original.summary}</span>
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <Badge>{row.original.status}</Badge>,
  },
  {
    accessorKey: "assignee",
    header: "Assignee",
    cell: ({ row }) =>
      row.original.assignee ? (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <Avatar name={row.original.assignee.name} size="xs" />
          {row.original.assignee.name}
        </span>
      ) : "—",
  },
  {
    accessorKey: "progress",
    header: "Progress",
    cell: ({ row }) => (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ flex: 1, height: 6, background: color.surface.sunken, borderRadius: radius.full }}>
          <div style={{ width: \`\${row.original.progress}%\`, height: "100%", background: color.accent.background }} />
        </div>
        <span>{row.original.progress}%</span>
      </div>
    ),
  },
];

<DynamicTable<Issue> columns={columns} data={issues} />`;

export const inlineEditingSnippet = `import {
  Avatar,
  Combobox,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@catylast/primitives";

// Render a Select or Combobox inside a cell to make it inline-editable.
// The cell renderer takes the row's current value and dispatches updates
// to your application state.

const columns: ColumnDef<Issue>[] = [
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <Select
        value={row.original.status}
        onValueChange={(s) =>
          updateIssue(row.original.id, { status: s as Issue["status"] })
        }
      >
        <SelectTrigger variant="ghost" hideIcon>
          <Badge>{row.original.status}</Badge>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="To do">To do</SelectItem>
          <SelectItem value="In progress">In progress</SelectItem>
          <SelectItem value="Done">Done</SelectItem>
        </SelectContent>
      </Select>
    ),
  },
  {
    accessorKey: "assignee",
    header: "Assignee",
    cell: ({ row }) => (
      <Combobox
        value={row.original.assignee ?? null}
        options={users}
        getKey={(u) => u.id}
        getLabel={(u) => u.name}
        onSelect={(u) =>
          updateIssue(row.original.id, { assignee: u })
        }
        renderTrigger={(u) => (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <Avatar name={u.name} size="xs" /> {u.name}
          </span>
        )}
      />
    ),
  },
];`;

export const toolbarSnippet = `// The \`toolbarLeft\` and \`toolbarRight\` slots render above the table.
// Use them for search inputs, quick filters, density switchers, export
// buttons — anything that complements the table.

<DynamicTable<Issue>
  columns={columns}
  data={issues}
  toolbarLeft={
    <input
      type="search"
      placeholder="Search issues"
      onChange={(e) => setQuery(e.target.value)}
    />
  }
  toolbarRight={<Button onClick={exportCsv}>Export</Button>}
  enableColumnVisibility   /* the gear sits next to your right slot */
/>`;

export const compactSnippet = `// Compact density tightens row height and cell padding. Useful when
// scanning many rows.

<DynamicTable<Issue>
  columns={columns}
  data={issues}
  density="compact"
/>`;

export const comfortableSnippet = `// Comfortable density gives rows extra breathing room. Useful when cells
// contain multi-line content or rich media.

<DynamicTable<Issue>
  columns={columns}
  data={issues}
  density="comfortable"
/>`;

export const readOnlySnippet = `// All interactive features are opt-in. Omit the flags for a static,
// read-only table.

<DynamicTable<Issue>
  columns={columns}
  data={issues}
  pinnedColumns={["summary"]}
  enableExpansion
  getRowChildren={(row) => row.children}
  getRowId={(row) => row.id}
/>`;

export const emptySnippet = `<DynamicTable<Issue>
  columns={columns}
  data={[]}
  empty="No issues match your filters."
/>`;

export const loadingSnippet = `<DynamicTable<Issue>
  columns={columns}
  data={[]}
  loading
  loadingContent={<MySpinner />}
/>`;

export const showcaseSnippet = `// The full kitchen-sink demo. See the source of \`_dynamicTableDemo/\`
// in the storybook repo for the wiring; this snippet is the public API
// surface you'd write in your app.

<DynamicTable<Issue>
  columns={columns}
  data={issues}
  pinnedColumns={["summary"]}
  enableSelection
  enableExpansion
  enableColumnVisibility
  expanded={expanded}
  onExpandedChange={setExpanded}
  getRowChildren={(row) => row.children}
  getRowId={(row) => row.id}
  renderCreator={() => <CreateMenu onCreate={handleCreate} />}
  renderRowActions={(row) => (
    <RowActions
      row={row}
      onAddChild={handleAddChild}
      onDelete={handleDelete}
      onMoveParent={handleMoveParent}
    />
  )}
/>`;
