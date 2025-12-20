import React, { useState, useRef, useEffect } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, Filter, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CatalystColumn, FilterOption } from '../types';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface ColumnHeaderProps<T> {
  column: CatalystColumn<T>;
  sortDirection: 'asc' | 'desc' | null;
  filterValues: string[];
  onSort: (columnId: string) => void;
  onFilter: (columnId: string, values: string[]) => void;
}

export function ColumnHeader<T>({
  column,
  sortDirection,
  filterValues,
  onSort,
  onFilter,
}: ColumnHeaderProps<T>) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [pendingFilters, setPendingFilters] = useState<string[]>(filterValues);
  
  const hasFilters = filterValues.length > 0;
  const isSortable = column.sortable !== false;
  const isFilterable = column.filterable !== false && column.filterOptions && column.filterOptions.length > 0;

  // Sync pending filters when filterValues change
  useEffect(() => {
    setPendingFilters(filterValues);
  }, [filterValues]);

  const handleFilterToggle = (value: string) => {
    setPendingFilters(prev =>
      prev.includes(value)
        ? prev.filter(v => v !== value)
        : [...prev, value]
    );
  };

  const applyFilters = () => {
    onFilter(column.id, pendingFilters);
    setFilterOpen(false);
  };

  const clearFilters = () => {
    setPendingFilters([]);
    onFilter(column.id, []);
    setFilterOpen(false);
  };

  // Get header text
  const headerText = typeof column.header === 'string' ? column.header : column.id;

  return (
    <div className="flex items-center gap-1.5">
      {/* Header Text */}
      <span className="font-medium text-muted-foreground whitespace-nowrap text-xs uppercase tracking-wide">
        {headerText}
      </span>

      {/* Sort Button */}
      {isSortable && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSort(column.id);
          }}
          className={cn(
            "p-0.5 rounded hover:bg-muted/50 transition-colors",
            sortDirection ? "text-primary" : "text-muted-foreground/50 hover:text-muted-foreground"
          )}
          title={`Sort by ${headerText}`}
        >
          {sortDirection === 'asc' ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : sortDirection === 'desc' ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronsUpDown className="h-3.5 w-3.5" />
          )}
        </button>
      )}

      {/* Filter Button */}
      {isFilterable && (
        <Popover open={filterOpen} onOpenChange={setFilterOpen}>
          <PopoverTrigger asChild>
            <button
              onClick={(e) => e.stopPropagation()}
              className={cn(
                "p-0.5 rounded hover:bg-muted/50 transition-colors relative",
                hasFilters ? "text-primary" : "text-muted-foreground/50 hover:text-muted-foreground"
              )}
              title={`Filter by ${headerText}`}
            >
              <Filter className="h-3.5 w-3.5" />
              {hasFilters && (
                <span className="absolute -top-1 -right-1 h-3.5 min-w-[0.875rem] px-0.5 flex items-center justify-center text-[10px] font-medium rounded-full bg-primary text-primary-foreground">
                  {filterValues.length}
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent 
            align="start" 
            className="w-60 p-0"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-3 py-2 border-b bg-muted/30">
              <span className="text-xs font-semibold text-muted-foreground">
                Filter by {headerText}
              </span>
            </div>
            
            {/* Options */}
            <div className="max-h-48 overflow-y-auto p-1">
              {column.filterOptions?.map((opt) => (
                <label
                  key={opt.value}
                  className={cn(
                    "flex items-center gap-2 px-2 py-1.5 rounded-sm cursor-pointer text-sm",
                    "hover:bg-muted/50 transition-colors",
                    pendingFilters.includes(opt.value) && "bg-primary/5"
                  )}
                >
                  <Checkbox
                    checked={pendingFilters.includes(opt.value)}
                    onCheckedChange={() => handleFilterToggle(opt.value)}
                    className="h-4 w-4"
                  />
                  <span className="flex-1 truncate">{opt.label}</span>
                  {opt.color && (
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: opt.color }}
                    />
                  )}
                </label>
              ))}
            </div>
            
            {/* Footer */}
            <div className="flex items-center justify-between px-3 py-2 border-t bg-muted/30">
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-7 text-xs"
              >
                Clear
              </Button>
              <Button
                size="sm"
                onClick={applyFilters}
                className="h-7 text-xs"
              >
                Apply
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
