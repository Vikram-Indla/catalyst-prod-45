// ============================================================
// WORKSTREAMS V10 TOOLBAR
// Search, filters, view toggle, and keyboard shortcuts
// ============================================================

import { useState, useRef, useEffect } from 'react';
import { Search, Filter, X, LayoutList, LayoutGrid, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { HealthFilter, ViewMode, LeadFilter } from './types';

interface ToolbarProps {
  // Search
  searchQuery: string;
  onSearchChange: (query: string) => void;
  
  // Filters
  healthFilter: HealthFilter;
  onHealthFilterChange: (health: HealthFilter) => void;
  leadFilter: LeadFilter;
  onLeadFilterChange: (lead: LeadFilter) => void;
  availableLeads: { id: string; name: string }[];
  
  // View
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  
  // My Workstreams toggle
  showMyWorkstreams: boolean;
  onMyWorkstreamsToggle: () => void;
  
  // Count
  totalCount: number;
}

const HEALTH_OPTIONS: { key: HealthFilter; label: string; color: string }[] = [
  { key: 'all', label: 'All', color: '#64748b' },
  { key: 'healthy', label: 'On Track', color: '#10b981' },
  { key: 'at-risk', label: 'At Risk', color: '#f59e0b' },
  { key: 'critical', label: 'Critical', color: '#ef4444' },
];

export function Toolbar({
  searchQuery,
  onSearchChange,
  healthFilter,
  onHealthFilterChange,
  leadFilter,
  onLeadFilterChange,
  availableLeads,
  viewMode,
  onViewModeChange,
  showMyWorkstreams,
  onMyWorkstreamsToggle,
  totalCount,
}: ToolbarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  // Keyboard shortcut for search (⌘K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const activeFilterCount = [
    healthFilter !== 'all',
    leadFilter !== 'all',
    showMyWorkstreams,
  ].filter(Boolean).length;

  return (
    <div 
      className="flex items-center gap-4 mb-6"
      role="toolbar"
      aria-label="Workstreams toolbar"
    >
      {/* Search Input */}
      <div className="relative flex-1 max-w-xs">
        <Search 
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" 
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          type="search"
          placeholder="Search workstreams..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={cn(
            'w-full h-9 pl-10 pr-16 rounded-lg border bg-white dark:bg-slate-800',
            'text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400',
            'outline-none transition-all',
            isFocused
              ? 'border-blue-500 ring-2 ring-blue-500/20'
              : 'border-slate-200 dark:border-slate-700'
          )}
          aria-label="Search workstreams"
          role="searchbox"
        />
        {searchQuery ? (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
            aria-label="Clear search"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        ) : (
          <kbd 
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600 font-mono"
            aria-hidden="true"
          >
            ⌘K
          </kbd>
        )}
      </div>

      {/* Health Filter Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className={cn(
              'gap-2 h-9',
              healthFilter !== 'all' && 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400'
            )}
            aria-haspopup="listbox"
          >
            <Filter className="w-4 h-4" />
            Health
            {healthFilter !== 'all' && (
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" aria-hidden="true" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-40" role="listbox" aria-label="Filter by health">
          <DropdownMenuLabel className="text-xs">Health Status</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {HEALTH_OPTIONS.map((option) => (
            <DropdownMenuCheckboxItem
              key={option.key}
              checked={healthFilter === option.key}
              onCheckedChange={() => onHealthFilterChange(option.key)}
              role="option"
              aria-selected={healthFilter === option.key}
            >
              <span 
                className="w-2 h-2 rounded-full mr-2" 
                style={{ backgroundColor: option.color }}
                aria-hidden="true"
              />
              {option.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Lead Filter Dropdown */}
      {availableLeads.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className={cn(
                'gap-2 h-9',
                leadFilter !== 'all' && 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400'
              )}
              aria-haspopup="listbox"
            >
              <Users className="w-4 h-4" />
              Lead
              {leadFilter !== 'all' && (
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" aria-hidden="true" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48" role="listbox" aria-label="Filter by lead">
            <DropdownMenuLabel className="text-xs">Workstream Lead</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={leadFilter === 'all'}
              onCheckedChange={() => onLeadFilterChange('all')}
              role="option"
              aria-selected={leadFilter === 'all'}
            >
              All Leads
            </DropdownMenuCheckboxItem>
            {availableLeads.map((lead) => (
              <DropdownMenuCheckboxItem
                key={lead.id}
                checked={leadFilter === lead.id}
                onCheckedChange={() => onLeadFilterChange(lead.id)}
                role="option"
                aria-selected={leadFilter === lead.id}
              >
                {lead.name}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* My Workstreams Toggle */}
      <Button
        variant={showMyWorkstreams ? 'default' : 'ghost'}
        size="sm"
        onClick={onMyWorkstreamsToggle}
        className="h-9"
        aria-pressed={showMyWorkstreams}
      >
        My Workstreams
      </Button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Count */}
      <span 
        className="text-sm text-slate-500 dark:text-slate-400"
        role="status"
        aria-live="polite"
      >
        {totalCount} workstream{totalCount !== 1 ? 's' : ''}
      </span>

      {/* View Toggle */}
      <div 
        className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg p-0.5 bg-slate-50 dark:bg-slate-800"
        role="radiogroup"
        aria-label="View mode"
      >
        <button
          onClick={() => onViewModeChange('list')}
          className={cn(
            'p-1.5 rounded transition-colors',
            viewMode === 'list'
              ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-slate-100'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          )}
          role="radio"
          aria-checked={viewMode === 'list'}
          aria-label="List view"
        >
          <LayoutList className="w-4 h-4" />
        </button>
        <button
          onClick={() => onViewModeChange('grid')}
          className={cn(
            'p-1.5 rounded transition-colors',
            viewMode === 'grid'
              ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-slate-100'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          )}
          role="radio"
          aria-checked={viewMode === 'grid'}
          aria-label="Grid view"
        >
          <LayoutGrid className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
