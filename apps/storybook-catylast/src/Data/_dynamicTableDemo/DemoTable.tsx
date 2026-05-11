import {
  Avatar,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@catylast/primitives";
import { WorkItemTypeIcon } from "@catylast/icons";
import {
  DynamicTable,
  type ColumnDef,
  type DynamicTableProps,
  type ExpandedState,
} from "@catylast/dynamic-table";
import { color, fontFamily, fontWeight, radius, space } from "@catylast/tokens";
import { useMemo, useState } from "react";

import {
  type Issue,
  type Priority,
  type Project,
  type Status,
  type User,
  type WorkItemType,
  PROJECTS,
  formatTicketKey,
  getProject,
  initialIssues,
  nextTicketNumber,
  addChildToParent,
  findById,
  moveToParent,
  removeById,
  updateById,
} from "./data";
import {
  AssigneeCell,
  CreateButton,
  PointsCell,
  PriorityCell,
  RowActions,
  StatusCell,
  TitleCell,
  TypeIcon,
  statusBadge,
} from "./components";

// ---------- shared column sets used across focused stories ----------

/**
 * Plain columns with the lightest-possible cell content. The Key column
 * uses a tiny custom cell only so the prefix can strike through when
 * the row is Done — that visual rule applies to every variant of the
 * table (read-only and editable alike), not just the inline-editable
 * Showcase.
 */
export const basicColumns: ColumnDef<Issue>[] = [
  {
    accessorKey: "key",
    header: "Key",
    size: 110,
    cell: ({ row }) => (
      <span
        style={{
          fontFamily: fontFamily.mono,
          color: color.text.subtle,
          textDecoration:
            row.original.status === "Done" ? "line-through" : undefined,
        }}
      >
        {row.original.key}
      </span>
    ),
  },
  { accessorKey: "summary", header: "Title", size: 360 },
  { accessorKey: "status", header: "Status", size: 140 },
  { accessorKey: "priority", header: "Priority", size: 110 },
  { accessorKey: "storyPoints", header: "Points", size: 80 },
];

/**
 * Icon-only "compact mode" columns. The leading **Type** column passes
 * `previewTitle={false}` (the default) to `<WorkItemTypeIcon>` so each
 * cell renders just the brand-colored glyph — no key, no title text.
 * The next column shows the same icon with `previewTitle` enabled —
 * a side-by-side reference for the prop's two modes.
 *
 * Useful when a list view needs to fit dozens of rows on screen and
 * the work-item type is the only field that matters for triage.
 */
export const iconOnlyColumns: ColumnDef<Issue>[] = [
  {
    id: "type-icon-only",
    header: "Type",
    size: 80,
    cell: ({ row }) => (
      // previewTitle defaults to false — only the icon renders.
      <WorkItemTypeIcon name={row.original.type} size={18} />
    ),
  },
  {
    id: "type-with-label",
    header: "Type (with label)",
    size: 200,
    cell: ({ row }) => (
      // previewTitle = true — icon + canonical label inline.
      <WorkItemTypeIcon
        name={row.original.type}
        size={18}
        previewTitle
      />
    ),
  },
  {
    accessorKey: "key",
    header: "Key",
    size: 110,
    cell: ({ row }) => (
      <span
        style={{
          fontFamily: fontFamily.mono,
          fontSize: "12px",
          color: color.text.subtle,
          textDecoration:
            row.original.status === "Done" ? "line-through" : undefined,
        }}
      >
        {row.original.key}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    size: 140,
    cell: ({ row }) => statusBadge(row.original.status),
  },
];

/** Display-only columns with rich cell content — Badge, Avatar, progress bar. */
export const displayColumns: ColumnDef<Issue>[] = [
  {
    accessorKey: "summary",
    header: "Title",
    size: 380,
    cell: ({ row }) => {
      // Done state strikes through ONLY the ticket key + number, never
      // the title text. Same rule applies in every variant of the title
      // cell across the demo (editable, read-only, basic).
      const isDone = row.original.status === "Done";
      return (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: space[8],
            minWidth: 0,
          }}
        >
          <TypeIcon type={row.original.type} />
          <span
            style={{
              color: color.text.subtle,
              fontFamily: fontFamily.mono,
              fontSize: "12px",
              flexShrink: 0,
              textDecoration: isDone ? "line-through" : undefined,
            }}
          >
            {row.original.key}
          </span>
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {row.original.summary}
          </span>
        </span>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    size: 140,
    cell: ({ row }) => statusBadge(row.original.status),
  },
  {
    accessorKey: "priority",
    header: "Priority",
    size: 130,
    cell: ({ row }) => <PriorityCell issue={row.original} />,
  },
  {
    accessorKey: "assignee",
    header: "Assignee",
    size: 220,
    cell: ({ row }) => {
      const a = row.original.assignee;
      if (!a) return <span style={{ color: color.text.subtle }}>—</span>;
      return (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: space[8],
          }}
        >
          <Avatar name={a.name} size="xs" />
          {a.name}
        </span>
      );
    },
  },
  {
    accessorKey: "progress",
    header: "Progress",
    size: 160,
    cell: ({ row }) => {
      const p = row.original.progress;
      if (p === undefined)
        return <span style={{ color: color.text.subtle }}>—</span>;
      return (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: space[8],
            width: "100%",
          }}
        >
          <div
            style={{
              flex: 1,
              height: "6px",
              background: color.surface.sunken,
              borderRadius: radius.full,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${p}%`,
                height: "100%",
                background: color.accent.background,
                transition: "width 200ms ease",
              }}
            />
          </div>
          <span
            style={{
              fontFamily: fontFamily.mono,
              fontSize: "12px",
              color: color.text.subtle,
              flexShrink: 0,
              minWidth: "32px",
              textAlign: "right",
            }}
          >
            {p}%
          </span>
        </div>
      );
    },
  },
];

/**
 * Inline-editable columns. Every column whose data type maps to a known
 * cell renderer becomes editable here:
 *
 * - **Title** → click anywhere on the text to flip into the inline
 *   `<input>`, commit on Enter / blur, cancel on Esc.
 * - **Status** → `Select` of the four statuses.
 * - **Priority** → `Select` of the six tiers (icon + canonical label).
 * - **Assignee** → `Combobox` over the people list.
 *
 * Holds an internal `editingId` so the title-edit input mounts only on
 * the row being edited.
 */
export function buildEditableColumns(
  onUpdate: (id: string, patch: Partial<Issue>) => void,
): ColumnDef<Issue>[] {
  // Locally-scoped editing-id state lives in a closure. Each
  // `<DynamicTable columns={buildEditableColumns(...)}>` call gets its
  // own. Consumers can lift this into their own state if they need
  // to coordinate edit mode across columns.
  return [
    {
      accessorKey: "summary",
      header: "Title",
      size: 380,
      cell: ({ row }) => (
        <EditableTitleCell
          issue={row.original}
          onCommit={(summary) => onUpdate(row.original.id, { summary })}
        />
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      size: 160,
      cell: ({ row }) => (
        <StatusCell
          issue={row.original}
          onChange={(s) => onUpdate(row.original.id, { status: s })}
        />
      ),
    },
    {
      accessorKey: "priority",
      header: "Priority",
      size: 160,
      cell: ({ row }) => (
        <PriorityCell
          issue={row.original}
          onChange={(p) => onUpdate(row.original.id, { priority: p })}
        />
      ),
    },
    {
      accessorKey: "assignee",
      header: "Assignee",
      size: 240,
      cell: ({ row }) => (
        <AssigneeCell
          issue={row.original}
          onChange={(u) => onUpdate(row.original.id, { assignee: u })}
        />
      ),
    },
  ];
}

/**
 * Self-contained editable title cell — owns its own "is editing" flag
 * so consumers of `buildEditableColumns` don't have to thread an
 * editing-id through the table state. The Showcase still uses the
 * lifted-state version (via `buildColumns`) because it coordinates
 * edit mode with the +Create flow.
 */
function EditableTitleCell({
  issue,
  onCommit,
}: {
  issue: Issue;
  onCommit: (summary: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  return (
    <TitleCell
      issue={issue}
      isEditing={isEditing}
      onStartEdit={() => setIsEditing(true)}
      onCommitTitle={(_id, v) => {
        onCommit(v);
        setIsEditing(false);
      }}
      onCancelEdit={() => setIsEditing(false)}
    />
  );
}

// ---------- columns ----------

function buildColumns(handlers: {
  editingId: string | null;
  startEdit: (id: string) => void;
  updateStatus: (id: string, s: Status) => void;
  updatePriority: (id: string, p: Priority) => void;
  updateAssignee: (id: string, u: User | null) => void;
  updateStoryPoints: (id: string, points: number | null) => void;
  commitTitle: (id: string, summary: string) => void;
  cancelEdit: (id: string) => void;
}): ColumnDef<Issue>[] {
  return [
    {
      accessorKey: "summary",
      header: "Title",
      size: 380,
      cell: ({ row }) => (
        <TitleCell
          issue={row.original}
          isEditing={handlers.editingId === row.original.id}
          onStartEdit={handlers.startEdit}
          onCommitTitle={handlers.commitTitle}
          onCancelEdit={handlers.cancelEdit}
        />
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      size: 160,
      cell: ({ row }) => (
        <StatusCell
          issue={row.original}
          onChange={(s) => handlers.updateStatus(row.original.id, s)}
        />
      ),
    },
    {
      accessorKey: "priority",
      header: "Priority",
      size: 160,
      cell: ({ row }) => (
        <PriorityCell
          issue={row.original}
          onChange={(p) => handlers.updatePriority(row.original.id, p)}
        />
      ),
    },
    {
      accessorKey: "assignee",
      header: "Assignee",
      size: 220,
      cell: ({ row }) => (
        <AssigneeCell
          issue={row.original}
          onChange={(u) => handlers.updateAssignee(row.original.id, u)}
        />
      ),
    },
    {
      accessorKey: "storyPoints",
      header: "Points",
      size: 90,
      cell: ({ row }) => (
        <PointsCell
          issue={row.original}
          onChange={(p) => handlers.updateStoryPoints(row.original.id, p)}
        />
      ),
    },
  ];
}

let idCounter = 1000;

/**
 * Stateful DynamicTable demo — owns the issue tree and wires every interaction
 * (create, add-child, edit title, change status, change assignee, change parent,
 * delete) to immutable tree-mutation helpers in `./data.ts`.
 *
 * Consumers should treat this as a reference implementation, not part of the
 * public API. Copy the parts you need into your own state container.
 */
export function DemoTable(args: Partial<DynamicTableProps<Issue>>) {
  const [data, setData] = useState<Issue[]>(initialIssues);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<ExpandedState>({});
  /**
   * Active project — drives every newly-created ticket's key prefix.
   * Switch the project from the toolbar; existing tickets keep their
   * original prefix (so an IRP ticket stays `IRP-7` even after the
   * user toggles to Sectorial Services).
   */
  const [currentProjectId, setCurrentProjectId] = useState<string>(
    PROJECTS[0]!.id,
  );
  const currentProject =
    getProject(PROJECTS, currentProjectId) ?? PROJECTS[0]!;

  const expandRow = (id: string) => {
    setExpanded((prev) => {
      const current = typeof prev === "boolean" ? {} : prev;
      return { ...current, [id]: true };
    });
  };

  /**
   * Build a fresh Issue tagged with the active project. Ticket numbers
   * cascade per project: when the user creates an IRP ticket we look
   * at every existing IRP-* key, find the highest number, and add
   * one. Switching projects mid-session and creating again picks up
   * that project's own counter — no global sequence collisions.
   */
  const makeIssue = (
    type: WorkItemType,
    project: Project = currentProject,
  ): Issue => {
    idCounter += 1;
    const internalId = `new-${idCounter}`;
    const n = nextTicketNumber(data, project);
    return {
      id: internalId,
      projectId: project.id,
      key: formatTicketKey(project, n),
      type,
      summary: "",
      status: "To do",
      priority: "medium",
      progress: 0,
    };
  };

  const handleCreate = (type: WorkItemType) => {
    const newItem = makeIssue(type);
    setData((prev) => [...prev, newItem]);
    setEditingId(newItem.id);
  };

  const handleAddChild = (parentId: string, type: WorkItemType) => {
    // Children inherit their parent's project so a parent IRP-1 epic
    // gets IRP-N children even when the toolbar is showing a different
    // active project. Sub-tasks always live in the same project as
    // their parent.
    const parent = findById(data, parentId);
    const project =
      (parent && getProject(PROJECTS, parent.projectId)) ?? currentProject;
    const newItem = makeIssue(type, project);
    setData((prev) => addChildToParent(prev, parentId, newItem));
    expandRow(parentId);
    setEditingId(newItem.id);
  };

  const handleDelete = (id: string) => {
    setData((prev) => removeById(prev, id));
    if (editingId === id) setEditingId(null);
  };

  const handleStartEdit = (id: string) => {
    setEditingId(id);
  };

  const handleUpdateStatus = (id: string, status: Status) => {
    setData((prev) => updateById(prev, id, { status }));
  };

  const handleUpdatePriority = (id: string, priority: Priority) => {
    setData((prev) => updateById(prev, id, { priority }));
  };

  const handleUpdateAssignee = (id: string, assignee: User | null) => {
    setData((prev) => updateById(prev, id, { assignee }));
  };

  const handleUpdateStoryPoints = (id: string, points: number | null) => {
    setData((prev) =>
      updateById(
        prev,
        id,
        // Conditionally spread: passing `storyPoints: undefined` directly
        // is rejected under `exactOptionalPropertyTypes`. When the user
        // clears the input we drop the key so `updateById` leaves the
        // existing value alone — the cell already renders an em-dash
        // when the prop is absent.
        points === null ? {} : { storyPoints: points },
      ),
    );
  };

  const handleMoveParent = (rowId: string, newParentId: string) => {
    setData((prev) => moveToParent(prev, rowId, newParentId));
  };

  const handleCommitTitle = (id: string, summary: string) => {
    setData((prev) => updateById(prev, id, { summary }));
    setEditingId(null);
  };

  const handleCancelEdit = (id: string) => {
    setData((prev) => {
      const row = findById(prev, id);
      if (row && !row.summary.trim()) {
        return removeById(prev, id);
      }
      return prev;
    });
    setEditingId(null);
  };

  const columns = useMemo(
    () =>
      buildColumns({
        editingId,
        startEdit: handleStartEdit,
        updateStatus: handleUpdateStatus,
        updatePriority: handleUpdatePriority,
        updateAssignee: handleUpdateAssignee,
        updateStoryPoints: handleUpdateStoryPoints,
        commitTitle: handleCommitTitle,
        cancelEdit: handleCancelEdit,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [editingId],
  );

  return (
    <DynamicTable<Issue>
      {...args}
      columns={columns}
      data={data}
      pinnedColumns={["summary"]}
      enableSelection
      enableExpansion
      enableColumnVisibility
      expanded={expanded}
      onExpandedChange={setExpanded}
      getRowChildren={(row) => row.children}
      getRowId={(row) => row.id}
      toolbarLeft={
        <ProjectSelector
          value={currentProjectId}
          onChange={setCurrentProjectId}
        />
      }
      renderCreator={() => <CreateButton onCreate={handleCreate} />}
      renderRowActions={(row) => (
        <RowActions
          row={row}
          data={data}
          onAddChild={handleAddChild}
          onDelete={handleDelete}
          onMoveParent={handleMoveParent}
        />
      )}
    />
  );
}

/**
 * Project picker shown in the table's `toolbarLeft` slot. Switching
 * the active project changes the prefix used by `+Create` (and by
 * `+Add child` whenever the parent doesn't already belong to a
 * project). Existing rows keep their original prefix.
 */
function ProjectSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  const active = getProject(PROJECTS, value) ?? PROJECTS[0]!;
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger size="sm" variant="default">
        <SelectValue>
          <span style={{ fontWeight: 500 }}>{active.name}</span>
          <span
            style={{
              marginLeft: "8px",
              padding: "1px 6px",
              borderRadius: "3px",
              background: "var(--catylast-color-surface-sunken)",
              color: "var(--catylast-color-text-subtle)",
              fontFamily: "var(--catylast-font-family-mono)",
              fontSize: "11px",
            }}
          >
            {active.key}
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {PROJECTS.map((p) => (
          <SelectItem key={p.id} value={p.id}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <span>{p.name}</span>
              <span
                style={{
                  padding: "1px 6px",
                  borderRadius: "3px",
                  background: "var(--catylast-color-surface-sunken)",
                  color: "var(--catylast-color-text-subtle)",
                  fontFamily: "var(--catylast-font-family-mono)",
                  fontSize: "11px",
                }}
              >
                {p.key}
              </span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * Static columns for read-only / empty / loading stories. Cells fall back to
 * plain readouts (Badge, Avatar+name) instead of inline-editable Select /
 * Combobox.
 */
export function buildReadOnlyColumns(): ColumnDef<Issue>[] {
  // Pass `startEdit: undefined` so the title cell stays a plain text
  // span (no click affordance, no hover bg). The other update
  // handlers are no-ops — they're typed as required by `buildColumns`
  // so the column factory's contract stays explicit.
  return buildColumns({
    editingId: null,
    startEdit: () => {},
    updateStatus: () => {},
    updatePriority: () => {},
    updateAssignee: () => {},
    updateStoryPoints: () => {},
    commitTitle: () => {},
    cancelEdit: () => {},
  });
}

export { initialIssues } from "./data";
export type { Issue } from "./data";
