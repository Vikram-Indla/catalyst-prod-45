/**
 * StoryDetailModal — Shared UI components
 * SectionBlock, IssueRow, ColumnPicker, InlineCreateRow, SkeletonRows, EmptyState,
 * StatusLozenge, JiraStatusPill, IssueIcon, Skel, DetailRow
 */
import React, { useState, useEffect, useRef } from 'react';
import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';
import ChevronRightIcon from '@atlaskit/icon/glyph/chevron-right';
import DragHandlerIcon from '@atlaskit/icon/core/drag-handle';
import EditIcon from '@atlaskit/icon/core/edit';
import LinkIcon from '@atlaskit/icon/core/link';
import DeleteIcon from '@atlaskit/icon/core/delete';
import CheckMarkIcon from '@atlaskit/icon/core/check-mark';
import SettingsIcon from '@atlaskit/icon/core/settings';
import Spinner from '@atlaskit/spinner';
import CrossIcon from '@atlaskit/icon/glyph/cross';
import WarningIcon from '@atlaskit/icon/core/warning';
import type { ColumnConfig, PhIssueRow, StatusCategory } from './types';
import { LOZENGE, PRIORITY_COLORS, WORK_ITEM_ICONS } from './constants';
import { getStatusCategory, getAvatarColor, formatDateShort } from './helpers';
import { detailLabelStyle, detailValueStyle } from './constants';
import Lozenge from '@atlaskit/lozenge';
import { statusToLozenge } from '../../../utils/statusToLozenge';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';

/* ── IssueIcon ─────────────────────────────── */
/**
 * §21 / ICON-GUARDRAIL — Thin delegation to the canonical Jira issue-type
 * icon resolver at `src/lib/jira-issue-type-icons.tsx` ("RESET ICONS").
 *
 * Previously this component contained hand-rolled inline SVGs that:
 *   (a) only covered 5 types (epic / bug / sub / incident / task) and
 *       fell through to a green bookmark for everything else — so
 *       "Business Request" rendered as a STORY icon instead of the
 *       canonical amber lightbulb.
 *   (b) drifted from the canonical palette (Task was #4BADE8 here vs
 *       #2684FF in the canonical — two different blues shipping side by
 *       side).
 *
 * Keeping the `IssueIcon` export name + prop contract so no call sites
 * need to change. All rendering now goes through the SVG files in
 * `/admin/icons/jira/*.svg` via `JiraIssueTypeIcon`.
 */
export function IssueIcon({ type, size = 16 }: { type: string; size?: number }) {
  return <JiraIssueTypeIcon type={type} size={size} />;
}

/* ── StatusLozenge ─────────────────────────── */
/**
 * §20 / L41 — Thin Atlaskit wrapper. Keeps the external prop contract
 * (`{status, category}`) so no call sites need to change. The `category`
 * prop is kept for backward-compat but the actual appearance is derived
 * purely from the status string via `statusToLozenge`, which is the single
 * source of truth. This is why "In UAT" no longer renders cyan.
 */
export function StatusLozenge({ status, category: _category }: { status: string; category?: string | null }) {
  return <Lozenge appearance={statusToLozenge(status)}>{status}</Lozenge>;
}

/* ── JiraStatusPill ────────────────────────── */
/**
 * §20 / L41 — Same Atlaskit wrapper, rendered with `isBold` for the
 * emphasised pill variant (used in history rows / current-status summary
 * where a heavier pill reads better in dense prose).
 */
export function JiraStatusPill({ status, category: _category }: { status: string; category: string }) {
  return <Lozenge appearance={statusToLozenge(status)} isBold>{status}</Lozenge>;
}

/* ── Skel ──────────────────────────────────── */
export function Skel({ w, h = 14 }: { w: number | string; h?: number }) {
  return <div style={{ width: w, height: h, borderRadius: 4, background: 'var(--ds-surface-sunken, #F1F5F9)', animation: 'sdm-pulse 1.5s ease-in-out infinite' }} />;
}

/* ── DetailRow ─────────────────────────────── */
export function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <div style={detailLabelStyle}>{label}</div>
      <div style={detailValueStyle}>{children}</div>
    </>
  );
}

/* ── SectionBlock ──────────────────────────── */
export interface SectionBlockProps {
  title: string;
  count: number;
  doneCount?: number;
  defaultExpanded?: boolean;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
}

export function SectionBlock({ title, count, doneCount, defaultExpanded = true, headerRight, children }: SectionBlockProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  return (
    <div className="sdm-child-issues">
      <div className="sdm-child-header">
        <div className="sdm-child-header-left">
          <button className="sdm-chevron-btn" onClick={() => setExpanded(e => !e)} aria-expanded={expanded}>
            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
          <span className="sdm-child-title">{title}</span>
          <span className="sdm-count-badge">{count}</span>
        </div>
        {expanded && doneCount !== undefined && count > 0 && (
          <div className="sdm-progress-block" title={`${doneCount} of ${count} done`}>
            <div className="sdm-progress-track">
              <div className="sdm-progress-fill" style={{ width: `${count ? Math.round((doneCount / count) * 100) : 0}%` }} />
            </div>
            <span className="sdm-progress-text">{doneCount} / {count}</span>
          </div>
        )}
        {expanded && headerRight && (
          <div className="sdm-child-header-right">{headerRight}</div>
        )}
      </div>
      {expanded && <div>{children}</div>}
    </div>
  );
}

/* ── IssueRow ──────────────────────────────── */
export interface IssueRowProps {
  item: PhIssueRow;
  columns: ColumnConfig;
  onDelete: () => void;
  onCopyLink: () => void;
}

export function IssueRow({ item, columns, onDelete, onCopyLink }: IssueRowProps) {
  const isDone = item.status_category === 'done';
  const avatarColor = item.assignee_display_name ? getAvatarColor(item.assignee_display_name) : '#8993A4';
  const avatarInitial = item.assignee_display_name?.charAt(0).toUpperCase() ?? '?';
  return (
    <div className="sdm-child-row" role="listitem">
      <span className="sdm-drag-handle"><GripVertical size={12} /></span>
      <span className="sdm-type-icon" dangerouslySetInnerHTML={{ __html: WORK_ITEM_ICONS[item.issue_type] ?? WORK_ITEM_ICONS.task }} />
      <span className="sdm-child-key" style={isDone ? { color: 'rgba(9,30,66,0.4)' } : {}}>{item.issue_key}</span>
      <span className={`sdm-child-summary${isDone ? ' sdm-child-summary--done' : ''}`}>{item.summary}</span>
      {columns.status && (
        <span className="sdm-status-lozenge">
          {/* §20 / L41 — Atlaskit Lozenge only; no inline LOZENGE[category] styles. */}
          <Lozenge appearance={statusToLozenge(item.status)}>{item.status}</Lozenge>
        </span>
      )}
      {columns.assignee && (
        <div className="sdm-child-avatar" style={{ background: avatarColor }} title={item.assignee_display_name ?? 'Unassigned'}>{avatarInitial}</div>
      )}
      {columns.priority && (
        <div className="sdm-priority-dot" style={{ background: PRIORITY_COLORS[item.priority] ?? '#8993A4' }} title={item.priority} />
      )}
      {columns.created && (
        <span className="sdm-date-col" title={item.jira_created_at ?? ''}>{formatDateShort(item.jira_created_at)}</span>
      )}
      {columns.updated && (
        <span className="sdm-date-col" title={item.jira_updated_at ?? ''}>{formatDateShort(item.jira_updated_at)}</span>
      )}
      <div className="sdm-row-actions">
        <button className="sdm-row-action-btn" title="Edit" onClick={e => e.stopPropagation()}><Edit2 size={11} /></button>
        <button className="sdm-row-action-btn" title="Copy link" onClick={e => { e.stopPropagation(); onCopyLink(); }}><Link2 size={11} /></button>
        <button className="sdm-row-action-btn sdm-row-action-btn--danger" title="Delete" onClick={e => { e.stopPropagation(); onDelete(); }}><Trash2 size={11} /></button>
      </div>
    </div>
  );
}

/* ── ColumnPicker ──────────────────────────── */
export function ColumnPicker({ columns, onChange }: { columns: ColumnConfig; onChange: (c: ColumnConfig) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);
  const toggle = (key: keyof ColumnConfig) => onChange({ ...columns, [key]: !columns[key] });
  const COLS: { key: keyof ColumnConfig; label: string }[] = [
    { key: 'status', label: 'Status' }, { key: 'assignee', label: 'Assignee' },
    { key: 'priority', label: 'Priority' }, { key: 'created', label: 'Created' },
    { key: 'updated', label: 'Updated' },
  ];
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className="sdm-visibility-btn" onClick={() => setOpen(o => !o)} title="Configure visible columns">
        <Settings2 size={11} /> Columns
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', right: 0, width: 200, background: 'var(--ds-surface, #fff)', border: '1px solid rgba(9,30,66,.24)', borderRadius: 6, boxShadow: '0 6px 16px rgba(9,30,66,.15)', zIndex: 60, overflow: 'hidden', paddingBottom: 4 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ds-text-subtlest, #6B778C)', textTransform: 'uppercase', letterSpacing: '.05em', padding: '6px 12px 6px', borderBottom: '1px solid rgba(9,30,66,.1)' }}>Visible columns</div>
          {COLS.map(col => (
            <div key={col.key} onClick={() => toggle(col.key)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', cursor: 'pointer', transition: 'background .12s' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(9,30,66,.04)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ width: 14, height: 14, borderRadius: 3, border: `1.5px solid ${columns[col.key] ? 'var(--ds-text-brand, #2563EB)' : 'rgba(9,30,66,.24)'}`, background: columns[col.key] ? 'var(--ds-text-brand, #2563EB)' : 'var(--ds-surface, #fff)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background .12s, border-color .12s' }}>
                {columns[col.key] && <Check size={9} color="var(--ds-surface, #fff)" strokeWidth={3} />}
              </div>
              <span style={{ fontSize: 12, color: 'var(--ds-text, #172B4D)' }}>{col.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── InlineCreateRow ───────────────────────── */
export interface InlineCreateRowProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  pending: boolean;
  typeIcon: string;
  onTypeToggle?: () => void;
  placeholder: string;
}

export const InlineCreateRow = React.forwardRef<HTMLInputElement, InlineCreateRowProps>(
  ({ value, onChange, onSubmit, onCancel, pending, typeIcon, onTypeToggle, placeholder }, ref) => (
    <div className="sdm-create-row">
      <button className="sdm-type-select-btn" onClick={onTypeToggle} title="Toggle type">
        <span dangerouslySetInnerHTML={{ __html: typeIcon }} />
      </button>
      <input ref={ref} className="sdm-create-input" type="text" placeholder={placeholder} value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onSubmit(); } if (e.key === 'Escape') onCancel(); }}
        maxLength={255} />
      <button className="sdm-confirm-btn" onClick={onSubmit} disabled={!value.trim() || pending}>
        {pending ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
      </button>
      <button className="sdm-cancel-btn" onClick={onCancel}><X size={13} /></button>
    </div>
  )
);
InlineCreateRow.displayName = 'InlineCreateRow';

/* ── SkeletonRows ──────────────────────────── */
export function SkeletonRows({ count = 3 }: { count?: number }) {
  return (
    <div>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="sdm-skeleton-row">
          <div className="sdm-skeleton-pulse" style={{ width: 15, height: 15 }} />
          <div className="sdm-skeleton-pulse" style={{ width: 55, height: 12 }} />
          <div className="sdm-skeleton-pulse" style={{ flex: 1, height: 12 }} />
          <div className="sdm-skeleton-pulse" style={{ width: 55, height: 18 }} />
          <div className="sdm-skeleton-pulse" style={{ width: 22, height: 22, borderRadius: '50%' }} />
        </div>
      ))}
    </div>
  );
}

/* ── EmptyState ────────────────────────────── */
export function EmptyState({ heading, sub, cta, onCta }: { heading: string; sub: string; cta?: string; onCta?: () => void }) {
  return (
    <div className="sdm-child-empty">
      <AlertTriangle size={28} color="#8993A4" />
      <div className="sdm-child-empty-heading">{heading}</div>
      <div className="sdm-child-empty-sub">{sub}</div>
      {cta && onCta && <button className="sdm-child-empty-cta" onClick={onCta}>{cta}</button>}
    </div>
  );
}
