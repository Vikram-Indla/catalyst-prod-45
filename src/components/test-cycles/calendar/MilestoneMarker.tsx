import React from 'react';
import { Flag, FlagTriangleRight } from 'lucide-react';
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
        isStart ? 'bg-[#dbeafe] text-[#2563eb]' : 'bg-[#ccfbf1] text-[#0d9488]'
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
