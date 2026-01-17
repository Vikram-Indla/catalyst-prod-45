/**
 * Analytics Month Cell - V7 Design with assignment segments
 */

import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { MonthCell, MonthSegment } from './types';

interface AnalyticsMonthCellProps {
  cell: MonthCell;
  contractEndDate?: string | null;
}

// Assignment abbreviations map
const ASSIGNMENT_ABBREV: Record<string, string> = {
  'senaei': 'SEN',
  'senaei bau': 'SEN',
  'pmo': 'PMO',
  'security': 'SEC',
  'audit': 'AUD',
  'default': 'SEN',
};

// Assignment colors - matching reference
const ASSIGNMENT_COLORS: Record<string, { bg: string; text: string; bgOver?: string }> = {
  'SEN': { bg: 'bg-blue-400', text: 'text-white' },
  'PMO': { bg: 'bg-rose-400', text: 'text-white' },
  'SEC': { bg: 'bg-teal-400', text: 'text-white' },
  'AUD': { bg: 'bg-amber-400', text: 'text-white' },
  'default': { bg: 'bg-blue-400', text: 'text-white' },
};

function getAbbrev(name: string): string {
  const lower = name.toLowerCase();
  for (const [key, abbrev] of Object.entries(ASSIGNMENT_ABBREV)) {
    if (lower.includes(key)) return abbrev;
  }
  return name.slice(0, 3).toUpperCase();
}

function getColor(abbrev: string) {
  return ASSIGNMENT_COLORS[abbrev] || ASSIGNMENT_COLORS['default'];
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
      const abbrev = getAbbrev(seg.assignment.name);
      const colors = getColor(abbrev);
      const width = `${(seg.percent / totalWidth) * 100}%`;
      
      // Check if this segment is the "extra" over 100%
      const isExtraOver = idx > 0 && segments.slice(0, idx).reduce((s, x) => s + x.percent, 0) >= 100;
      
      return (
        <div
          key={idx}
          className={cn(
            'h-full flex flex-col items-center justify-center',
            isExtraOver 
              ? 'bg-rose-100 dark:bg-rose-900/40' 
              : colors.bg,
            idx === 0 && 'rounded-l-lg',
            idx === segments.length - 1 && 'rounded-r-lg',
          )}
          style={{ 
            width,
            backgroundImage: isExtraOver 
              ? 'repeating-linear-gradient(135deg, transparent, transparent 3px, rgba(244,63,94,0.3) 3px, rgba(244,63,94,0.3) 6px)' 
              : undefined,
          }}
        >
          <span className={cn(
            'text-xs font-bold',
            isExtraOver ? 'text-rose-600' : colors.text
          )}>
            {seg.percent > 100 ? `+${seg.percent - 100}%` : `${seg.percent}%`}
          </span>
          <span className={cn(
            'text-[9px] font-medium opacity-80',
            isExtraOver ? 'text-rose-600' : colors.text
          )}>
            {abbrev}
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
