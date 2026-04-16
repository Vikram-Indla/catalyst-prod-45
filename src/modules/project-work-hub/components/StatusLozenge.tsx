import React from 'react';
import { cn } from '@/lib/utils';

interface StatusLozengeProps {
  status: string;
  statusCategory?: 'TODO' | 'IN_PROGRESS' | 'DONE';
}

const formatStatus = (status: string): string => {
  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
};

type BadgeCategory = 'todo' | 'inprogress' | 'done';

function resolveCategory(statusCategory?: string, status?: string): BadgeCategory {
  const cat = statusCategory?.toLowerCase() || '';
  if (cat === 'done') return 'done';
  if (cat === 'in_progress' || cat === 'inprogress' || cat === 'indeterminate') return 'inprogress';
  if (cat === 'todo') return 'todo';
  // Fallback: derive from status string
  const s = (status || '').toLowerCase();
  if (/done|closed|resolved|completed|shipped/.test(s)) return 'done';
  if (/progress|review|active|dev|testing|qa/.test(s)) return 'inprogress';
  return 'todo';
}

const CATEGORY_CLASSES: Record<BadgeCategory, string> = {
  todo: 'status-badge-todo',
  inprogress: 'status-badge-inprogress',
  done: 'status-badge-done',
};

/**
 * StatusLozenge — Uses canonical 3-color CSS vars from index.css
 */
export const StatusLozenge: React.FC<StatusLozengeProps> = ({ status, statusCategory }) => {
  const category = resolveCategory(statusCategory, status);

  return (
    <span className={cn('status-badge-base', CATEGORY_CLASSES[category])}>
      {formatStatus(status)}
    </span>
  );
};
