/**
 * JiraTable -- canonical cell renderers.
 *
 * Each renderer is a small function-component built ONLY on @atlaskit/* primitives.
 * They're consumed via `<Column>.cell` so a page can mix-and-match.
 *
 * For inline-editable cells, the editor lives in editors.tsx and the render
 * here is just the visual representation; the editor is opened by the column's
 * own `onCellEdit` wiring (see JiraTable.tsx).
 */
import React from "react";
import ReactDOM from "react-dom";
import Avatar from "@atlaskit/avatar";
import { UnassignedAvatar, toStatusCategory, isTerminalStatus } from "@/components/ads";
import CommentIcon from "@atlaskit/icon/glyph/comment";
import DragHandleIcon from "@atlaskit/icon/glyph/drag-handler";
import MoreIcon from "@atlaskit/icon/glyph/more";
import { token } from "@atlaskit/tokens";
import AkChevronRightIcon from "@atlaskit/icon/glyph/chevron-right";
import AkChevronDownIcon from "@atlaskit/icon/glyph/chevron-down";
import DropdownMenu, {
  DropdownItem,
  DropdownItemGroup,
} from "@atlaskit/dropdown-menu";
import { IssueHoverCard } from "@/components/shared/IssueHoverCard";
import { StatusLozengeDropdown } from "@/components/shared/StatusLozenge";
import { useCanonicalIssueWorkflow } from "@/hooks/useCanonicalIssueWorkflow";

function appearanceToWorkflowCategory(ap: LozengeAppearance): string {
  // Jira dropdown buckets only To Do / In Progress / Done.
  // Map 6-tier ADS appearances onto those 3:
  //   success / removed (cancelled/closed terminal) → done
  //   inprogress / moved (on hold, blocked = active but paused) → in_progress
  //   new / default → todo
  if (ap === 'success' || ap === 'removed') return 'done';
  if (ap === 'inprogress' || ap === 'moved') return 'in_progress';
  return 'todo';
}
import type { CellProps } from "./types";

// ─── Checkbox Cell ─────────────────────────────────────────────────────────
// Multi-select checkbox. Caller provides isChecked and onChange handlers.
export function makeCheckboxCell({
  isChecked,
  onChange,
}: {
  isChecked: (row: any) => boolean;
  onChange: (row: any, checked: boolean) => void;
}) {
  return function CheckboxCell({ row }: CellProps<any>) {
    const checked = isChecked(row);
    return (
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(row, e.target.checked)}
        aria-label="Select row"
        style={{
          cursor: "pointer",
          width: 16,
          height: 16,
          margin: 0,
        }}
      />
    );
  };
}

// ─── Type Icon Cell ────────────────────────────────────────────────────────
// Generic type-icon column. Caller passes the icon node.
export function makeTypeIconCell(getIcon: (row: any) => React.ReactNode) {
  return function TypeIconCell({ row }: CellProps<any>) {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 20,
          height: 20,
        }}
      >
        {getIcon(row)}
      </span>
    );
  };
}

// ─── Drag Handle Cell ──────────────────────────────────────────────────────
// Row-hover drag affordance. Shows a 6-dot drag handle icon only when dragging
// is enabled (no active sort AND no grouping). Visible on hover, hidden at rest.
export function makeDragHandleCell(isDragEnabled: () => boolean) {
  return function DragHandleCell({ row }: CellProps<any>) {
    if (!isDragEnabled()) return null;
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 20,
          height: 20,
          cursor: "grab",
          color: token("color.text.subtle", "var(--ds-text-subtle)"),
        }}
        className="jira-drag-handle"
      >
        <DragHandleIcon label="" size="small" />
      </span>
    );
  };
}

// ─── Row Menu Cell ─────────────────────────────────────────────────────────
// Row-level actions menu (⋯ more-actions button). Visible on row hover only.
// Caller provides action handlers (onOpen, onMove, onDelete).
export function makeRowMenuCell({
  onOpen,
  onMove,
  onDelete,
}: {
  onOpen?: (row: any) => void;
  onMove?: (row: any) => void;
  onDelete?: (row: any) => void;
}) {
  return function RowMenuCell({ row }: CellProps<any>) {
    return (
      <DropdownMenu
        trigger={({ triggerRef, ...triggerProps }) => (
          <button
            {...triggerProps}
            ref={triggerRef}
            type="button"
            aria-label="More actions"
            className="jira-row-menu-trigger"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 32,
              height: 32,
              padding: 0,
              border: "none",
              borderRadius: 3,
              background: "transparent",
              color: token("color.text.subtle", "var(--ds-text-subtle)"),
              cursor: "pointer",
              opacity: 0,
              transition: "opacity 120ms ease, background 100ms ease",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = token(
                "color.background.neutral.subtle.hovered",
                "var(--ds-background-neutral-subtle)",
              );
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
            }}
          >
            <MoreIcon label="" size="small" />
          </button>
        )}
      >
        <DropdownItemGroup>
          {onOpen && (
            <DropdownItem
              onClick={(e) => {
                e.preventDefault();
                onOpen(row);
              }}
            >
              Open
            </DropdownItem>
          )}
          {onMove && (
            <DropdownItem
              onClick={(e) => {
                e.preventDefault();
                onMove(row);
              }}
            >
              Move to...
            </DropdownItem>
          )}
        </DropdownItemGroup>
        {onDelete && (
          <DropdownItemGroup>
            <DropdownItem
              onClick={(e) => {
                e.preventDefault();
                onDelete(row);
              }}
            >
              <span style={{ color: "var(--ds-text-danger)" }}>
                Delete
              </span>
            </DropdownItem>
          </DropdownItemGroup>
        )}
      </DropdownMenu>
    );
  };
}

// ─── Caret Cell ────────────────────────────────────────────────────────────
// Renders a >/v expand caret on rows that have children. Toggles via the
// supplied `toggle` callback (parent owns expandedSet state).
export function makeCaretCell({
  hasChildren,
  isExpanded,
  toggle,
}: {
  hasChildren: (row: any) => boolean;
  isExpanded: (row: any) => boolean;
  toggle: (row: any) => void;
}) {
  return function CaretCell({ row }: CellProps<any>) {
    if (!hasChildren(row)) return null;
    const expanded = isExpanded(row);
    return (
      <button
        type="button"
        data-jira-table-editor
        aria-label={expanded ? "Collapse" : "Expand"}
        onClick={(e) => {
          e.stopPropagation();
          toggle(row);
        }}
        style={{
          width: 20,
          height: 20,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          border: "none",
          borderRadius: 3,
          background: "transparent",
          color: token("color.text.subtle", "var(--ds-text-subtle)"),
          cursor: "pointer",
          padding: 0,
        }}
        onMouseEnter={(e) =>
          ((e.currentTarget as HTMLElement).style.background = token(
            "color.background.neutral.subtle.hovered",
            "var(--ds-background-neutral-subtle)",
          ))
        }
        onMouseLeave={(e) =>
          ((e.currentTarget as HTMLElement).style.background = "transparent")
        }
      >
        {expanded ? (
          <AkChevronDownIcon label="" size="small" />
        ) : (
          <AkChevronRightIcon label="" size="small" />
        )}
      </button>
    );
  };
}

// ─── Key (link) Cell ───────────────────────────────────────────────────────
// Jira-faithful key cell.
//
// Key cell style — re-measured 2026-05-12 against user-provided Jira screenshot
// (digital-transformation.atlassian.net BAU list view, current production):
//   - font-size:    14px
//   - font-weight:  400
//   - color:        color.link (#0C66E4) — blue, underlined at rest
//   - text-decoration: underline at rest state (Jira parity confirmed visually)
//
// NOTE: 2026-04-26 comment claiming #505258/grey was stale — current Jira
// production renders keys as blue+underlined links in rest state.
export function makeKeyCell(
  getKey: (row: any) => string | null,
  /**
   * When provided, the key renders as an `<a>` element (Jira parity: key cell
   * is `<a class="css-... issue-key">` with href to the issue). Left-click
   * calls `onOpen` and `preventDefault` so the SPA panel opens instead of
   * navigating; middle-click / Ctrl+click falls through to the browser (opens
   * the URL in a new tab) — matching Jira's UX exactly.
   *
   * `getHref` lets the caller supply the link URL (e.g. `?selectedIssue=<id>`
   * or `/project-hub/:key/allwork?issue=<key>`). Defaults to `#` when omitted.
   *
   * `getIcon` (2026-05-17 jira-compare): when provided, the cell renders a
   * leading icon before the key, matching Jira's "Work" column where the
   * type glyph sits in the same cell as the key. Use this to retire a
   * standalone __type column for icon-only parity surfaces.
   */
  onOpen?: (row: any) => void,
  getHref?: (row: any) => string,
  getIcon?: (row: any) => React.ReactNode,
  /**
   * Optional handler invoked when the user clicks the hover-only "open in
   * side panel" trigger rendered at the end of the cell. When provided,
   * a sidebar-icon button appears on row hover (and on focus-visible).
   * Click bubbling is stopped so the row's own onClick doesn't double-fire.
   */
  onSidebarClick?: (row: any) => void,
) {
  return function KeyCell({ row, isFocused }: CellProps<any>) {
    const key = getKey(row);
    const icon = getIcon ? getIcon(row) : null;
    // When focused (detail panel open): block + 100% width so the blue border
    // spans the full column cell width — matching Jira's full-width selection
    // indicator on the open-detail row's key cell.
    const sharedStyle: React.CSSProperties = isFocused
      ? {
          display: "block",
          width: "100%",
          boxSizing: "border-box",
          fontFamily: "inherit",
          fontWeight: 400,
          color: token("color.link", "var(--ds-link)"),
          fontSize: 'var(--ds-font-size-400)',
          letterSpacing: 0,
          whiteSpace: "nowrap",
          cursor: "pointer",
          textDecoration: "underline",
          border: `2px solid ${token("color.border.focused", "var(--ds-border-focused)")}`,
          borderRadius: 3,
          padding: "0px 6px",
        }
      : {
          display: "inline-flex",
          alignItems: "center",
          padding: "0 2px",
          fontFamily: "inherit",
          fontWeight: 400,
          color: token("color.link", "var(--ds-link)"),
          fontSize: 'var(--ds-font-size-400)',
          lineHeight: 1,
          letterSpacing: 0,
          whiteSpace: "nowrap",
          cursor: "pointer",
          textDecoration: "underline",
        };
    // 2026-06-28: keyNode is a plain <span> — no <a href>, no navigation
     // semantics. Click opens the modal via onOpen. Previously used <a> with
     // preventDefault, but some downstream handler still triggered navigation.
     // Removing the anchor element entirely guarantees no nav can fire.
    let keyNode: React.ReactNode;
    if (onOpen) {
      keyNode = (
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            onOpen(row);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              onOpen(row);
            }
          }}
          style={sharedStyle}
        >
          {key || "—"}
        </span>
      );
    } else {
      keyNode = (
        <span style={sharedStyle}>
          {key || "—"}
        </span>
      );
    }
    // Type icon only — no sidebar swap. The single sidebar affordance lives
    // on the Summary cell's right-edge hover button (editors.tsx); per Vikram
    // we never replace the type icon, which is the row's primary identifier.
    const iconSlot = icon ? (
      <span
        className="jira-row-key-icon-slot"
        style={{
          display: "inline-flex",
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </span>
    ) : null;
    if (iconSlot) {
      return (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          {iconSlot}
          {keyNode}
        </span>
      );
    }
    return wrapped;
  };
}

// ─── Summary (text) Cell ───────────────────────────────────────────────────
// Plain text with truncation. Inline edit happens via editors.SummaryEditor —
// wire it on the column with `onCellEdit`.
//
// Apr 27, 2026 (L60): typography per Jira-parity spec — 14/20/400 with
// `color.text` (var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse)))). Inherits from JiraTable's tbody td baseline so
// no explicit fontSize is needed here; only truncation behavior.
//
// Tooltip on truncated text is the user's spec requirement — added via
// the `title` attribute (browser-native tooltip; Atlaskit Tooltip is
// heavier and overkill for "show full text on hover when truncated").
export function makeSummaryCell(getSummary: (row: any) => string) {
  return function SummaryCell({ row }: CellProps<any>) {
    const summary = getSummary(row);
    return (
      <span
        title={summary}
        // Jira parity (2026-06-28): summary cell stays LTR/left-aligned, NO
        // dir="auto". Verified against live Jira (digital-transformation
        // MDT-281/282, Arabic summaries): every ancestor span→td→tr→table is
        // direction:ltr; text-align:start with no dir attribute. The browser's
        // Unicode bidi algorithm orders Arabic glyphs inside the run on its
        // own; the block itself is LTR. dir="auto" right-aligned Arabic and
        // diverged from Jira. See JiraTable/editors.tsx for the matching cells.
        style={{
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          flex: 1,
          // 2026-05-08 DOM probe: Jira summary links = rgb(80,82,88) = --ds-text-subtle.
          // Catalyst was inheriting --ds-text (rgb 41,42,46 — near-black). Fixed.
          color: "var(--ds-text-subtle)",
        }}
      >
        {summary}
      </span>
    );
  };
}

// LozengeAppearance type re-exported for callers (tasksListColumns, stories).
// The pill component itself lives at @/components/shared/StatusLozenge.
export type { LozengeAppearance } from '@/components/shared/StatusLozenge';

export function makeStatusCell(
  getStatus: (row: any) => string | null,
  appearanceFor: (status: string | null) => LozengeAppearance,
  labelFor?: (status: string | null) => string,
) {
  return function StatusCell({ row }: CellProps<any>) {
    const status = getStatus(row);
    if (!status)
      return (
        <span style={{ color: token("color.text.subtlest", "var(--ds-text-subtlest)") }}>
          —
        </span>
      );
    const displayLabel = labelFor ? labelFor(status) : status;
    return (
      <StatusLozengeDropdown
        status={displayLabel}
        interactive={false}
        size="sm"
      />
    );
  };
}

// ─── Status Edit Cell ────────────────────────────────────────────────────────
// Delegates entirely to the canonical StatusLozengeDropdown so every JiraTable
// status cell renders the same pill, popover border, chevron, and selection
// styling as the detail-modal status dropdown. No bespoke popup here.
export function makeStatusEditCell<T>(opts: {
  getStatus: (row: T) => string | null;
  options: string[];
  appearanceFor: (s: string | null) => LozengeAppearance;
  labelFor?: (s: string) => string;
  onChange: (row: T, next: string) => void;
  canEdit?: (row: T) => boolean;
  lockWhenDone?: boolean;
  getIssueType?: (row: T) => string | null;
}) {
  return function StatusEditCell({ row }: CellProps<T>) {
    const status = opts.getStatus(row);
    const issueType = opts.getIssueType ? opts.getIssueType(row) : null;
    const canonical = useCanonicalIssueWorkflow(issueType);
    const effectiveOptions = canonical.isCanonical
      ? canonical.getAvailableStatuses(status).filter((s) => !canonical.requiresReason(status, s) || s === status)
      : opts.options;
    const displayLabel = (s: string | null): string =>
      canonical.isCanonical ? canonical.labelForStatus(s) : (opts.labelFor && s ? opts.labelFor(s) : (s ?? ""));
    const callerEditable = opts.canEdit ? opts.canEdit(row) : true;

    if (!status) {
      return <span style={{ color: token("color.text.subtlest", "var(--ds-text-subtlest)") }}>—</span>;
    }

    // Build dropdown options in canonical {value, label, color_category} format.
    const dropdownOptions = effectiveOptions.map((s) => ({
      value: s,
      label: displayLabel(s),
      color_category: appearanceToWorkflowCategory(opts.appearanceFor(s)),
    }));

    return (
      <span data-jira-cell-editor style={{ display: "inline-flex", alignItems: "center" }}>
        <StatusLozengeDropdown
          status={displayLabel(status)}
          statusCategory={appearanceToWorkflowCategory(opts.appearanceFor(status))}
          statusOptions={dropdownOptions}
          onStatusChange={(next) => opts.onChange(row, next)}
          interactive={callerEditable}
          size="sm"
          lockWhenDone={opts.lockWhenDone !== false}
        />
      </span>
    );
  };
}

// ─── Assignee (avatar + name) Cell ─────────────────────────────────────────
export interface AssigneeCellInput {
  name: string | null;
  avatarUrl?: string | null;
}

export function makeAssigneeCell(
  getAssignee: (row: any) => AssigneeCellInput | null,
) {
  return function AssigneeCell({ row }: CellProps<any>) {
    const a = getAssignee(row);
    if (!a || !a.name) {
      return (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <UnassignedAvatar size={22} />
          <span data-jira-cell-ghost>Unassigned</span>
        </span>
      );
    }
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          overflow: "hidden",
        }}
      >
        <Avatar
          size="small"
          name={a.name}
          src={a.avatarUrl || undefined}
          appearance="circle"
        />
        <span
          style={{
            color: token(
              "color.text",
              "var(--cp-text-primary, var(--cp-text-inverse))",
            ),
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {a.name}
        </span>
      </span>
    );
  };
}

// ─── Parent Cell — Jira-faithful: issue-type icon + key + summary ─────────
// Jira's list view parent chip shows the parent's TYPE ICON inline with
// the key and summary on a subtle tinted background. Our previous version
// used a plain green Lozenge with only text, which lost the "this is an
// Epic" signal. Now the parent cell accepts an optional icon prefix so
// callers pass `<JiraIssueTypeIcon type="Epic" size={14} />` or similar.
export interface ParentCellInput {
  key: string | null;
  label: string;
  /** Parent's work-item type icon (e.g. Epic / Story). Rendered inline. */
  icon?: React.ReactNode;
}

export function makeParentCell(
  getParent: (row: any) => ParentCellInput | null,
) {
  return function ParentCell({ row }: CellProps<any>) {
    const p = getParent(row);
    if (!p)
      return (
        <span style={{ color: token("color.text.subtlest", "var(--ds-text-subtlest)") }}>
          —
        </span>
      );
    const display = p.key ? `${p.key} — ${p.label}` : p.label;
    // Measured directly from Jira production DOM 2026-04-18:
    //   bg #227D9B, white text, 2px 4px padding, 3px radius.
    return (
      // Re-measured 2026-04-26 (Jira list view, Epic parent ref like
      // "IRP-81 M4 - Profiles"): Jira renders the parent ref as an
      // Atlaskit lozenge with appearance="success" — soft mint green bg,
      // dark text, with the parent's type icon (purple lightning for
      // Epic) prepended in its native color. NOT the previous teal
      // (#227D9B/white) which was a Catalyst opinion.
      //
      //   bg: #B3DF72 (matches StatusPill 'success' family)
      //   color: #292A2E (primary text)
      //   font-size: 12px / weight 500 / line-height 16px
      //   padding: 0px 6px / radius 3px
      //   icon retains native color (e.g. Epic = purple)
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          maxWidth: 260,
          padding: "0px 6px",
          borderRadius: 3,
          background: "var(--cp-jira-epic-chip-bg)",
          color: "var(--cp-jira-epic-chip-fg)",
          fontSize: 'var(--ds-font-size-200)',
          fontWeight: 500,
          lineHeight: "16px",
          overflow: "hidden",
          whiteSpace: "nowrap",
        }}
        title={display}
      >
        {p.icon && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              flexShrink: 0,
            }}
          >
            {p.icon}
          </span>
        )}
        {p.key && <strong style={{ fontWeight: 700 }}>{p.key}</strong>}
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {p.label}
        </span>
      </span>
    );
  };
}

// ─── Comments Cell ─────────────────────────────────────────────────────────
// The Comments column is not inline-editable (writing a comment requires the
// full side-panel context). But it IS accessible: clicking the cell opens
// the detail panel so the user can land on the Comments section. Pass
// `onOpen` to wire that behaviour in consumers.
export function makeCommentsCell(
  getCount: (row: any) => number | null,
  onOpen?: (row: any) => void,
) {
  return function CommentsCell({ row }: CellProps<any>) {
    const n = getCount(row);
    const hasCount = typeof n === "number" && n > 0;
    // Jira-parity: both "N comments" and "Add comment" show the chat icon.
    // "Add comment" is always visible (not hover-only) — Jira shows it at rest.
    const content = (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          color: token("color.text.subtle", "var(--ds-text-subtle)"),
        }}
      >
        {/* Icon wrapper: relative container for the blue dot badge when hasCount */}
        <span
          style={{
            position: "relative",
            display: "inline-flex",
            color: token("color.icon.subtle", "var(--ds-text-subtlest)"),
          }}
        >
          <CommentIcon label="" size="small" />
          {hasCount && (
            <span
              aria-hidden="true"
              style={{
                position: "absolute",
                top: 0,
                right: 0,
                width: 6,
                height: 6,
                borderRadius: "50%",
                backgroundColor: token(
                  "color.background.information.bold",
                  "var(--ds-link)",
                ),
                border: `1.5px solid ${token("elevation.surface", "var(--ds-surface)")}`,
                boxSizing: "border-box",
              }}
            />
          )}
        </span>
        {hasCount ? (
          `${n} comment${n === 1 ? "" : "s"}`
        ) : (
          <span
            data-jira-cell-ghost
            style={{ color: token("color.text.subtlest", "var(--ds-text-subtlest)") }}
          >
            Add comment
          </span>
        )}
      </span>
    );
    if (!onOpen) return content;
    return (
      <button
        type="button"
        data-jira-cell-editor
        onClick={(e) => {
          e.stopPropagation();
          onOpen(row);
        }}
        style={{
          background: "transparent",
          border: "none",
          padding: "0px 6px",
          margin: "-2px -6px",
          borderRadius: 3,
          cursor: "pointer",
          fontFamily: "inherit",
          fontSize: "inherit",
          textAlign: "left",
        }}
      >
        {content}
      </button>
    );
  };
}

// ─── Priority bars Cell ────────────────────────────────────────────────────
const PRIORITY_ORDER = [
  "critical",
  "highest",
  "high",
  "medium",
  "low",
  "lowest",
];
export function makePriorityCell(getPriority: (row: any) => string | null) {
  return function PriorityCell({ row }: CellProps<any>) {
    const p = (getPriority(row) || "").toLowerCase();
    const idx = PRIORITY_ORDER.indexOf(p);
    const level = idx >= 0 ? PRIORITY_ORDER.length - idx : 0;
    const color =
      level >= 4
        ? token("color.icon.danger", "#E5484D")
        : level >= 3
          ? token("color.icon.warning", "var(--cp-amber)")
          : level >= 1
            ? token("color.icon.success", "#22C55E")
            : token(
                "color.border",
                "var(--cp-lozenge-grey-bg, var(--cp-border-neutral))",
              );
    const inactive = token(
      "color.border",
      "var(--cp-lozenge-grey-bg, var(--cp-border-neutral))",
    );
    return (
      <span
        style={{ display: "inline-flex", gap: 0 }}
        title={p || "No priority"}
      >
        {[1, 2, 3, 4].map((i) => (
          <span
            key={i}
            style={{
              width: 4,
              height: 16,
              borderRadius: 1,
              background: i <= level ? color : inactive,
            }}
          />
        ))}
      </span>
    );
  };
}

// ─── Date Cell ─────────────────────────────────────────────────────────────
//
// Apr 27, 2026 (L63): canonical Jira-parity date cell — calendar icon
// prefix + bordered pill background, matching Jira's Created/Updated
// columns where every date renders as `📅 27 Apr 26` in a subtle
// rounded border. Spec requires:
//   - Atlaskit calendar icon (NOT Lucide) — using @atlaskit/icon/glyph/calendar
//   - 12px / 16px line-height / weight 400 / color.text.subtle (per Jira-parity
//     spec; was 13px previously)
//   - Subtle border + 3px radius around the date "chip" mirrors Jira's
//     bordered date affordance
//
// This is the SOLE date renderer for the JiraTable. Other date sites
// across Catalyst that don't yet use makeDateCell should adopt this
// component (sweep targets: see L63 lessons).
export function makeDateCell(
  getISO: (row: any) => string | null,
  format: (iso: string) => string = (iso) => {
    const d = new Date(iso);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  },
) {
  return function DateCell({ row }: CellProps<any>) {
    const iso = getISO(row);
    if (!iso) {
      return (
        <span style={{ color: token("color.text.subtlest", "var(--ds-text-subtlest)") }}>
          —
        </span>
      );
    }
    const display = format(iso);
    const fullIso = new Date(iso).toLocaleString("en-GB", {
      dateStyle: "long",
      timeStyle: "short",
    });
    return (
      <span
        title={fullIso}
        style={{
          color: token("color.text.subtle", "var(--ds-text-subtle)"),
          fontSize: 'var(--ds-font-size-400)',
          lineHeight: "20px",
          fontWeight: 400,
          whiteSpace: "nowrap",
        }}
      >
        {display}
      </span>
    );
  };
}

// ─── Labels Cell ─────────────────────────────────────────────────────────────
// Renders label tags as Jira-style outlined chips. Measured from Jira live DOM:
//   bg transparent, border 1px solid var(--cp-lozenge-grey-bg, var(--cp-border-neutral)), borderRadius 4px, padding 0px 4px,
//   fontSize 14px, fontWeight 400, color #292A2E.
export function makeLabelsCell(getLabels: (row: any) => string[] | null) {
  return function LabelsCell({ row }: CellProps<any>) {
    const labels = getLabels(row);
    if (!labels || labels.length === 0) {
      return (
        <span style={{ color: token("color.text.subtlest", "var(--ds-text-subtlest)") }}>
          —
        </span>
      );
    }
    return (
      <span style={{ display: "inline-flex", flexWrap: "wrap", gap: 4 }}>
        {labels.map((label) => (
          <span
            key={label}
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "0 4px",
              borderRadius: 4,
              border: `1px solid ${token("color.border", "var(--cp-lozenge-grey-bg, var(--cp-border-neutral))")}`,
              fontSize: 'var(--ds-font-size-400)',
              fontWeight: 400,
              lineHeight: "20px",
              color: token("color.text", "var(--ds-text)"),
              whiteSpace: "nowrap",
            }}
          >
            {label}
          </span>
        ))}
      </span>
    );
  };
}

// ─── Sprint/Iteration Cell ─────────────────────────────────────────────────────────
// Renders sprint/release versions as comma-separated plain text. Sprint/release versions are not
// inline-editable in this column cell — editing happens via the bulk wizard
// or detail panel. Matches Jira's list column display.
export function makeSprintReleaseCell(
  getSprintRelease: (row: any) => string[] | null | undefined,
) {
  return function SprintReleaseCell({ row }: CellProps<any>) {
    const raw = getSprintRelease(row);
    // Normalise: Jira stores sprint_release as JSON array of {id,name,...} objects.
    // Extract .name (or coerce to string) so we never pass an object to React.
    const versions = raw
      ? (raw as any[])
          .map((v) => (typeof v === "string" ? v : (v?.name ?? String(v))))
          .filter(Boolean)
      : [];
    if (versions.length === 0) {
      return (
        <span style={{ color: token("color.text.subtlest", "var(--ds-text-subtlest)") }}>
          —
        </span>
      );
    }
    // jira-compare 2026-05-20: Live DOM probe confirms sprint-release pill =
    // transparent bg + 0.556px solid rgb(183,185,190) border + 4px radius +
    // 0px 4px padding + 14px/400 text. Matches @atlaskit/tag appearance="default".
    return (
      <span style={{ display: "inline-flex", flexWrap: "wrap", gap: 4 }}>
        {versions.map((v) => (
          <span
            key={v}
            style={{
              display: "inline-block",
              border:
                "0.556px solid var(--ds-border-neutral, rgb(183,185,190))",
              borderRadius: 4,
              padding: "0px 4px",
              fontSize: 'var(--ds-font-size-400)',
              fontWeight: 400,
              color: token("color.text", "var(--ds-text)"),
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: 160,
              lineHeight: "20px",
            }}
            title={v}
          >
            {v}
          </span>
        ))}
      </span>
    );
  };
}
