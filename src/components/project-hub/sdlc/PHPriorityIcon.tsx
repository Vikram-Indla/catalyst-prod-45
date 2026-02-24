/**
 * Priority indicator dot + label
 */
import React from 'react';
import { ArrowUp, ArrowDown, Minus, AlertTriangle } from 'lucide-react';
import type { IssuePriority } from '@/types/project-hub.types';
import { PRIORITY_CONFIG } from '@/types/project-hub.types';

const ICON_MAP: Record<IssuePriority, React.ElementType> = {
  urgent: AlertTriangle,
  high: ArrowUp,
  medium: Minus,
  low: ArrowDown,
};

interface Props {
  priority: IssuePriority;
  showLabel?: boolean;
}

export function PHPriorityIcon({ priority, showLabel }: Props) {
  const cfg = PRIORITY_CONFIG[priority];
  const Icon = ICON_MAP[priority];
  return (
    <span className="inline-flex items-center gap-1" title={cfg.label}>
      <Icon size={12} color={cfg.color} strokeWidth={2.5} />
      {showLabel && (
        <span style={{ fontSize: 10, fontWeight: 600, color: cfg.color }}>
          {cfg.label}
        </span>
      )}
    </span>
  );
}
