// =====================================================
// DEFECT FILTER BAR
// Command search + filter tokens + filter triggers
// =====================================================

import { useState, useRef } from 'react';
import { Search, Plus, X, Keyboard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DefectFilterToken } from './DefectFilterToken';
import { 
  DefectFilterDropdown, 
  getStatusOptions, 
  getSeverityOptions, 
  getPriorityOptions 
} from './DefectFilterDropdown';
import type { DefectFilters, FilterType, FilterToken } from '@/types/defect.types';

interface DefectFilterBarProps {
  filters: DefectFilters;
  onSearchChange: (search: string) => void;
  onFilterAdd: (type: FilterType, values: string[]) => void;
  onFilterRemove: (type: FilterType, value?: string) => void;
  onClearAll: () => void;
  onSaveView?: () => void;
}

export function DefectFilterBar({
  filters,
  onSearchChange,
  onFilterAdd,
  onFilterRemove,
  onClearAll,
  onSaveView,
}: DefectFilterBarProps) {
  const [searchFocused, setSearchFocused] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<FilterType | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Build active tokens from filters
  const activeTokens: FilterToken[] = [];
  
  if (filters.statuses.length > 0) {
    activeTokens.push({ 
      type: 'status', 
      values: filters.statuses, 
      label: 'Status' 
    });
  }
  if (filters.severities.length > 0) {
    activeTokens.push({ 
      type: 'severity', 
      values: filters.severities, 
      label: 'Severity' 
    });
  }
  if (filters.priorities.length > 0) {
    activeTokens.push({ 
      type: 'priority', 
      values: filters.priorities, 
      label: 'Priority' 
    });
  }
  if (filters.assigneeIds.length > 0) {
    activeTokens.push({ 
      type: 'assignee', 
      values: filters.assigneeIds, 
      label: 'Assignee' 
    });
  }

  const hasActiveFilters = activeTokens.length > 0 || filters.search;

  const getDropdownOptions = (type: FilterType) => {
    switch (type) {
      case 'status': return getStatusOptions();
      case 'severity': return getSeverityOptions();
      case 'priority': return getPriorityOptions();
      default: return [];
    }
  };

  const getSelectedValues = (type: FilterType): string[] => {
    switch (type) {
      case 'status': return filters.statuses;
      case 'severity': return filters.severities;
      case 'priority': return filters.priorities;
      case 'assignee': return filters.assigneeIds;
      default: return [];
    }
  };

  return (
    <div className="flex items-center gap-2 px-4 py-2.5 bg-white border-b border-slate-200">
      {/* Command Search */}
      <div className={cn(
        "relative transition-all duration-200",
        searchFocused ? "w-80" : "w-64"
      )}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          ref={searchRef}
          id="defect-search"
          value={filters.search}
          onChange={(e) => onSearchChange(e.target.value)}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          placeholder="Search defects..."
          className="h-9 pl-9 pr-12 text-sm"
        />
        {!searchFocused && (
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-slate-50 px-1.5 font-mono text-[10px] font-medium text-slate-500">
            /
          </kbd>
        )}
      </div>

      {/* Active Filter Tokens */}
      {activeTokens.map((token) => (
        <DefectFilterToken
          key={token.type}
          type={token.type}
          label={token.label}
          values={token.values}
          onRemove={() => onFilterRemove(token.type)}
          onEdit={() => setActiveDropdown(token.type)}
        />
      ))}

      {/* Filter Triggers */}
      <div className="flex items-center gap-1">
        {(['status', 'severity', 'priority'] as FilterType[]).map((type) => {
          const isActive = getSelectedValues(type).length > 0;
          if (isActive) return null; // Already shown as token

          return (
            <div key={type} className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-slate-500 hover:text-slate-700"
                onClick={() => setActiveDropdown(activeDropdown === type ? null : type)}
              >
                <Plus className="h-3 w-3 mr-1" />
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Button>

              {activeDropdown === type && (
                <DefectFilterDropdown
                  type={type}
                  selected={getSelectedValues(type)}
                  options={getDropdownOptions(type)}
                  onChange={(values) => onFilterAdd(type, values)}
                  onClose={() => setActiveDropdown(null)}
                  searchable={type === 'assignee'}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Clear & Save */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={onClearAll}
            className="text-slate-500 hover:text-slate-700 transition-colors"
          >
            Clear all
          </button>
          {onSaveView && (
            <>
              <span className="text-slate-300">|</span>
              <button
                onClick={onSaveView}
                className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                Save view
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
