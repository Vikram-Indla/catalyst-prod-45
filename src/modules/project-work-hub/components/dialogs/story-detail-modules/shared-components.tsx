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
import { StatusLozenge as CanonicalStatusLozenge } from '@/components/shared/StatusLozenge';
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
/** Thin wrapper preserving the local `{status, category}` contract. Delegates to canonical StatusLozenge. */
export function StatusLozenge({ status, category }: { status: string; category?: string | null }) {
  return <CanonicalStatusLozenge status={status} statusCategory={category ?? undefined} />;
}

/* ── JiraStatusPill ────────────────────────── */
/** Bold-size status pill. Delegates to canonical StatusLozenge at 'md' size. */
export function JiraStatusPill({ status, category }: { status: string; category: string }) {
  return <CanonicalStatusLozenge status={status} statusCategory={category ?? undefined} size="md" />;
}

/* ── Skel ──────────────────────────────────── */
export function Skel({ w, h = 14 }: { w: number | string; h?: number }) {
  return <div style={{ width: w, height: h, borderRadius: 4, background: 'var(--ds-surface-sunken, var(--cp-bg-sunken, var(--cp-bg-sunken)))', animation: 'sdm-pulse 1.5s ease-in-out infinite' }} />;
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
            {expanded ? <ChevronDownIcon label="" size="small" /> : <ChevronRightIcon label="" size="small" />}
          </button>
          <span className="sdm-child-title">{title}</span>
          {count > 0 && <span className="sdm-count-badge">{count}</span>}
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
  const avatarColor = item.assignee_display_name ? getAvatarColor(item.assignee_display_name) : 'var(--ds-background-neutral-bold)';
  const avatarInitial = item.assignee_display_name?.charAt(0).toUpperCase() ?? '?';
  return (
    <div className="sdm-child-row" role="listitem">
      <span className="sdm-drag-handle"><DragHandlerIcon label="Drag" /></span>
      <span className="sdm-type-icon" dangerouslySetInnerHTML={{ __html: WORK_ITEM_ICONS[item.issue_type] ?? WORK_ITEM_ICONS.task }} />
      <span className="sdm-child-key" style={isDone ? { color: 'var(--ds-shadow-raised)' } : {}}>{item.issue_key}</span>
      <span className={`sdm-child-summary${isDone ? ' sdm-child-summary--done' : ''}`}>{item.summary}</span>
      {columns.status && (
        <span className="sdm-status-lozenge">
          {/* §20 / L41 — Canonical StatusLozenge; appearance derived from status string. */}
          <StatusLozenge status={item.status} category={item.status_category} />
        </span>
      )}
      {columns.assignee && (
        <div className="sdm-child-avatar" style={{ background: avatarColor }} title={item.assignee_display_name ?? 'Unassigned'}>{avatarInitial}</div>
      )}
      {columns.priority && (
        <div className="sdm-priority-dot" style={{ background: PRIORITY_COLORS[item.priority] ?? 'var(--ds-background-neutral-bold)' }} title={item.priority} />
      )}
      {columns.created && (
        <span className="sdm-date-col" title={item.jira_created_at ?? ''}>{formatDateShort(item.jira_created_at)}</span>
      )}
      {columns.updated && (
        <span className="sdm-date-col" title={item.jira_updated_at ?? ''}>{formatDateShort(item.jira_updated_at)}</span>
      )}
      <div className="sdm-row-actions">
        <button className="sdm-row-action-btn" title="Edit" onClick={e => e.stopPropagation()}><EditIcon label="Edit" /></button>
        <button className="sdm-row-action-btn" title="Copy link" onClick={e => { e.stopPropagation(); onCopyLink(); }}><LinkIcon label="Copy link" /></button>
        <button className="sdm-row-action-btn sdm-row-action-btn--danger" title="Delete" onClick={e => { e.stopPropagation(); onDelete(); }}><DeleteIcon label="Delete" /></button>
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
        <SettingsIcon label="Columns" /> Columns
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', right: 0, width: 200, background: 'var(--ds-surface)', border: '1px solid var(--ds-shadow-raised)', borderRadius: 6, boxShadow: '0 6px 16px var(--ds-shadow-raised)', zIndex: 60, overflow: 'hidden', paddingBottom: 4 }}>
          <div style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 700, color: 'var(--ds-text-subtlest, var(--cp-text-secondary))', textTransform: 'uppercase', letterSpacing: '.05em', padding: '4px 12px 6px', borderBottom: '1px solid var(--ds-background-neutral-subtle-pressed)' }}>Visible columns</div>
          {COLS.map(col => (
            <div key={col.key} onClick={() => toggle(col.key)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 12px', cursor: 'pointer', transition: 'background .12s' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--ds-background-neutral-subtle-hovered)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ width: 14, height: 14, borderRadius: 3, border: `1.5px solid ${columns[col.key] ? 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))' : 'var(--ds-shadow-raised)'}`, background: columns[col.key] ? 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))' : 'var(--ds-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background .12s, border-color .12s' }}>
                {columns[col.key] && <CheckMarkIcon label="" color="var(--ds-surface)" />}
              </div>
              <span style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse)))' }}>{col.label}</span>
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
        {pending ? <Spinner size="small" /> : <CheckMarkIcon label="Confirm" />}
      </button>
      <button className="sdm-cancel-btn" onClick={onCancel}><CrossIcon label="Cancel" size="small" /></button>
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
      <WarningIcon label="Warning" />
      <div className="sdm-child-empty-heading">{heading}</div>
      <div className="sdm-child-empty-sub">{sub}</div>
      {cta && onCta && <button className="sdm-child-empty-cta" onClick={onCta}>{cta}</button>}
    </div>
  );
}
