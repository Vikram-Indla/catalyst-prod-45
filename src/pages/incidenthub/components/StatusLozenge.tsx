/**
 * StatusLozenge — IncidentHub status display
 * Uses canonical 3-color CSS vars from index.css
 */

import { cn } from '@/lib/utils';

type StatusCategory = 'todo' | 'inprogress' | 'done';

const DONE = ['resolved', 'closed'];
const IN_PROGRESS = ['in_progress', 'in_review', 'to_committee', 'converted'];

function resolveCategory(status: string): StatusCategory {
  const key = status?.toLowerCase().replace(/\s+/g, '_') || 'open';
  if (DONE.includes(key)) return 'done';
  if (IN_PROGRESS.includes(key)) return 'inprogress';
  return 'todo';
}

const LABELS: Record<string, string> = {
  open: 'OPEN',
  triage: 'TRIAGE',
  on_hold: 'ON HOLD',
  closed: 'CLOSED',
  converted: 'CONVERTED',
  in_progress: 'IN PROGRESS',
  in_review: 'IN REVIEW',
  to_committee: 'COMMITTEE',
  resolved: 'RESOLVED',
};

const CATEGORY_CLASSES: Record<StatusCategory, string> = {
  todo: 'status-badge-todo',
  inprogress: 'status-badge-inprogress',
  done: 'status-badge-done',
};

interface StatusLozengeProps {
  status: string;
  onClick?: () => void;
  className?: string;
}

export function StatusLozenge({ status, onClick, className }: StatusLozengeProps) {
  const key = status?.toLowerCase().replace(/\s+/g, '_') || 'open';
  const category = resolveCategory(status);
  const label = LABELS[key] || status?.toUpperCase() || 'UNKNOWN';

  return (
    <span
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter') onClick(); } : undefined}
      className={cn(
        'status-badge-base',
        CATEGORY_CLASSES[category],
        onClick && 'cursor-pointer',
        className,
      )}
    >
      {label}
    </span>
  );
}
