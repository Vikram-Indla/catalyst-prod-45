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
import React from 'react';
import Lozenge from '@atlaskit/lozenge';
import Avatar from '@atlaskit/avatar';
import { token } from '@atlaskit/tokens';
import { ChevronRight, ChevronDown } from 'lucide-react';
import type { CellProps } from './types';

// ─── Type Icon Cell ────────────────────────────────────────────────────────
// Generic type-icon column. Caller passes the icon node.
export function makeTypeIconCell(getIcon: (row: any) => React.ReactNode) {
  return function TypeIconCell({ row }: CellProps<any>) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20 }}>
        {getIcon(row)}
      </span>
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
        aria-label={expanded ? 'Collapse' : 'Expand'}
        onClick={(e) => { e.stopPropagation(); toggle(row); }}
        style={{
          width: 20,
          height: 20,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: 'none',
          borderRadius: 3,
          background: 'transparent',
          color: token('color.text.subtle', '#42526E'),
          cursor: 'pointer',
          padding: 0,
        }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = token('color.background.neutral.subtle.hovered', '#F4F5F7'))}
        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
      >
        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>
    );
  };
}

// ─── Key (link) Cell ───────────────────────────────────────────────────────
// Jira-faithful key cell.
//
// Measured directly from Jira production DOM 2026-04-26 (BAU-5650 sample row,
// digital-transformation.atlassian.net):
//   - font-family:  "Atlassian Sans" (NOT monospace)
//   - font-size:    14px
//   - font-weight:  400 (regular, NOT bold)
//   - color:        rgb(80, 82, 88)  /  #505258  — neutral subtle, NOT link-blue
//   - text-decoration: none in rest state; underline + bg tint on hover
//
// The hover affordance lives in JiraTable.tsx:
//   [data-jira-table-row-open]:hover { background:#E9F2FF; text-decoration: underline; }
//
// Previously this cell rendered as monospaced bold link-blue (Catalyst's
// pre-2026-04 "opinionated" treatment). The 2026-04-26 audit confirmed Jira
// has long since moved to neutral subtle for the rest state, with the link
// affordance reserved for hover. The canonical now matches.
export function makeKeyCell(getKey: (row: any) => string | null) {
  return function KeyCell({ row }: CellProps<any>) {
    const key = getKey(row);
    return (
      <span
        data-jira-table-row-open
        style={{
          display: 'inline-block',
          padding: '2px 6px',
          margin: '-2px -6px',
          fontFamily: 'inherit', // inherit "Atlassian Sans" from JiraTable root
          fontWeight: 400,
          color: token('color.text.subtle', '#505258'),
          fontSize: 14,
          letterSpacing: 0,
        }}
      >
        {key || '—'}
      </span>
    );
  };
}

// ─── Summary (text) Cell ───────────────────────────────────────────────────
// Plain text with truncation. Inline edit happens via editors.SummaryEditor —
// wire it on the column with `onCellEdit`.
export function makeSummaryCell(getSummary: (row: any) => string) {
  return function SummaryCell({ row }: CellProps<any>) {
    return (
      <span
        style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          flex: 1,
        }}
      >
        {getSummary(row)}
      </span>
    );
  };
}

// ─── Status Lozenge ────────────────────────────────────────────────────────
// Kept for legacy callers. The type vocabulary maps to our new StatusPill
// below which uses Jira's actual measured colors instead of Atlaskit Lozenge's
// all-caps bold default.
export type LozengeAppearance =
  | 'default'
  | 'inprogress'
  | 'success'
  | 'removed'
  | 'moved'
  | 'new';

/**
 * StatusPill — Jira-faithful status lozenge.
 *
 * Measured directly from Jira production DOM on 2026-04-18:
 *   - bg (to-do family):     rgb(221, 222, 225)  / #DDDEE1
 *   - bg (in-progress fam.): rgb(223, 237, 255)  / #DFEDFF  (estimated; Atlaskit inprogress)
 *   - bg (done family):      rgb(179, 223, 114)  / #B3DF72
 *   - text color:            rgb(41, 42, 46)     / #292A2E  (all families)
 *   - text is SENTENCE CASE — not uppercase
 *   - font-weight 400 — NOT bold
 *   - font-size 14 / padding 0 4px / border-radius 3px
 */
export function StatusPill({
  appearance,
  children,
}: {
  appearance: LozengeAppearance;
  children: React.ReactNode;
}) {
  // Map the 6-value vocabulary to the 3 Jira color families.
  const palette = (() => {
    switch (appearance) {
      case 'inprogress':
      case 'new':
      case 'moved':
        return { bg: '#DFEDFF', fg: '#0055CC' };
      case 'success':
        return { bg: '#B3DF72', fg: '#292A2E' };
      case 'removed':
        return { bg: '#FFD2CC', fg: '#5D1F1A' };
      case 'default':
      default:
        return { bg: '#DDDEE1', fg: '#292A2E' };
    }
  })();
  // Re-measured 2026-04-26 (Jira BAU-5650, "Ready for QA" lozenge):
  //   - font-size 14px / weight 400 / radius 3px / padding 0 4px
  //   - rendered box height 16px (line-height 16px, tight against text)
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '0 4px',
        borderRadius: 3,
        background: palette.bg,
        color: palette.fg,
        fontSize: 14,
        fontWeight: 400,
        lineHeight: '16px',
        letterSpacing: 0,
        textTransform: 'none',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
}

export function makeStatusCell(
  getStatus: (row: any) => string | null,
  appearanceFor: (status: string | null) => LozengeAppearance,
  labelFor?: (status: string | null) => string,
) {
  return function StatusCell({ row }: CellProps<any>) {
    const status = getStatus(row);
    if (!status) return <span style={{ color: token('color.text.subtlest', '#7A869A') }}>—</span>;
    return (
      <StatusPill appearance={appearanceFor(status)}>
        {labelFor ? labelFor(status) : status}
      </StatusPill>
    );
  };
}

// ─── Assignee (avatar + name) Cell ─────────────────────────────────────────
export interface AssigneeCellInput {
  name: string | null;
  avatarUrl?: string | null;
}

export function makeAssigneeCell(getAssignee: (row: any) => AssigneeCellInput | null) {
  return function AssigneeCell({ row }: CellProps<any>) {
    const a = getAssignee(row);
    if (!a || !a.name) {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <Avatar size="small" appearance="circle" />
          <span data-jira-cell-ghost>Unassigned</span>
        </span>
      );
    }
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
        <Avatar size="small" name={a.name} src={a.avatarUrl || undefined} appearance="circle" />
        <span
          style={{
            color: '#292A2E',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
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

export function makeParentCell(getParent: (row: any) => ParentCellInput | null) {
  return function ParentCell({ row }: CellProps<any>) {
    const p = getParent(row);
    if (!p) return <span style={{ color: token('color.text.subtlest', '#7A869A') }}>—</span>;
    const display = p.key ? `${p.key} — ${p.label}` : p.label;
    // Measured directly from Jira production DOM 2026-04-18:
    //   bg #227D9B, white text, 2px 4px padding, 3px radius.
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          maxWidth: 260,
          padding: '2px 6px',
          borderRadius: 3,
          background: '#227D9B',
          color: '#FFFFFF',
          fontSize: 12,
          fontWeight: 500,
          lineHeight: '18px',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
        }}
        title={display}
      >
        {p.icon && (
          <span style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
            {p.icon}
          </span>
        )}
        {p.key && <strong style={{ fontWeight: 700 }}>{p.key}</strong>}
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', opacity: 0.92 }}>
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
    const hasCount = typeof n === 'number' && n > 0;
    const content = hasCount ? (
      <span style={{ color: token('color.text.subtle', '#42526E') }}>{n} comment{n === 1 ? '' : 's'}</span>
    ) : (
      <span data-jira-cell-ghost>Add comment</span>
    );
    if (!onOpen) return content;
    return (
      <button
        type="button"
        data-jira-cell-editor
        onClick={(e) => { e.stopPropagation(); onOpen(row); }}
        style={{
          background: 'transparent',
          border: 'none',
          padding: '2px 6px',
          margin: '-2px -6px',
          borderRadius: 3,
          cursor: 'pointer',
          fontFamily: 'inherit',
          fontSize: 'inherit',
          textAlign: 'left',
        }}
      >
        {content}
      </button>
    );
  };
}

// ─── Priority bars Cell ────────────────────────────────────────────────────
const PRIORITY_ORDER = ['critical', 'highest', 'high', 'medium', 'low', 'lowest'];
export function makePriorityCell(getPriority: (row: any) => string | null) {
  return function PriorityCell({ row }: CellProps<any>) {
    const p = (getPriority(row) || '').toLowerCase();
    const idx = PRIORITY_ORDER.indexOf(p);
    const level = idx >= 0 ? PRIORITY_ORDER.length - idx : 0;
    const color =
      level >= 4 ? token('color.icon.danger',  '#E5484D') :
      level >= 3 ? token('color.icon.warning', '#F59E0B') :
      level >= 1 ? token('color.icon.success', '#22C55E') :
      token('color.border', '#DFE1E6');
    const inactive = token('color.border', '#DFE1E6');
    return (
      <span style={{ display: 'inline-flex', gap: 2 }} title={p || 'No priority'}>
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
export function makeDateCell(
  getISO: (row: any) => string | null,
  format: (iso: string) => string = (iso) =>
    new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }),
) {
  return function DateCell({ row }: CellProps<any>) {
    const iso = getISO(row);
    return iso ? (
      <span style={{ color: token('color.text.subtle', '#42526E'), fontSize: 13 }}>{format(iso)}</span>
    ) : (
      <span style={{ color: token('color.text.subtlest', '#7A869A') }}>—</span>
    );
  };
}
