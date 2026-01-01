/**
 * Timeline Cell with Teal/Blue/Bronze colors only
 * NO ORANGE, NO RED
 */

import { getTimelineCellColors } from '@/lib/catalyst-colors';
import { cn } from '@/lib/utils';

interface TimelineCellV2Props {
  allocation: number;
  isCurrentPeriod?: boolean;
}

export function TimelineCellV2({ allocation, isCurrentPeriod = false }: TimelineCellV2Props) {
  const colors = getTimelineCellColors(allocation);

  return (
    <div 
      className={cn(
        'flex-1 px-2 py-2.5 flex items-center justify-center border-r border-border last:border-r-0 min-w-20',
        isCurrentPeriod && 'bg-[#2563eb]/5'
      )}
    >
      <span 
        className="text-[11px] font-semibold px-2.5 py-1 rounded"
        style={{ 
          backgroundColor: colors.bg, 
          color: colors.text 
        }}
      >
        {allocation}%
      </span>
    </div>
  );
}
