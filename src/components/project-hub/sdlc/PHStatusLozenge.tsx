/**
 * Status Lozenge — Linear-style pill with colored dot
 */
import React from 'react';
import type { IssueStatus } from '@/types/project-hub.types';
import { STATUS_CONFIG } from '@/types/project-hub.types';

interface Props {
  status: IssueStatus;
  compact?: boolean;
}

export function PHStatusLozenge({ status, compact }: Props) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.backlog;
  return (
    <span
      className="inline-flex items-center gap-1.5 font-semibold whitespace-nowrap"
      style={{
        fontSize: compact ? 10 : 11,
        fontWeight: 600,
        padding: compact ? '1px 6px' : '2px 8px',
        borderRadius: 12,
        background: cfg.bg,
        color: cfg.color,
        height: compact ? 18 : 22,
        lineHeight: 1,
      }}
    >
      <span
        className="flex-shrink-0 rounded-full"
        style={{ width: 6, height: 6, background: cfg.color }}
      />
      {cfg.label}
    </span>
  );
}
