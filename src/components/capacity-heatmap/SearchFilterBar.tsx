/**
 * Search and Filter Bar for Heatmap
 * Catalyst V5 compliant
 */

import { memo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Search, X, Filter, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useHeatmapStore } from '@/stores/capacity-heatmap-store';
import { CATALYST_COLORS } from '@/types/capacity-heatmap';

interface SearchFilterBarProps {
  departments: string[];
  className?: string;
}

export const SearchFilterBar = memo(function SearchFilterBar({
  departments,
  className
}: SearchFilterBarProps) {
  const {
    searchQuery,
    setSearchQuery,
    filters,
    setFilters,
    resetFilters,
  } = useHeatmapStore();
  
  const activeFilterCount = 
    (filters.departments.length > 0 ? 1 : 0) +
    (filters.showOnlyConflicts ? 1 : 0) +
    (filters.utilizationRange[0] > 0 || filters.utilizationRange[1] < 200 ? 1 : 0);
  
  const handleDepartmentToggle = useCallback((dept: string) => {
    const current = filters.departments;
    const updated = current.includes(dept)
      ? current.filter(d => d !== dept)
      : [...current, dept];
    setFilters({ departments: updated });
  }, [filters.departments, setFilters]);
  
  return (
    <motion.div
      className={cn(
        "flex items-center gap-3",
        className
      )}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Search input */}
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          id="heatmap-search"
          type="text"
          placeholder="Search resources... (Press /)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 pr-8 h-9"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
            onClick={() => setSearchQuery('')}
          >
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>
      
      {/* Filter dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-9 gap-2">
            <Filter className="w-4 h-4" />
            Filters
            {activeFilterCount > 0 && (
              <Badge 
                variant="secondary" 
                className="h-5 w-5 p-0 flex items-center justify-center text-[10px]"
                style={{ backgroundColor: CATALYST_COLORS.primary, color: 'white' }}
              >
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>Departments</DropdownMenuLabel>
          {departments.map((dept) => (
            <DropdownMenuCheckboxItem
              key={dept}
              checked={filters.departments.includes(dept)}
              onCheckedChange={() => handleDepartmentToggle(dept)}
            >
              {dept}
            </DropdownMenuCheckboxItem>
          ))}
          
          <DropdownMenuSeparator />
          
          <DropdownMenuLabel>Status</DropdownMenuLabel>
          <DropdownMenuCheckboxItem
            checked={filters.showOnlyConflicts}
            onCheckedChange={(checked) => setFilters({ showOnlyConflicts: checked })}
          >
            <AlertTriangle className="w-4 h-4 mr-2" style={{ color: CATALYST_COLORS.danger }} />
            Show only conflicts
          </DropdownMenuCheckboxItem>
          
          <DropdownMenuSeparator />
          
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-xs"
            onClick={resetFilters}
          >
            Reset all filters
          </Button>
        </DropdownMenuContent>
      </DropdownMenu>
      
      {/* Active filter badges */}
      {activeFilterCount > 0 && (
        <div className="flex items-center gap-1.5">
          {filters.departments.map((dept) => (
            <Badge
              key={dept}
              variant="secondary"
              className="h-6 gap-1 text-xs cursor-pointer hover:bg-destructive/20"
              onClick={() => handleDepartmentToggle(dept)}
            >
              {dept}
              <X className="w-3 h-3" />
            </Badge>
          ))}
          
          {filters.showOnlyConflicts && (
            <Badge
              variant="secondary"
              className="h-6 gap-1 text-xs cursor-pointer hover:bg-destructive/20"
              style={{ backgroundColor: `${CATALYST_COLORS.danger}15`, color: CATALYST_COLORS.danger }}
              onClick={() => setFilters({ showOnlyConflicts: false })}
            >
              Conflicts only
              <X className="w-3 h-3" />
            </Badge>
          )}
        </div>
      )}
    </motion.div>
  );
});
