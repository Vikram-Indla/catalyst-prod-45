/**
 * FeatureBacklogHeader — Toolbar for Feature Backlog
 * Uses PageChrome-style inline breadcrumb (SECTION / Page Title)
 * Matches Epic Backlog header exactly with List / Board / Table views
 */
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Search, 
  Filter, 
  Download,
  Plus,
  X,
  LayoutGrid,
  List,
  Table,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export type FeatureViewMode = 'list' | 'board' | 'table';

interface FeatureBacklogHeaderProps {
  programId: string;
  viewMode: FeatureViewMode;
  onViewModeChange: (mode: FeatureViewMode) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenFilters: () => void;
  onOpenColumns: () => void;
  onExport: () => void;
  onCreateClick: () => void;
  selectedCount: number;
  onClearSelection: () => void;
  onBulkDelete?: () => void;
  activeFiltersCount?: number;
}

export function FeatureBacklogHeader({
  programId,
  viewMode,
  onViewModeChange,
  searchQuery,
  onSearchChange,
  onOpenFilters,
  onOpenColumns,
  onExport,
  onCreateClick,
  selectedCount,
  onClearSelection,
  onBulkDelete,
  activeFiltersCount = 0,
}: FeatureBacklogHeaderProps) {
  return (
    <div className="shrink-0" style={{ backgroundColor: 'var(--bg)' }}>
      {/* Row 1: Breadcrumb + Title - PageChrome style (inline) */}
      <div
        className="flex items-center justify-between px-6"
        style={{ 
          height: '52px',
          borderBottom: '1px solid var(--divider)',
        }}
      >
        {/* Left: Breadcrumb + Title */}
        <div className="flex items-center gap-2">
          <span
            className="text-[11px] font-semibold uppercase tracking-wider"
            style={{ color: 'var(--text-3)' }}
          >
            PROGRAM
          </span>
          <span 
            className="text-[14px]" 
            style={{ color: 'var(--text-4)' }}
          >
            /
          </span>
          <h1
            className="text-[18px] font-semibold"
            style={{ color: 'var(--text-1)' }}
          >
            Feature Backlog
          </h1>
        </div>

        {/* Right: Selection indicator + bulk actions */}
        {selectedCount > 0 && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full" style={{ backgroundColor: 'var(--surface-1)' }}>
              <span className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>
                {selectedCount} selected
              </span>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-5 w-5 p-0 hover:bg-transparent"
                onClick={onClearSelection}
              >
                <X className="h-3.5 w-3.5" style={{ color: 'var(--icon-default)' }} />
              </Button>
            </div>
            <Button 
              variant="destructive" 
              size="sm"
              onClick={onBulkDelete}
              className="gap-1.5"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        )}
      </div>

      {/* Row 2: Toolbar - matches Epic Backlog layout */}
      <div
        className="flex items-center px-6"
        style={{ height: '44px' }}
      >
        <div className="flex items-center justify-between gap-4 w-full">
          {/* Left - View Toggle */}
          <div 
            className="flex items-center rounded-md overflow-hidden shrink-0"
            style={{ 
              backgroundColor: 'var(--bg-card)', 
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-xs)',
            }}
          >
            <button
              onClick={() => onViewModeChange('list')}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors",
                viewMode === 'list' 
                  ? "bg-brand-primary text-white" 
                  : ""
              )}
              style={viewMode !== 'list' ? { color: 'var(--text-1)', backgroundColor: 'transparent' } : undefined}
              onMouseOver={(e) => {
                if (viewMode !== 'list') e.currentTarget.style.backgroundColor = 'var(--nav-hover-bg)';
              }}
              onMouseOut={(e) => {
                if (viewMode !== 'list') e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <List className="h-4 w-4" />
              List
            </button>
            <button
              onClick={() => onViewModeChange('board')}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors",
                viewMode === 'board' 
                  ? "bg-brand-primary text-white" 
                  : ""
              )}
              style={viewMode !== 'board' ? { color: 'var(--text-1)', backgroundColor: 'transparent' } : undefined}
              onMouseOver={(e) => {
                if (viewMode !== 'board') e.currentTarget.style.backgroundColor = 'var(--nav-hover-bg)';
              }}
              onMouseOut={(e) => {
                if (viewMode !== 'board') e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <LayoutGrid className="h-4 w-4" />
              Board
            </button>
            <button
              onClick={() => onViewModeChange('table')}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors",
                viewMode === 'table' 
                  ? "bg-brand-primary text-white" 
                  : ""
              )}
              style={viewMode !== 'table' ? { color: 'var(--text-1)', backgroundColor: 'transparent' } : undefined}
              onMouseOver={(e) => {
                if (viewMode !== 'table') e.currentTarget.style.backgroundColor = 'var(--nav-hover-bg)';
              }}
              onMouseOut={(e) => {
                if (viewMode !== 'table') e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <Table className="h-4 w-4" />
              Table
            </button>
          </div>

          {/* Center - Search */}
          <div className="relative flex-1 max-w-md">
            <Search 
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" 
              style={{ color: 'var(--icon-muted)' }}
            />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 h-9"
              style={{ 
                backgroundColor: 'var(--input-bg)', 
                borderColor: 'var(--input-border)',
                color: 'var(--input-text)',
              }}
            />
            <span 
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs px-1.5 py-0.5 rounded border"
              style={{ 
                color: 'var(--text-4)', 
                borderColor: 'var(--border-color)',
                backgroundColor: 'var(--surface-1)'
              }}
            >
              ⌘K
            </span>
          </div>

          {/* Right - Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Filters Button with Count Badge */}
            <button
              onClick={onOpenFilters}
              className={cn(
                'h-8 px-3 flex items-center gap-2 rounded-md border text-sm font-medium transition-all',
                activeFiltersCount > 0
                  ? 'border-[#c69c6d] text-[#c69c6d] bg-[#c69c6d]/5 hover:bg-[#c69c6d]/10'
                  : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
              style={activeFiltersCount === 0 ? { 
                backgroundColor: 'var(--surface-1)', 
                borderColor: 'var(--border-color)',
              } : undefined}
              title="Filters"
            >
              <Filter className="h-4 w-4" />
              <span className="hidden sm:inline">Filters</span>
              {activeFiltersCount > 0 && (
                <span className="min-w-5 h-5 px-1.5 rounded-full bg-[#c69c6d] text-[10px] font-semibold text-white flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onExport}
                    className="h-8 px-3 gap-1.5"
                    style={{ 
                      backgroundColor: 'var(--surface-1)', 
                      borderColor: 'var(--border-color)',
                      color: 'var(--text-1)'
                    }}
                  >
                    <Download className="h-4 w-4" />
                    Export
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Export data</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Button
              onClick={onCreateClick}
              size="sm"
              className="h-8 px-3 bg-brand-primary hover:bg-brand-primary-hover text-white gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Create Feature
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}