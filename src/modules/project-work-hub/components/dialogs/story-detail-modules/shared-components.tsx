/**
 * StoryDetailModal — Shared UI components
 * SectionBlock, IssueRow, ColumnPicker, InlineCreateRow, SkeletonRows, EmptyState,
 * StatusLozenge, JiraStatusPill, IssueIcon, Skel, DetailRow
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronDown, ChevronRight, Plus, GripVertical, Edit2, Link2, Trash2,
  Check, Eye, EyeOff, Settings2, Loader2, X, AlertTriangle,
} from 'lucide-react';
import type { ColumnConfig, PhIssueRow, StatusCategory } from './types';
import { LOZENGE, PRIORITY_COLORS, WORK_ITEM_ICONS } from './constants';
import { getStatusCategory, getStatusStyle, getAvatarColor, formatDateShort } from './helpers';
import { detailLabelStyle, detailValueStyle } from './constants';

/* ── IssueIcon ─────────────────────────────── */
export function IssueIcon({ type, size = 16 }: { type: string; size?: number }) {
  const t = type?.toLowerCase() || '';
  if (t.includes('epic')) return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none"><rect width="16" height="16" rx="3" fill="#6554C0"/><path d="M10.5 3.5L6.5 8.5h3l-4 4" stroke="#FFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
  );
  if (t.includes('bug') || t.includes('defect')) return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none"><rect width="16" height="16" rx="3" fill="#FF5630"/><circle cx="8" cy="8" r="3" fill="#FFF"/></svg>
  );
  if (t.includes('sub')) return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none"><rect width="16" height="16" rx="3" fill="#0052CC"/><rect x="4" y="4" width="4" height="4" rx="0.5" fill="#FFF"/><rect x="8" y="8" width="4" height="4" rx="0.5" fill="#FFF" opacity="0.7"/></svg>
  );
  if (t.includes('incident')) return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none"><path d="M8 1L15 14H1L8 1Z" fill="#FF5630"/><rect x="7.25" y="5" width="1.5" height="5" rx="0.75" fill="#FFF"/><circle cx="8" cy="12" r="0.75" fill="#FFF"/></svg>
  );
  if (t.includes('task')) return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none"><rect width="16" height="16" rx="3" fill="#4BADE8"/><path d="M4.5 8.5L7 11L11.5 5.5" stroke="#FFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
  );
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none"><rect width="16" height="16" rx="3" fill="#36B37E"/><path d="M5 2h6v10.5L8 10l-3 2.5V2z" fill="#FFF"/></svg>
  );
}

/* ── StatusLozenge ─────────────────────────── */
export function StatusLozenge({ status, category }: { status: string; category?: string | null }) {
  const cat = category?.toLowerCase() || getStatusCategory(status);
  let bg = '#DFE1E6', color = '#253858';
  if (cat === 'done') { bg = '#E3FCEF'; color = '#006644'; }
  else if (cat === 'in_progress' || cat === 'inprogress') { bg = '#DEEBFF'; color = '#0747A6'; }
  return (
    <span style={{
      display: 'inline-block', height: 20, lineHeight: '20px', fontSize: 11,
      fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em',
      borderRadius: 3, padding: '0 6px', whiteSpace: 'nowrap',
      background: bg, color,
    }}>{status}</span>
  );
}

/* ── JiraStatusPill ────────────────────────── */
export function JiraStatusPill({ status, category }: { status: string; category: string }) {
  const style = getStatusStyle(status, category);
  return (
    <span style={{
      display: 'inline-block', height: 22, lineHeight: '22px', fontSize: 11,
      fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
      borderRadius: 4, padding: '0 8px', whiteSpace: 'nowrap',
      background: style.bg, color: style.text,
    }}>{status}</span>
  );
}

/* ── Skel ──────────────────────────────────── */
export function Skel({ w, h = 14 }: { w: number | string; h?: number }) {
  return <div style={{ width: w, height: h, borderRadius: 4, background: '#F1F5F9', animation: 'sdm-pulse 1.5s ease-in-out infinite' }} />;
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
        <span className="sdm-status-lozenge" style={LOZENGE[item.status_category]}>{item.status}</span>
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
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', right: 0, width: 200, background: '#fff', border: '1px solid rgba(9,30,66,.24)', borderRadius: 6, boxShadow: '0 6px 16px rgba(9,30,66,.15)', zIndex: 60, overflow: 'hidden', paddingBottom: 4 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#6B778C', textTransform: 'uppercase', letterSpacing: '.05em', padding: '6px 12px 6px', borderBottom: '1px solid rgba(9,30,66,.1)' }}>Visible columns</div>
          {COLS.map(col => (
            <div key={col.key} onClick={() => toggle(col.key)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', cursor: 'pointer', transition: 'background .12s' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(9,30,66,.04)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ width: 14, height: 14, borderRadius: 3, border: `1.5px solid ${columns[col.key] ? '#2563EB' : 'rgba(9,30,66,.24)'}`, background: columns[col.key] ? '#2563EB' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background .12s, border-color .12s' }}>
                {columns[col.key] && <Check size={9} color="#fff" strokeWidth={3} />}
              </div>
              <span style={{ fontSize: 12, color: '#172B4D' }}>{col.label}</span>
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
