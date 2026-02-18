/**
 * CellRenderers — Specialized cell components for the Initiative Table
 * Catalyst V5 Design System
 */

import { format, differenceInDays } from 'date-fns';
import type { InitiativeStatus } from '@/types/initiative';
import { STATUS_DISPLAY, getPriorityLevel, getAvatarColor, getInitials } from '@/types/initiative';

/* ── Status Cell ── */
export function StatusCell({ status }: { status: InitiativeStatus }) {
  const s = STATUS_DISPLAY[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 h-[22px] px-2 rounded-full border text-[11px] font-medium whitespace-nowrap"
      style={{ backgroundColor: s.bg, borderColor: s.border, color: s.text }}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: s.dot }} />
      {s.label}
    </span>
  );
}

/* ── Priority Cell ── */
export function PriorityCell({ score }: { score: number | null }) {
  if (score === null) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-10 h-1 rounded-full" style={{ background: '#d4d4d8' }} />
        <span className="text-[12px] tabular-nums" style={{ color: '#a1a1aa' }}>—</span>
      </div>
    );
  }
  let barColor = '#d4d4d8';
  let textColor = '#a1a1aa';
  if (score >= 4.0) { barColor = '#059669'; textColor = '#059669'; }
  else if (score >= 3.0) { barColor = '#2563eb'; textColor = '#2563eb'; }
  else if (score > 0) { barColor = '#d97706'; textColor = '#d97706'; }

  return (
    <div className="flex items-center gap-2">
      <div className="w-10 h-1 rounded-full overflow-hidden" style={{ background: '#e4e4e7' }}>
        <div className="h-full rounded-full" style={{ width: `${(score / 5) * 100}%`, background: barColor }} />
      </div>
      <span className="text-[12px] font-medium tabular-nums" style={{ color: textColor }}>{score.toFixed(1)}</span>
    </div>
  );
}

/* ── Score Cell ── */
export function ScoreCell({ score }: { score: number | null }) {
  const getScoreColor = (s: number | null) => {
    if (s === null) return '#a1a1aa';
    if (s >= 4.0) return '#059669';
    if (s >= 3.0) return '#2563eb';
    return '#d97706';
  };
  if (score === null) return <span style={{ color: '#a1a1aa' }}>—</span>;
  return (
    <span className="font-mono text-[12px] font-semibold tabular-nums" style={{ color: getScoreColor(score) }}>
      {score.toFixed(1)}
    </span>
  );
}

/* ── Assignee Cell ── */
export function AssigneeCell({ name }: { name: string | null }) {
  if (!name) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full shrink-0" style={{ border: '1.5px dashed #d4d4d8' }} />
        <span className="text-[12px] italic" style={{ color: '#a1a1aa' }}>Unassigned</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-semibold shrink-0"
        style={{ backgroundColor: getAvatarColor(name) }}
      >
        {getInitials(name)}
      </div>
      <span className="text-[12px] truncate" style={{ color: '#18181b' }}>{name}</span>
    </div>
  );
}

/* ── Date Cell ── */
export function DateCell({ date, status }: { date: string | null; status?: InitiativeStatus }) {
  if (!date) return <span className="text-[12px]" style={{ color: '#a1a1aa' }}>—</span>;
  const parsed = new Date(date);
  if (isNaN(parsed.getTime())) return <span className="text-[12px]" style={{ color: '#a1a1aa' }}>—</span>;
  const formatted = format(parsed, 'MMM dd, yyyy');

  const terminalStatuses: InitiativeStatus[] = ['delivered', 'closed', 'cancelled'];
  const isOverdue = status && !terminalStatuses.includes(status) && parsed < new Date();
  const isSoon = status && !terminalStatuses.includes(status) && !isOverdue && differenceInDays(parsed, new Date()) <= 14;

  let color = '#52525b';
  let fontWeight = 400;
  if (isOverdue) { color = '#dc2626'; fontWeight = 500; }
  else if (isSoon) { color = '#d97706'; fontWeight = 500; }

  return (
    <span className="text-[12px] tabular-nums inline-flex items-center gap-1" style={{ color, fontWeight }}>
      {isOverdue && (
        <svg width="12" height="12" viewBox="0 0 14 14" fill="none" className="shrink-0">
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
  let fillColor = '#2563eb';
  if (clamped >= 100) fillColor = '#22c55e';
  const terminalStatuses: InitiativeStatus[] = ['delivered', 'closed', 'cancelled'];
  // Check overdue only if status provided — we don't have target_complete here
  if (status === 'delivered') fillColor = '#22c55e';

  return (
    <div className="inline-flex items-center gap-2">
      <div className="shrink-0 overflow-hidden" style={{ width: 60, height: 4, borderRadius: 2, background: '#e4e4e7' }}>
        <div style={{ width: `${clamped}%`, height: '100%', borderRadius: 2, background: fillColor }} />
      </div>
      <span className="text-[12px] tabular-nums" style={{ color: '#71717a', minWidth: 28 }}>{clamped}%</span>
    </div>
  );
}

/* ── EA Review Cell ── */
export function EACell({ value }: { value?: boolean | null }) {
  if (value === true) {
    return (
      <span className="inline-flex items-center h-[20px] px-2 rounded text-[11px] font-medium"
        style={{ background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' }}>
        Required
      </span>
    );
  }
  if (value === false) {
    return (
      <span className="inline-flex items-center h-[20px] px-2 rounded text-[11px] font-medium"
        style={{ background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0' }}>
        Not Required
      </span>
    );
  }
  return (
    <span className="inline-flex items-center h-[20px] px-2 rounded text-[11px] font-medium"
      style={{ background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a' }}>
      Pending
    </span>
  );
}

/* ── Quarter Cell ── */
export function QuarterCell({ value }: { value: string | null }) {
  if (!value) return <span className="text-[12px]" style={{ color: '#a1a1aa' }}>—</span>;
  return (
    <span className="inline-flex items-center h-[20px] px-2 rounded text-[12px] font-medium"
      style={{ background: '#f4f4f5', color: '#52525b' }}>
      {value}
    </span>
  );
}

/* ── ID Cell ── */
export function IDCell({ value }: { value: string }) {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm font-mono text-[11px] font-medium"
      style={{ background: '#eff6ff', color: '#1d4ed8' }}>
      {value}
    </span>
  );
}
