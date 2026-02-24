/**
 * Issue Type Icon — 16x16 colored rounded square with white symbol
 */
import React from 'react';
import { Zap, Star, Bookmark, Check, Circle, ListChecks } from 'lucide-react';
import type { IssueType } from '@/types/project-hub.types';

const TYPE_MAP: Record<IssueType, { Icon: React.ElementType; color: string; label: string }> = {
  epic:    { Icon: Zap,        color: '#7C3AED', label: 'Epic' },
  feature: { Icon: Star,       color: '#16A34A', label: 'Feature' },
  story:   { Icon: Bookmark,   color: '#16A34A', label: 'Story' },
  task:    { Icon: Check,      color: '#2563EB', label: 'Task' },
  bug:     { Icon: Circle,     color: '#EF4444', label: 'Bug' },
  subtask: { Icon: ListChecks, color: '#64748B', label: 'Subtask' },
};

/** Left-border accent color per type */
export const TYPE_ACCENT: Record<IssueType, string> = {
  epic: '#7C3AED',
  feature: '#16A34A',
  story: '#16A34A',
  task: '#2563EB',
  bug: '#EF4444',
  subtask: '#94A3B8',
};

interface Props {
  type: IssueType;
  size?: number;
}

export function PHIssueTypeIcon({ type, size = 16 }: Props) {
  const cfg = TYPE_MAP[type] ?? TYPE_MAP.task;
  return (
    <span
      title={cfg.label}
      className="inline-flex items-center justify-center flex-shrink-0"
      style={{
        width: size,
        height: size,
        borderRadius: 3,
        background: cfg.color,
      }}
    >
      <cfg.Icon size={size * 0.625} color="#fff" strokeWidth={2.5} />
    </span>
  );
}
