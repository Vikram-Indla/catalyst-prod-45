/**
 * Analytics Month Cell - Strategy D: Horizontal Bar
 * White cells with thin colored progress bar at bottom
 * Microsoft Project style - clean enterprise look
 */

import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { MonthCell, MonthSegment } from './types';

interface AnalyticsMonthCellProps {
  cell: MonthCell;
  contractEndDate?: string | null;
}

// Project color mapping for horizontal bars
const PROJECT_COLORS: Record<string, string> = {
  'sectorial': '#3b82f6',           // BLUE
  'sectorial services': '#3b82f6',
  'dataplatform': '#10b981',        // GREEN  
  'data platform': '#10b981',
  'senaei': '#f59e0b',              // AMBER
  'senaei 3.0': '#f59e0b',
  'tahommena': '#ec4899',           // PINK
  'tahommena 2.0': '#ec4899',
  'inspection': '#8b5cf6',          // PURPLE
  'inspection project': '#8b5cf6',
  'irplatform': '#06b6d4',          // CYAN
  'ir platform': '#06b6d4',
  'ir-platform': '#06b6d4',
  'ir platform - phase 1': '#06b6d4',
};

function getProjectSlug(name: string): string {
  const lowerName = name.toLowerCase().trim();
  if (lowerName.includes('sectorial')) return 'sectorial';
  if (lowerName.includes('data platform') || lowerName.includes('dataplatform')) return 'dataplatform';
  if (lowerName.includes('senaei')) return 'senaei';
  if (lowerName.includes('tahommena')) return 'tahommena';
  if (lowerName.includes('inspection')) return 'inspection';
  if (lowerName.includes('ir platform') || lowerName.includes('irplatform') || lowerName.includes('ir-platform')) return 'irplatform';
  return 'sectorial'; // default
}

function getProjectColor(name: string): string {
  if (!name) return '#3b82f6';
  const lowerName = name.toLowerCase().trim();
  
  // Direct match - order matters (more specific first)
  if (lowerName.includes('sectorial')) return '#3b82f6';      // BLUE
  if (lowerName.includes('data platform') || lowerName.includes('dataplatform')) return '#10b981';  // GREEN
  if (lowerName.includes('senaei')) return '#f59e0b';         // AMBER
  if (lowerName.includes('tahommena')) return '#ec4899';      // PINK
  if (lowerName.includes('inspection')) return '#8b5cf6';     // PURPLE
  if (lowerName.includes('ir platform') || lowerName.includes('irplatform') || lowerName.includes('ir-platform')) return '#06b6d4';    // CYAN
  
  return '#3b82f6'; // default blue
}

export function AnalyticsMonthCell({ cell, contractEndDate }: AnalyticsMonthCellProps) {
  const { totalPercent, isEnded, segments } = cell;

  // Check if contract ends this month
  const monthStart = new Date(cell.year, cell.month - 1, 1);
  const monthEnd = new Date(cell.year, cell.month, 0);
  const contractDate = contractEndDate ? new Date(contractEndDate) : null;
  const contractEndsThisMonth = contractDate && contractDate >= monthStart && contractDate <= monthEnd;

  // Contract ended (past end date) - show diagonal striped END cell
  if (isEnded) {
    return (
      <td className="allocation-cell end p-1 min-w-[120px] max-w-[120px] w-[120px]" data-status="end">
        <div 
          className="h-12 flex items-center justify-center rounded-lg"
          style={{
            backgroundImage: 'repeating-linear-gradient(-45deg, #f1f5f9, #f1f5f9 4px, #e2e8f0 4px, #e2e8f0 8px)',
          }}
        >
          <span className="text-xs font-medium text-slate-400 bg-white/80 px-2 py-0.5 rounded">END</span>
        </div>
      </td>
    );
  }

  // Contract ends this month - show dotted fill with END label
  if (contractEndsThisMonth && (segments.length === 0 || totalPercent === 0)) {
    return (
      <td className="allocation-cell end p-1 min-w-[120px] max-w-[120px] w-[120px]" data-status="end">
        <div 
          className="h-12 flex items-center justify-center rounded-lg border border-dashed border-slate-300"
          style={{
            backgroundImage: 'repeating-linear-gradient(-45deg, #f8fafc, #f8fafc 4px, #e2e8f0 4px, #e2e8f0 8px)',
          }}
        >
          <span className="text-xs font-medium text-slate-400 bg-white/80 px-2 py-0.5 rounded">END</span>
        </div>
      </td>
    );
  }

  // Empty/no allocation - show as Available (white cell, no bar)
  if (segments.length === 0 || totalPercent === 0) {
    return (
      <td className="allocation-cell p-1 min-w-[120px] max-w-[120px] w-[120px]">
        <div className="h-12 flex items-center justify-center rounded-lg bg-white border border-slate-200">
          <span className="text-xs font-medium text-slate-400">Available</span>
        </div>
      </td>
    );
  }

  // Get primary segment (first one) for color and project name
  const primarySegment = segments[0];
  const projectSlug = getProjectSlug(primarySegment.assignment.name);
  const barColor = getProjectColor(primarySegment.assignment.name);
  const isOverAllocated = totalPercent > 100;

  // Calculate bar width as percentage (capped at 100% for display)
  const barWidth = Math.min(totalPercent, 100);

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
    <td 
      className="allocation-cell p-1 min-w-[120px] max-w-[120px] w-[120px]" 
      data-project={projectSlug}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <div 
            className={cn(
              'relative h-12 flex flex-col items-center justify-center rounded-lg bg-white border cursor-default',
              isOverAllocated 
                ? 'border-rose-300 ring-1 ring-rose-300' 
                : 'border-slate-200'
            )}
          >
            {/* Text content - dark on white */}
            <span className={cn(
              'text-xs font-semibold z-10',
              isOverAllocated ? 'text-rose-600' : 'text-slate-700'
            )}>
              {totalPercent}%
            </span>
            <span className="text-[9px] font-medium text-slate-500 truncate max-w-[100px] px-1 z-10">
              {primarySegment.assignment.name}
            </span>
            
            {/* Horizontal progress bar at bottom (Strategy D) */}
            <div 
              className="absolute bottom-1 left-1.5 right-1.5 h-1 rounded-full"
              style={{ backgroundColor: '#e2e8f0' }}
            >
              <div 
                className="h-full rounded-full"
                style={{ 
                  width: `${barWidth}%`,
                  backgroundColor: barColor,
                  transition: 'width 0.3s ease'
                }}
              />
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </td>
  );
}
