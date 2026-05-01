// =====================================================
// RELEASES TOOLBAR COMPONENT
// Search, filter, view toggle
// =====================================================

import { useState } from 'react';
import { Search, Filter, X, LayoutList, GanttChartSquare } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Lozenge } from '@/components/ads';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { ReleasesFilter, ReleaseStatus, ReleaseHealth, ViewMode, STATUS_CONFIG, HEALTH_CONFIG } from '@/types/releases';

interface Props {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  filter: ReleasesFilter;
  onToggleStatus: (status: ReleaseStatus) => void;
  onToggleHealth: (health: ReleaseHealth) => void;
  onSearch: (search: string) => void;
  onClearFilters: () => void;
  activeFilterCount: number;
}

const ALL_STATUSES: ReleaseStatus[] = ['planning', 'active', 'uat', 'released', 'archived'];
const ALL_HEALTH: ReleaseHealth[] = ['healthy', 'at_risk', 'critical'];

export function ReleasesToolbar({
  viewMode,
  onViewModeChange,
  filter,
  onToggleStatus,
  onToggleHealth,
  onSearch,
  onClearFilters,
  activeFilterCount,
}: Props) {
  const [filterOpen, setFilterOpen] = useState(false);

  return (
    <div className="flex items-center gap-4 mb-6">
      {/* Search */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          id="release-search"
          type="text"
          placeholder="Search releases..."
          value={filter.search}
          onChange={(e) => onSearch(e.target.value)}
          className="pl-10 bg-white dark:bg-[var(--ds-surface-raised,#1A1A1A)] border-slate-200 dark:border-[var(--ds-border,#2E2E2E)]"
        />
        {filter.search && (
          <button
            onClick={() => onSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filter */}
      <Popover open={filterOpen} onOpenChange={setFilterOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Filter className="w-4 h-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-1">
                <Lozenge appearance="inprogress">{activeFilterCount}</Lozenge>
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-4" align="start">
          <div className="space-y-4">
            {/* Status Filter */}
            <div>
              <div className="text-xs font-semibold uppercase text-slate-500 mb-2">Status</div>
              <div className="flex flex-wrap gap-2">
                {ALL_STATUSES.map(status => {
                  const config = STATUS_CONFIG[status];
                  const isSelected = filter.status.includes(status);
                  return (
                    <button
                      key={status}
                      onClick={() => onToggleStatus(status)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border",
                        isSelected 
                          ? `${config.className} border-current` 
                          : "bg-slate-50 text-slate-400 border-transparent hover:bg-slate-100"
                      )}
                    >
                      {config.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Health Filter */}
            <div>
              <div className="text-xs font-semibold uppercase text-slate-500 mb-2">Health</div>
              <div className="flex flex-wrap gap-2">
                {ALL_HEALTH.map(health => {
                  const config = HEALTH_CONFIG[health];
                  const isSelected = filter.health.includes(health);
                  return (
                    <button
                      key={health}
                      onClick={() => onToggleHealth(health)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border flex items-center gap-2",
                        isSelected 
                          ? "bg-slate-100 border-slate-300" 
                          : "bg-slate-50 text-slate-400 border-transparent hover:bg-slate-100"
                      )}
                    >
                      <div className={cn("w-2 h-2 rounded-full", config.dotClass)} />
                      {config.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Clear */}
            {activeFilterCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onClearFilters}
                className="w-full text-slate-500"
              >
                Clear all filters
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* View Toggle */}
      <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
        <button
          onClick={() => onViewModeChange('table')}
          className={cn(
            "px-3 py-2 flex items-center gap-2 text-sm font-medium transition-colors",
            viewMode === 'table'
              ? "bg-primary text-white"
              : "bg-white dark:bg-[var(--ds-surface-raised,#1A1A1A)] text-slate-600 hover:bg-slate-50 dark:hover:bg-[var(--ds-surface,#0A0A0A)]"
          )}
        >
          <LayoutList className="w-4 h-4" />
          Table
        </button>
        <button
          onClick={() => onViewModeChange('timeline')}
          className={cn(
            "px-3 py-2 flex items-center gap-2 text-sm font-medium transition-colors",
            viewMode === 'timeline'
              ? "bg-primary text-white"
              : "bg-white dark:bg-[var(--ds-surface-raised,#1A1A1A)] text-slate-600 hover:bg-slate-50 dark:hover:bg-[var(--ds-surface,#0A0A0A)]"
          )}
        >
          <GanttChartSquare className="w-4 h-4" />
          Timeline
        </button>
      </div>
    </div>
  );
}
