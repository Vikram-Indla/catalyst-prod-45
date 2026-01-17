/**
 * Analytics Month Cell - Renders allocation percentage with color coding
 */

import { cn } from '@/lib/utils';
import { Lock } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { MonthCell } from './types';

interface AnalyticsMonthCellProps {
  cell: MonthCell;
  contractEndDate?: string | null;
  resourceName: string;
}

export function AnalyticsMonthCell({ cell, contractEndDate, resourceName }: AnalyticsMonthCellProps) {
  const { totalPercent, isEnded, segments } = cell;

  // Contract ended - show lock icon with striped background
  if (isEnded) {
    return (
      <td className="text-center p-0 h-14 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-muted/60 to-muted/40 flex items-center justify-center"
          style={{
            backgroundImage: 'repeating-linear-gradient(135deg, transparent, transparent 5px, hsl(var(--muted)/0.3) 5px, hsl(var(--muted)/0.3) 10px)',
          }}
        >
          <Lock className="w-4 h-4 text-muted-foreground/50" />
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

  // Color based on allocation
  const getCellStyle = () => {
    if (totalPercent === 0) {
      return 'bg-card text-muted-foreground';
    }
    if (totalPercent > 100) {
      // Over-allocated - red
      return 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-t-2 border-red-500';
    }
    if (totalPercent === 100) {
      // At capacity - blue
      return 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400';
    }
    // Partially allocated - light blue
    return 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400';
  };

  // Build tooltip content
  const tooltipContent = segments.length > 0 ? (
    <div className="space-y-1">
      <div className="font-medium text-xs">{resourceName}</div>
      {segments.map((seg, i) => (
        <div key={i} className="flex items-center justify-between gap-4 text-xs">
          <span>{seg.assignment.name}</span>
          <span className="font-mono">{seg.percent}%</span>
        </div>
      ))}
      <div className="border-t border-border pt-1 flex items-center justify-between font-medium text-xs">
        <span>Total</span>
        <span className={cn('font-mono', totalPercent > 100 && 'text-red-500')}>
          {totalPercent}%
        </span>
      </div>
    </div>
  ) : null;

  const cellContent = (
    <div className={cn(
      'h-14 flex items-center justify-center font-semibold text-sm relative transition-colors',
      getCellStyle(),
    )}>
      <span className={cn(totalPercent > 100 && 'font-bold')}>
        {totalPercent}
      </span>
      {contractEndsThisMonth && (
        <div className="absolute top-1 right-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 font-medium flex items-center gap-0.5">
          <Lock className="w-2.5 h-2.5" />
          {new Date(contractEndDate!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </div>
      )}
    </div>
  );

  if (segments.length > 0) {
    return (
      <td className="p-0 border-r border-border/30">
        <Tooltip>
          <TooltipTrigger asChild>
            {cellContent}
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            {tooltipContent}
          </TooltipContent>
        </Tooltip>
      </td>
    );
  }

  return <td className="p-0 border-r border-border/30">{cellContent}</td>;
}
