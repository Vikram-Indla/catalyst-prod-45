/**
 * Period Navigator Component - Catalyst View 2
 * Weekly/Monthly toggle with period navigation arrows
 */

import { ChevronLeft, ChevronRight, Calendar, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { PeriodType, PeriodRange } from './types';

interface PeriodNavigatorProps {
  periodType: PeriodType;
  periodRange: PeriodRange;
  onPeriodTypeChange: (type: PeriodType) => void;
  onNavigate: (direction: 1 | -1) => void;
}

export function PeriodNavigator({
  periodType,
  periodRange,
  onPeriodTypeChange,
  onNavigate
}: PeriodNavigatorProps) {
  return (
    <div className="flex items-center gap-3">
      {/* Period Type Toggle */}
      <div className="flex items-center bg-muted/50 rounded-lg p-0.5 border border-border">
        <button
          onClick={() => onPeriodTypeChange('weekly')}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all",
            periodType === 'weekly'
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <CalendarDays className="w-3.5 h-3.5" />
          Weekly
        </button>
        <button
          onClick={() => onPeriodTypeChange('monthly')}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all",
            periodType === 'monthly'
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Calendar className="w-3.5 h-3.5" />
          Monthly
        </button>
      </div>

      {/* Period Navigation */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 hover:bg-muted"
          onClick={() => onNavigate(-1)}
          aria-label="Previous period"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <div className="min-w-[160px] text-center">
          <span className="text-sm font-medium text-foreground">
            {periodRange.label}
          </span>
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 hover:bg-muted"
          onClick={() => onNavigate(1)}
          aria-label="Next period"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
