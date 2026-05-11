import {
  Avatar,
  Badge,
  Button,
  Combobox,
  ComboboxList,
  IconButton,
  LinkButton,
  Menu,
  MenuContent,
  MenuItem,
  MenuLabel,
  MenuSeparator,
  MenuSub,
  MenuSubContent,
  MenuSubTrigger,
  MenuTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@catylast/primitives";
import {
  Icon,
  PriorityIcon,
  PRIORITY_LABELS,
  PRIORITY_NAMES,
  WorkItemTypeIcon,
  WORK_ITEM_TYPE_LABELS,
} from "@catylast/icons";
import {
  color,
  fontFamily,
  fontSize,
  radius,
  space,
} from "@catylast/tokens";
import { useEffect, useRef, useState } from "react";

import {
  type Issue,
  type Priority,
  type Status,
  type User,
  type WorkItemType,
  WORK_ITEM_TYPES,
  STATUSES,
  USERS,
  eligibleParents,
} from "./data";

// ---------- presentational helpers ----------

export function statusBadge(status: Status) {
  if (status === "Done") return <Badge variant="success">{status}</Badge>;
  if (status === "In progress")
    return <Badge variant="primary">{status}</Badge>;
  if (status === "In review") return <Badge variant="warning">{status}</Badge>;
  return <Badge variant="default">{status}</Badge>;
}

/**
 * Thin compatibility shim around `<WorkItemTypeIcon>` so the existing
 * call-sites in this demo (TitleCell, TypeMenuItems, ParentOption) keep
 * the short `<TypeIcon type="epic" />` syntax. Sizes default to 14px to
 * stay consistent with the previous Lucide-backed icons.
 */
export function TypeIcon({
  type,
  size = 14,
}: {
  type: WorkItemType;
  size?: number;
}) {
  return <WorkItemTypeIcon name={type} size={size} />;
}

/**
 * Render a priority value as `[icon] [Human Label]` (e.g. "[↑] High",
 * "[=] Medium"). The label always uses the canonical title-case form
 * from `PRIORITY_LABELS` — the wire-format `"highest"` / `"medium"`
 * keys never reach the screen.
 */
function PriorityValue({
  priority,
  size = 14,
}: {
  priority: Priority;
  size?: number;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: space[6],
        minWidth: 0,
      }}
    >
      <PriorityIcon name={priority} size={size} />
      <span style={{ fontSize: fontSize.sm, color: color.text.primary }}>
        {PRIORITY_LABELS[priority]}
      </span>
    </span>
  );
}

/**
 * Inline-editable priority cell. When `onChange` is supplied, the cell
 * is a `Select` dropdown that fires the callback with the new
 * priority key. When omitted, it stays read-only — used for snapshots,
 * archived rows, or columns where the table consumer hasn't wired an
 * editor yet. Either way the displayed value pairs the brand-colored
 * arrow icon with the canonical title-case label.
 */
export function PriorityCell({
  issue,
  onChange,
  size = 14,
}: {
  issue: Issue;
  onChange?: (priority: Priority) => void;
  size?: number;
}) {
  if (!onChange) {
    return <PriorityValue priority={issue.priority} size={size} />;
  }
  return (
    <Select
      value={issue.priority}
      onValueChange={(v) => onChange(v as Priority)}
    >
      <SelectTrigger size="sm" variant="ghost" hideIcon>
        <PriorityValue priority={issue.priority} size={size} />
      </SelectTrigger>
      <SelectContent>
        {PRIORITY_NAMES.map((p) => (
          <SelectItem key={p} value={p}>
            <PriorityValue priority={p} size={size} />
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ---------- inline editable story points ----------

function PointsEdit({
  initialValue,
  onCommit,
  onCancel,
}: {
  initialValue: number | undefined;
  onCommit: (value: number | null) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(
    initialValue === undefined ? "" : String(initialValue),
  );
  const ref = useRef<HTMLInputElement>(null);
  const committedRef = useRef(false);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  const commit = () => {
    if (committedRef.current) return;
    committedRef.current = true;
    const trimmed = value.trim();
    if (trimmed === "") {
      onCommit(null);
      return;
    }
    const parsed = Number.parseInt(trimmed, 10);
    if (Number.isFinite(parsed) && parsed >= 0) {
      onCommit(parsed);
    } else {
      onCancel();
    }
  };

  return (
    <input
      ref={ref}
      type="text"
      inputMode="numeric"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
        } else if (e.key === "Escape") {
          e.preventDefault();
          committedRef.current = true;
          onCancel();
        }
      }}
      onBlur={commit}
      aria-label="Story points"
      style={{
        width: "60px",
        border: `1px solid ${color.border.default}`,
        borderRadius: radius.xs,
        background: color.surface.background,
        outline: "none",
        font: "inherit",
        fontFamily: fontFamily.mono,
        color: color.text.primary,
        padding: `${space[2]} ${space[6]}`,
        textAlign: "right",
      }}
    />
  );
}

/**
 * Inline-editable story-points cell. Mirrors the TitleCell pattern:
 * click the number to flip into a text input, Enter / blur commits an
 * integer, blank commits `null` (clears the points), Esc cancels.
 * When `onChange` is omitted the cell stays read-only.
 */
export function PointsCell({
  issue,
  onChange,
}: {
  issue: Issue;
  onChange?: (points: number | null) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const value = issue.storyPoints;

  const commit = (next: number | null) => {
    onChange?.(next);
    setIsEditing(false);
  };

  if (isEditing && onChange) {
    return (
      <PointsEdit
        initialValue={value}
        onCommit={commit}
        onCancel={() => setIsEditing(false)}
      />
    );
  }

  const canEdit = Boolean(onChange);
  return (
    <span
      role={canEdit ? "button" : undefined}
      tabIndex={canEdit ? 0 : undefined}
      onClick={
        canEdit
          ? (e) => {
              e.stopPropagation();
              setIsEditing(true);
            }
          : undefined
      }
      onKeyDown={
        canEdit
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setIsEditing(true);
              }
            }
          : undefined
      }
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "flex-end",
        minWidth: "44px",
        padding: canEdit ? `${space[2]} ${space[6]}` : 0,
        borderRadius: radius.xs,
        cursor: canEdit ? "text" : "default",
        fontFamily: fontFamily.mono,
        fontWeight: 500,
        color: value === undefined ? color.text.subtle : color.text.primary,
        transition: "background 120ms ease",
      }}
      onMouseEnter={
        canEdit
          ? (e) => {
              e.currentTarget.style.background = color.surface.hover;
            }
          : undefined
      }
      onMouseLeave={
        canEdit
          ? (e) => {
              e.currentTarget.style.background = "transparent";
            }
          : undefined
      }
    >
      {value ?? "—"}
    </span>
  );
}

// ---------- title cell with inline edit and progress bar ----------

function TitleEdit({
  initialValue,
  onCommit,
  onCancel,
}: {
  initialValue: string;
  onCommit: (value: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initialValue);
  const ref = useRef<HTMLInputElement>(null);
  const committedRef = useRef(false);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  const commit = () => {
    if (committedRef.current) return;
    committedRef.current = true;
    const trimmed = value.trim();
    if (trimmed) onCommit(trimmed);
    else onCancel();
  };

  return (
    <input
      ref={ref}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
        } else if (e.key === "Escape") {
          e.preventDefault();
          committedRef.current = true;
          onCancel();
        }
      }}
      onBlur={commit}
      placeholder="What needs to be done?"
      aria-label="Issue title"
      style={{
        flex: 1,
        minWidth: 0,
        border: "none",
        background: "transparent",
        outline: "none",
        font: "inherit",
        color: color.text.primary,
        padding: 0,
      }}
    />
  );
}

export function TitleCell({
  issue,
  isEditing,
  onStartEdit,
  onCommitTitle,
  onCancelEdit,
}: {
  issue: Issue;
  isEditing: boolean;
  /**
   * Fires when the user clicks the title text outside of edit mode.
   * Wire it to your editing-id state so clicking flips the cell into
   * the inline `<input>`. Optional — when omitted the cell stays
   * read-only on click (used for archived / locked rows).
   */
  onStartEdit?: (id: string) => void;
  onCommitTitle: (id: string, summary: string) => void;
  onCancelEdit: (id: string) => void;
}) {
  const canEdit = Boolean(onStartEdit);
  const isDone = issue.status === "Done";
  // Real apps will swap this for their router. The placeholder href
  // keeps the component a real `<a>` so middle-click / cmd-click /
  // copy-link work, and screen readers announce it as a link.
  const ticketHref = `#/tickets/${issue.key}`;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: space[6],
        minWidth: 0,
      }}
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: space[8],
          minWidth: 0,
        }}
      >
        <TypeIcon type={issue.type} />
        <LinkButton
          href={ticketHref}
          appearance="subtle-link"
          spacing="none"
          aria-label={`Open ticket ${issue.key}`}
          onClick={(e) => {
            // Stop propagation so clicking the link doesn't bubble to
            // the table's row click handler (open detail panel etc.).
            e.stopPropagation();
          }}
          style={{
            color: color.text.subtle,
            fontFamily: fontFamily.mono,
            fontSize: fontSize.xs,
            flexShrink: 0,
            textDecoration: isDone ? "line-through" : undefined,
          }}
        >
          {issue.key}
        </LinkButton>
        {isEditing ? (
          <TitleEdit
            initialValue={issue.summary}
            onCommit={(v) => onCommitTitle(issue.id, v)}
            onCancel={() => onCancelEdit(issue.id)}
          />
        ) : (
          <span
            role={canEdit ? "button" : undefined}
            tabIndex={canEdit ? 0 : undefined}
            onClick={
              canEdit
                ? (e) => {
                    e.stopPropagation();
                    onStartEdit?.(issue.id);
                  }
                : undefined
            }
            onKeyDown={
              canEdit
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onStartEdit?.(issue.id);
                    }
                  }
                : undefined
            }
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              minWidth: 0,
              flex: 1,
              color: !issue.summary ? color.text.subtle : color.text.primary,
              fontStyle: issue.summary ? "normal" : "italic",
              cursor: canEdit ? "text" : "default",
              padding: canEdit ? `${space[2]} ${space[4]}` : 0,
              margin: canEdit ? `0 -${space[4]}` : 0,
              borderRadius: radius.xs,
              transition: "background 120ms ease",
            }}
            onMouseEnter={
              canEdit
                ? (e) => {
                    e.currentTarget.style.background = color.surface.hover;
                  }
                : undefined
            }
            onMouseLeave={
              canEdit
                ? (e) => {
                    e.currentTarget.style.background = "transparent";
                  }
                : undefined
            }
          >
            {issue.summary || "Untitled"}
          </span>
        )}
      </div>
      {issue.progress !== undefined && (
        <div
          style={{
            height: "2px",
            background: color.surface.sunken,
            borderRadius: radius.xs,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${issue.progress}%`,
              height: "100%",
              background: color.accent.background,
              transition: "width 200ms ease",
            }}
          />
        </div>
      )}
    </div>
  );
}

// ---------- inline editable status ----------

export function StatusCell({
  issue,
  onChange,
}: {
  issue: Issue;
  onChange: (status: Status) => void;
}) {
  return (
    <Select
      value={issue.status}
      onValueChange={(v) => onChange(v as Status)}
    >
      <SelectTrigger size="sm" variant="ghost" hideIcon>
        {statusBadge(issue.status)}
      </SelectTrigger>
      <SelectContent>
        {STATUSES.map((s) => (
          <SelectItem key={s} value={s}>
            {statusBadge(s)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ---------- inline editable assignee ----------

function AssigneeOption({ user }: { user: User }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: space[8],
        minWidth: 0,
      }}
    >
      <Avatar name={user.name} size="xs" />
      <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
        {user.name}
      </span>
    </span>
  );
}

export function AssigneeCell({
  issue,
  onChange,
}: {
  issue: Issue;
  onChange: (user: User | null) => void;
}) {
  return (
    <Combobox<User>
      value={issue.assignee ?? null}
      options={USERS}
      getKey={(u) => u.id}
      getLabel={(u) => u.name}
      onSelect={(u) => onChange(u)}
      onClear={() => onChange(null)}
      clearable
      placeholder="Unassigned"
      searchPlaceholder="Search people"
      emptyText="No people match"
      size="sm"
      variant="ghost"
      renderTrigger={(u) => <AssigneeOption user={u} />}
      renderOption={(u) => <AssigneeOption user={u} />}
    />
  );
}

// ---------- type picker menu items ----------

export function TypeMenuItems({
  onPick,
}: {
  onPick: (type: WorkItemType) => void;
}) {
  return (
    <>
      {WORK_ITEM_TYPES.map((t) => (
        <MenuItem key={t} onSelect={() => onPick(t)}>
          <TypeIcon type={t} />
          {WORK_ITEM_TYPE_LABELS[t]}
        </MenuItem>
      ))}
    </>
  );
}

// ---------- footer creator ----------

export function CreateButton({
  onCreate,
}: {
  onCreate: (type: WorkItemType) => void;
}) {
  return (
    <Menu>
      <MenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <Icon name="plus" size={14} />
          Create
        </Button>
      </MenuTrigger>
      <MenuContent align="start">
        <MenuLabel>Create work item</MenuLabel>
        <TypeMenuItems onPick={onCreate} />
      </MenuContent>
    </Menu>
  );
}

// ---------- row hover actions: + add child, ... kebab ----------

function ParentOption({ issue }: { issue: Issue }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: space[8],
        minWidth: 0,
      }}
    >
      <TypeIcon type={issue.type} />
      <span
        style={{
          color: color.text.subtle,
          fontFamily: fontFamily.mono,
          fontSize: fontSize.xs,
          flexShrink: 0,
        }}
      >
        {issue.key}
      </span>
      <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
        {issue.summary}
      </span>
    </span>
  );
}

export function RowActions({
  row,
  data,
  onAddChild,
  onDelete,
  onMoveParent,
}: {
  row: Issue;
  data: Issue[];
  onAddChild: (parentId: string, type: WorkItemType) => void;
  onDelete: (id: string) => void;
  onMoveParent: (rowId: string, newParentId: string) => void;
}) {
  const [actionsOpen, setActionsOpen] = useState(false);

  return (
    <>
      <Menu>
        <MenuTrigger asChild>
          <IconButton
            icon="plus"
            label={`Add child of ${row.key}`}
            size="sm"
          />
        </MenuTrigger>
        <MenuContent align="end">
          <MenuLabel>Create child of {row.key}</MenuLabel>
          <TypeMenuItems onPick={(t) => onAddChild(row.id, t)} />
        </MenuContent>
      </Menu>
      <Menu open={actionsOpen} onOpenChange={setActionsOpen}>
        <MenuTrigger asChild>
          <IconButton
            icon="more-horizontal"
            label={`Actions for ${row.key}`}
            size="sm"
          />
        </MenuTrigger>
        <MenuContent align="end">
          <MenuSub>
            <MenuSubTrigger>Create work item</MenuSubTrigger>
            <MenuSubContent>
              <TypeMenuItems onPick={(t) => onAddChild(row.id, t)} />
            </MenuSubContent>
          </MenuSub>
          <MenuSub>
            <MenuSubTrigger>Move work item</MenuSubTrigger>
            <MenuSubContent>
              <MenuItem disabled>Move up</MenuItem>
              <MenuItem disabled>Move down</MenuItem>
            </MenuSubContent>
          </MenuSub>
          <MenuSub>
            <MenuSubTrigger>Change parent</MenuSubTrigger>
            <MenuSubContent
              style={{ width: "320px", padding: 0 }}
              alignOffset={-4}
            >
              <ComboboxList<Issue>
                options={eligibleParents(data, row.id)}
                getKey={(i) => i.id}
                getLabel={(i) => `${i.key} ${i.summary}`}
                onSelect={(parent) => {
                  onMoveParent(row.id, parent.id);
                  setActionsOpen(false);
                }}
                searchPlaceholder="Search work items"
                emptyText="No matches"
                renderOption={(i) => <ParentOption issue={i} />}
              />
            </MenuSubContent>
          </MenuSub>
          <MenuSeparator />
          <MenuItem disabled>Edit dates</MenuItem>
          <MenuItem disabled>Edit dependencies</MenuItem>
          <MenuSeparator />
          <MenuItem variant="danger" onSelect={() => onDelete(row.id)}>
            Delete
          </MenuItem>
        </MenuContent>
      </Menu>
    </>
  );
}
