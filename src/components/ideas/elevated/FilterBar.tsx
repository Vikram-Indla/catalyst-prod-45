// ============================================================
// FILTER BAR - Linear Style Filters
// ============================================================

import { Search, Filter, ChevronDown, X, LayoutGrid, List } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface FilterOption {
  value: string;
  label: string;
}

interface FilterBarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  
  filters?: {
    key: string;
    label: string;
    value: string;
    options: FilterOption[];
    onChange: (value: string) => void;
  }[];
  
  viewMode?: 'grid' | 'list';
  onViewModeChange?: (mode: 'grid' | 'list') => void;
  
  activeFiltersCount?: number;
  onClearFilters?: () => void;
  
  className?: string;
}

export function FilterBar({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search ideas...",
  filters = [],
  viewMode,
  onViewModeChange,
  activeFiltersCount = 0,
  onClearFilters,
  className,
}: FilterBarProps) {
  return (
    <div className={cn(
      "bg-white border border-slate-200 rounded-xl p-4",
      "flex items-center gap-4 flex-wrap",
      className
    )}>
      {/* Search */}
      <div className="relative flex-1 min-w-[240px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-400" />
        <Input
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="pl-10 h-10 bg-slate-50 border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-blue-500/20"
        />
      </div>

      {/* Filters */}
      {filters.map((filter) => (
        <Select
          key={filter.key}
          value={filter.value}
          onValueChange={filter.onChange}
        >
          <SelectTrigger className="h-10 w-auto min-w-[140px] border-slate-200 bg-white">
            <SelectValue placeholder={filter.label} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{filter.label}</SelectItem>
            {filter.options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}

      {/* Clear Filters */}
      {activeFiltersCount > 0 && onClearFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearFilters}
          className="text-slate-500 hover:text-slate-700"
        >
          <X className="w-4 h-4 mr-1" />
          Clear ({activeFiltersCount})
        </Button>
      )}

      {/* Divider */}
      {viewMode && onViewModeChange && (
        <>
          <div className="w-px h-8 bg-slate-200" />
          
          {/* View Toggle */}
          <div className="flex bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => onViewModeChange('grid')}
              className={cn(
                "w-9 h-8 flex items-center justify-center rounded-md transition-all",
                viewMode === 'grid' 
                  ? "bg-white text-slate-900 shadow-sm" 
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              <LayoutGrid className="w-[18px] h-[18px]" />
            </button>
            <button
              onClick={() => onViewModeChange('list')}
              className={cn(
                "w-9 h-8 flex items-center justify-center rounded-md transition-all",
                viewMode === 'list' 
                  ? "bg-white text-slate-900 shadow-sm" 
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              <List className="w-[18px] h-[18px]" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
