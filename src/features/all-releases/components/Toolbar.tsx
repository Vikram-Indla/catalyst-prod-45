/**
 * Toolbar Component
 * Unified search + filter + sort + view toggle (single row, 34px height)
 */

import { Search, X, LayoutGrid, GanttChartSquare, Table2, ArrowUpDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { ReleaseStatus, ViewMode } from '../types';
import { HealthLevel } from '../utils/healthScore';

export type SortOption = 'health-asc' | 'health-desc' | 'name-asc' | 'name-desc' | 'date-asc' | 'date-desc';

interface ToolbarProps {
  search: string;
  onSearchChange: (val: string) => void;
  statusFilter: ReleaseStatus[];
  onStatusToggle: (status: ReleaseStatus) => void;
  healthFilter: HealthLevel[];
  onHealthToggle: (health: HealthLevel) => void;
  quarter: string;
  onQuarterChange: (q: string) => void;
  sortBy: SortOption;
  onSortChange: (s: SortOption) => void;
  viewMode: ViewMode;
  onViewModeChange: (m: ViewMode) => void;
  onClearFilters: () => void;
  activeFilterCount: number;
}

const STATUS_OPTIONS: { value: ReleaseStatus; label: string }[] = [
  { value: 'planning', label: 'Planning' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'testing', label: 'Testing' },
  { value: 'staging', label: 'Staging' },
  { value: 'released', label: 'Released' },
  { value: 'cancelled', label: 'Cancelled' },
];

const HEALTH_OPTIONS: { value: HealthLevel; label: string; dot: string }[] = [
  { value: 'healthy', label: 'Healthy', dot: 'bg-emerald-500' },
  { value: 'attention', label: 'Attention', dot: 'bg-yellow-500' },
  { value: 'at_risk', label: 'At Risk', dot: 'bg-orange-500' },
  { value: 'critical', label: 'Critical', dot: 'bg-red-500' },
];

const QUARTER_OPTIONS = [
  { value: 'all', label: 'All Quarters' },
  { value: 'Q1 2026', label: 'Q1 2026' },
  { value: 'Q2 2026', label: 'Q2 2026' },
  { value: 'Q3 2026', label: 'Q3 2026' },
  { value: 'Q4 2026', label: 'Q4 2026' },
];

const SORT_LABELS: Record<SortOption, string> = {
  'health-asc': 'Health ↑',
  'health-desc': 'Health ↓',
  'name-asc': 'Name A-Z',
  'name-desc': 'Name Z-A',
  'date-asc': 'Date (nearest)',
  'date-desc': 'Date (farthest)',
};

const views: { mode: ViewMode; icon: React.ReactNode; label: string }[] = [
  { mode: 'cards', icon: <LayoutGrid className="w-3.5 h-3.5" />, label: 'Cards' },
  { mode: 'timeline', icon: <GanttChartSquare className="w-3.5 h-3.5" />, label: 'Timeline' },
  { mode: 'table', icon: <Table2 className="w-3.5 h-3.5" />, label: 'Table' },
];

function FilterButton({ label, count, isActive, children }: { label: string; count: number; isActive: boolean; children: React.ReactNode }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-[34px] text-xs font-medium bg-white dark:bg-[var(--ds-surface-raised,#1A1A1A)]",
            isActive && "border-blue-600 text-blue-600 bg-blue-50"
          )}
        >
          {label}
          {count > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded-full min-w-[18px] text-center">
              {count}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      {children}
    </DropdownMenu>
  );
}

export function Toolbar({
  search, onSearchChange,
  statusFilter, onStatusToggle,
  healthFilter, onHealthToggle,
  quarter, onQuarterChange,
  sortBy, onSortChange,
  viewMode, onViewModeChange,
  onClearFilters, activeFilterCount,
}: ToolbarProps) {
  return (
    <div className="flex items-center gap-2 mb-4 flex-wrap">
      {/* Search */}
      <div className="relative min-w-[180px] max-w-[240px]">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-[var(--ds-text-subtlest,#878787)]" />
        <Input
          placeholder="Search releases..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-8 h-[34px] text-xs bg-white dark:bg-[var(--ds-surface-raised,#1A1A1A)]"
        />
      </div>

      {/* Status */}
      <FilterButton label="Status" count={statusFilter.length} isActive={statusFilter.length > 0}>
        <DropdownMenuContent align="start" className="w-44">
          <DropdownMenuLabel className="text-xs">Filter by Status</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {STATUS_OPTIONS.map(({ value, label }) => (
            <DropdownMenuCheckboxItem
              key={value}
              checked={statusFilter.includes(value)}
              onCheckedChange={() => onStatusToggle(value)}
              className="text-xs"
            >
              {label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </FilterButton>

      {/* Health */}
      <FilterButton label="Health" count={healthFilter.length} isActive={healthFilter.length > 0}>
        <DropdownMenuContent align="start" className="w-44">
          <DropdownMenuLabel className="text-xs">Filter by Health</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {HEALTH_OPTIONS.map(({ value, label, dot }) => (
            <DropdownMenuCheckboxItem
              key={value}
              checked={healthFilter.includes(value)}
              onCheckedChange={() => onHealthToggle(value)}
              className="text-xs"
            >
              <span className={cn("w-2 h-2 rounded-full mr-2 inline-block", dot)} />
              {label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </FilterButton>

      {/* Quarter */}
      <FilterButton label={quarter === 'all' ? 'Quarter' : quarter} count={quarter !== 'all' ? 1 : 0} isActive={quarter !== 'all'}>
        <DropdownMenuContent align="start" className="w-44">
          <DropdownMenuLabel className="text-xs">Filter by Quarter</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {QUARTER_OPTIONS.map(({ value, label }) => (
            <DropdownMenuCheckboxItem
              key={value}
              checked={quarter === value}
              onCheckedChange={() => onQuarterChange(value)}
              className="text-xs"
            >
              {label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </FilterButton>

      {/* Clear */}
      {activeFilterCount > 0 && (
        <Button variant="ghost" size="sm" onClick={onClearFilters} className="h-[34px] text-xs text-slate-500 dark:text-[var(--ds-text-subtlest,#A1A1A1)]">
          <X className="w-3.5 h-3.5 mr-1" />
          Clear ({activeFilterCount})
        </Button>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Sort */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-[34px] text-xs bg-white dark:bg-[var(--ds-surface-raised,#1A1A1A)]">
            <ArrowUpDown className="w-3.5 h-3.5 mr-1.5" />
            {SORT_LABELS[sortBy]}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuRadioGroup value={sortBy} onValueChange={(v) => onSortChange(v as SortOption)}>
            {Object.entries(SORT_LABELS).map(([value, label]) => (
              <DropdownMenuRadioItem key={value} value={value} className="text-xs">
                {label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* View Toggle */}
      <div className="flex border border-slate-200 dark:border-[var(--ds-border,#2E2E2E)] rounded-md overflow-hidden">
        {views.map(({ mode, icon, label }) => (
          <button
            key={mode}
            onClick={() => onViewModeChange(mode)}
            className={cn(
              "h-[34px] flex items-center gap-1.5 px-3 border-r border-slate-200 dark:border-[var(--ds-border,#2E2E2E)] last:border-r-0 transition-colors text-xs font-medium",
              viewMode === mode
                ? "bg-blue-50 text-blue-600"
                : "text-slate-400 dark:text-[var(--ds-text-subtlest,#878787)] hover:text-slate-600 dark:hover:text-[var(--ds-text-subtlest,#A1A1A1)] hover:bg-slate-50 dark:hover:bg-[var(--ds-surface-overlay,#1F1F1F)]"
            )}
          >
            {icon}
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
