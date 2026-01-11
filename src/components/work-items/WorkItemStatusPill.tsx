/**
 * WorkItemStatusPill — Colored status pill for work items
 * Follows Catalyst V5 color specifications
 */

import React from 'react';
import { WorkItemStatus, WORK_ITEM_STATUS_CONFIG } from '@/types/work-items';
import { cn } from '@/lib/utils';

interface WorkItemStatusPillProps {
  status: WorkItemStatus;
  className?: string;
}

export function WorkItemStatusPill({ status, className }: WorkItemStatusPillProps) {
  const config = WORK_ITEM_STATUS_CONFIG[status];

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap',
        className
      )}
      style={{
        backgroundColor: config.bgColor,
        color: config.textColor,
      }}
    >
      {config.label}
    </span>
  );
}

export default WorkItemStatusPill;
