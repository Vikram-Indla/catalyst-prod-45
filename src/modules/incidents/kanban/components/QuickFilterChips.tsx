/**
 * Quick Filter Chips - Executive-grade filter bar for Kanban
 * Compact, token-based, control-room quality
 */

import { memo } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
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
    <div className="bg-[var(--surface-2)] border border-[var(--border-color)] rounded-lg px-2 py-1 max-w-full overflow-hidden">
      <ScrollArea className="w-full">
        <div className="flex items-center gap-1.5">
          {QUICK_FILTERS.map(filter => {
            const isActive = activeFilters.includes(filter.key);
            const count = counts?.[filter.key] ?? 0;
            
            return (
              <button
                key={filter.key}
                onClick={() => onToggle(filter.key)}
                className={cn(
                  // Base chip styles
                  "inline-flex items-center gap-1.5 h-7 px-2.5 py-1 rounded-md",
                  "text-[12px] font-normal whitespace-nowrap",
                  "transition-all duration-150 border",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)]/50",
                  
                  // State styles
                  isActive
                    ? "bg-[var(--surface-1)] border-[var(--brand-gold)]/30 text-[var(--text-1)] shadow-sm"
                    : "bg-transparent border-transparent text-[var(--text-3)] hover:bg-[var(--surface-3)] hover:text-[var(--text-2)]"
                )}
              >
                {/* Checkmark for selected state */}
                {isActive && (
                  <Check className="h-3 w-3 text-[var(--brand-gold)] flex-shrink-0" />
                )}
                
                {/* Label */}
                <span>{filter.label}</span>
                
                {/* Count badge */}
                {count > 0 && (
                  <span className={cn(
                    "inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5",
                    "text-[10px] font-medium tabular-nums rounded-full",
                    isActive
                      ? "bg-[var(--brand-gold)]/15 text-[var(--brand-gold)]"
                      : "bg-[var(--surface-3)] text-[var(--text-3)]"
                  )}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" className="h-1.5 opacity-0 hover:opacity-100" />
      </ScrollArea>
    </div>
  );
});

export default QuickFilterChips;
