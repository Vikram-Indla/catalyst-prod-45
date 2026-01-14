/**
 * Table Toolbar - Search, filters, and actions
 */

import React, { useState, useCallback } from 'react';
import { Search, Filter, X, Columns, Download, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { CATALYST_V5 } from '@/lib/catalyst-colors';
import type { TableFilters, FilterOption } from '@/types/assignment-table.types';

interface TableToolbarProps {
  filters: TableFilters;
  onFiltersChange: (filters: TableFilters) => void;
  filterOptions: {
    modules: FilterOption[];
    assignees: FilterOption[];
    statuses: FilterOption[];
    priorities: FilterOption[];
    types: FilterOption[];
  };
  totalCount: number;
  filteredCount: number;
  onExport: (format: 'csv' | 'xlsx') => void;
  onColumnsClick: () => void;
  hasSelection?: boolean;
}

export function TableToolbar({
  filters,
  onFiltersChange,
  filterOptions,
  totalCount,
  filteredCount,
  onExport,
  onColumnsClick,
  hasSelection,
}: TableToolbarProps) {
  const [searchValue, setSearchValue] = useState(filters.search);

  // Debounced search
  const handleSearchChange = useCallback((value: string) => {
    setSearchValue(value);
    // Debounce
    const timeoutId = setTimeout(() => {
      onFiltersChange({ ...filters, search: value });
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [filters, onFiltersChange]);

  const clearSearch = () => {
    setSearchValue('');
    onFiltersChange({ ...filters, search: '' });
  };

  const handleFilterChange = (key: keyof TableFilters, values: string[]) => {
    onFiltersChange({ ...filters, [key]: values });
  };

  const clearAllFilters = () => {
    setSearchValue('');
    onFiltersChange({
      search: '',
      status: [],
      assignee: [],
      priority: [],
      module: [],
      testType: [],
    });
  };

  const hasActiveFilters = 
    filters.search ||
    filters.status.length > 0 ||
    filters.assignee.length > 0 ||
    filters.priority.length > 0 ||
    filters.module.length > 0 ||
    filters.testType.length > 0;

  const renderFilterDropdown = (
    label: string,
    options: FilterOption[],
    selected: string[],
    onChange: (values: string[]) => void
  ) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5">
          {label}
          {selected.length > 0 && (
            <Badge 
              className="h-4 px-1 text-[10px] rounded-full"
              style={{ backgroundColor: CATALYST_V5.primaryLight, color: CATALYST_V5.primary }}
            >
              {selected.length}
            </Badge>
          )}
          <ChevronDown className="h-3.5 w-3.5 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        {options.map(option => (
          <DropdownMenuCheckboxItem
            key={option.value}
            checked={selected.includes(option.value)}
            onCheckedChange={(checked) => {
              if (checked) {
                onChange([...selected, option.value]);
              } else {
                onChange(selected.filter(v => v !== option.value));
              }
            }}
          >
            {option.label}
          </DropdownMenuCheckboxItem>
        ))}
        {selected.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onChange([])}>
              Clear selection
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="space-y-3">
      {/* Main toolbar row */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative w-72">
          <Search 
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" 
            style={{ color: CATALYST_V5.slate[400] }}
          />
          <Input
            placeholder="Search by ID, title, or assignee..."
            value={searchValue}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9 pr-8 h-8 text-sm"
            style={{ borderColor: CATALYST_V5.slate[200] }}
          />
          {searchValue && (
            <button
              onClick={clearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-slate-100"
            >
              <X className="h-3.5 w-3.5" style={{ color: CATALYST_V5.slate[400] }} />
            </button>
          )}
        </div>

        {/* Filter dropdowns */}
        {renderFilterDropdown('Status', filterOptions.statuses, filters.status, (v) => handleFilterChange('status', v))}
        {renderFilterDropdown('Assignee', filterOptions.assignees, filters.assignee, (v) => handleFilterChange('assignee', v))}
        {renderFilterDropdown('Priority', filterOptions.priorities, filters.priority, (v) => handleFilterChange('priority', v))}
        {renderFilterDropdown('Module', filterOptions.modules, filters.module, (v) => handleFilterChange('module', v))}

        <div className="flex-1" />

        {/* Results count */}
        <span className="text-sm" style={{ color: CATALYST_V5.slate[500] }}>
          Showing {filteredCount} of {totalCount} tests
        </span>

        {/* Column customizer */}
        <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={onColumnsClick}>
          <Columns className="h-4 w-4" />
          Columns
        </Button>

        {/* Export */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1.5">
              <Download className="h-4 w-4" />
              Export
              <ChevronDown className="h-3.5 w-3.5 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onExport('csv')}>
              Export as CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExport('xlsx')}>
              Export as Excel
            </DropdownMenuItem>
            {hasSelection && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onExport('csv')}>
                  Export Selected Only
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Active filter chips */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-3.5 w-3.5" style={{ color: CATALYST_V5.slate[400] }} />
          
          {filters.status.map(status => (
            <Badge 
              key={status} 
              variant="secondary" 
              className="gap-1 pr-1 capitalize"
              style={{ backgroundColor: CATALYST_V5.primaryLight, color: CATALYST_V5.primary }}
            >
              {status.replace('_', ' ')}
              <button 
                onClick={() => handleFilterChange('status', filters.status.filter(s => s !== status))}
                className="ml-0.5 p-0.5 rounded hover:bg-primary/20"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          
          {filters.assignee.map(assigneeId => {
            const assignee = filterOptions.assignees.find(a => a.value === assigneeId);
            return (
              <Badge 
                key={assigneeId} 
                variant="secondary" 
                className="gap-1 pr-1"
                style={{ backgroundColor: CATALYST_V5.primaryLight, color: CATALYST_V5.primary }}
              >
                {assignee?.label || 'Unassigned'}
                <button 
                  onClick={() => handleFilterChange('assignee', filters.assignee.filter(a => a !== assigneeId))}
                  className="ml-0.5 p-0.5 rounded hover:bg-primary/20"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
          
          {filters.priority.map(priority => (
            <Badge 
              key={priority} 
              variant="secondary" 
              className="gap-1 pr-1 capitalize"
              style={{ backgroundColor: CATALYST_V5.primaryLight, color: CATALYST_V5.primary }}
            >
              {priority}
              <button 
                onClick={() => handleFilterChange('priority', filters.priority.filter(p => p !== priority))}
                className="ml-0.5 p-0.5 rounded hover:bg-primary/20"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          
          {filters.module.map(module => (
            <Badge 
              key={module} 
              variant="secondary" 
              className="gap-1 pr-1"
              style={{ backgroundColor: CATALYST_V5.primaryLight, color: CATALYST_V5.primary }}
            >
              {module}
              <button 
                onClick={() => handleFilterChange('module', filters.module.filter(m => m !== module))}
                className="ml-0.5 p-0.5 rounded hover:bg-primary/20"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          
          <button 
            onClick={clearAllFilters}
            className="text-xs font-medium hover:underline"
            style={{ color: CATALYST_V5.primary }}
          >
            Clear All
          </button>
        </div>
      )}
    </div>
  );
}
