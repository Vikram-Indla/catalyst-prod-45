/**
 * Prompt 5: Advanced Filtering System
 * Multi-dimensional filtering with status, departments, roles, allocation range
 */

import { useState } from 'react';
import { Filter, X, Sliders } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

export type AllocationStatus = 'AVAILABLE' | 'PARTIAL' | 'AT_CAPACITY' | 'OVER_ALLOCATED';

export interface FilterState {
  status: AllocationStatus[];
  departments: string[];
  roles: string[];
  allocationRange: { min: number; max: number };
  availableInPeriod: { start: Date | null; end: Date | null; minPercent: number } | null;
  searchQuery: string;
}

export const defaultFilterState: FilterState = {
  status: [],
  departments: [],
  roles: [],
  allocationRange: { min: 0, max: 200 },
  availableInPeriod: null,
  searchQuery: '',
};

interface ResourceMetric {
  id: string;
  name: string;
  role?: string;
  department?: string;
  allocation?: number;
}

interface AdvancedFiltersProps {
  resources: ResourceMetric[];
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  className?: string;
}

export function AdvancedFilters({
  resources,
  filters,
  onFiltersChange,
  className
}: AdvancedFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Extract unique values from resources
  const uniqueDepartments = [...new Set(resources.map(r => r.department).filter(Boolean))] as string[];
  const uniqueRoles = [...new Set(resources.map(r => r.role).filter(Boolean))] as string[];

  const activeFilterCount = [
    filters.status.length > 0,
    filters.departments.length > 0,
    filters.roles.length > 0,
    filters.allocationRange.min > 0 || filters.allocationRange.max < 200,
  ].filter(Boolean).length;

  const toggleStatusFilter = (status: AllocationStatus) => {
    const newValue = filters.status.includes(status)
      ? filters.status.filter(s => s !== status)
      : [...filters.status, status];
    onFiltersChange({ ...filters, status: newValue });
  };

  const toggleDepartmentFilter = (dept: string) => {
    const newValue = filters.departments.includes(dept)
      ? filters.departments.filter(d => d !== dept)
      : [...filters.departments, dept];
    onFiltersChange({ ...filters, departments: newValue });
  };

  const toggleRoleFilter = (role: string) => {
    const newValue = filters.roles.includes(role)
      ? filters.roles.filter(r => r !== role)
      : [...filters.roles, role];
    onFiltersChange({ ...filters, roles: newValue });
  };

  const clearFilters = () => {
    onFiltersChange(defaultFilterState);
  };

  const statusLabels: Record<AllocationStatus, { label: string; color: string }> = {
    AVAILABLE: { label: 'Available', color: 'bg-teal-500' },
    PARTIAL: { label: 'Partial', color: 'bg-blue-400' },
    AT_CAPACITY: { label: 'At Capacity', color: 'bg-blue-600' },
    OVER_ALLOCATED: { label: 'Over-Allocated', color: 'bg-amber-500' },
  };

  return (
    <div className={className}>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 gap-2">
            <Filter className="w-4 h-4" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent className="w-96 overflow-y-auto">
          <SheetHeader className="pb-4">
            <div className="flex items-center justify-between">
              <SheetTitle className="flex items-center gap-2">
                <Sliders className="w-5 h-5" />
                Filters
              </SheetTitle>
              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear all
                </Button>
              )}
            </div>
          </SheetHeader>

          <div className="space-y-6">
            {/* Status Filter */}
            <FilterSection title="Status">
              <div className="flex flex-wrap gap-2">
                {(Object.keys(statusLabels) as AllocationStatus[]).map((status) => (
                  <Badge
                    key={status}
                    variant={filters.status.includes(status) ? 'default' : 'outline'}
                    className={cn(
                      "cursor-pointer transition-all",
                      filters.status.includes(status) && statusLabels[status].color
                    )}
                    onClick={() => toggleStatusFilter(status)}
                  >
                    {statusLabels[status].label}
                  </Badge>
                ))}
              </div>
            </FilterSection>

            {/* Department Filter */}
            <FilterSection title="Department">
              <div className="flex flex-wrap gap-2">
                {uniqueDepartments.map((dept) => (
                  <Badge
                    key={dept}
                    variant={filters.departments.includes(dept) ? 'default' : 'outline'}
                    className="cursor-pointer transition-all"
                    onClick={() => toggleDepartmentFilter(dept)}
                  >
                    {dept}
                  </Badge>
                ))}
              </div>
            </FilterSection>

            {/* Role Filter */}
            <FilterSection title="Role">
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                {uniqueRoles.map((role) => (
                  <Badge
                    key={role}
                    variant={filters.roles.includes(role) ? 'default' : 'outline'}
                    className="cursor-pointer transition-all"
                    onClick={() => toggleRoleFilter(role)}
                  >
                    {role}
                  </Badge>
                ))}
              </div>
            </FilterSection>

            {/* Allocation Range Filter */}
            <FilterSection title="Allocation Range">
              <div className="space-y-4">
                <Slider
                  value={[filters.allocationRange.min, filters.allocationRange.max]}
                  min={0}
                  max={200}
                  step={5}
                  onValueChange={([min, max]) =>
                    onFiltersChange({
                      ...filters,
                      allocationRange: { min, max }
                    })
                  }
                  className="w-full"
                />
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{filters.allocationRange.min}%</span>
                  <span>{filters.allocationRange.max}%</span>
                </div>
              </div>
            </FilterSection>

            {/* Active Filters Summary */}
            {activeFilterCount > 0 && (
              <div className="pt-4 border-t border-border">
                <h4 className="text-sm font-medium mb-2">Active Filters</h4>
                <div className="flex flex-wrap gap-2">
                  {filters.status.map((status) => (
                    <Badge key={status} variant="secondary" className="gap-1">
                      {statusLabels[status].label}
                      <X
                        className="w-3 h-3 cursor-pointer"
                        onClick={() => toggleStatusFilter(status)}
                      />
                    </Badge>
                  ))}
                  {filters.departments.map((dept) => (
                    <Badge key={dept} variant="secondary" className="gap-1">
                      {dept}
                      <X
                        className="w-3 h-3 cursor-pointer"
                        onClick={() => toggleDepartmentFilter(dept)}
                      />
                    </Badge>
                  ))}
                  {filters.roles.map((role) => (
                    <Badge key={role} variant="secondary" className="gap-1">
                      {role}
                      <X
                        className="w-3 h-3 cursor-pointer"
                        onClick={() => toggleRoleFilter(role)}
                      />
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-sm font-medium mb-3 text-foreground">{title}</h4>
      {children}
    </div>
  );
}

// Utility function to apply filters
export function applyFilters(resources: ResourceMetric[], filters: FilterState): ResourceMetric[] {
  return resources.filter(r => {
    // Status filter
    if (filters.status.length > 0) {
      const allocation = r.allocation ?? 0;
      let status: AllocationStatus;
      if (allocation === 0) status = 'AVAILABLE';
      else if (allocation < 100) status = 'PARTIAL';
      else if (allocation === 100) status = 'AT_CAPACITY';
      else status = 'OVER_ALLOCATED';
      
      if (!filters.status.includes(status)) return false;
    }

    // Department filter
    if (filters.departments.length > 0 && !filters.departments.includes(r.department || '')) {
      return false;
    }

    // Role filter
    if (filters.roles.length > 0 && !filters.roles.includes(r.role || '')) {
      return false;
    }

    // Allocation range
    const allocation = r.allocation ?? 0;
    if (allocation < filters.allocationRange.min || allocation > filters.allocationRange.max) {
      return false;
    }

    // Search query
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      const matches = 
        r.name.toLowerCase().includes(query) ||
        r.role?.toLowerCase().includes(query) ||
        r.department?.toLowerCase().includes(query);
      if (!matches) return false;
    }

    return true;
  });
}
