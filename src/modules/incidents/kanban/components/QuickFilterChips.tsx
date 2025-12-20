/**
 * Quick Filter Chips - Minimal, subtle filter row for Kanban
 */

import { memo } from 'react';
import { cn } from '@/lib/utils';
import { 
  QUICK_FILTERS, 
  type QuickFilterKey 
} from '../../shared/computations';

interface QuickFilterChipsProps {
  activeFilters: QuickFilterKey[];
  onToggle: (key: QuickFilterKey) => void;
  counts?: Record<QuickFilterKey, number>;
}

export const QuickFilterChips = memo(function QuickFilterChips({
  activeFilters,
  onToggle,
  counts,
}: QuickFilterChipsProps) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {QUICK_FILTERS.map(filter => {
        const isActive = activeFilters.includes(filter.key);
        const count = counts?.[filter.key];
        
        return (
          <button
            key={filter.key}
            onClick={() => onToggle(filter.key)}
            className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium",
              "transition-colors border",
              isActive
                ? "bg-primary/10 border-primary/30 text-primary"
                : "bg-muted/30 border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            )}
          >
            {filter.color && (
              <span 
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: isActive ? filter.color : 'currentColor', opacity: isActive ? 1 : 0.4 }}
              />
            )}
            <span>{filter.label}</span>
            {count !== undefined && count > 0 && (
              <span className={cn(
                "text-[10px] tabular-nums",
                isActive ? "text-primary/80" : "text-muted-foreground/60"
              )}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
});

export default QuickFilterChips;
