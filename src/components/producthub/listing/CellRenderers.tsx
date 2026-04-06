/**
 * CellRenderers — LINEAR PRECISION Design with pb-* classes
 */

import { format, differenceInDays } from 'date-fns';
import { Lightbulb, FolderKanban, Zap, Wrench, Link, CircleDashed, type LucideIcon } from 'lucide-react';
import type { InitiativeStatus } from '@/types/initiative';
import { STATUS_DISPLAY, getPriorityLevel, getAvatarColor, getInitials } from '@/types/initiative';

const TYPE_ICON_MAP: Record<string, { Icon: LucideIcon; color: string }> = {
  business_request: { Icon: Lightbulb, color: '#B45309' },
  project: { Icon: FolderKanban, color: '#2563EB' },
  enhancement: { Icon: Zap, color: '#0EA5E9' },
  improvement: { Icon: Wrench, color: '#D97706' },
  entity_integration: { Icon: Link, color: '#64748B' },
};
/* ── Status Cell ── */
export function StatusCell({ status }: { status: InitiativeStatus }) {
  const s = STATUS_DISPLAY[status];
  const lozengeClass = `pb-lozenge pb-lozenge-${s.lozenge}`;
  return (
    <span className={lozengeClass}>
      {s.label}
    </span>
  );
}

/* ── Priority Cell — FIX 3: Monochrome horizontal bars, no dashes ── */
export function PriorityCell({ score }: { score: number | null }) {
  const filled = score === null ? 0 : score >= 4.0 ? 4 : score >= 3.0 ? 3 : score >= 2.0 ? 2 : score >= 1.0 ? 1 : 0;
  return (
    <div className="pb-priority-bars">
      {[1, 2, 3, 4].map(i => (
        <span key={i} className={`pb-priority-bar ${i <= filled ? 'pb-priority-bar-filled' : ''}`} />
      ))}
    </div>
  );
}

/* ── Score Cell — FIX 4: Monochrome vertical bars, equal height, no em dash ── */
export function ScoreCell({ score }: { score: number | null }) {
  const filled = score === null ? 0 : Math.min(5, Math.max(0, Math.round(score)));
  return (
    <div className="pb-score-bars">
      {[1, 2, 3, 4, 5].map(i => (
        <span
          key={i}
          className={`pb-score-bar ${i <= filled ? 'pb-score-bar-filled' : ''}`}
          style={{ height: 12 }}
        />
      ))}
    </div>
  );
}

/* ── Assignee Cell ── */
export function AssigneeCell({ name, avatarUrl }: { name: string | null; avatarUrl?: string }) {
  if (!name) {
    return (
      <div className="pb-assignee">
        <div style={{ width: 24, height: 24, borderRadius: '50%', border: '1.5px dashed var(--pb-border-strong)' }} />
        <span style={{ fontSize: 13, fontStyle: 'italic', color: 'var(--pb-ink-muted)' }}>Unassigned</span>
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
}

/* ── Date Cell ── */
export function DateCell({ date, status }: { date: string | null; status?: InitiativeStatus }) {
  if (!date) return <span className="pb-date" style={{ color: 'var(--pb-ink-muted)' }}>—</span>;
  const parsed = new Date(date);
  if (isNaN(parsed.getTime())) return <span className="pb-date" style={{ color: 'var(--pb-ink-muted)' }}>—</span>;
  const formatted = format(parsed, 'MMM dd, yyyy');

  const terminalStatuses: InitiativeStatus[] = ['done', 'cancelled'];
  const isOverdue = status && !terminalStatuses.includes(status) && parsed < new Date();
  const isSoon = status && !terminalStatuses.includes(status) && !isOverdue && differenceInDays(parsed, new Date()) <= 14;

  let color = 'var(--pb-ink-tertiary)';
  if (isOverdue) color = 'var(--pb-danger)';
  else if (isSoon) color = 'var(--pb-warning)';

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
}

/* ── Progress Cell ── */
export function ProgressCell({ value, status }: { value: number; status?: InitiativeStatus }) {
  const clamped = Math.min(Math.max(value, 0), 100);
  const done = status === 'done' || clamped >= 100;
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 40, height: 4, borderRadius: 4, background: 'var(--pb-surface-tertiary)', overflow: 'hidden', flexShrink: 0 }}>
        <div style={{ width: `${clamped}%`, height: '100%', borderRadius: 4, background: done ? 'var(--pb-success)' : 'var(--pb-primary)', transition: 'width 300ms ease' }} />
      </div>
      <span className="pb-progress-label" style={{ minWidth: 28 }}>{clamped}%</span>
    </div>
  );
}

/* ── EA Review Cell ── */
export function EACell({ value }: { value?: boolean | null }) {
  if (value === true) return <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--pb-danger)', background: 'var(--pb-danger-bg)', padding: '2px 8px', borderRadius: 4 }}>Required</span>;
  if (value === false) return <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--pb-success)', background: 'var(--pb-success-bg)', padding: '2px 8px', borderRadius: 4 }}>Not Required</span>;
  return <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--pb-warning)', background: 'var(--pb-warning-bg)', padding: '2px 8px', borderRadius: 4 }}>Pending</span>;
}

/* ── Quarter Cell ── */
export function QuarterCell({ value }: { value: string | null }) {
  if (!value) return <span className="pb-date" style={{ color: 'var(--pb-ink-muted)' }}>—</span>;
  return <span className="pb-quarter">{value}</span>;
}

/* ── ID Cell ── */
export function IDCell({ value }: { value: string }) {
  return <span className="pb-id">{value}</span>;
}

/* ── Type Icon Cell — icon only, no text, transparent bg ── */
export function TypeIconCell({ typeKey }: { typeKey?: string | null }) {
  const iconConfig = TYPE_ICON_MAP[typeKey || ''] || { Icon: CircleDashed, color: 'var(--fg-3, #94A3B8)' };
  const { Icon, color } = iconConfig;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} title={typeKey?.replace(/_/g, ' ') || 'Unknown'}>
      <Icon size={16} style={{ color }} />
    </span>
  );
}
