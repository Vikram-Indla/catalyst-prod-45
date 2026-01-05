/**
 * Executive Scan Controls - Quick filters and sorting for capacity view
 * CATALYST V5 DARK MODE COMPLIANT
 */

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { 
  AlertTriangle, 
  Calendar, 
  TrendingUp,
  ArrowUpDown,
  Filter,
  X
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export type QuickFilter = 'risk' | 'frees-soon' | 'over-allocated' | null;
export type SortOption = 'utilization-desc' | 'utilization-asc' | 'contract-end' | 'name' | null;

interface ExecutiveScanControlsProps {
  activeQuickFilter: QuickFilter;
  onQuickFilterChange: (filter: QuickFilter) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  className?: string;
}

export function ExecutiveScanControls({
  activeQuickFilter,
  onQuickFilterChange,
  sortBy,
  onSortChange,
  className,
}: ExecutiveScanControlsProps) {
  const quickFilters = [
    { id: 'risk' as const, label: 'Risk Only', icon: AlertTriangle, color: 'text-red-500 dark:text-red-400' },
    { id: 'frees-soon' as const, label: 'Frees Up ≤30d', icon: Calendar, color: 'text-blue-500 dark:text-blue-400' },
    { id: 'over-allocated' as const, label: 'Over-Allocated', icon: TrendingUp, color: 'text-amber-500 dark:text-amber-400' },
  ];

  const sortOptions = [
    { id: 'utilization-desc' as const, label: 'Utilization (High → Low)' },
    { id: 'utilization-asc' as const, label: 'Utilization (Low → High)' },
    { id: 'contract-end' as const, label: 'Contract End (Soon First)' },
    { id: 'name' as const, label: 'Name (A → Z)' },
  ];

  const currentSort = sortOptions.find(s => s.id === sortBy);

  return (
    <div className={cn(
      "flex items-center gap-2 flex-wrap",
      className
    )}>
      {/* Quick Filter Toggles */}
      <div className="flex items-center gap-1.5">
        <Filter className="h-3.5 w-3.5 text-muted-foreground dark:text-[var(--text-secondary)]" />
        {quickFilters.map((filter) => {
          const Icon = filter.icon;
          const isActive = activeQuickFilter === filter.id;
          
          return (
            <Button
              key={filter.id}
              variant={isActive ? "default" : "outline"}
              size="sm"
              onClick={() => onQuickFilterChange(isActive ? null : filter.id)}
              className={cn(
                "h-7 px-2.5 text-xs gap-1.5 transition-all",
                isActive 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-card dark:bg-[var(--surface-3)] border-border dark:border-[var(--border-default)] text-foreground dark:text-[var(--text-primary)] hover:bg-muted dark:hover:bg-[var(--surface-elevated)]"
              )}
            >
              <Icon className={cn("h-3 w-3", isActive ? "" : filter.color)} />
              {filter.label}
            </Button>
          );
        })}
        
        {/* Clear filter button */}
        {activeQuickFilter && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onQuickFilterChange(null)}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Separator */}
      <div className="h-5 w-px bg-border dark:bg-[var(--border-subtle)]" />

      {/* Sort Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-7 px-2.5 text-xs gap-1.5",
              "bg-card dark:bg-[var(--surface-3)] border-border dark:border-[var(--border-default)] text-foreground dark:text-[var(--text-primary)]",
              "hover:bg-muted dark:hover:bg-[var(--surface-elevated)]",
              sortBy && "border-primary/50"
            )}
          >
            <ArrowUpDown className="h-3 w-3" />
            {currentSort?.label || 'Sort'}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align="start" 
          className="w-48 bg-card dark:bg-[var(--surface-elevated)] border-border dark:border-[var(--border-default)]"
        >
          <DropdownMenuLabel className="text-xs text-muted-foreground dark:text-[var(--text-secondary)]">
            Sort Resources
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-border dark:bg-[var(--border-subtle)]" />
          {sortOptions.map((option) => (
            <DropdownMenuItem
              key={option.id}
              onClick={() => onSortChange(option.id === sortBy ? null : option.id)}
              className={cn(
                "text-xs cursor-pointer",
                option.id === sortBy && "bg-primary/10"
              )}
            >
              {option.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
