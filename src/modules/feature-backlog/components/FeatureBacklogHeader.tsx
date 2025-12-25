/**
 * FeatureBacklogHeader — Toolbar for Feature Backlog
 * Uses PageChrome-style inline breadcrumb (SECTION / Page Title)
 */
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Search, 
  Filter, 
  Columns, 
  Download,
  Plus,
  X,
  LayoutGrid,
  List,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FeatureBacklogHeaderProps {
  programId: string;
  viewMode: 'list' | 'kanban';
  onViewModeChange: (mode: 'list' | 'kanban') => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenFilters: () => void;
  onOpenColumns: () => void;
  onExport: () => void;
  onCreateClick: () => void;
  selectedCount: number;
  onClearSelection: () => void;
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
        {/* Left: Breadcrumb + Title (NO ICONS) */}
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

        {/* Right: Selection indicator */}
        {selectedCount > 0 && (
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
        )}
      </div>

      {/* Row 2: Toolbar */}
      <div
        className="flex items-center px-6"
        style={{ height: '44px' }}
      >
        <div className="flex items-center justify-between gap-4 w-full">
          {/* Left - Search */}
          <div className="relative w-full max-w-md">
            <Search 
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" 
              style={{ color: 'var(--icon-muted)' }}
            />
            <Input
              placeholder="Search features..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 h-9"
              style={{ 
                backgroundColor: 'var(--input-bg)', 
                borderColor: 'var(--input-border)',
                color: 'var(--input-text)',
              }}
            />
          </div>

          {/* Right - View Toggle and Action Buttons */}
          <div className="flex items-center gap-2">
            {/* View Toggle */}
            <div 
              className="flex items-center rounded-md overflow-hidden"
              style={{ 
                backgroundColor: 'var(--surface-1)', 
                border: '1px solid var(--border-color)' 
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
                style={viewMode !== 'list' ? { color: 'var(--text-2)' } : undefined}
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
                onClick={() => onViewModeChange('kanban')}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors",
                  viewMode === 'kanban' 
                    ? "bg-brand-primary text-white" 
                    : ""
                )}
                style={viewMode !== 'kanban' ? { color: 'var(--text-2)' } : undefined}
                onMouseOver={(e) => {
                  if (viewMode !== 'kanban') e.currentTarget.style.backgroundColor = 'var(--nav-hover-bg)';
                }}
                onMouseOut={(e) => {
                  if (viewMode !== 'kanban') e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <LayoutGrid className="h-4 w-4" />
                Kanban
              </button>
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={onOpenFilters}
              className="h-8 w-8"
              style={{ 
                backgroundColor: 'var(--surface-1)', 
                borderColor: 'var(--border-color)',
                color: 'var(--icon-default)'
              }}
              title="Filters"
            >
              <Filter className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={onOpenColumns}
              className="h-8 w-8"
              style={{ 
                backgroundColor: 'var(--surface-1)', 
                borderColor: 'var(--border-color)',
                color: 'var(--icon-default)'
              }}
              title="Columns"
            >
              <Columns className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={onExport}
              className="h-8 w-8"
              style={{ 
                backgroundColor: 'var(--surface-1)', 
                borderColor: 'var(--border-color)',
                color: 'var(--icon-default)'
              }}
              title="Export"
            >
              <Download className="h-4 w-4" />
            </Button>

            <Button
              size="icon"
              className="h-8 w-8 bg-brand-primary hover:bg-brand-primary-hover text-white"
              title="Create Feature"
              onClick={onCreateClick}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}