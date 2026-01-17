/**
 * Analytics Month Cell - V8 Enterprise Design
 * Single brand color for clean, professional look
 */

import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { MonthCell, MonthSegment } from './types';

interface AnalyticsMonthCellProps {
  cell: MonthCell;
  contractEndDate?: string | null;
}

// Single brand color for all allocations - clean enterprise look
const BRAND_COLOR = '#3b82f6'; // Blue-500

export function AnalyticsMonthCell({ cell, contractEndDate }: AnalyticsMonthCellProps) {
  const { totalPercent, isEnded, segments } = cell;

  // Check if contract ends this month
  const monthStart = new Date(cell.year, cell.month - 1, 1);
  const monthEnd = new Date(cell.year, cell.month, 0);
  const contractDate = contractEndDate ? new Date(contractEndDate) : null;
  const contractEndsThisMonth = contractDate && contractDate >= monthStart && contractDate <= monthEnd;

  // Contract ended (past end date) - show dotted fill
  if (isEnded) {
    return (
      <td className="p-1 min-w-[120px]">
        <div 
          className="h-12 flex items-center justify-center rounded-lg"
          style={{
            backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(156,163,175,0.3) 4px, rgba(156,163,175,0.3) 8px)',
            backgroundColor: 'rgba(156,163,175,0.1)',
          }}
        >
          <span className="text-xs font-medium text-muted-foreground/60 bg-background/80 px-2 py-0.5 rounded">END</span>
        </div>
      </td>
    );
  }

  // Contract ends this month - show dotted fill with END label
  if (contractEndsThisMonth && (segments.length === 0 || totalPercent === 0)) {
    return (
      <td className="p-1 min-w-[120px]">
        <div 
          className="h-12 flex items-center justify-center rounded-lg border border-dashed border-muted-foreground/40"
          style={{
            backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(156,163,175,0.2) 4px, rgba(156,163,175,0.2) 8px)',
            backgroundColor: 'rgba(156,163,175,0.05)',
          }}
        >
          <span className="text-xs font-medium text-muted-foreground/70 bg-background/80 px-2 py-0.5 rounded">END</span>
        </div>
      </td>
    );
  }

  // Empty/no allocation - show as Available
  if (segments.length === 0 || totalPercent === 0) {
    return (
      <td className="p-1 min-w-[120px]">
        <div className="h-12 flex items-center justify-center rounded-lg bg-muted/30">
          <span className="text-xs font-medium text-muted-foreground/70">Available</span>
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
      const width = `${(seg.percent / totalWidth) * 100}%`;
      const isForecast = seg.status === 'forecast';
      
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
            backgroundColor: isExtraOver ? undefined : BRAND_COLOR,
            opacity: isForecast ? 0.4 : 1,
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
