/**
 * CellRenderers — V12 Hybrid Precision with canonical Jira SVG icons
 * All colors use CSS custom properties for dark mode compliance
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { format, differenceInDays } from 'date-fns';
import type { RequestStatus } from '@/types/request';
import { STATUS_DISPLAY, getPriorityLevel, getAvatarColor, getInitials } from '@/types/request';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { BusinessRequestIcon } from '@/components/producthub/shared/BusinessRequestBadge';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import Avatar from '@atlaskit/avatar';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveUsers } from '@/hooks/useActiveUsers';

/* ── Type mapping helper ── */
function mapBrTypeToIconType(requestType: string): string {
  const t = (requestType || '').toLowerCase().trim();
  // request_type values: 'feature', 'gap', 'integration', 'data_request'
  if (t === 'gap') return 'business gap';
  if (t === 'data_request' || t === 'data request') return 'task'; // Data requests use task icon
  return t; // 'feature' and 'integration' map directly
}

/* ── Status Cell ── */
export const StatusCell = React.memo(function StatusCell({ status }: { status: RequestStatus }) {
  const s = STATUS_DISPLAY[status];
  return (
    <StatusBadge status={s.label} />
  );
});

/* ── Priority Cell — V12: Colored horizontal bars ── */
export const PriorityCell = React.memo(function PriorityCell({ score }: { score: number | null }) {
  const filled = score === null ? 0 : score >= 4.0 ? 4 : score >= 3.0 ? 3 : score >= 2.0 ? 2 : score >= 1.0 ? 1 : 0;
  const colors = ['#4ADE80', '#FBBF24', '#F97316', 'var(--ds-text-danger, #EF4444)'];
  const fillColor = filled === 0 ? 'var(--cp-border-default)' : colors[Math.min(filled - 1, 3)];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      {[1, 2, 3, 4].map(i => (
        <span key={i} style={{
          width: 14, height: 3, borderRadius: 2,
          background: i <= filled ? fillColor : 'var(--cp-border-default)',
        }} />
      ))}
    </div>
  );
});

/* ── Score Cell — V12: Green vertical bars ── */
export const ScoreCell = React.memo(function ScoreCell({ score }: { score: number | null }) {
  const filled = score === null ? 0 : Math.min(5, Math.max(0, Math.round(score)));
  const heights = [4, 6, 8, 10, 13, 16];
  return (
    <div style={{ display: 'inline-flex', alignItems: 'flex-end', gap: 2, height: 16 }}>
      {[1, 2, 3, 4, 5, 6].map(i => (
        <span key={i} style={{
          width: 4, height: heights[i - 1], borderRadius: '2px 2px 0 0',
          background: i <= filled ? 'var(--cp-success-60)' : 'var(--cp-border-default)',
        }} />
      ))}
    </div>
  );
});

/* ── Assignee Cell — Atlaskit Avatar + inline picker ── */
export const AssigneeCell = React.memo(function AssigneeCell({
  name, avatarUrl, requestId,
}: { name: string | null; avatarUrl?: string; requestId?: string }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const queryClient = useQueryClient();
  const { data: users = [] } = useActiveUsers();

  const openPicker = useCallback((e: React.MouseEvent) => {
    if (!requestId) return;
    e.stopPropagation();
    const r = triggerRef.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + 4, left: r.left });
    setSearch('');
    setOpen(true);
  }, [requestId]);

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (
        triggerRef.current?.contains(e.target as Node) ||
        popupRef.current?.contains(e.target as Node)
      ) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  const handleSelect = useCallback(async (userId: string, userName: string) => {
    if (!requestId) return;
    setSaving(true);
    setOpen(false);
    await (supabase as any).from('ph_requests').update({ assignee_id: userId }).eq('id', requestId);
    queryClient.invalidateQueries({ queryKey: ['requests-backlog'] });
    setSaving(false);
  }, [requestId, queryClient]);

  const filtered = users.filter(u =>
    !search ||
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()),
  );

  const trigger = (
    <button
      ref={triggerRef}
      onClick={openPicker}
      title={requestId ? 'Click to change assignee' : undefined}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        background: 'none', border: 'none', padding: 0, cursor: requestId ? 'pointer' : 'default',
        borderRadius: 4, outline: 'none',
        opacity: saving ? 0.5 : 1,
      }}
    >
      <Avatar
        src={avatarUrl}
        name={name || 'Unassigned'}
        size="small"
        appearance="circle"
      />
      <span style={{ fontSize: 13, color: name ? 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))' : 'var(--cp-text-muted)' }}>
        {name || 'Unassigned'}
      </span>
    </button>
  );

  const picker = open ? createPortal(
    <div
      ref={popupRef}
      style={{
        position: 'fixed', top: pos.top, left: pos.left, zIndex: 99999,
        width: 240, maxHeight: 280, overflowY: 'auto',
        background: 'var(--ds-surface-overlay, #fff)',
        border: '1px solid var(--ds-border, var(--cp-lozenge-grey-bg, var(--cp-border-neutral, #DFE1E6)))',
        borderRadius: 4, boxShadow: '0 4px 16px rgba(0,0,0,0.16)',
        fontFamily: 'var(--cp-font-body)',
      }}
    >
      <div style={{ padding: '8px 8px 4px' }}>
        <input
          autoFocus
          placeholder="Search people…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          onClick={e => e.stopPropagation()}
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: '6px 8px', fontSize: 13, border: '2px solid var(--ds-border-focused, var(--cp-primary-60, #0052CC))',
            borderRadius: 3, outline: 'none', background: 'var(--ds-background-input, #fff)',
            color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))',
          }}
        />
      </div>
      {filtered.map(u => (
        <button
          key={u.id}
          onClick={e => { e.stopPropagation(); handleSelect(u.id, u.full_name || u.email); }}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            width: '100%', padding: '7px 10px', border: 'none',
            background: 'none', cursor: 'pointer', textAlign: 'left',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--ds-background-neutral-subtle-hovered, var(--cp-bg-sunken, #F4F5F7))'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; }}
        >
          <Avatar src={u.avatar_url || undefined} name={u.full_name || u.email} size="xsmall" />
          <span style={{ fontSize: 13, color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {u.full_name || u.email}
          </span>
        </button>
      ))}
      {filtered.length === 0 && (
        <div style={{ padding: '10px 12px', fontSize: 13, color: 'var(--cp-text-muted)' }}>No users found</div>
      )}
    </div>,
    document.body,
  ) : null;

  return <>{trigger}{picker}</>;
});

/* ── Date Cell ── */
export const DateCell = React.memo(function DateCell({ date, status }: { date: string | null; status?: RequestStatus }) {
  if (!date) return <span style={{ color: 'var(--cp-text-muted)', fontSize: 13 }}>—</span>;
  const parsed = new Date(date);
  if (isNaN(parsed.getTime())) return <span style={{ color: 'var(--cp-text-muted)', fontSize: 13 }}>—</span>;
  const formatted = format(parsed, 'MMM dd, yyyy');

  const terminalStatuses: RequestStatus[] = ['done', 'cancelled'];
  const isOverdue = status && !terminalStatuses.includes(status) && parsed < new Date();
  const isSoon = status && !terminalStatuses.includes(status) && !isOverdue && differenceInDays(parsed, new Date()) <= 14;

  let color = 'var(--cp-text-tertiary)';
  if (isOverdue) color = 'var(--cp-danger-60)';
  else if (isSoon) color = 'var(--cp-warning-60)';

  return (
    <span className="pb-date" style={{ color, fontWeight: isOverdue || isSoon ? 500 : 400, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      {isOverdue && (
        <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
          <path d="M7 1L13 12H1L7 1Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M7 6V8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="7" cy="10.25" r="0.75" fill="currentColor" />
        </svg>
      )}
      {formatted}
    </span>
  );
});

/* ── Progress Cell ── */
export const ProgressCell = React.memo(function ProgressCell({ value, status }: { value: number; status?: RequestStatus }) {
  const clamped = Math.min(Math.max(value, 0), 100);
  const done = status === 'done' || clamped >= 100;
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 40, height: 4, borderRadius: 4, background: 'var(--cp-bg-sunken)', overflow: 'hidden', flexShrink: 0 }}>
        <div style={{ width: `${clamped}%`, height: '100%', borderRadius: 4, background: done ? 'var(--cp-success-60)' : 'var(--cp-primary-60)', transition: 'width 300ms ease' }} />
      </div>
      <span className="pb-progress-label" style={{ minWidth: 28, fontFamily: 'var(--cp-font-mono)', fontSize: 12, fontVariantNumeric: 'tabular-nums', color: 'var(--cp-text-tertiary)' }}>{clamped}%</span>
    </div>
  );
});

/* ── EA Review Cell ── */
export const EACell = React.memo(function EACell({ value }: { value?: boolean | null }) {
  if (value === true) return <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--cp-danger-60)', background: 'var(--cp-danger-10)', padding: '2px 8px', borderRadius: 4 }}>Required</span>;
  if (value === false) return <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--cp-success-60)', background: 'var(--cp-success-10)', padding: '2px 8px', borderRadius: 4 }}>Not Required</span>;
  return <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--cp-warning-60)', background: 'var(--cp-warning-10)', padding: '2px 8px', borderRadius: 4 }}>Pending</span>;
});

/* ── Quarter Cell ── */
export const QuarterCell = React.memo(function QuarterCell({ value }: { value: string | null }) {
  if (!value) return <span style={{ color: 'var(--cp-text-muted)', fontSize: 13 }}>—</span>;
  return <span className="pb-quarter">{value}</span>;
});

/* ── ID Cell ── */
export const IDCell = React.memo(function IDCell({ value }: { value: string }) {
  return <span className="pb-id">{value}</span>;
});

/* ── Type Icon Cell — single Business Request icon ── */
export const TypeIconCell = React.memo(function TypeIconCell() {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} title="Business Request">
      <BusinessRequestIcon size={14} />
    </span>
  );
});

/* ── Type Cell — Block D (2026-05-01)
   Renders the ticket type as icon + lozenge label. Reads from
   `request.request_type` (feature, gap, integration, data_request)
   and maps to JiraIssueTypeIcon. Falls back to "Business Request"
   so legacy Catalyst rows without request_type render. */
export const TypeCell = React.memo(function TypeCell({ requestType }: { requestType?: string | null }) {
  const displayLabel = requestType
    ? requestType.charAt(0).toUpperCase() + requestType.slice(1).replace(/_/g, ' ')
    : 'Business Request';
  const iconType = requestType ? mapBrTypeToIconType(requestType) : 'business request';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} title={displayLabel}>
      <JiraIssueTypeIcon type={iconType} size={14} />
      <span style={{ fontSize: 12, color: 'var(--cp-text-secondary)' }}>{displayLabel}</span>
    </span>
  );
});

/* ── Parent Cell — Block D (2026-05-01)
   Shows the parent MIM key (or epic key) as a subtle link. Reads
   from `request.parent_mim_key`. Empty when ticket has no parent. */
export const ParentCell = React.memo(function ParentCell({ parentKey }: { parentKey?: string | null }) {
  if (!parentKey) return <span style={{ color: 'var(--cp-text-muted)', fontSize: 13 }}>—</span>;
  return (
    <span
      className="pb-id"
      style={{ fontFamily: 'var(--cp-font-mono)', fontSize: 12, color: 'var(--ds-text-link, var(--cp-primary-60, #0052CC))' }}
      title={`Parent: ${parentKey}`}
    >
      {parentKey}
    </span>
  );
});

/* ── Comments Cell — Block D (2026-05-01)
   Lightweight count badge. Reads from `request.comment_count`.
   Renders blank (en-dash) when 0 to avoid noise. */
export const CommentsCell = React.memo(function CommentsCell({ count }: { count?: number | null }) {
  const n = count || 0;
  if (n === 0) return <span style={{ color: 'var(--cp-text-muted)', fontSize: 13 }}>—</span>;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      minWidth: 22, height: 18, padding: '0 6px',
      fontSize: 11, fontWeight: 600,
      color: 'var(--ds-text-subtle, var(--cp-text-secondary, var(--cp-text-secondary, #44546F)))',
      background: 'var(--ds-background-neutral, var(--cp-bg-sunken, var(--cp-bg-sunken, #F1F5F9)))',
      borderRadius: 9,
    }} title={`${n} comment${n === 1 ? '' : 's'}`}>
      {n}
    </span>
  );
});
