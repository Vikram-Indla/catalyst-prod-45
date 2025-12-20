/**
 * Quick Filter Chips - Executive-grade filter bar for Kanban
 * Control-room quality typography: strong, readable, no muted text
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
    <div className="bg-[var(--surface-2)] border border-[var(--border-color)] rounded-lg px-2 py-1.5 max-w-full overflow-hidden">
      <ScrollArea className="w-full">
        <div className="flex items-center gap-2">
          {QUICK_FILTERS.map(filter => {
            const isActive = activeFilters.includes(filter.key);
            const count = counts?.[filter.key] ?? 0;
            
            return (
              <button
                key={filter.key}
                onClick={() => onToggle(filter.key)}
                className={cn(
                  // Base chip styles - STRONG typography
                  "inline-flex items-center gap-2 h-8 px-3 py-1.5 rounded-md",
                  "text-sm font-medium whitespace-nowrap",
                  "transition-all duration-150 border",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--g300))]/50",
                  
                  // State styles - NO muted text, always readable
                  isActive
                    ? [
                        "bg-[hsl(var(--g300)/0.08)] border-[hsl(var(--g300)/0.3)]",
                        "text-[var(--text-1)] font-semibold",
                        "shadow-[inset_0_-2px_0_0_hsl(var(--g300))]", // Bottom accent
                      ]
                    : [
                        "bg-[var(--surface-1)] border-[var(--border-color)]",
                        "text-[var(--text-1)]",
                        "hover:bg-[var(--surface-3)] hover:border-[var(--border-strong)]",
                      ]
                )}
              >
                {/* Checkmark for selected state */}
                {isActive && (
                  <Check className="h-3.5 w-3.5 text-[hsl(var(--g300))] flex-shrink-0" />
                )}
                
                {/* Label - ALWAYS primary text, never muted */}
                <span>{filter.label}</span>
                
                {/* Count badge - strong visibility */}
                {count > 0 && (
                  <span className={cn(
                    "inline-flex items-center justify-center min-w-[20px] h-5 px-1.5",
                    "text-xs font-semibold tabular-nums rounded-full",
                    isActive
                      ? "bg-[hsl(var(--g300)/0.15)] text-[hsl(var(--g300))]"
                      : "bg-[var(--surface-3)] text-[var(--text-1)]"
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
