/**
 * StatusBadge — Jira-grade reusable status pill.
 * Uses CSS tokens for light + dark mode. Zero hardcoded hex in component.
 */

import { cn } from '@/lib/utils';

type StatusCategory = 'todo' | 'inprogress' | 'done';

const TODO_PATTERNS = [
  'todo', 'backlog', 'new', 'draft', 'submitted', 'rejected',
  'cancelled', 'canceled', 'notstarted', 'pending', 'pendingapproval',
  'requirements', 'onhold',
];

const DONE_PATTERNS = [
  'done', 'closed', 'resolved', 'complete', 'completed',
  'inproduction', 'inprod', 'released', 'shipped', 'deployed',
  'verified', 'accepted', 'approved', 'productionready', 'betaready',
];

function resolveCategory(status: string): StatusCategory {
  const n = status.toLowerCase().replace(/[\s_\-]+/g, '').trim();
  if (DONE_PATTERNS.some(p => n.includes(p))) return 'done';
  if (TODO_PATTERNS.some(p => n.includes(p))) return 'todo';
  return 'inprogress';
}

const DISPLAY: Record<string, string> = {
  'ready for development': 'READY FOR DEV',
  'in development': 'IN DEV',
  'in progress': 'IN PROGRESS',
  'end to end testing': 'E2E TESTING',
  'in production': 'IN PROD',
  'in review': 'IN REVIEW',
  'ready for qa': 'READY FOR QA',
  'to do': 'TODO',
  'todo': 'TODO',
  'on hold': 'ON HOLD',
  'in beta': 'IN BETA',
  'in qa': 'IN QA',
  'in uat': 'IN UAT',
};

function getLabel(status: string): string {
  const lower = status.toLowerCase().trim();
  return DISPLAY[lower] || status.replace(/[_-]/g, ' ').toUpperCase();
}

const VARIANT_CLASSES: Record<StatusCategory, string> = {
  todo:       'status-badge-todo',
  inprogress: 'status-badge-inprogress',
  done:       'status-badge-done',
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const category = resolveCategory(status);

  return (
    <span
      className={cn(
        'status-badge-base',
        VARIANT_CLASSES[category],
        className,
      )}
    >
      {getLabel(status)}
    </span>
  );
}

export default StatusBadge;
