/**
 * Analytics Month Cell - V7 Design with assignment segments
 * Uses Catalyst V5 workstream colors
 */

import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { WORKSTREAM_COLORS, DEFAULT_WORKSTREAM_COLOR } from '@/lib/workstream-colors';
import type { MonthCell, MonthSegment } from './types';

interface AnalyticsMonthCellProps {
  cell: MonthCell;
  contractEndDate?: string | null;
}

// Map assignment names to workstream tracks for color lookup
function getWorkstreamColor(assignmentName: string) {
  const lower = assignmentName.toLowerCase();
  
  // Match assignment to workstream based on keywords
  if (lower.includes('senaie') || lower.includes('senaei') || lower.includes('sen')) {
    return WORKSTREAM_COLORS['Senaie Track'];
  }
  if (lower.includes('tahom') || lower.includes('tah')) {
    return WORKSTREAM_COLORS['Tahommona Track'];
  }
  if (lower.includes('catalyst') || lower.includes('cat')) {
    return WORKSTREAM_COLORS['Catalyst Track'];
  }
  if (lower.includes('delivery') || lower.includes('del')) {
    return WORKSTREAM_COLORS['Delivery Track'];
  }
  if (lower.includes('mim') || lower.includes('website')) {
    return WORKSTREAM_COLORS['MIM Website'];
  }
  if (lower.includes('data') || lower.includes('ai') || lower.includes('dat')) {
    return WORKSTREAM_COLORS['Data & AI Track'];
  }
  if (lower.includes('security') || lower.includes('sec')) {
    return WORKSTREAM_COLORS['Catalyst Track']; // Use teal for security
  }
  if (lower.includes('stand') || lower.includes('alone') || lower.includes('ins') || lower.includes('int')) {
    return WORKSTREAM_COLORS['Stand-Alone Projects Track'];
  }
  
  return DEFAULT_WORKSTREAM_COLOR;
}

export function AnalyticsMonthCell({ cell, contractEndDate }: AnalyticsMonthCellProps) {
  const { totalPercent, isEnded, segments } = cell;

  // Contract ended - show dashed END box
  if (isEnded) {
    return (
      <td className="p-1 min-w-[120px]">
        <div className="h-12 flex items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20">
          <span className="text-xs font-medium text-muted-foreground/60">END</span>
        </div>
      </td>
    );
  }

  // Check if contract ends this month
  const monthStart = new Date(cell.year, cell.month - 1, 1);
  const monthEnd = new Date(cell.year, cell.month, 0);
  const contractEndsThisMonth = contractEndDate && 
    new Date(contractEndDate) >= monthStart && 
    new Date(contractEndDate) <= monthEnd;

  // Empty/no allocation
  if (segments.length === 0 || totalPercent === 0) {
    return (
      <td className="p-1 min-w-[120px]">
        <div className="h-12 flex items-center justify-center rounded-lg bg-muted/30">
          {contractEndsThisMonth && (
            <span className="text-xs font-medium text-muted-foreground/60">END</span>
          )}
        </div>
      </td>
    );
  }

  // Over-allocated - striped background on additional segment
  const isOverAllocated = totalPercent > 100;

  // Render segments
  const renderSegments = () => {
    // Calculate widths proportionally
    const totalWidth = segments.reduce((sum, s) => sum + s.percent, 0);
    
    return segments.map((seg, idx) => {
      const wsColor = getWorkstreamColor(seg.assignment.name);
      const width = `${(seg.percent / totalWidth) * 100}%`;
      
      // Check if this segment is the "extra" over 100%
      const isExtraOver = idx > 0 && segments.slice(0, idx).reduce((s, x) => s + x.percent, 0) >= 100;
      
      return (
        <div
          key={idx}
          className={cn(
            'h-full flex flex-col items-center justify-center',
            idx === 0 && 'rounded-l-lg',
            idx === segments.length - 1 && 'rounded-r-lg',
          )}
          style={{ 
            width,
            backgroundColor: isExtraOver ? undefined : wsColor.hex,
            backgroundImage: isExtraOver 
              ? 'repeating-linear-gradient(135deg, transparent, transparent 3px, rgba(244,63,94,0.3) 3px, rgba(244,63,94,0.3) 6px)' 
              : undefined,
          }}
        >
          <span className={cn(
            'text-xs font-bold',
            isExtraOver ? 'text-rose-600' : 'text-white'
          )}>
            {seg.percent > 100 ? `+${seg.percent - 100}%` : `${seg.percent}%`}
          </span>
          <span className={cn(
            'text-[9px] font-medium truncate max-w-full px-1',
            isExtraOver ? 'text-rose-600' : 'text-white/90'
          )}>
            {seg.assignment.name}
          </span>
        </div>
      );
    });
  };

  // Tooltip content
  const tooltipContent = (
    <div className="space-y-1 text-xs">
      {segments.map((seg, i) => (
        <div key={i} className="flex justify-between gap-4">
          <span>{seg.assignment.name}</span>
          <span className="font-mono font-medium">{seg.percent}%</span>
        </div>
      ))}
      <div className="border-t pt-1 flex justify-between font-medium">
        <span>Total</span>
        <span className={cn('font-mono', isOverAllocated && 'text-rose-500')}>
          {totalPercent}%
        </span>
      </div>
    </div>
  );

  return (
    <td className="p-1 min-w-[120px]">
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(
            'h-12 flex rounded-lg overflow-hidden cursor-default',
            isOverAllocated && 'ring-2 ring-rose-400'
          )}>
            {renderSegments()}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </td>
  );
}
