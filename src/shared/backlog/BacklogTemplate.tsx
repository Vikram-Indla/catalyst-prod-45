/**
 * BacklogTemplate - Shared layout template for Industry Backlog and Epic Backlog
 * This component is the single source of truth for:
 * - Industry Backlog (Demand)
 * - Epic Backlog (Program)
 * - Any future backlog types
 * 
 * Ensures pixel-perfect parity between all backlog views.
 */

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Filter, Download, Search, List, LayoutGrid, Table, Plus } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export type BacklogViewType = 'list' | 'board' | 'table';

export interface BacklogTemplateConfig {
  /** Entity type: 'demand' | 'epic' */
  entityType: 'demand' | 'epic';
  /** Scope: 'industry' | 'program' */
  scope: 'industry' | 'program';
  /** Context ID (e.g., programId when scope = program) */
  contextId?: string;
  /** Page title displayed in header */
  title: string;
  /** Breadcrumb section label */
  sectionLabel: string;
  /** Create button label */
  createLabel: string;
}

export interface BacklogTemplateProps {
  config: BacklogTemplateConfig;
  
  // View state
  currentView: BacklogViewType;
  onViewChange: (view: BacklogViewType) => void;
  
  // Search
  searchQuery: string;
  onSearchChange: (query: string) => void;
  
  // Filters
  activeFiltersCount: number;
  onOpenFilters: () => void;
  
  // Actions
  onExport: () => void;
  onCreate: () => void;
  
  // Content slots
  listView: ReactNode;
  boardView: ReactNode;
  tableView: ReactNode;
  
  // Optional bulk actions bar
  bulkActionsBar?: ReactNode;
  
  // Loading state
  isLoading?: boolean;
}

/**
 * Shared header toolbar for all backlog views
 */
function BacklogToolbar({
  config,
  currentView,
  onViewChange,
  searchQuery,
  onSearchChange,
  activeFiltersCount,
  onOpenFilters,
  onExport,
  onCreate,
}: Pick<BacklogTemplateProps, 
  'config' | 'currentView' | 'onViewChange' | 'searchQuery' | 'onSearchChange' | 
  'activeFiltersCount' | 'onOpenFilters' | 'onExport' | 'onCreate'
>) {
  return (
    <div className="shrink-0" style={{ backgroundColor: 'var(--bg)' }}>
      {/* Row 1: Breadcrumb + Title */}
      <div
        className="flex items-center justify-between px-6"
        style={{ 
          height: '52px',
          borderBottom: '1px solid var(--divider)',
        }}
      >
        <div className="flex items-center gap-2">
          <span
            className="text-[11px] font-semibold uppercase tracking-wider"
            style={{ color: 'var(--text-3)' }}
          >
            {config.sectionLabel}
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
            {config.title}
          </h1>
        </div>
      </div>

      {/* Row 2: Toolbar */}
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
            <ViewToggleButton
              active={currentView === 'list'}
              onClick={() => onViewChange('list')}
              icon={<List className="h-4 w-4" />}
              label="List"
            />
            <ViewToggleButton
              active={currentView === 'board'}
              onClick={() => onViewChange('board')}
              icon={<LayoutGrid className="h-4 w-4" />}
              label="Board"
            />
            <ViewToggleButton
              active={currentView === 'table'}
              onClick={() => onViewChange('table')}
              icon={<Table className="h-4 w-4" />}
              label="Table"
            />
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
            {/* Filters Button */}
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
              onClick={onCreate}
              size="sm"
              className="h-8 px-3 bg-brand-primary hover:bg-brand-primary-hover text-white gap-1.5"
            >
              <Plus className="h-4 w-4" />
              {config.createLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ViewToggleButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors",
        active && "bg-brand-primary text-white"
      )}
      style={!active ? { color: 'var(--text-1)', backgroundColor: 'transparent' } : undefined}
      onMouseOver={(e) => {
        if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--nav-hover-bg)';
      }}
      onMouseOut={(e) => {
        if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
      }}
    >
      {icon}
      {label}
    </button>
  );
}

/**
 * BacklogTemplate - Main component that renders the complete backlog layout
 */
export function BacklogTemplate({
  config,
  currentView,
  onViewChange,
  searchQuery,
  onSearchChange,
  activeFiltersCount,
  onOpenFilters,
  onExport,
  onCreate,
  listView,
  boardView,
  tableView,
  bulkActionsBar,
  isLoading = false,
}: BacklogTemplateProps) {
  // Map view names for internal state compatibility
  const normalizedView = currentView === 'board' ? 'state' : currentView;
  
  const handleViewChange = (view: BacklogViewType) => {
    onViewChange(view);
  };

  return (
    <div className="h-full flex flex-col bg-background">
      <BacklogToolbar
        config={config}
        currentView={currentView}
        onViewChange={handleViewChange}
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        activeFiltersCount={activeFiltersCount}
        onOpenFilters={onOpenFilters}
        onExport={onExport}
        onCreate={onCreate}
      />

      {/* Bulk Actions Bar (if any) */}
      {bulkActionsBar}

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-muted-foreground">Loading...</div>
          </div>
        ) : currentView === 'table' ? (
          /* Table View - Full width */
          <div className="h-full overflow-auto">
            {tableView}
          </div>
        ) : currentView === 'list' ? (
          /* List View - Split panel */
          <div className="h-full" style={{ backgroundColor: 'var(--bg)' }}>
            {listView}
          </div>
        ) : (
          /* Board View - Kanban */
          <div className="h-full overflow-auto px-4 sm:px-6 pt-2 pb-4">
            {boardView}
          </div>
        )}
      </div>
    </div>
  );
}

export default BacklogTemplate;
