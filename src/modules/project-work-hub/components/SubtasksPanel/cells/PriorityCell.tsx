/**
 * PriorityCell — Canonical PriorityIndicator + editable popover.
 */
import React from 'react';
import { PriorityIndicator } from '@/components/shared/PriorityIndicator';
import { PriorityPopover } from '../popovers/PriorityPopover';

interface PriorityCellProps {
  priority: string;
  onChange?: (priority: 'Critical' | 'High' | 'Medium' | 'Low') => void;
  readOnly?: boolean;
}

export const PriorityCell = React.memo(function PriorityCell({ priority, onChange, readOnly }: PriorityCellProps) {
  const trigger = (
    <button
      type="button"
      className="sp-inline-trigger"
      onClick={(e) => e.stopPropagation()}
      aria-label={`Priority ${priority} — change`}
      disabled={readOnly}
    >
      <PriorityIndicator priority={priority} showLabel fontSize={14} />
    </button>
  );

  if (readOnly || !onChange) return trigger;

  return (
    <PriorityPopover priority={priority} onChange={onChange}>
      {trigger}
    </PriorityPopover>
  );
});
