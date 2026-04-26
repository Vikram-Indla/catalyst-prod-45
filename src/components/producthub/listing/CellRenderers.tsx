/**
 * CellRenderers — V12 Hybrid Precision with canonical Jira SVG icons
 * All colors use CSS custom properties for dark mode compliance
 */

import React from 'react';
import { format, differenceInDays } from 'date-fns';
import type { InitiativeStatus } from '@/types/initiative';
import { STATUS_DISPLAY, getPriorityLevel, getAvatarColor, getInitials } from '@/types/initiative';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { JiraIssueTypeIcon } from '@/components/shared/JiraIssueTypeIcon';


/* ── Status Cell ── */
export const StatusCell = React.memo(function StatusCell({ status }: { status: InitiativeStatus }) {
  const s = STATUS_DISPLAY[status];
  return (
    <StatusBadge status={s.label} />
  );
});

/* ── Priority Cell — V12: Colored horizontal bars ── */
export const PriorityCell = React.memo(function PriorityCell({ score }: { score: number | null }) {
  const filled = score === null ? 0 : score >= 4.0 ? 4 : score >= 3.0 ? 3 : score >= 2.0 ? 2 : score >= 1.0 ? 1 : 0;
  const colors = ['#4ADE80', '#FBBF24', '#F97316', '#EF4444'];
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

/* ── Assignee Cell ── */
export const AssigneeCell = React.memo(function AssigneeCell({ name, avatarUrl }: { name: string | null; avatarUrl?: string }) {
  if (!name) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 22, height: 22, borderRadius: '50%', border: '1.5px dashed var(--cp-border-strong)', background: 'transparent', flexShrink: 0 }} />
        <span style={{ fontSize: 13, color: 'var(--cp-text-muted)' }}>Unassigned</span>
      </div>
    );
  }
  return (
    <div className="pb-assignee">
      {avatarUrl ? (
        <img src={avatarUrl} alt={name} className="pb-avatar" style={{ objectFit: 'cover' }} />
      ) : (
        <div className="pb-avatar" style={{ backgroundColor: getAvatarColor(name) }}>
          {getInitials(name)}
        </div>
      )}
      <span className="pb-assignee-name">{name}</span>
    </div>
  );
});

/* ── Date Cell ── */
export const DateCell = React.memo(function DateCell({ date, status }: { date: string | null; status?: InitiativeStatus }) {
  if (!date) return <span style={{ color: 'var(--cp-text-muted)', fontSize: 13 }}>—</span>;
  const parsed = new Date(date);
  if (isNaN(parsed.getTime())) return <span style={{ color: 'var(--cp-text-muted)', fontSize: 13 }}>—</span>;
  const formatted = format(parsed, 'MMM dd, yyyy');

  const terminalStatuses: InitiativeStatus[] = ['done', 'cancelled'];
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
export const ProgressCell = React.memo(function ProgressCell({ value, status }: { value: number; status?: InitiativeStatus }) {
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
      <JiraIssueTypeIcon issueType="Feature" size={14} />
    </span>
  );
});
