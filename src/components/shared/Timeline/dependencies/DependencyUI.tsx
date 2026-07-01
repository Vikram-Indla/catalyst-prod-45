/**
 * DependencyUI — presentational pieces for the timeline dependency mode.
 * All gated behind TimelineView's `depMode`; renders nothing when off.
 *
 * Reuses canonical primitives: JiraIssueTypeIcon, StatusPill + statusToLozenge,
 * @atlaskit/avatar, @atlaskit/select, @atlaskit/button. No hand-rolled lozenges.
 */

import React, { forwardRef, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import CatalystAvatar from '@/components/shared/CatalystAvatar';
import Select from '@atlaskit/select';
import { portalSelectStyles } from '@/lib/select-portal-styles';
import Tooltip from '@atlaskit/tooltip';
import Lozenge from '@atlaskit/lozenge';
import { Plus, Trash2, X, Check, ChevronDown } from '@/lib/atlaskit-icons';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { StatusLozenge } from '@/components/shared/StatusLozenge';
import { statusToLozenge } from '@/modules/project-work-hub/utils/statusToLozenge';
import { ROW_H, HEADER_H } from '../types';
import type { TimelineIssue } from '../types';
import type { DependencyIndex, UiDirection } from './normalize';
import { getEntry } from './normalize';
import type { AggRelation } from './aggregate';
import {
  resolveEffectiveEnd,
  computeLeadTimeDays,
  formatLeadTime,
  sourceLabel,
  type EndDateSource,
} from './leadTime';

export const BLOCKED_COL_W = 150;
export const BLOCKS_COL_W = 150;
export const DEP_PANEL_W = BLOCKED_COL_W + BLOCKS_COL_W;

const cellBorder = '1px solid var(--ds-border)';

/* Jira hover affordance — chevron at the cell's right edge, shown while the row is hovered. */
function DepChevron() {
  return (
    <span aria-hidden style={{
      position: 'absolute', right: 4, top: '48%', transform: 'translateY(-50%)',
      display: 'flex', color: 'var(--ds-text-subtle)', pointerEvents: 'none',
    }}>
      <ChevronDown size={16} />
    </span>
  );
}

/* "+ Add dependency" — shown in an empty dep cell on hover; opens the row dependency card. */
function AddDepLink({ onOpen }: { onOpen: (rect: DOMRect) => void }) {
  return (
    <button
      type="button"
      onClick={(e) => onOpen((e.currentTarget as HTMLElement).getBoundingClientRect())}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 0, padding: 0, border: 'none', background: 'transparent',
        color: 'var(--ds-link)', fontSize: 'var(--ds-font-size-400)', fontWeight: 500, cursor: 'pointer', textDecoration: 'underline',
        fontFamily: 'var(--ds-font-family-body)', whiteSpace: 'nowrap',
      }}
    >
      + Add dependency
    </button>
  );
}

/* Jira dependency marker — small orange folded-corner triangle, top-right of a cell that has a dependency. */
function DepCorner() {
  return (
    <span aria-hidden style={{
      position: 'absolute', top: 0, right: 0, width: 0, height: 0,
      borderTop: '9px solid var(--cat-dep-marker)',
      borderLeft: '9px solid transparent',
    }} />
  );
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  const t = new Date(d);
  if (Number.isNaN(t.getTime())) return '—';
  return t.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

/* Source → ADS Lozenge appearance: due=neutral, sprint=blue, release=green. */
const SOURCE_APPEARANCE: Record<EndDateSource, 'default' | 'inprogress' | 'success'> = {
  due: 'default',
  sprint: 'inprogress',
  release: 'success',
};

/**
 * Lead time = calendar days from today to the dependency item's EFFECTIVE end
 * date, resolved via due → sprint → release. A small badge shows which field
 * produced the date (End date / Sprint / Release) with a tooltip naming it.
 */
function LeadTimeCell({ issue }: { issue?: TimelineIssue }) {
  const resolved = resolveEffectiveEnd({
    dueDate: issue?.dueDate ?? null,
    sprintEndDate: issue?.sprintEndDate ?? null,
    sprintName: issue?.sprintName ?? null,
    releaseDate: issue?.releaseDate ?? null,
    releaseName: issue?.releaseName ?? null,
  });
  if (!resolved.source) {
    return <span style={{ color: 'var(--ds-text-subtlest)', fontSize: 'var(--ds-font-size-400)' }}>—</span>;
  }
  const todayIso = new Date().toISOString().slice(0, 10);
  const text = formatLeadTime(computeLeadTimeDays(resolved.endDate, todayIso));
  const label = sourceLabel(resolved.source);
  const tip = resolved.source === 'due'
    ? `End date: ${fmtDate(resolved.endDate)}`
    : `${resolved.source === 'sprint' ? 'Sprint' : 'Release'}: ${resolved.sourceName ?? '(unnamed)'} · ends ${fmtDate(resolved.endDate)}`;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
      <span style={{ color: 'var(--ds-text)', fontSize: 'var(--ds-font-size-400)', whiteSpace: 'nowrap' }}>{text}</span>
      <Tooltip content={tip} position="top">
        <span><Lozenge appearance={SOURCE_APPEARANCE[resolved.source]}>{label}</Lozenge></span>
      </Tooltip>
    </span>
  );
}

/* ───────────────────────────── column headers ─────────────────────────── */

export function DependencyColumnHeaders({ height }: { height: number }) {
  // Title sits in the BOTTOM band (height HEADER_H); top band stays empty so it
  // aligns with the gantt's two-row (month/week) header.
  const base: React.CSSProperties = {
    height, flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
    fontSize: 'var(--ds-font-size-400)', fontWeight: 600, color: 'var(--ds-text-subtle)',
    background: 'var(--ds-surface-sunken)',
    borderBottom: '2px solid var(--ds-border)',
    borderLeft: cellBorder, userSelect: 'none',
  };
  const titleBand: React.CSSProperties = {
    height: HEADER_H, display: 'flex', alignItems: 'center', paddingLeft: 8,
  };
  return (
    <div style={{ display: 'flex', flexShrink: 0 }} role="row">
      <div role="columnheader" style={{ ...base, width: BLOCKED_COL_W }}><div style={titleBand}>Blocked by</div></div>
      <div role="columnheader" style={{ ...base, width: BLOCKS_COL_W }}><div style={titleBand}>Blocks</div></div>
    </div>
  );
}

/* ───────────────────────────── columns body ───────────────────────────── */

export interface DepRowCount {
  issueKey: string;
  blockedBy: number;
  blocks: number;
}

interface DependencyColumnsBodyProps {
  rows: { issue: TimelineIssue; depth: number }[];
  counts: Map<string, { blockedBy: number; blocks: number }>;
  /** Group-band roll-up shown on the `hubLabel` header row (Jira "N Work items"). */
  groupCounts: { blockedBy: number; blocks: number };
  groupHeight: number;
  showReleases: boolean;
  releasesCollapsed: boolean;
  showCreateEpicRow: boolean;
  onOpenAggregate: (issueKey: string, dir: 'blockedBy' | 'blocks', anchor: DOMRect) => void;
  onOpenGroupAggregate: (dir: 'blockedBy' | 'blocks', anchor: DOMRect) => void;
  /** Keys whose row gets the stripe colour (#F0F1F2) — even top-level units + subtrees. */
  tintKeys: Set<string>;
  /** Shared row hover (synced with the sidebar panel). */
  hoveredKey: string | null;
  onHover: (key: string | null) => void;
}

export const DependencyColumnsBody = forwardRef<HTMLDivElement, DependencyColumnsBodyProps>(
  function DependencyColumnsBody({ rows, counts, groupCounts, groupHeight, showReleases, releasesCollapsed, showCreateEpicRow, onOpenAggregate, onOpenGroupAggregate, tintKeys, hoveredKey, onHover }, ref) {
    const [hoverCell, setHoverCell] = useState<string | null>(null);
    // Jira aligns dependency cell content to the left edge, not centred.
    const cellBase: React.CSSProperties = {
      position: 'relative',
      display: 'flex', alignItems: 'center', justifyContent: 'flex-start',
      borderLeft: cellBorder, paddingLeft: 8, overflow: 'hidden',
    };
    return (
      <div ref={ref} style={{ position: 'relative', width: DEP_PANEL_W, flex: 1, minHeight: 0, flexShrink: 0, overflowY: 'hidden', overflowX: 'hidden', borderLeft: cellBorder }}>
        {/* Full-height column guides — the per-row borders only span rows; these
            carry the Blocked-by / Blocks dividers all the way to the bottom. */}
        <div aria-hidden style={{ position: 'absolute', top: 0, bottom: 0, left: BLOCKED_COL_W, borderLeft: cellBorder, pointerEvents: 'none' }} />
        <div aria-hidden style={{ position: 'absolute', top: 0, bottom: 0, left: DEP_PANEL_W, borderLeft: cellBorder, pointerEvents: 'none' }} />
        {showReleases && (
          <div style={{ display: 'flex', height: groupHeight, flexShrink: 0 }} role="row">
            <div style={{ ...cellBase, width: BLOCKED_COL_W, borderLeft: 'none', height: groupHeight }}>
              {groupCounts.blockedBy > 0
                ? <GroupAggCount count={groupCounts.blockedBy} dir="blockedBy" onOpen={(rect) => onOpenGroupAggregate('blockedBy', rect)} />
                : null}
            </div>
            <div style={{ ...cellBase, width: BLOCKS_COL_W, height: groupHeight }}>
              {groupCounts.blocks > 0
                ? <GroupAggCount count={groupCounts.blocks} dir="blocks" onOpen={(rect) => onOpenGroupAggregate('blocks', rect)} />
                : null}
            </div>
          </div>
        )}
        {!releasesCollapsed && rows.map(({ issue }) => {
          const c = counts.get(issue.issueKey) ?? { blockedBy: 0, blocks: 0 };
          const rowBg = hoveredKey === issue.issueKey
            ? 'var(--cat-dep-row-hover)'
            : tintKeys.has(issue.issueKey)
              ? 'var(--cat-dep-row-bg)'
              : 'transparent';
          return (
            <div
              key={issue.issueKey}
              style={{ display: 'flex', background: rowBg, transition: 'background 80ms ease' }}
              role="row"
              onMouseEnter={() => onHover(issue.issueKey)}
              onMouseLeave={() => onHover(null)}
            >
              <div
                style={{ ...cellBase, width: BLOCKED_COL_W, borderLeft: 'none', height: ROW_H }}
                onMouseEnter={() => setHoverCell(`${issue.issueKey}:blockedBy`)}
                onMouseLeave={() => setHoverCell(null)}
              >
                {c.blockedBy > 0
                  ? <ItemAggCount count={c.blockedBy} aria={`blocked by, ${issue.issueKey}`} onOpen={(rect) => onOpenAggregate(issue.issueKey, 'blockedBy', rect)} />
                  : hoverCell === `${issue.issueKey}:blockedBy`
                    ? <AddDepLink onOpen={(rect) => onOpenAggregate(issue.issueKey, 'blockedBy', rect)} />
                    : null}
                {c.blockedBy > 0 && issue.issueType === 'Epic' && <DepCorner />}
                {c.blockedBy > 0 && hoveredKey === issue.issueKey && <DepChevron />}
              </div>
              <div
                style={{ ...cellBase, width: BLOCKS_COL_W, height: ROW_H }}
                onMouseEnter={() => setHoverCell(`${issue.issueKey}:blocks`)}
                onMouseLeave={() => setHoverCell(null)}
              >
                {c.blocks > 0
                  ? <ItemAggCount count={c.blocks} aria={`blocks, ${issue.issueKey}`} onOpen={(rect) => onOpenAggregate(issue.issueKey, 'blocks', rect)} />
                  : hoverCell === `${issue.issueKey}:blocks`
                    ? <AddDepLink onOpen={(rect) => onOpenAggregate(issue.issueKey, 'blocks', rect)} />
                    : null}
                {c.blocks > 0 && issue.issueType === 'Epic' && <DepCorner />}
                {c.blocks > 0 && hoveredKey === issue.issueKey && <DepChevron />}
              </div>
            </div>
          );
        })}
        {showCreateEpicRow && <div style={{ height: ROW_H, borderBottom: cellBorder, flexShrink: 0 }} aria-hidden />}
      </div>
    );
  },
);

/* Work-item count — Jira renders plain dark "N work item(s)" text (no pill), left-aligned. */
function ItemAggCount({ count, aria, onOpen }: { count: number; aria: string; onOpen: (rect: DOMRect) => void }) {
  return (
    <button
      type="button"
      aria-label={`${count} work item${count === 1 ? '' : 's'} ${aria}`}
      onClick={(e) => onOpen((e.currentTarget as HTMLElement).getBoundingClientRect())}
      style={{
        display: 'inline-flex', alignItems: 'center', height: ROW_H, padding: 0,
        border: 'none', background: 'transparent', whiteSpace: 'nowrap',
        color: 'var(--ds-text)', fontSize: 'var(--ds-font-size-400)', fontWeight: 400,
        cursor: 'pointer', fontFamily: 'var(--ds-font-family-body)',
      }}
    >
      {count} work item{count === 1 ? '' : 's'}
    </button>
  );
}

/* Group-band roll-up — Jira renders "N Work items": number in primary text, label in subtle grey. */
function GroupAggCount({ count, dir, onOpen }: { count: number; dir: 'blockedBy' | 'blocks'; onOpen: (rect: DOMRect) => void }) {
  return (
    <button
      type="button"
      aria-label={`${count} work items ${dir === 'blockedBy' ? 'blocked by' : 'blocks'}`}
      onClick={(e) => onOpen((e.currentTarget as HTMLElement).getBoundingClientRect())}
      style={{
        display: 'inline-flex', alignItems: 'baseline', gap: 4, padding: 0,
        border: 'none', background: 'transparent', whiteSpace: 'nowrap',
        cursor: 'pointer', fontFamily: 'var(--ds-font-family-body)',
      }}
    >
      <span style={{ color: 'var(--ds-text)', fontSize: 'var(--ds-font-size-400)', fontWeight: 400 }}>{count}</span>
      <span style={{ color: 'var(--ds-text-subtlest)', fontSize: 'var(--ds-font-size-400)', fontWeight: 400 }}>Work items</span>
    </button>
  );
}

/* ───────────────────────── aggregate popover ──────────────────────────── */

export interface AggregatePopoverProps {
  title: string;
  dir: 'blockedBy' | 'blocks';
  relations: AggRelation[];
  keyToIssue: Map<string, TimelineIssue>;
  anchor: DOMRect;
  onClose: () => void;
  onOpenItem: (issueKey: string) => void;
}

export function DependencyAggregatePopover({ title, dir, relations, keyToIssue, anchor, onClose, onOpenItem }: AggregatePopoverProps) {
  const AGG_W = 867;
  const top = Math.min(anchor.bottom + 6, window.innerHeight - 360);
  const left = Math.min(Math.max(8, anchor.left - 180), window.innerWidth - (AGG_W + 8));
  const verb = dir === 'blockedBy' ? 'is blocked by' : 'blocks';
  return createPortal(
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 9998 }} aria-hidden />
      <div
        role="dialog"
        aria-label={title}
        style={{
          position: 'fixed', top, left, width: AGG_W, maxHeight: 340, zIndex: 9999,
          background: 'var(--ds-surface-overlay)',
          borderRadius: 4,
          boxShadow: 'var(--ds-shadow-overlay, rgba(30,31,33,0.15) 0px 8px 12px 0px, rgba(30,31,33,0.31) 0px 0px 1px 0px)',
          display: 'flex', flexDirection: 'column',
          fontFamily: 'var(--ds-font-family-body)',
        }}
      >
        <div style={{ padding: '12px 16px 8px', fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: 'var(--ds-text-subtlest)' }}>
          {title}
        </div>
        <div style={{ overflowY: 'auto', paddingBottom: 8 }}>
          {relations.length === 0 && (
            <div style={{ padding: 16, fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text-subtlest)' }}>No dependencies</div>
          )}
          {relations.map((rel) => {
            const member = keyToIssue.get(rel.memberKey);
            const other = keyToIssue.get(rel.otherKey);
            return (
              <div
                key={`${rel.edgeId}`}
                style={{
                  display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 130px minmax(0,1fr)',
                  alignItems: 'center', gap: 8, padding: '8px 16px', fontSize: 'var(--ds-font-size-400)', color: 'var(--ds-text)',
                }}
              >
                <DepItemRef issue={member} fallbackKey={rel.memberKey} onOpen={onOpenItem} />
                <span style={{ color: 'var(--ds-text-subtlest)', flexShrink: 0 }}>{verb}</span>
                <DepItemRef issue={other} fallbackKey={rel.otherKey} onOpen={onOpenItem} />
              </div>
            );
          })}
        </div>
      </div>
    </>,
    document.body,
  );
}

function DepItemRef({ issue, fallbackKey, onOpen }: { issue?: TimelineIssue; fallbackKey: string; onOpen: (k: string) => void }) {
  const type = issue?.issueType ?? null;
  const summary = issue?.summary ?? '';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
      {type ? <JiraIssueTypeIcon type={type} size={16} /> : null}
      <button
        type="button"
        onClick={() => onOpen(fallbackKey)}
        style={{ color: 'var(--ds-link)', fontWeight: 500, textDecoration: 'underline', background: 'none', border: 'none', padding: 0, cursor: 'pointer', flexShrink: 0, fontSize: 'var(--ds-font-size-400)', fontFamily: 'var(--ds-font-family-body)' }}
      >
        {fallbackKey}
      </button>
      {summary && (
        <span style={{ color: 'var(--ds-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {summary}
        </span>
      )}
    </span>
  );
}

/* ─────────────────────────── row dependency card ──────────────────────── */

type PickerOption = { label: string; value: string; issueType: string | null };

export interface RowDependencyCardProps {
  rowKey: string;
  index: DependencyIndex;
  keyToIssue: Map<string, TimelineIssue>;
  candidateOptions: PickerOption[];
  anchor: DOMRect;
  isFiltered: boolean;
  onClose: () => void;
  onRemove: (edgeId: number | string) => Promise<{ ok: boolean; error?: string }>;
  onAdd: (direction: UiDirection, otherKey: string) => Promise<{ ok: boolean; error?: string }>;
  onShowOnCanvas: (key: string) => void;
  onFilter: (key: string) => void;
  onClearFilter: () => void;
}

export function RowDependencyCard(props: RowDependencyCardProps) {
  const { rowKey, index, keyToIssue, candidateOptions, anchor, isFiltered, onClose, onRemove, onAdd, onShowOnCanvas, onFilter, onClearFilter } = props;
  const [adding, setAdding] = useState(false);
  const [dir, setDir] = useState<UiDirection>('is_blocked_by');
  const [picked, setPicked] = useState<PickerOption | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const entry = getEntry(index, rowKey);
  const relRows = useMemo(() => [
    ...entry.blockedBy.map(r => ({ kind: 'Is blocked by' as const, key: r.key, edgeId: r.edgeId, createdAt: r.createdAt })),
    ...entry.blocks.map(r => ({ kind: 'Blocks' as const, key: r.key, edgeId: r.edgeId, createdAt: r.createdAt })),
  ], [entry]);

  const dirOptions: { label: string; value: UiDirection }[] = [
    { label: 'Is blocked by', value: 'is_blocked_by' },
    { label: 'Blocks', value: 'blocks' },
  ];

  const CARD_W = 820;
  const top = Math.min(anchor.bottom + 6, window.innerHeight - 380);
  const left = Math.min(Math.max(8, anchor.left), window.innerWidth - (CARD_W + 8));

  const handleSave = async () => {
    if (!picked) return;
    setBusy(true); setError(null);
    const res = await onAdd(dir, picked.value);
    setBusy(false);
    if (!res.ok) { setError(res.error ?? 'Failed to add'); return; }
    setAdding(false); setPicked(null); setDir('is_blocked_by');
  };

  // Jira column layout: Type 150 · Work item flex · Status 94 · Assignee 94 · Lead time 132 · delete 32.
  const GRID = '150px minmax(0,1fr) 94px 94px 200px 32px';
  const HEADERS = ['Type', 'Work item', 'Status', 'Assignee', 'Lead time', ''];
  const colStyle: React.CSSProperties = { fontSize: 'var(--ds-font-size-400)', fontWeight: 700, color: 'var(--ds-text-subtlest)', textTransform: 'none' };

  return createPortal(
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 9998 }} aria-hidden />
      <div
        role="dialog"
        aria-label={`Dependencies for ${rowKey}`}
        style={{
          position: 'fixed', top, left, width: CARD_W, maxHeight: 420, zIndex: 9999,
          background: 'var(--ds-surface-overlay)',
          borderRadius: 4,
          boxShadow: 'var(--ds-shadow-overlay, rgba(30,31,33,0.15) 0px 8px 12px 0px, rgba(30,31,33,0.31) 0px 0px 1px 0px)',
          display: 'flex', flexDirection: 'column',
          fontFamily: 'var(--ds-font-family-body)',
        }}
      >
        {/* table header */}
        <div style={{ display: 'grid', gridTemplateColumns: GRID, gap: 8, padding: '12px 16px 8px' }}>
          {HEADERS.map((h, i) => <div key={i} style={colStyle}>{h}</div>)}
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {relRows.length === 0 && !adding && (
            <div style={{ padding: 16, fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text-subtlest)' }}>No dependencies yet</div>
          )}
          {relRows.map((r) => {
            const issue = keyToIssue.get(r.key);
            return (
              <div key={`${r.edgeId}`} style={{ position: 'relative', display: 'grid', gridTemplateColumns: GRID, gap: 8, alignItems: 'flex-start', padding: '8px 16px', fontSize: 'var(--ds-font-size-400)', color: 'var(--ds-text)' }}>
                {/* Jira dependency marker bar (warning-bold orange) hugging the row's left edge */}
                <span aria-hidden style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: 'var(--ds-background-warning-bold)' }} />
                <span style={{ color: 'var(--ds-text)' }}>{r.kind}</span>
                <DepItemRef issue={issue} fallbackKey={r.key} onOpen={onShowOnCanvas} />
                <span>{issue?.status ? <StatusLozenge status={issue.status} appearance={statusToLozenge(issue.status)} /> : '—'}</span>
                <span>
                  {issue?.assigneeDisplayName
                    ? <CatalystAvatar size="small" name={issue.assigneeDisplayName} src={issue.assigneeAvatarUrl ?? undefined} />
                    : <CatalystAvatar size="small" />}
                </span>
                <LeadTimeCell issue={issue} />
                <Tooltip content="Remove dependency" position="top">
                  <button
                    type="button"
                    aria-label={`Remove dependency on ${r.key}`}
                    onClick={() => onRemove(r.edgeId)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--ds-text-subtle)', borderRadius: 3 }}
                  >
                    <Trash2 size={16} />
                  </button>
                </Tooltip>
              </div>
            );
          })}

          {/* inline add row */}
          {adding && (
            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 64px', gap: 8, alignItems: 'center', padding: '12px 16px', background: 'var(--ds-background-neutral-subtle)' }}>
              <Select
                options={dirOptions}
                value={dirOptions.find(o => o.value === dir)}
                onChange={(o) => o && setDir(o.value)}
                isDisabled={busy}
                menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
                styles={{ ...portalSelectStyles, menuPortal: (base: any) => ({ ...base, zIndex: 10000 }) }}
                spacing="compact"
              />
              <Select
                options={candidateOptions}
                value={picked}
                onChange={(o) => setPicked(o as PickerOption)}
                placeholder="Choose a work item..."
                isClearable
                isDisabled={busy}
                formatOptionLabel={((opt: PickerOption) => (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    {opt.issueType ? <JiraIssueTypeIcon type={opt.issueType} size={16} /> : null}
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{opt.label}</span>
                  </span>
                )) as any}
                menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
                styles={{ ...portalSelectStyles, menuPortal: (base: any) => ({ ...base, zIndex: 10000 }) }}
                spacing="compact"
              />
              <div style={{ display: 'flex', gap: 0 }}>
                <button
                  type="button"
                  aria-label="Save dependency"
                  disabled={!picked || busy}
                  onClick={handleSave}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, border: 'none', background: 'transparent', cursor: !picked || busy ? 'not-allowed' : 'pointer', color: !picked || busy ? 'var(--ds-text-disabled)' : 'var(--ds-text-success)', borderRadius: 3 }}
                >
                  <Check size={16} />
                </button>
                <button
                  type="button"
                  aria-label="Cancel add dependency"
                  onClick={() => { setAdding(false); setPicked(null); setError(null); }}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--ds-text-subtle)', borderRadius: 3 }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          )}
          {error && (
            <div style={{ padding: '8px 16px', color: 'var(--ds-text-danger)', fontSize: 'var(--ds-font-size-200)' }}>{error}</div>
          )}
        </div>

        {/* footer */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '8px 16px 16px' }}>
          {!adding && (
            <button
              type="button"
              onClick={() => { setAdding(true); setError(null); }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                width: '100%', height: 36, padding: '0 8px',
                border: '1px solid var(--ds-border)', borderRadius: 4,
                background: 'transparent', color: 'var(--ds-text)',
                fontSize: 'var(--ds-font-size-400)', fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--ds-font-family-body)',
              }}
            >
              <Plus size={16} /> Add dependency
            </button>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button type="button" onClick={() => onShowOnCanvas(rowKey)} style={footerLinkStyle}>
              Show dependencies for {rowKey}
            </button>
            <span style={{ color: 'var(--ds-text-subtlest)' }}>·</span>
            {isFiltered ? (
              <button type="button" onClick={onClearFilter} style={footerLinkStyle}>
                Clear filter for {rowKey}
              </button>
            ) : (
              <button type="button" onClick={() => onFilter(rowKey)} style={footerLinkStyle}>
                Filter by dependencies of {rowKey}
              </button>
            )}
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}

const footerLinkStyle: React.CSSProperties = {
  background: 'none', border: 'none', padding: 0, cursor: 'pointer',
  color: 'var(--ds-link)', fontSize: 'var(--ds-font-size-400)', fontWeight: 500, fontFamily: 'var(--ds-font-family-body)',
};
