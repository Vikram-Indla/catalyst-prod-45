import { useState, useRef, useEffect } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, Filter, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

export type SortDirection = 'asc' | 'desc' | null;

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

interface TableColumnHeaderProps {
  label: string;
  columnId: string;
  sortable?: boolean;
  filterable?: boolean;
  filterOptions?: FilterOption[];
  sortDirection: SortDirection;
  activeFilters: string[];
  onSort: (columnId: string) => void;
  onFilter: (columnId: string, values: string[]) => void;
  className?: string;
}

export function TableColumnHeader({
  label,
  columnId,
  sortable = true,
  filterable = true,
  filterOptions = [],
  sortDirection,
  activeFilters,
  onSort,
  onFilter,
  className
}: TableColumnHeaderProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterSearch, setFilterSearch] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<string[]>(activeFilters);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelectedFilters(activeFilters);
  }, [activeFilters]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = filterOptions.filter(opt =>
    opt.label.toLowerCase().includes(filterSearch.toLowerCase())
  );

  const handleToggleFilter = (value: string) => {
    const newFilters = selectedFilters.includes(value)
      ? selectedFilters.filter(f => f !== value)
      : [...selectedFilters, value];
    setSelectedFilters(newFilters);
  };

  const handleApplyFilters = () => {
    onFilter(columnId, selectedFilters);
    setIsFilterOpen(false);
  };

  const handleClearFilters = () => {
    setSelectedFilters([]);
    onFilter(columnId, []);
    setIsFilterOpen(false);
  };

  const handleSelectAll = () => {
    const allValues = filterOptions.map(o => o.value);
    setSelectedFilters(allValues);
  };

  const hasActiveFilters = activeFilters.length > 0;

  return (
    <div className={cn("flex items-center gap-1 relative", className)}>
      <span className="truncate">{label}</span>
      
      {/* Sort Button */}
      {sortable && (
        <button
          onClick={() => onSort(columnId)}
          className="p-0.5 rounded hover:bg-muted/50 transition-colors"
          title={`Sort by ${label}`}
        >
          {sortDirection === 'asc' ? (
            <ArrowUp className="h-3 w-3 text-brand-gold" />
          ) : sortDirection === 'desc' ? (
            <ArrowDown className="h-3 w-3 text-brand-gold" />
          ) : (
            <ArrowUpDown className="h-3 w-3 text-muted-foreground/60" />
          )}
        </button>
      )}

      {/* Filter Button */}
      {filterable && filterOptions.length > 0 && (
        <div ref={dropdownRef} className="relative">
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={cn(
              "p-0.5 rounded hover:bg-muted/50 transition-colors",
              hasActiveFilters && "text-brand-gold"
            )}
            title={`Filter by ${label}`}
          >
            <Filter className={cn("h-3 w-3", hasActiveFilters ? "text-brand-gold" : "text-muted-foreground/60")} />
          </button>

          {/* Filter Dropdown */}
          {isFilterOpen && (
            <div className="absolute top-full left-0 mt-1 w-56 bg-card border border-border rounded-lg shadow-xl z-50 overflow-hidden">
              {/* Search */}
              <div className="p-2 border-b border-border">
                <Input
                  placeholder="Search..."
                  value={filterSearch}
                  onChange={(e) => setFilterSearch(e.target.value)}
                  className="h-8 text-xs bg-background"
                />
              </div>

              {/* Quick Actions */}
              <div className="flex items-center justify-between px-2 py-1.5 border-b border-border bg-muted/30">
                <button
                  onClick={handleSelectAll}
                  className="text-xs text-brand-gold hover:underline"
                >
                  Select All
                </button>
                <button
                  onClick={handleClearFilters}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear
                </button>
              </div>

              {/* Options */}
              <div className="max-h-48 overflow-auto py-1">
                {filteredOptions.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-muted-foreground text-center">
                    No options found
                  </div>
                ) : (
                  filteredOptions.map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center gap-2 px-3 py-1.5 hover:bg-muted/50 cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedFilters.includes(option.value)}
                        onCheckedChange={() => handleToggleFilter(option.value)}
                        className="h-3.5 w-3.5"
                      />
                      <span className="text-xs text-foreground flex-1 truncate">
                        {option.label}
                      </span>
                      {option.count !== undefined && (
                        <span className="text-xs text-muted-foreground">
                          ({option.count})
                        </span>
                      )}
                    </label>
                  ))
                )}
              </div>

              {/* Apply Button */}
              <div className="p-2 border-t border-border bg-muted/30">
                <Button
                  size="sm"
                  onClick={handleApplyFilters}
                  className="w-full h-7 text-xs bg-brand-gold hover:bg-brand-gold-hover text-white"
                >
                  <Check className="h-3 w-3 mr-1" />
                  Apply Filters
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Active Filter Badge */}
      {hasActiveFilters && (
        <span className="ml-0.5 px-1 py-0.5 text-[10px] bg-brand-gold/20 text-brand-gold rounded">
          {activeFilters.length}
        </span>
      )}
    </div>
  );
}
