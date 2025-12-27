/**
 * Strategic Backlog - Epics Section
 * Pixel-perfect table matching Themes section styling
 */
import { useState, useMemo } from 'react';
import { Search, ChevronUp, ChevronDown, Plus, Box } from 'lucide-react';
import { WorkItemIcon } from '@/components/ja/icons/WorkItemIcon';
import type { StrategicTheme } from '@/types/strategicBacklog';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ColumnSelector, useColumnVisibility, ColumnDefinition } from './ColumnSelector';
import { Button } from '@/components/ui/button';

// Column definitions for Epics table
const EPIC_COLUMNS: ColumnDefinition[] = [
  { key: 'name', label: 'Epic', defaultVisible: true, required: true },
  { key: 'theme', label: 'Theme', defaultVisible: true, width: 'w-52' },
  { key: 'status', label: 'State', defaultVisible: true, width: 'w-28' },
  { key: 'features', label: 'Features', defaultVisible: true, width: 'w-28' },
  { key: 'updated', label: 'Updated', defaultVisible: true, width: 'w-36' },
];

const STORAGE_KEY = 'strategic_backlog_columns_epics';

interface Epic {
  id: string;
  name: string;
  epic_key?: string | null;
  status?: string | null;
  theme_id?: string | null;
  priority?: string | null;
  created_at: string;
  updated_at: string;
}

interface EpicsSectionProps {
  epics: Epic[];
  themes: StrategicTheme[];
  isLoading: boolean;
  isArchived: boolean;
  onSelectItem: (item: any) => void;
  selectedItemId?: string;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  featureCounts: Record<string, number>;
  onCreateEpic?: () => void;
}

type SortColumn = 'name' | 'theme' | 'status' | 'features' | 'updated';

// Sortable header with stacked chevrons - matching Themes section
function SortableHeader({ 
  label, 
  column, 
  currentSort, 
  direction, 
  onSort,
}: { 
  label: string; 
  column: SortColumn; 
  currentSort: SortColumn; 
  direction: 'asc' | 'desc'; 
  onSort: (col: SortColumn) => void;
}) {
  const isActive = currentSort === column;
  return (
    <button
      onClick={() => onSort(column)}
      className="group flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
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

// Status Badge matching Themes section style
function StatusBadge({ status }: { status?: string | null }) {
  const statusMap: Record<string, { label: string; bgColor: string }> = {
    active: { label: 'ACTIVE', bgColor: '#2563eb' },
    in_progress: { label: 'IN PROGRESS', bgColor: '#2563eb' },
    draft: { label: 'DRAFT', bgColor: '#9ca3af' },
    backlog: { label: 'BACKLOG', bgColor: '#9ca3af' },
    done: { label: 'DONE', bgColor: '#0d9488' },
    completed: { label: 'COMPLETED', bgColor: '#0d9488' },
  };
  
  const config = statusMap[status || ''] || { label: 'DRAFT', bgColor: '#9ca3af' };
  
  return (
    <span 
      className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider text-white"
      style={{ backgroundColor: config.bgColor }}
    >
      {config.label}
    </span>
  );
}

export function StrategicBacklogEpicsSection({ 
  epics,
  themes, 
  isLoading,
  isArchived,
  onSelectItem,
  selectedItemId,
  searchQuery,
  onSearchChange,
  featureCounts,
  onCreateEpic,
}: EpicsSectionProps) {
  const [sortColumn, setSortColumn] = useState<SortColumn>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [visibleColumns, setVisibleColumns] = useColumnVisibility(EPIC_COLUMNS, STORAGE_KEY);

  const themeLookup = useMemo(() => {
    const map: Record<string, string> = {};
    themes.forEach(t => { map[t.id] = t.name; });
    return map;
  }, [themes]);

  const filteredEpics = useMemo(() => {
    let result = epics;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(epic =>
        epic.name.toLowerCase().includes(query) ||
        epic.epic_key?.toLowerCase().includes(query) ||
        (epic.theme_id && themeLookup[epic.theme_id]?.toLowerCase().includes(query))
      );
    }

    result = [...result].sort((a, b) => {
      let aVal: any, bVal: any;

      switch (sortColumn) {
        case 'name':
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case 'theme':
          aVal = a.theme_id ? themeLookup[a.theme_id] || '' : '';
          bVal = b.theme_id ? themeLookup[b.theme_id] || '' : '';
          break;
        case 'status':
          aVal = a.status || '';
          bVal = b.status || '';
          break;
        case 'features':
          aVal = featureCounts[a.id] || 0;
          bVal = featureCounts[b.id] || 0;
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
  }, [epics, searchQuery, sortColumn, sortDirection, themeLookup, featureCounts]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const isColumnVisible = (key: string) => visibleColumns.includes(key);

  // Grid columns matching Themes section pattern
  const gridCols = `1fr ${isColumnVisible('theme') ? '200px ' : ''}${isColumnVisible('status') ? '120px ' : ''}${isColumnVisible('features') ? '120px ' : ''}${isColumnVisible('updated') ? '140px' : ''}`.trim();

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Search + Column Selector */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search epics..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary transition-colors"
          />
        </div>
        <ColumnSelector
          columns={EPIC_COLUMNS}
          visibleColumns={visibleColumns}
          onVisibleColumnsChange={setVisibleColumns}
          storageKey={STORAGE_KEY}
        />
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {isLoading ? (
          <div className="bg-[hsl(var(--surface-0))] border border-[hsl(var(--border-default))] rounded-xl p-8 text-center text-muted-foreground">
            Loading epics...
          </div>
        ) : filteredEpics.length === 0 ? (
          <div className="bg-[hsl(var(--surface-0))] border border-[hsl(var(--border-default))] rounded-xl p-8 text-center">
            <div className="w-12 h-12 rounded-full mb-4 bg-[hsl(var(--surface-2))] flex items-center justify-center mx-auto">
              <Box className="h-6 w-6 text-[hsl(var(--text-muted))]" />
            </div>
            <p className="text-sm font-medium text-[hsl(var(--text-secondary))]">No epics found</p>
            <p className="text-xs text-[hsl(var(--text-muted))] mt-1">Create epics to organize your work items</p>
            {onCreateEpic && (
              <Button 
                size="sm" 
                onClick={onCreateEpic}
                className="mt-4 bg-[hsl(var(--brand-primary))] hover:bg-[hsl(var(--brand-primary-hover))] text-white gap-1.5"
              >
                <Plus className="h-4 w-4" />
                Create Epic
              </Button>
            )}
          </div>
        ) : (
          filteredEpics.map((epic) => {
            const isSelected = selectedItemId === epic.id;
            return (
              <button
                key={epic.id}
                onClick={() => onSelectItem(epic)}
                className={cn(
                  "w-full text-left bg-[hsl(var(--surface-0))] border border-[hsl(var(--border-default))] rounded-xl p-4 transition-all",
                  "hover:bg-[hsl(var(--surface-2))] hover:border-[hsl(var(--brand-primary))]",
                  isSelected && "border-[hsl(var(--brand-primary))] bg-[hsl(var(--surface-2))]"
                )}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <WorkItemIcon type="epic" size={14} />
                    <span className="text-sm font-medium text-[hsl(var(--text-primary))]">{epic.name}</span>
                  </div>
                  <StatusBadge status={epic.status} />
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{epic.theme_id ? themeLookup[epic.theme_id] : '—'}</span>
                  <span>{featureCounts[epic.id] || 0} features</span>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Desktop Table View - Matching Themes section exactly */}
      <div className="hidden md:block bg-[hsl(var(--surface-0))] border border-[hsl(var(--border-default))] rounded-xl shadow-[var(--shadow-elev-1)] overflow-hidden">
        {/* Header */}
        <div 
          className="grid gap-4 px-5 py-3.5 bg-[hsl(var(--surface-1))] border-b border-[hsl(var(--border-default))]"
          style={{ gridTemplateColumns: gridCols }}
        >
          {isColumnVisible('name') && (
            <SortableHeader 
              label="Epic" 
              column="name" 
              currentSort={sortColumn} 
              direction={sortDirection} 
              onSort={handleSort} 
            />
          )}
          {isColumnVisible('theme') && (
            <SortableHeader 
              label="Theme" 
              column="theme" 
              currentSort={sortColumn} 
              direction={sortDirection} 
              onSort={handleSort} 
            />
          )}
          {isColumnVisible('status') && (
            <SortableHeader 
              label="State" 
              column="status" 
              currentSort={sortColumn} 
              direction={sortDirection} 
              onSort={handleSort} 
            />
          )}
          {isColumnVisible('features') && (
            <SortableHeader 
              label="Features" 
              column="features" 
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
          {isLoading ? (
            <div className="flex items-center justify-center py-16 px-4 text-muted-foreground">
              Loading epics...
            </div>
          ) : filteredEpics.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="w-12 h-12 rounded-full mb-4 bg-[hsl(var(--surface-2))] flex items-center justify-center">
                <Box className="h-6 w-6 text-[hsl(var(--text-muted))]" />
              </div>
              <p className="text-sm font-medium text-[hsl(var(--text-secondary))]">No epics found</p>
              <p className="text-xs text-[hsl(var(--text-muted))] mt-1">Create epics to organize your work items</p>
              {onCreateEpic && (
                <Button 
                  size="sm" 
                  onClick={onCreateEpic}
                  className="mt-4 bg-[hsl(var(--brand-primary))] hover:bg-[hsl(var(--brand-primary-hover))] text-white gap-1.5"
                >
                  <Plus className="h-4 w-4" />
                  Create Epic
                </Button>
              )}
            </div>
          ) : (
            filteredEpics.map((epic, index) => {
              const isSelected = selectedItemId === epic.id;
              return (
                <button
                  key={epic.id}
                  onClick={() => onSelectItem(epic)}
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
                      <WorkItemIcon type="epic" size={14} />
                      <span className="text-sm font-medium text-[hsl(var(--text-primary))] group-hover:text-[hsl(var(--brand-primary))] truncate transition-colors">
                        {epic.name}
                      </span>
                    </div>
                  )}
                  {isColumnVisible('theme') && (
                    <div className="flex items-center">
                      <span className="text-sm text-muted-foreground truncate">
                        {epic.theme_id ? themeLookup[epic.theme_id] || '—' : '—'}
                      </span>
                    </div>
                  )}
                  {isColumnVisible('status') && (
                    <div className="flex items-center">
                      <StatusBadge status={epic.status} />
                    </div>
                  )}
                  {isColumnVisible('features') && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-foreground tabular-nums">
                        {featureCounts[epic.id] || 0}
                      </span>
                    </div>
                  )}
                  {isColumnVisible('updated') && (
                    <div className="flex items-center">
                      <span className="text-sm text-muted-foreground">
                        {epic.updated_at ? format(new Date(epic.updated_at), 'MMM d, yyyy') : '—'}
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
      {filteredEpics.length > 0 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-muted-foreground">
            Showing {filteredEpics.length} of {epics.length} epics
          </p>
        </div>
      )}
    </div>
  );
}