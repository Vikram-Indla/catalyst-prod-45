import type { Meta, StoryObj } from "@storybook/react-vite";
import { DynamicTable } from "@catylast/dynamic-table";
import { fontFamily, space } from "@catylast/tokens";
import { useState } from "react";

import { flatIssues, initialIssues, type Issue } from "./_dynamicTableDemo/data";
import {
  basicColumns,
  buildEditableColumns,
  buildReadOnlyColumns,
  DemoTable,
  displayColumns,
  iconOnlyColumns,
} from "./_dynamicTableDemo/DemoTable";
import {
  basicSnippet,
  columnVisibilitySnippet,
  compactSnippet,
  comfortableSnippet,
  customCellsSnippet,
  emptySnippet,
  expansionSnippet,
  inlineEditingSnippet,
  loadingSnippet,
  pinnedColumnsSnippet,
  readOnlySnippet,
  selectionSnippet,
  showcaseSnippet,
  sortableSnippet,
  toolbarSnippet,
} from "./_dynamicTableDemo/snippets";

const componentDescription = `A flexible, theme-aware table component for displaying structured data with sorting, multi-row selection, hierarchical row expansion, sticky pinned columns, column resizing, density modes, and column visibility. Every column's \`cell\` prop renders any React node, so cells can be Badges, Avatars, Selects, Comboboxes, progress bars, or fully custom content — the table renders the *machine* (DOM, sticky math, state); you provide the *content*.

Built on TanStack Table v8 for the headless state engine. We own all markup, styles, and accessibility wiring.

**Use it for:** issue lists, work-item trees, settings tables, audit logs — any tabular data that needs interaction.

**Skip it for:** purely visual layouts (use \`Box\` / \`Stack\`), simple key-value displays (use \`DescriptionList\`), or charts (use a chart component).

Every feature is opt-in via flags — none are forced. The minimum signature is two props: \`columns\` and \`data\`. Sorting and column resizing are on by default; selection, expansion, column visibility, and pinning are separate flags.`;

const meta: Meta<typeof DynamicTable> = {
  title: "Data/DynamicTable",
  component: DynamicTable,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: { component: componentDescription },
    },
  },
};
export default meta;

type Story = StoryObj<typeof DynamicTable>;

const wrapStyle = {
  height: "640px",
  padding: space[16],
  fontFamily: fontFamily.sans,
};
const wrapStyleShort = { ...wrapStyle, height: "320px" };
const wrapStyleMid = { ...wrapStyle, height: "440px" };

// ---------- focused single-feature stories ----------

export const Default: Story = {
  name: "Basic",
  parameters: {
    docs: {
      description: {
        story:
          "The minimum signature: pass `columns` and `data`. Sorting and column resizing are enabled by default — click any header to sort, drag a header's right edge to resize. No other features are turned on.",
      },
      source: { code: basicSnippet },
    },
  },
  render: () => (
    <div style={wrapStyleMid}>
      <DynamicTable columns={basicColumns} data={flatIssues} />
    </div>
  ),
};

export const SortableColumns: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Sorting is on by default. Clicking a header cycles unsorted → ascending → descending → unsorted. A chevron next to the header reflects the current sort direction. Disable per column with `enableSorting: false` on its `ColumnDef`, or globally with `enableSorting={false}` on the table.",
      },
      source: { code: sortableSnippet },
    },
  },
  render: () => (
    <div style={wrapStyleMid}>
      <DynamicTable columns={basicColumns} data={flatIssues} />
    </div>
  ),
};

export const PinnedColumns: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Pin one or more columns to the left so they stay visible during horizontal scroll. The last pinned column gets a 1px right-edge divider that separates the sticky and scrolling regions. Pass `pinnedColumns={[\"summary\", \"status\"]}` to pin both.",
      },
      source: { code: pinnedColumnsSnippet },
    },
  },
  render: () => (
    <div style={wrapStyleMid}>
      <DynamicTable
        columns={displayColumns}
        data={flatIssues}
        pinnedColumns={["summary"]}
      />
    </div>
  ),
};

export const Selection: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Setting `enableSelection` injects a leading checkbox column. The header checkbox toggles all rows; partial selection shows an indeterminate state announced as `aria-checked="mixed"`. Subscribe to `onSelectionChange` for the array of selected row originals.',
      },
      source: { code: selectionSnippet },
    },
  },
  render: function SelectionStory() {
    const [count, setCount] = useState(0);
    return (
      <div style={wrapStyleMid}>
        <div
          style={{
            marginBottom: space[12],
            fontSize: "13px",
            fontFamily: fontFamily.sans,
          }}
        >
          Selected: <strong>{count}</strong>
        </div>
        <DynamicTable
          columns={basicColumns}
          data={flatIssues}
          enableSelection
          onSelectionChange={(rows) => setCount(rows.length)}
        />
      </div>
    );
  },
};

export const RowExpansion: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Hierarchical expansion. Provide `getRowChildren` so the table can find each row's children; a chevron toggle is auto-injected into the first column and children indent by 24px per depth level. Always pair with `getRowId` so expanded state survives data refreshes.",
      },
      source: { code: expansionSnippet },
    },
  },
  render: () => (
    <div style={wrapStyle}>
      <DynamicTable
        columns={displayColumns}
        data={initialIssues}
        pinnedColumns={["summary"]}
        enableExpansion
        getRowChildren={(row) => (row as Issue).children}
        getRowId={(row) => (row as Issue).id}
      />
    </div>
  ),
};

export const ColumnVisibility: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Setting `enableColumnVisibility` adds a *Configure columns* gear in the toolbar. Each menu item is a column; click to toggle, with the menu staying open so users can flip several at once. Use `defaultColumnVisibility` for an initial hidden set, and `enableHiding: false` on a `ColumnDef` to make a column un-hideable.",
      },
      source: { code: columnVisibilitySnippet },
    },
  },
  render: () => (
    <div style={wrapStyleMid}>
      <DynamicTable
        columns={displayColumns}
        data={flatIssues}
        enableColumnVisibility
      />
    </div>
  ),
};

export const CustomCells: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Cells aren't strings — they're render functions. Compose `Badge`, `Avatar`, progress bars, links, or any custom component. The table doesn't care what you put in a cell; it only owns the row, header, and pinning math.",
      },
      source: { code: customCellsSnippet },
    },
  },
  render: () => (
    <div style={wrapStyleMid}>
      <DynamicTable
        columns={displayColumns}
        data={flatIssues}
        pinnedColumns={["summary"]}
      />
    </div>
  ),
};

export const InlineEditing: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Drop a `Select`, `Combobox`, or any input into a cell to make it inline-editable. The cell renderer takes the current value, renders the control, and dispatches updates to your application state on change. Click any status pill or assignee field below to try it.",
      },
      source: { code: inlineEditingSnippet },
    },
  },
  render: function InlineEditingStory() {
    const [data, setData] = useState<Issue[]>(flatIssues);
    const handleUpdate = (id: string, patch: Partial<Issue>) => {
      setData((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
      );
    };
    return (
      <div style={wrapStyleMid}>
        <DynamicTable
          columns={buildEditableColumns(handleUpdate)}
          data={data}
          pinnedColumns={["summary"]}
        />
      </div>
    );
  },
};

export const WithToolbar: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "The `toolbarLeft` and `toolbarRight` slots render above the table. Use them for search inputs, quick filters, density switchers, export buttons. When `enableColumnVisibility` is also on, the gear icon sits at the far right alongside your right-slot content.",
      },
      source: { code: toolbarSnippet },
    },
  },
  render: function ToolbarStory() {
    const [query, setQuery] = useState("");
    const filtered = flatIssues.filter((i) =>
      i.summary.toLowerCase().includes(query.toLowerCase()),
    );
    return (
      <div style={wrapStyleMid}>
        <DynamicTable
          columns={displayColumns}
          data={filtered}
          enableColumnVisibility
          toolbarLeft={
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search issues"
              style={{
                padding: "4px 8px",
                fontSize: "13px",
                border: "1px solid var(--catylast-color-border-default)",
                borderRadius: "4px",
                background: "var(--catylast-color-surface-background)",
                color: "var(--catylast-color-text-primary)",
                outline: "none",
                minWidth: "240px",
              }}
            />
          }
        />
      </div>
    );
  },
};

// ---------- density variants ----------

export const Compact: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Compact density tightens cell padding and minimum row height (28px). Useful when scanning many rows or when vertical space is scarce.",
      },
      source: { code: compactSnippet },
    },
  },
  render: () => (
    <div style={wrapStyle}>
      <DemoTable density="compact" />
    </div>
  ),
};

export const Comfortable: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Comfortable density gives rows extra breathing room (44px minimum row height). Useful when cells contain multi-line content, rich media, or controls that need padding.",
      },
      source: { code: comfortableSnippet },
    },
  },
  render: () => (
    <div style={wrapStyle}>
      <DemoTable density="comfortable" />
    </div>
  ),
};

// ---------- states ----------

export const ReadOnly: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "All interactive features are opt-in. Omit `enableSelection`, `enableColumnVisibility`, `renderCreator`, and `renderRowActions` for a purely static, read-only display.",
      },
      source: { code: readOnlySnippet },
    },
  },
  render: () => (
    <div style={wrapStyle}>
      <DynamicTable
        columns={buildReadOnlyColumns()}
        data={initialIssues}
        pinnedColumns={["summary"]}
        enableExpansion
        getRowChildren={(row) => (row as Issue).children}
        getRowId={(row) => (row as Issue).id}
      />
    </div>
  ),
};

export const Empty: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Render the empty slot when `data` is empty and `loading` is false. When a creator slot is also present, the empty message is suppressed because the creator IS the call-to-action.",
      },
      source: { code: emptySnippet },
    },
  },
  render: () => (
    <div style={wrapStyleShort}>
      <DynamicTable
        columns={buildReadOnlyColumns()}
        data={[]}
        empty="No issues match your filters."
      />
    </div>
  ),
};

export const Loading: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Set `loading` to show a centered loading slot in place of rows. Override the default text with `loadingContent` for a spinner or skeleton.",
      },
      source: { code: loadingSnippet },
    },
  },
  render: () => (
    <div style={wrapStyleShort}>
      <DynamicTable columns={buildReadOnlyColumns()} data={[]} loading />
    </div>
  ),
};

// ---------- pagination ----------

type PaginationStoryArgs = {
  position: "start" | "center" | "end";
  pageSize: number;
};

export const Pagination: StoryObj<PaginationStoryArgs> = {
  parameters: {
    docs: {
      description: {
        story:
          "Pagination is on by default with `pageSize: 20` — the chrome renders below the table whenever there are more rows than fit on one page, and auto-hides when there's only one page so single-page tables don't get useless chrome.\n\n**Outside the scroll region.** The pagination footer is fixed at the bottom of the table container, OUTSIDE the scrolling row area. Even with hundreds of rows, the user never has to scroll to find the next-page button.\n\n**Use the Controls panel below** to flip the `position` between `start` / `center` / `end` and to change `pageSize` live.\n\n**Configuration:**\n\n- **Default** — `pageSize: 20`, `position: \"center\"`\n- **Custom page size** — `pagination={{ pageSize: 10 }}`\n- **Position** — `pagination={{ position: \"start\" | \"center\" | \"end\" }}`\n- **Disable entirely** — `pagination={false}` renders every row, no chrome\n- **Controlled** — `pagination={{ page, onPageChange, pageSize }}` drives page state from the outside (URL-synced, etc.)\n\nThe pagination component itself is `@catylast/primitives/Pagination` — built standalone and reused here. Visit **Navigation → Pagination** to see the primitive in isolation.",
      },
    },
  },
  args: {
    position: "center",
    pageSize: 10,
  },
  argTypes: {
    position: {
      control: { type: "inline-radio" },
      options: ["start", "center", "end"],
      description: "Horizontal placement of the pagination chrome inside the footer bar.",
    },
    pageSize: {
      control: { type: "number", min: 1, max: 50 },
      description: "Rows per page. Default is 20.",
    },
  },
  render: (args) => (
    <div style={wrapStyleMid}>
      <DynamicTable
        columns={displayColumns}
        data={flatIssues}
        pagination={{
          pageSize: args.pageSize,
          position: args.position,
        }}
      />
    </div>
  ),
};

export const PaginationPositions: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "The `position` prop on `pagination` controls horizontal alignment inside the footer bar. Three values:\n\n- **`start`** — pinned to the left edge.\n- **`center`** (default) — middle of the bar.\n- **`end`** — pinned to the right edge.\n\nThis story renders three tables back-to-back so you can compare side-by-side. The bar itself always sits outside the scrolling region, so the chevrons are reachable without scrolling.",
      },
    },
  },
  render: function PositionStory() {
    const small = flatIssues.slice(0, 25);
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: space[20],
          padding: space[16],
          fontFamily: fontFamily.sans,
        }}
      >
        <section>
          <div
            style={{
              fontSize: "12px",
              color: "var(--catylast-color-text-subtle)",
              marginBottom: space[8],
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            position = start
          </div>
          <div style={{ height: "260px" }}>
            <DynamicTable
              columns={basicColumns}
              data={small}
              pagination={{ pageSize: 10, position: "start" }}
            />
          </div>
        </section>
        <section>
          <div
            style={{
              fontSize: "12px",
              color: "var(--catylast-color-text-subtle)",
              marginBottom: space[8],
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            position = center (default)
          </div>
          <div style={{ height: "260px" }}>
            <DynamicTable
              columns={basicColumns}
              data={small}
              pagination={{ pageSize: 10 }}
            />
          </div>
        </section>
        <section>
          <div
            style={{
              fontSize: "12px",
              color: "var(--catylast-color-text-subtle)",
              marginBottom: space[8],
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            position = end
          </div>
          <div style={{ height: "260px" }}>
            <DynamicTable
              columns={basicColumns}
              data={small}
              pagination={{ pageSize: 10, position: "end" }}
            />
          </div>
        </section>
      </div>
    );
  },
};

// ---------- icon-only column variant (previewTitle prop) ----------

export const IconOnlyType: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Demonstrates the `WorkItemTypeIcon` component's `previewTitle` prop in two side-by-side columns:\n\n- **Type** — `previewTitle={false}` (the default). Renders only the brand-colored glyph. No label, no key, no title text. Useful for compact list views where the type is the only field that matters.\n- **Type (with label)** — `previewTitle={true}`. Renders the glyph plus its canonical label (`Story`, `QA Bug`, `Production Incident`, …) inline.\n\nThe same `previewTitle` prop is also available on `PriorityIcon`. Same pattern: omit it for icon-only, set it to `true` to inline the human label, or pass a custom string to override.",
      },
    },
  },
  render: () => (
    <div style={wrapStyleMid}>
      <DynamicTable columns={iconOnlyColumns} data={flatIssues} />
    </div>
  ),
};

// ---------- comprehensive showcase ----------

export const Showcase: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Every feature wired together — pinning, expansion, multi-row selection, column visibility, inline editing (status `Select`, assignee `Combobox`, priority `Select` with brand icons, click-to-edit title, click-to-edit story points), hover row actions (`+ Add child`, kebab menu with submenus), the type-picker creator footer, change-parent submenu with searchable list, and progress bars under each title.\n\n**Project-driven ticket keys.** The toolbar's project selector controls which prefix gets stamped onto newly-created tickets. The seed data interleaves three projects (`IRP-*`, `CAT-*`, `SS-*`) — switch the selector and click `+ Create` to see the next ticket pick up the active project's prefix. Sub-tasks always inherit their parent's prefix, even when the toolbar shows a different active project.\n\n**Done strike-through.** Toggle any row's status to `Done` — the prefix + number strike through, the title text stays untouched. Same rule applies to every variant of the table (read-only, basic, editable). The link is a real `<a>` so middle-click / cmd-click / right-click → Copy link all work.",
      },
      source: { code: showcaseSnippet },
    },
  },
  render: () => (
    <div style={wrapStyle}>
      <DemoTable />
    </div>
  ),
};
