/**
 * CellRenderers — V12 Hybrid Precision with canonical Jira SVG icons
 */

import { format, differenceInDays } from 'date-fns';
import type { InitiativeStatus } from '@/types/initiative';
import { STATUS_DISPLAY, getPriorityLevel, getAvatarColor, getInitials } from '@/types/initiative';

/* ── Canonical Jira SVG Icons (16×16) ── */
const TYPE_SVG_MAP: Record<string, { svg: JSX.Element; label: string }> = {
  project: {
    label: 'Project',
    svg: (
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
        <path fill="#2684FF" fillRule="evenodd" d="M3,0 L21,0 C22.6568542,-3.04359188e-16 24,1.34314575 24,3 L24,21 C24,22.6568542 22.6568542,24 21,24 L3,24 C1.34314575,24 2.02906125e-16,22.6568542 0,21 L0,3 C-2.02906125e-16,1.34314575 1.34314575,3.04359188e-16 3,0 Z M6,4 C4.8954305,4 4,4.8954305 4,6 L4,18 C4,19.1045695 4.8954305,20 6,20 L18,20 C19.1045695,20 20,19.1045695 20,18 L20,6 C20,4.8954305 19.1045695,4 18,4 L6,4 Z M6,6 L6,18 L18,18 L18,6 L6,6 Z"/>
      </svg>
    ),
  },
  enhancement: {
    label: 'Enhancement',
    svg: (
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
        <path fill="#6554C0" fillRule="evenodd" d="M3,0 L21,0 C22.6568542,-3.04359188e-16 24,1.34314575 24,3 L24,21 C24,22.6568542 22.6568542,24 21,24 L3,24 C1.34314575,24 2.02906125e-16,22.6568542 0,21 L0,3 C-2.02906125e-16,1.34314575 1.34314575,3.04359188e-16 3,0 Z M18.1875,9.4 L15.125,9.4 L15.125,4.8 C15.125,3.80261507 14.3098441,3 13.3125,3 C12.786559,3 12.3057802,3.22820418 11.9641282,3.60847767 L11.7684218,3.8182425 C9.18052942,7.02081922 5.18814094,12.029567 5,12.8 C5,13.8104178 5.81859781,14.3985043 6.7700213,14.5602545 L6.937625,14.5744 L9.875,14.5744 L9.875,19.2 C9.875,20.1973849 10.6901559,21 11.6875,21 C12.1186864,21 12.6506353,20.7635783 13.2071068,20.2071068 L19.527288,12.1937646 C19.8846996,11.712293 20,11.2 20,11.2 C20,10.2026151 19.1848441,9.4 18.1875,9.4 Z"/>
      </svg>
    ),
  },
  improvement: {
    label: 'Improvement',
    svg: (
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
        <path fill="#36B37E" fillRule="evenodd" d="M13,7.42194829 L16.2836227,10.7069575 C16.6740646,11.0975642 17.3072295,11.0976979 17.6978362,10.707256 C18.0884429,10.3168142 18.0885766,9.68364921 17.6981347,9.29304249 L12.7002451,4.29304249 C12.3096867,3.90231917 11.6762915,3.90231917 11.2857331,4.29304249 L6.28784344,9.29304249 C5.89740159,9.68364921 5.89753524,10.3168142 6.28814196,10.707256 C6.67874867,11.0976979 7.31191364,11.0975642 7.70235549,10.7069575 L11,7.40792056 L11,19 C11,19.5522847 11.4477153,20 12,20 C12.5522847,20 13,19.5522847 13,19 L13,7.42194829 Z M3,0 L21,0 C22.6568542,-3.04359188e-16 24,1.34314575 24,3 L24,21 C24,22.6568542 22.6568542,24 21,24 L3,24 C1.34314575,24 2.02906125e-16,22.6568542 0,21 L0,3 C-2.02906125e-16,1.34314575 1.34314575,3.04359188e-16 3,0 Z"/>
      </svg>
    ),
  },
  entity_integration: {
    label: 'Integration',
    svg: (
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
        <path fill="#2684FF" fillRule="evenodd" d="M3,0 L21,0 C22.6568542,-3.04359188e-16 24,1.34314575 24,3 L24,21 C24,22.6568542 22.6568542,24 21,24 L3,24 C1.34314575,24 2.02906125e-16,22.6568542 0,21 L0,3 C-2.02906125e-16,1.34314575 1.34314575,3.04359188e-16 3,0 Z M6,4 C4.8954305,4 4,4.8954305 4,6 L4,18 C4,19.1045695 4.8954305,20 6,20 L18,20 C19.1045695,20 20,19.1045695 20,18 L20,6 C20,4.8954305 19.1045695,4 18,4 L6,4 Z M6,6 L6,18 L18,18 L18,6 L6,6 Z"/>
      </svg>
    ),
  },
  business_request: {
    label: 'Business Request',
    svg: (
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
        <path fill="#36B37E" fillRule="evenodd" d="M3,0 L21,0 C22.6568542,-3.04359188e-16 24,1.34314575 24,3 L24,21 C24,22.6568542 22.6568542,24 21,24 L3,24 C1.34314575,24 2.02906125e-16,22.6568542 0,21 L0,3 C-2.02906125e-16,1.34314575 1.34314575,3.04359188e-16 3,0 Z M15.6470004,19.5152539 L16.9369996,17.9868881 L12.0001502,13.8199984 L7.06117589,17.98674 C7.03905703,18.0054091 7,17.9917347 7,18.1534919 L7,6.68807648 C7,6.34797522 7.41227423,6 8,6 L16,6 C16.5865377,6 17,6.34873697 17,6.68807648 L17,18.1534919 C17,17.9913444 16.9591854,18.0056137 16.9369996,17.9868881 L15.6470004,19.5152539 C16.8851842,20.5603283 19,19.8209625 19,18.1534919 L19,6.68807648 C19,5.16156919 17.6228445,4 16,4 L8,4 C6.37572577,4 5,5.16116515 5,6.68807648 L5,18.1534919 C5,19.8207306 7.11270618,20.5604209 8.3509996,19.5152539 L11.9998498,16.4369193 L15.6470004,19.5152539 Z"/>
      </svg>
    ),
  },
};

const DEFAULT_TYPE_SVG = (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
    <path fill="#94A3B8" fillRule="evenodd" d="M3,0 L21,0 C22.6568542,-3.04359188e-16 24,1.34314575 24,3 L24,21 C24,22.6568542 22.6568542,24 21,24 L3,24 C1.34314575,24 2.02906125e-16,22.6568542 0,21 L0,3 C-2.02906125e-16,1.34314575 1.34314575,3.04359188e-16 3,0 Z M12,17 C14.7614237,17 17,14.7614237 17,12 C17,9.23857625 14.7614237,7 12,7 C9.23857625,7 7,9.23857625 7,12 C7,14.7614237 9.23857625,17 12,17 Z"/>
  </svg>
);

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

/* ── Priority Cell — V12: Colored horizontal bars ── */
export function PriorityCell({ score }: { score: number | null }) {
  const filled = score === null ? 0 : score >= 4.0 ? 4 : score >= 3.0 ? 3 : score >= 2.0 ? 2 : score >= 1.0 ? 1 : 0;
  const colors = ['#4ADE80', '#FBBF24', '#F97316', '#EF4444'];
  const fillColor = filled === 0 ? '#E2E8F0' : colors[Math.min(filled - 1, 3)];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      {[1, 2, 3, 4].map(i => (
        <span key={i} style={{
          width: 14, height: 3, borderRadius: 2,
          background: i <= filled ? fillColor : '#E2E8F0',
        }} />
      ))}
    </div>
  );
}

/* ── Score Cell — V12: Green vertical bars ── */
export function ScoreCell({ score }: { score: number | null }) {
  const filled = score === null ? 0 : Math.min(5, Math.max(0, Math.round(score)));
  const heights = [4, 6, 8, 10, 13, 16];
  return (
    <div style={{ display: 'inline-flex', alignItems: 'flex-end', gap: 2, height: 16 }}>
      {[1, 2, 3, 4, 5, 6].map(i => (
        <span key={i} style={{
          width: 4, height: heights[i - 1], borderRadius: '2px 2px 0 0',
          background: i <= filled ? '#22C55E' : '#E2E8F0',
        }} />
      ))}
    </div>
  );
}

/* ── Assignee Cell ── */
export function AssigneeCell({ name, avatarUrl }: { name: string | null; avatarUrl?: string }) {
  if (!name) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 22, height: 22, borderRadius: '50%', border: '1.5px dashed #CBD5E1', background: 'transparent', flexShrink: 0 }} />
        <span style={{ fontSize: 13, color: '#94A3B8' }}>Unassigned</span>
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
  if (!date) return <span style={{ color: '#94A3B8', fontSize: 14 }}>—</span>;
  const parsed = new Date(date);
  if (isNaN(parsed.getTime())) return <span style={{ color: '#94A3B8', fontSize: 14 }}>—</span>;
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
  if (!value) return <span style={{ color: '#94A3B8', fontSize: 14 }}>—</span>;
  return <span className="pb-quarter">{value}</span>;
}

/* ── ID Cell ── */
export function IDCell({ value }: { value: string }) {
  return <span className="pb-id">{value}</span>;
}

/* ── Type Icon Cell — canonical Jira SVGs ── */
export function TypeIconCell({ typeKey }: { typeKey?: string | null }) {
  const config = TYPE_SVG_MAP[typeKey || ''];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, width: 16, height: 16 }} title={config?.label || typeKey?.replace(/_/g, ' ') || 'Unknown'}>
      {config?.svg || DEFAULT_TYPE_SVG}
    </span>
  );
}
