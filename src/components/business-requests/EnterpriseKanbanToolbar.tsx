/**
 * EnterpriseKanbanToolbar — Sticky toolbar for enterprise Kanban board
 * Three-zone layout: Left (view/filter controls), Center (search), Right (export/create)
 */

import { useState } from 'react';
import { Search, Filter, ArrowUpDown, Columns3, Settings2, Download, Plus, LayoutList, Kanban, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { ViewMode } from './ViewToggle';

interface FilterChip {
  key: string;
  label: string;
  value: string;
}

interface EnterpriseKanbanToolbarProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeFilters: FilterChip[];
  onFilterClick: () => void;
  onClearFilter: (key: string) => void;
  onClearAllFilters: () => void;
  onExport: () => void;
  onCreateClick: () => void;
  filterCount?: number;
}

export function EnterpriseKanbanToolbar({
  viewMode,
  onViewModeChange,
  searchQuery,
  onSearchChange,
  activeFilters,
  onFilterClick,
  onClearFilter,
  onClearAllFilters,
  onExport,
  onCreateClick,
  filterCount = 0,
}: EnterpriseKanbanToolbarProps) {
  const [sortOpen, setSortOpen] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [wipOpen, setWipOpen] = useState(false);

  return (
    <div 
      className="flex flex-col gap-2 px-4 py-3 border-b"
      style={{ 
        borderColor: 'var(--divider)',
        background: 'var(--surface-1)',
      }}
    >
      {/* Main toolbar row */}
      <div className="flex items-center gap-3">
        {/* Left zone: View toggle + Filter/Sort/Columns/WIP */}
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div 
            className="flex items-center rounded-md p-0.5"
            style={{ 
              background: 'var(--surface-2)',
              border: '1px solid var(--divider)',
            }}
          >
            <button
              onClick={() => onViewModeChange('list')}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded text-sm font-medium transition-all',
                viewMode === 'list' 
                  ? 'bg-background shadow-sm' 
                  : 'hover:bg-background/50'
              )}
              style={{ 
                color: viewMode === 'list' ? 'var(--text-1)' : 'var(--text-3)',
              }}
            >
              <LayoutList className="h-4 w-4" />
              <span className="hidden sm:inline">List</span>
            </button>
            <button
              onClick={() => onViewModeChange('kanban')}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded text-sm font-medium transition-all',
                viewMode === 'kanban' 
                  ? 'bg-background shadow-sm' 
                  : 'hover:bg-background/50'
              )}
              style={{ 
                color: viewMode === 'kanban' ? 'var(--text-1)' : 'var(--text-3)',
              }}
            >
              <Kanban className="h-4 w-4" />
              <span className="hidden sm:inline">Board</span>
            </button>
          </div>

          {/* Divider */}
          <div className="h-6 w-px" style={{ background: 'var(--divider)' }} />

          {/* Filter button */}
          <Button
            variant="outline"
            size="sm"
            onClick={onFilterClick}
            className={cn(
              'gap-1.5 h-9',
              filterCount > 0 && 'border-brand-primary'
            )}
            style={{ 
              borderColor: filterCount > 0 ? 'var(--brand-primary)' : undefined,
              color: filterCount > 0 ? 'var(--brand-primary)' : undefined,
            }}
          >
            <Filter className="h-4 w-4" />
            <span className="hidden sm:inline">Filter</span>
            {filterCount > 0 && (
              <Badge 
                variant="secondary" 
                className="ml-1 h-5 px-1.5 text-xs"
                style={{ 
                  background: 'var(--brand-primary)',
                  color: 'white',
                }}
              >
                {filterCount}
              </Badge>
            )}
          </Button>

          {/* Sort dropdown */}
          <DropdownMenu open={sortOpen} onOpenChange={setSortOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 h-9">
                <ArrowUpDown className="h-4 w-4" />
                <span className="hidden sm:inline">Sort</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuLabel>Sort by</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Rank (Default)</DropdownMenuItem>
              <DropdownMenuItem>Score</DropdownMenuItem>
              <DropdownMenuItem>Target Date</DropdownMenuItem>
              <DropdownMenuItem>Ageing</DropdownMenuItem>
              <DropdownMenuItem>Recently Updated</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Columns settings */}
          <Popover open={columnsOpen} onOpenChange={setColumnsOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 h-9">
                <Columns3 className="h-4 w-4" />
                <span className="hidden lg:inline">Columns</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-64 p-4">
              <div className="space-y-3">
                <div className="font-medium text-sm" style={{ color: 'var(--text-1)' }}>
                  Column Settings
                </div>
                <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                  Configure visible columns and card fields. Coming next.
                </p>
              </div>
            </PopoverContent>
          </Popover>

          {/* WIP settings */}
          <Popover open={wipOpen} onOpenChange={setWipOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 h-9">
                <Settings2 className="h-4 w-4" />
                <span className="hidden lg:inline">WIP</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-64 p-4">
              <div className="space-y-3">
                <div className="font-medium text-sm" style={{ color: 'var(--text-1)' }}>
                  Work In Progress Limits
                </div>
                <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                  Set WIP limits per column to manage flow. Coming next.
                </p>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Center zone: Search */}
        <div className="flex-1 max-w-md mx-auto">
          <div className="relative">
            <Search 
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" 
              style={{ color: 'var(--icon-muted)' }}
            />
            <Input
              placeholder="Search requests..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 h-9"
              style={{ 
                background: 'var(--surface-2)',
                borderColor: 'var(--divider)',
              }}
            />
          </div>
        </div>

        {/* Right zone: Export + Create */}
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onExport}
            className="gap-1.5 h-9"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export</span>
          </Button>
          <Button 
            size="sm" 
            onClick={onCreateClick}
            className="gap-1.5 h-9"
            style={{ 
              background: 'var(--brand-primary)',
              color: 'white',
            }}
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Create</span>
          </Button>
        </div>
      </div>

      {/* Active filter chips row */}
      {activeFilters.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium" style={{ color: 'var(--text-3)' }}>
            Active filters:
          </span>
          {activeFilters.map((filter) => (
            <Badge
              key={filter.key}
              variant="secondary"
              className="gap-1 pr-1"
              style={{ background: 'var(--surface-2)' }}
            >
              <span className="text-xs">{filter.label}: {filter.value}</span>
              <button
                onClick={() => onClearFilter(filter.key)}
                className="ml-1 rounded-full p-0.5 hover:bg-muted"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          <button
            onClick={onClearAllFilters}
            className="text-xs font-medium hover:underline"
            style={{ color: 'var(--brand-primary)' }}
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
