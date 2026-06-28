import React from 'react';
import { Flag, FlagTriangleRight } from '@/lib/atlaskit-icons';
import { cn } from '@/lib/utils';

interface MilestoneMarkerProps {
  type: 'start' | 'end';
  label?: string;
}

export function MilestoneMarker({ type, label }: MilestoneMarkerProps) {
  const isStart = type === 'start';

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium',
        isStart ? 'bg-[var(--ds-background-information)] text-[var(--ds-text-brand,var(--cp-workstream-catalyst-primary))]' : 'bg-[var(--ds-background-success)] text-[var(--ds-icon-information)]'
      )}
    >
      {isStart ? (
        <FlagTriangleRight className="h-3 w-3" />
      ) : (
        <Flag className="h-3 w-3" />
      )}
      <span>{label || (isStart ? 'Start' : 'End')}</span>
    </div>
  );
}
