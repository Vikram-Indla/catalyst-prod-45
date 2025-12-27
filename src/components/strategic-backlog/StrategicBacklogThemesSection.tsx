/**
 * Strategic Backlog - Themes Section
 * Enhanced with grid layout, left border accent, alternating rows
 * Uses dynamic theme statuses from database
 */
import { useState, useMemo } from 'react';
import { Search, Target, ChevronUp, ChevronDown, Plus, Layers } from 'lucide-react';
import { format } from 'date-fns';
import type { StrategicTheme } from '@/types/strategicBacklog';
import { cn } from '@/lib/utils';
import { ColumnSelector, useColumnVisibility, ColumnDefinition } from './ColumnSelector';
import { Button } from '@/components/ui/button';
import { useActiveThemeStatuses } from '@/hooks/useThemeStatuses';
import { getBrandColorHex } from '@/components/admin/BrandColorPicker';

// Column definitions for Themes table
const THEME_COLUMNS: ColumnDefinition[] = [
  { key: 'name', label: 'Theme', defaultVisible: true, required: true },
  { key: 'status', label: 'Status', defaultVisible: true, width: 'w-28' },
  { key: 'objectives', label: 'Objectives', defaultVisible: true, width: 'w-28' },
  { key: 'updated', label: 'Updated', defaultVisible: true, width: 'w-36' },
];

const STORAGE_KEY = 'strategic_backlog_columns_themes';

type SortColumn = 'name' | 'status' | 'objectives' | 'updated';

interface ThemesSectionProps {
  themes: StrategicTheme[];
  snapshotId: string;
  isArchived: boolean;
  onSelectItem: (item: StrategicTheme) => void;
  selectedItemId?: string;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  objectiveCounts: Record<string, number>;
  onCreateTheme?: () => void;
}

// Dynamic Status Badge that uses database-configured statuses
function StatusBadge({ status, statuses }: { status?: string; statuses: Array<{ value: string; label: string; color: string | null }> }) {
  const normalizedStatus = status?.toLowerCase() || 'draft';
  const statusConfig = statuses.find(s => s.value.toLowerCase() === normalizedStatus);
  
  const label = statusConfig?.label || (status || 'draft').replace('_', ' ');
  const colorValue = statusConfig?.color || 'neutral';
  const bgColor = getBrandColorHex(colorValue);
  
  return (
    <span 
      className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider text-white"
      style={{ backgroundColor: bgColor }}
    >
      {label.toUpperCase()}
    </span>
  );
}

// Sortable header with stacked chevrons
function SortableHeader({ 
  label, 
  column, 
  currentSort, 
  direction, 
  onSort,
  className = ""
}: { 
  label: string; 
  column: SortColumn; 
  currentSort: SortColumn; 
  direction: 'asc' | 'desc'; 
  onSort: (col: SortColumn) => void;
  className?: string;
}) {
  const isActive = currentSort === column;
  return (
    <button
      onClick={() => onSort(column)}
      className={cn(
        "group flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors",
        className
      )}
    >
      <span className="text-[11px] font-bold uppercase tracking-wider">{label}</span>
      <span className={cn(
        "flex flex-col -space-y-1",
        isActive ? "text-primary" : "text-muted-foreground"
      )}>
        <ChevronUp className={cn("h-3 w-3", isActive && direction === 'asc' ? "opacity-100" : "opacity-40")} />
        <ChevronDown className={cn("h-3 w-3", isActive && direction === 'desc' ? "opacity-100" : "opacity-40")} />
      </span>
    </button>
  );
}

export function StrategicBacklogThemesSection({ 
  themes, 
  snapshotId, 
  isArchived,
  onSelectItem,
  selectedItemId,
  searchQuery,
  onSearchChange,
  objectiveCounts,
  onCreateTheme,
}: ThemesSectionProps) {
  const [sortColumn, setSortColumn] = useState<SortColumn>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [visibleColumns, setVisibleColumns] = useColumnVisibility(THEME_COLUMNS, STORAGE_KEY);
  
  // Fetch dynamic theme statuses from database
  const { data: themeStatuses = [] } = useActiveThemeStatuses();

  const filteredThemes = useMemo(() => {
    let result = themes;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(theme =>
        theme.name.toLowerCase().includes(query) ||
        theme.description?.toLowerCase().includes(query)
      );
    }

    result = [...result].sort((a, b) => {
      let aVal: any, bVal: any;
      
      switch (sortColumn) {
        case 'name':
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case 'status':
          aVal = a.status || '';
          bVal = b.status || '';
          break;
        case 'objectives':
          aVal = objectiveCounts[a.id] || 0;
          bVal = objectiveCounts[b.id] || 0;
          break;
        case 'updated':
          aVal = a.updated_at || '';
          bVal = b.updated_at || '';
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [themes, searchQuery, sortColumn, sortDirection, objectiveCounts]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const isColumnVisible = (key: string) => visibleColumns.includes(key);

  // Calculate visible column count for grid - responsive columns for desktop
  const visibleCount = visibleColumns.length;
  const gridCols = `1fr ${isColumnVisible('status') ? '120px ' : ''}${isColumnVisible('objectives') ? '120px ' : ''}${isColumnVisible('updated') ? '140px' : ''}`.trim();

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Search + Column Selector */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search themes..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary transition-colors"
          />
        </div>
        <ColumnSelector
          columns={THEME_COLUMNS}
          visibleColumns={visibleColumns}
          onVisibleColumnsChange={setVisibleColumns}
          storageKey={STORAGE_KEY}
        />
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {filteredThemes.length === 0 ? (
          <div className="bg-[hsl(var(--surface-0))] border border-[hsl(var(--border-default))] rounded-xl p-8 text-center">
            <div className="w-12 h-12 rounded-full mb-4 bg-[hsl(var(--surface-2))] flex items-center justify-center mx-auto">
              <Layers className="h-6 w-6 text-[hsl(var(--text-muted))]" />
            </div>
            <p className="text-sm font-medium text-[hsl(var(--text-secondary))]">No themes found</p>
            <p className="text-xs text-[hsl(var(--text-muted))] mt-1">
              {searchQuery ? "Try adjusting your search query" : "Create your first strategic theme to get started"}
            </p>
            {onCreateTheme && !searchQuery && (
              <Button 
                size="sm" 
                onClick={onCreateTheme}
                className="mt-4 bg-[hsl(var(--brand-primary))] hover:bg-[hsl(var(--brand-primary-hover))] text-white gap-1.5"
              >
                <Plus className="h-4 w-4" />
                Create Theme
              </Button>
            )}
          </div>
        ) : (
          filteredThemes.map((theme) => {
            const isSelected = selectedItemId === theme.id;
            return (
              <button
                key={theme.id}
                onClick={() => onSelectItem(theme)}
                className={cn(
                  "w-full text-left bg-[hsl(var(--surface-0))] border border-[hsl(var(--border-default))] rounded-xl p-4 transition-all",
                  "hover:bg-[hsl(var(--surface-2))] hover:border-[hsl(var(--brand-primary))]",
                  isSelected && "border-[hsl(var(--brand-primary))] bg-[hsl(var(--surface-2))]"
                )}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <span className="text-sm font-medium text-[hsl(var(--text-primary))]">{theme.name}</span>
                  <StatusBadge status={theme.status} statuses={themeStatuses} />
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Target className="h-3.5 w-3.5" />
                    <span>{objectiveCounts[theme.id] || 0} objectives</span>
                  </div>
                  {theme.updated_at && (
                    <span>{format(new Date(theme.updated_at), 'MMM d, yyyy')}</span>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-[hsl(var(--surface-0))] border border-[hsl(var(--border-default))] rounded-xl shadow-[var(--shadow-elev-1)] overflow-hidden">
        {/* Header */}
        <div 
          className="grid gap-4 px-5 py-3.5 bg-[hsl(var(--surface-1))] border-b border-[hsl(var(--border-default))]"
          style={{ gridTemplateColumns: gridCols }}
        >
          {isColumnVisible('name') && (
            <SortableHeader 
              label="Theme" 
              column="name" 
              currentSort={sortColumn} 
              direction={sortDirection} 
              onSort={handleSort} 
            />
          )}
          {isColumnVisible('status') && (
            <SortableHeader 
              label="Status" 
              column="status" 
              currentSort={sortColumn} 
              direction={sortDirection} 
              onSort={handleSort} 
            />
          )}
          {isColumnVisible('objectives') && (
            <SortableHeader 
              label="Objectives" 
              column="objectives" 
              currentSort={sortColumn} 
              direction={sortDirection} 
              onSort={handleSort} 
            />
          )}
          {isColumnVisible('updated') && (
            <SortableHeader 
              label="Updated" 
              column="updated" 
              currentSort={sortColumn} 
              direction={sortDirection} 
              onSort={handleSort} 
            />
          )}
        </div>

        {/* Body */}
        <div className="divide-y divide-[hsl(var(--border-subtle))]">
          {filteredThemes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="w-12 h-12 rounded-full mb-4 bg-[hsl(var(--surface-2))] flex items-center justify-center">
                <Layers className="h-6 w-6 text-[hsl(var(--text-muted))]" />
              </div>
              <p className="text-sm font-medium text-[hsl(var(--text-secondary))]">No themes found</p>
              <p className="text-xs text-[hsl(var(--text-muted))] mt-1">
                {searchQuery ? "Try adjusting your search query" : "Create your first strategic theme to get started"}
              </p>
              {onCreateTheme && !searchQuery && (
                <Button 
                  size="sm" 
                  onClick={onCreateTheme}
                  className="mt-4 bg-[hsl(var(--brand-primary))] hover:bg-[hsl(var(--brand-primary-hover))] text-white gap-1.5"
                >
                  <Plus className="h-4 w-4" />
                  Create Theme
                </Button>
              )}
            </div>
          ) : (
            filteredThemes.map((theme, index) => {
              const isSelected = selectedItemId === theme.id;
              return (
                <button
                  key={theme.id}
                  onClick={() => onSelectItem(theme)}
                  className={cn(
                    "group w-full text-left grid gap-4 px-5 py-4 transition-all",
                    "border-l-2 border-l-transparent",
                    "hover:border-l-[hsl(var(--brand-primary))] hover:bg-[hsl(var(--surface-2))]",
                    "focus:outline-none focus:bg-[hsl(var(--surface-2))] focus:border-l-[hsl(var(--brand-primary))]",
                    index % 2 === 0 ? "bg-[hsl(var(--surface-0))]" : "bg-[hsl(var(--surface-1))]",
                    isSelected && "border-l-[hsl(var(--brand-primary))] bg-[hsl(var(--surface-2))]"
                  )}
                  style={{ gridTemplateColumns: gridCols }}
                >
                  {isColumnVisible('name') && (
                    <div className="flex items-center gap-3 min-w-0">
                      <Layers className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground group-hover:text-[hsl(var(--brand-primary))] truncate transition-colors">
                        {theme.name}
                      </span>
                    </div>
                  )}
                  {isColumnVisible('status') && (
                    <div className="flex items-center">
                      <StatusBadge status={theme.status} statuses={themeStatuses} />
                    </div>
                  )}
                  {isColumnVisible('objectives') && (
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-foreground tabular-nums">
                        {objectiveCounts[theme.id] || 0}
                      </span>
                    </div>
                  )}
                  {isColumnVisible('updated') && (
                    <div className="flex items-center">
                      <span className="text-sm text-muted-foreground">
                        {theme.updated_at ? format(new Date(theme.updated_at), 'MMM d, yyyy') : '—'}
                      </span>
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Footer: Row Count */}
      {filteredThemes.length > 0 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-muted-foreground">
            Showing {filteredThemes.length} of {themes.length} themes
          </p>
        </div>
      )}
    </div>
  );
}
